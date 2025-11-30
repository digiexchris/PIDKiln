# Command System and State Machine Component - Design

## Overview

Central command system using the command pattern with a state machine that manages furnace program execution. Accepts commands from multiple sources and processes them with priority-based queuing.

## Requirements

- Command pattern implementation with priority queue
- State machine managing program execution states
- Multiple command sources (hardware UI, internal monitoring, web frontend)
- Priority-based command processing
- Thread-safe operation
- Hardware-agnostic (shareable between test-app and esp32)
- Testable with CppUTest

## Architecture

### Core Components

```
CommandSystem (main coordinator)
  ├── PriorityCommandQueue (thread-safe)
  ├── StateMachine (state management)
  ├── CommandProcessor (executes commands)
  └── StateObserver (notifications)

ICommand (interface)
  ├── GetPriority() -> CommandPriority
  ├── CanExecute(StateMachineState) -> bool
  ├── Execute(IStateMachine&, CommandCallback) -> void
  ├── SetCallback(CommandCallback) -> void
  └── Cancel() -> void

IStateMachine (interface)
  ├── GetCurrentState() -> ProgramState
  ├── TransitionTo(ProgramState, std::shared_ptr<ICommand>) -> void
  ├── SetErrorMessage(const std::string&) -> void
  ├── GetErrorMessage() -> string
  ├── ClearErrorMessage() -> void
  ├── GetProgramExecutor() -> IProgramExecutor&
  ├── GetTemperatureController() -> ITemperatureController&
  ├── GetProgramStorage() -> IProgramStorage&
  ├── AddObserver(std::weak_ptr<IStateObserver>) -> void
  └── RemoveObserver(std::weak_ptr<IStateObserver>) -> void

CommandResult
  ├── success: bool
  └── errorMessage: string

CommandCallback
  └── function<void(CommandResult)>

ICommandSource (interface)
  └── SubmitCommand(std::shared_ptr<ICommand>)

ConcreteCommands (Frontend Commands - Initial Implementation):
  ├── StartCommand (segment: int, minute: int)
  ├── PauseCommand
  ├── ResumeCommand
  ├── StopCommand
  ├── LoadCommand (program: string)
  ├── UnloadCommand
  ├── SetTempCommand (temperature: float)
  ├── ClearErrorCommand
  └── SetTimeScaleCommand (time_scale: float) - Simulator only

All Commands (Complete List from BDD/API/Proto):
  ├── StartCommand - Start loaded program (with optional segment/minute)
  ├── PauseCommand - Pause running program
  ├── ResumeCommand - Resume paused program
  ├── StopCommand - Stop program gracefully
  ├── LoadCommand - Load program from storage
  ├── UnloadCommand - Unload current program
  ├── SetTempCommand - Set manual target temperature
  ├── ClearErrorCommand - Clear error state and return to STOPPED
  └── SetTimeScaleCommand - Set simulation time scale (simulator only)

Note: Reboot and firmware upload are handled via HTTP endpoints, not WebSocket commands.
```

### Command Sources

Multiple sources can submit commands via `ICommandSource` interface:

1. **Hardware UI** (physical buttons)
   - Button press → Create command → Submit via ICommandSource
   - Example: Stop button → Emergency StopCommand

2. **Internal Hardware Monitoring** (threads)
   - Thermocouple monitoring thread → Safety check → Submit command
   - Example: Thermal runaway detected → Emergency StopCommand
   - Example: Max temp reached → Emergency StopCommand

3. **Web Frontend** (FlatBuffers handler)
   - WebSocket message → Decode → Create command → Submit via ICommandSource
   - Example: StartCommand from frontend → Submit to command system

### Priority Levels and Command Base Classes

**Priority Levels**:
```cpp
enum class CommandPriority {
    Emergency = 0,    // Hardware safety (thermal runaway, max temp, emergency stop)
    Critical = 1,     // User stop, critical safety
    High = 2,         // User commands (start, pause, resume)
    Normal = 3,       // Set temp, load program, unload
    Low = 4           // Data requests (history, preferences) - handled separately
};
```

**Command Base Classes by Priority**:
Commands extend from base classes that define their priority group. Priority is built into the command class, not customizable.

```cpp
// Base classes for priority groups
class EmergencyCommand : public ICommand {
protected:
    CommandPriority GetPriority() const override { return CommandPriority::Emergency; }
};

class CriticalCommand : public ICommand {
protected:
    CommandPriority GetPriority() const override { return CommandPriority::Critical; }
};

class HighPriorityCommand : public ICommand {
protected:
    CommandPriority GetPriority() const override { return CommandPriority::High; }
};

class NormalPriorityCommand : public ICommand {
protected:
    CommandPriority GetPriority() const override { return CommandPriority::Normal; }
};

// Example: StopCommand extends CriticalCommand
class StopCommand : public CriticalCommand {
    // Priority is automatically Critical
};
```

**Command Priority Assignment**:
- StopCommand → CriticalCommand (Critical priority)
- StartCommand, PauseCommand, ResumeCommand → HighPriorityCommand (High priority)
- LoadCommand, UnloadCommand, SetTempCommand → NormalPriorityCommand (Normal priority)
- Emergency stop from hardware monitoring → EmergencyCommand (Emergency priority)

### State Machine

States per SPECIFICATION.md:
- NONE (0) - Initial state, no program loaded
- READY (1)
- RUNNING (2)
- PAUSED (3)
- STOPPED (4)
- ERROR (5)
- FINISHED (7)

**Note**: WAITING_THRESHOLD (6) is not currently used and can be ignored for initial implementation.

State transitions follow rules from SPECIFICATION.md section 1.3.

**Initial State**: StateMachine starts in `ProgramState::NONE` when constructed.

### Command Execution Flow

1. Command source creates command instance (with parameters) and submits via `ICommandSource::SubmitCommand()`
2. CommandSystem enqueues command in PriorityCommandQueue (std::priority_queue)
3. CommandProcessor processes queue (respecting priorities)
4. Before execution: Check `command->CanExecute(stateMachine.GetCurrentState())`
5. If valid: Execute command, may trigger state transition via `TransitionTo()`
6. If invalid: Reject with error via callback, command cancelled
7. State change triggers notifications to observers
8. Command object is destroyed after execution completes

**State Validation**: 
- Commands validate state before execution via `CanExecute()`
- `TransitionTo()` assumes the transition is valid (command already validated)
- If invalid transition attempted, `TransitionTo()` should assert or handle gracefully
- The guard is in place: `CanExecute()` check before execution prevents invalid commands from running

### Execute Function and Callback Usage

#### Execute Function Signature

```cpp
class ICommand {
public:
    virtual void Execute(IStateMachine& aStateMachine, 
                        CommandCallback aCallback = nullptr) = 0;
};

struct CommandResult {
    bool success;
    std::string errorMessage;  // Empty if success
};

using CommandCallback = std::function<void(CommandResult)>;
```

#### How Execute Works

The `Execute()` function is called by the `CommandProcessor` when it's time to process the command. The command:

1. **Receives the state machine** - Used to query current state and trigger transitions
2. **Receives optional callback** - Used to report results back to the caller
3. **Performs its action** - Executes the command logic
4. **Reports result** - Calls callback (if provided) with success/failure

#### Execution Patterns

**Pattern 1: Synchronous Execution (No Callback)**
```cpp
void PauseCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Check if we can pause
    if (aStateMachine.GetCurrentState() != ProgramState::RUNNING) {
        if (aCallback) {
            aCallback(CommandResult{false, "Can only pause when running"});
        }
        return;
    }
    
    // Trigger state transition
    aStateMachine.TransitionTo(ProgramState::PAUSED, shared_from_this());
    
    // Report success (if callback provided)
    if (aCallback) {
        aCallback(CommandResult{true, ""});
    }
}
```

**Pattern 2: Synchronous with Dependencies from State Machine**
```cpp
void LoadCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Validate state
    if (aStateMachine.GetCurrentState() == ProgramState::RUNNING) {
        if (aCallback) {
            aCallback(CommandResult{false, "Cannot load program while running"});
        }
        return;
    }
    
    // Get program storage from state machine
    auto& storage = aStateMachine.GetProgramStorage();
    
    // Load program from storage (synchronous operation)
    auto program = storage.LoadProgram(myProgramName);
    if (!program.has_value()) {
        if (aCallback) {
            aCallback(CommandResult{false, "Program not found: " + myProgramName});
        }
        return;
    }
    
    // Store loaded program (delegated to program executor)
    auto& executor = aStateMachine.GetProgramExecutor();
    executor.LoadProgram(program.value());
    
    // Transition to READY state
    aStateMachine.TransitionTo(ProgramState::READY, shared_from_this());
    
    // Report success
    if (aCallback) {
        aCallback(CommandResult{true, ""});
    }
}
```

**Pattern 3: Asynchronous Execution with Dependency from State Machine**
```cpp
void StartCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Validate state
    if (!CanExecute(aStateMachine.GetCurrentState())) {
        if (aCallback) {
            aCallback(CommandResult{false, "Cannot start in current state"});
        }
        return;
    }
    
    // Get program executor from state machine
    auto& executor = aStateMachine.GetProgramExecutor();
    
    // Start program execution (may be async operation)
    executor.Start(mySegment, myMinute, 
        [&aStateMachine, aCallback, this](bool success, const std::string& error) {
            if (success) {
                aStateMachine.TransitionTo(ProgramState::RUNNING, shared_from_this());
                if (aCallback) {
                    aCallback(CommandResult{true, ""});
                }
            } else {
                if (aCallback) {
                    aCallback(CommandResult{false, error});
                }
            }
        });
}
```

#### Callback Flow

**From Command Source to Result:**

```
FlatBuffers Handler
  ↓ creates command with callback
  ↓ SubmitCommand(command)
CommandSystem
  ↓ enqueues command
CommandProcessor
  ↓ calls Execute(stateMachine, callback)
Command::Execute()
  ↓ performs action
  ↓ calls callback(result)
FlatBuffers Handler callback
  ↓ receives result
  ↓ sends response to web client
```

**Example: Full Flow with Callback**

```cpp
// In FlatBuffers Handler
void HandleStartCommand(const StartCommand& aFlatBuffersCmd, uint32_t aRequestId) {
    // Create command with parameters only (no dependencies)
    auto command = std::make_shared<StartCommand>(
        aFlatBuffersCmd.segment(),
        aFlatBuffersCmd.minute()
    );
    
    // Create callback to send response back to web client
    auto callback = [this, aRequestId](CommandResult aResult) {
        // Send Ack response back to web client
        SendAckResponse(aRequestId, aResult.success, aResult.errorMessage);
    };
    
    // Store callback with command
    command->SetCallback(callback);
    
    // Submit to command system
    myCommandSource->SubmitCommand(command);
}

// In CommandProcessor
void CommandProcessor::ProcessNextCommand() {
    auto command = myQueue->Dequeue();
    if (!command) return;
    
    // Get callback from command (if attached)
    // Or: Command could store callback internally
    auto callback = command->GetCallback();
    
    // Execute command
    command->Execute(*myStateMachine, callback);
}
```

#### Callback Storage Options

**Option A: Callback Stored in Command**
```cpp
class ICommand {
private:
    CommandCallback myCallback;
public:
    void SetCallback(CommandCallback aCallback) { myCallback = aCallback; }
    void Execute(IStateMachine& aStateMachine) {
        Execute(aStateMachine, myCallback);
    }
};
```
**Pros**: Simple, callback travels with command
**Cons**: Commands become stateful (but only during execution)

**Option B: Callback Passed to Execute (Recommended)**
```cpp
// Command source creates callback and passes to Execute
command->Execute(*stateMachine, callback);
```
**Pros**: Explicit, no state in command
**Cons**: Need to store callback somewhere between creation and execution

**Option C: Command Wrapper**
```cpp
struct CommandWithCallback {
    std::shared_ptr<ICommand> command;
    CommandCallback callback;
};
```
**Pros**: Separates command from callback
**Cons**: Extra indirection

**Recommendation**: **Option A** - Store callback in command. Commands are short-lived (created, executed, destroyed), so the stateful callback doesn't cause issues. This keeps the Execute signature simple and allows the callback to travel with the command through the queue.

### Command Lifecycle

**Decision**: Commands are **created at queue time** (short-lived objects), not long-lived.

**Rationale**:
- Each command execution is independent with its own parameters
- Commands are queued, executed once, then destroyed
- Stateless commands are simpler and thread-safe
- No need to reset or manage state between uses
- Modern C++ move semantics make creation efficient
- Commands can be cancelled before execution (removed from queue)

**Lifecycle**:
1. **Creation**: Command source creates command with parameters (e.g., `StartCommand(segment=2, minute=0)`)
2. **Queuing**: Command is moved into priority queue via `std::shared_ptr<ICommand>`
3. **Validation**: Before execution, `CanExecute()` is checked
4. **Execution**: Command executes once via `Execute()`
5. **Completion**: Command result is reported via callback
6. **Destruction**: Command object is destroyed (shared_ptr reference count reaches 0)

**Example**:
```cpp
// Command created with parameters
auto command = std::make_shared<StartCommand>(
    std::make_shared<IProgramExecutor>(...),  // Dependencies
    2,  // segment parameter
    0   // minute parameter
);
command->SetPriority(CommandPriority::High);

// Immediately queued
myCommandSource->SubmitCommand(std::move(command));

// Command is executed once, then destroyed
```

### Priority Handling

- Emergency/Critical commands can interrupt lower-priority commands
- State machine can reject commands if state is incompatible
- Hardware safety events (Emergency priority) always processed first
- User commands (High priority) processed before normal operations
- Data requests (Low priority) handled synchronously, don't affect state machine

### Thread Safety

- PriorityCommandQueue uses `std::priority_queue` with mutex for thread-safe operations
- Multiple threads can submit commands concurrently
- CommandProcessor runs via `ProcessCommands()` function (called from thread/loop)
- State machine state access is protected by mutex

### Integration Points

**For Hardware UI:**
```cpp
class HardwareUI {
    ICommandSource* myCommandSource;
public:
    void OnStopButtonPressed() {
        // StopCommand extends CriticalCommand, priority is built-in
        auto command = std::make_shared<StopCommand>();
        myCommandSource->SubmitCommand(command);
    }
};
```

**For Internal Monitoring:**
```cpp
class ThermocoupleMonitor {
    ICommandSource* myCommandSource;
    void MonitorThread() {
        if (DetectThermalRunaway()) {
            // EmergencyStopCommand extends EmergencyCommand, priority is built-in
            auto command = std::make_shared<EmergencyStopCommand>();
            myCommandSource->SubmitCommand(command);
        }
    }
};
```

**For Web Handler:**
```cpp
class FlatBuffersHandler : public ICommandSource {
    ICommandSource* myCommandSource;  // Delegates to CommandSystem
public:
    void HandleStartCommand(StartCommand& aCmd) {
        // StartCommand extends HighPriorityCommand, priority is built-in
        auto command = std::make_shared<StartCommand>(aCmd.segment, aCmd.minute);
        myCommandSource->SubmitCommand(command);
    }
};
```

## Component Structure

```
components/command_system/
├── include/
│   └── command_system/
│       ├── CommandSystem.hpp
│       ├── ICommand.hpp
│       ├── ICommandSource.hpp
│       ├── IStateMachine.hpp
│       ├── IStateObserver.hpp
│       ├── PriorityCommandQueue.hpp
│       ├── StateMachine.hpp
│       ├── CommandPriority.hpp
│       ├── ProgramState.hpp
│       └── commands/
│           ├── StartCommand.hpp
│           ├── PauseCommand.hpp
│           ├── ResumeCommand.hpp
│           ├── StopCommand.hpp
│           ├── LoadCommand.hpp
│           ├── UnloadCommand.hpp
│           ├── SetTempCommand.hpp
│           ├── ClearErrorCommand.hpp
│           └── SetTimeScaleCommand.hpp
├── src/
│   ├── CommandSystem.cpp
│   ├── PriorityCommandQueue.cpp
│   ├── StateMachine.cpp
│   ├── CommandProcessor.cpp
│   └── commands/
│       ├── StartCommand.cpp
│       ├── PauseCommand.cpp
│       ├── ResumeCommand.cpp
│       ├── StopCommand.cpp
│       ├── LoadCommand.cpp
│       ├── UnloadCommand.cpp
│       ├── SetTempCommand.cpp
│       ├── ClearErrorCommand.cpp
│       └── SetTimeScaleCommand.cpp
└── CMakeLists.txt
```

## Design Decisions

1. **Command Pattern**: Encapsulates actions as objects, allows queuing, cancellation, and priority
2. **Priority Queue**: Ensures critical commands (safety) are processed before user commands
3. **ICommandSource Interface**: Allows multiple sources to submit commands without tight coupling
4. **State Machine Validation**: Commands check state before execution, preventing invalid transitions
5. **Observer Pattern**: Components can subscribe to state changes for reactive behavior
6. **Thread-Safe Queue**: Enables multi-threaded command sources (hardware monitoring, web handler)

## Clarifications and Design Decisions

### 1. Program Execution vs State Machine

**Decision**: Program execution (segment timing, temperature ramping, step tracking) will be handled by a **separate component** created in a future step. The command/state system only manages:
- State transitions
- Command processing
- State validation

The program executor component will be notified of state changes and will handle the actual program logic when state is RUNNING.

**Interface Definition**: Create `IProgramExecutor` interface in command_system component. The actual implementation will be in a separate component. The state machine will hold the `IProgramExecutor` instance, and commands will retrieve it from the state machine.

```cpp
class IProgramExecutor {
public:
    virtual ~IProgramExecutor() = default;
    virtual void Start(int aSegment, int aMinute, 
                      std::function<void(bool, const std::string&)> aCallback) = 0;
    virtual void Pause() = 0;
    virtual void Resume() = 0;
    virtual void Stop() = 0;
    virtual void LoadProgram(const Program& aProgram) = 0;
    virtual void UnloadProgram() = 0;
};

class IStateMachine {
public:
    virtual IProgramExecutor& GetProgramExecutor() = 0;
    // ... other methods
};
```

Commands retrieve `IProgramExecutor` from the state machine during `Execute()`.

### 2. Command Execution Context

Commands need access to various dependencies:
- Hardware handlers (heater control, thermocouple reads) - via `ITemperatureController` interface
- Program storage (for LoadCommand) - via `IProgramStorage` interface
- Program executor (for StartCommand) - via `IProgramExecutor` interface (future component)
- State machine (for state transitions) - passed to `Execute()` method

**Options for Dependency Injection**:

**Option A: Constructor Injection**
```cpp
class StartCommand : public ICommand {
    std::shared_ptr<IProgramExecutor> myProgramExecutor;
    std::shared_ptr<ITemperatureController> myTempController;
public:
    StartCommand(std::shared_ptr<IProgramExecutor> aExecutor,
                 std::shared_ptr<ITemperatureController> aController);
    void Execute(IStateMachine& aStateMachine, CommandCallback aCallback) override;
};
```
**Pros**: Clear dependencies, testable, type-safe
**Cons**: Commands need all dependencies at creation time

**Option B: Context Object**
```cpp
struct CommandContext {
    std::shared_ptr<IProgramExecutor> programExecutor;
    std::shared_ptr<ITemperatureController> temperatureController;
    std::shared_ptr<IProgramStorage> programStorage;
};

class StartCommand : public ICommand {
    void Execute(IStateMachine& aStateMachine, 
                 CommandContext& aContext,
                 CommandCallback aCallback) override;
};
```
**Pros**: Flexible, can add dependencies without changing command constructors
**Cons**: Less type-safe, context object can become large

**Option C: Dependencies in State Machine (Recommended)**
- State machine holds dependencies (IProgramExecutor, ITemperatureController, IProgramStorage)
- Commands retrieve dependencies from state machine during Execute()
- Commands don't store dependencies themselves
```cpp
class IStateMachine {
public:
    virtual IProgramExecutor& GetProgramExecutor() = 0;
    virtual ITemperatureController& GetTemperatureController() = 0;
    virtual IProgramStorage& GetProgramStorage() = 0;
    // ... state management methods
};

class StartCommand : public ICommand {
    int mySegment;
    int myMinute;
public:
    StartCommand(int aSegment, int aMinute);
    void Execute(IStateMachine& aStateMachine, CommandCallback aCallback) override {
        auto& executor = aStateMachine.GetProgramExecutor();
        executor.Start(mySegment, myMinute, aCallback);
        aStateMachine.TransitionTo(ProgramState::RUNNING, shared_from_this());
    }
};
```
**Pros**: 
- Commands are stateless (except parameters)
- Dependencies centralized in state machine
- Commands don't need dependency injection
- Simpler command constructors
- State machine is the single source of truth for dependencies
**Cons**: State machine interface grows with dependencies

### 3. Command Result/Response

Commands need to report success/failure to the calling layer (e.g., FlatBuffers handler for web responses).

**Options for Command Results**:

**Option A: Result Object with Callback**
```cpp
struct CommandResult {
    bool success;
    std::string errorMessage;  // Empty if success
};

using CommandCallback = std::function<void(CommandResult)>;

class ICommand {
    virtual void Execute(IStateMachine& aStateMachine, CommandCallback aCallback) = 0;
};
```
**Pros**: Single callback, clear result structure, easy to use
**Cons**: Callback must always be provided

**Option B: Separate Success/Error Callbacks**
```cpp
using SuccessCallback = std::function<void()>;
using ErrorCallback = std::function<void(const std::string&)>;

class ICommand {
    virtual void Execute(IStateMachine& aStateMachine,
                        SuccessCallback aOnSuccess,
                        ErrorCallback aOnError) = 0;
};
```
**Pros**: Explicit success/error handling
**Cons**: Two callbacks to manage, more complex

**Option C: Result Object Returned (Synchronous)**
```cpp
class ICommand {
    virtual CommandResult Execute(IStateMachine& aStateMachine) = 0;
};
```
**Pros**: Simple, no callbacks
**Cons**: Commands must be synchronous, blocks command processor

**Option D: Result Object with Optional Callback (Recommended)**
```cpp
struct CommandResult {
    bool success;
    std::string errorMessage;
};

using CommandCallback = std::function<void(CommandResult)>;

class ICommand {
    virtual void Execute(IStateMachine& aStateMachine, 
                        CommandCallback aCallback = nullptr) = 0;
};
```
**Pros**: Flexible (can be synchronous or asynchronous), single callback, clear structure
**Cons**: Callback may be null (need to check)

**Recommendation**: Option D - allows commands to be synchronous (no callback) or asynchronous (with callback), and the calling layer (FlatBuffers handler) can provide callbacks to send responses back to the web client.

### 4. State Change Notifications

Components need to react to state changes (FlatBuffers handler for broadcasts, program executor, etc.).

**Options for State Change Notifications**:

**Option A: Observer Pattern with Callbacks**
```cpp
struct StateChangeEvent {
    ProgramState oldState;
    ProgramState newState;
    std::shared_ptr<ICommand> triggerCommand;  // Command that caused transition
};

class IStateObserver {
public:
    virtual ~IStateObserver() = default;
    virtual void OnStateChanged(const StateChangeEvent& aEvent) = 0;
};

class StateMachine {
    void AddObserver(std::shared_ptr<IStateObserver> aObserver);
    void RemoveObserver(std::shared_ptr<IStateObserver> aObserver);
    void NotifyObservers(const StateChangeEvent& aEvent);
};
```
**Pros**: Decoupled, multiple observers, standard pattern
**Cons**: Observer management, potential memory leaks if not cleaned up

**Option B: Callback List**
```cpp
using StateChangeCallback = std::function<void(ProgramState, ProgramState)>;

class StateMachine {
    void RegisterStateChangeCallback(StateChangeCallback aCallback);
    void UnregisterStateChangeCallback(StateChangeCallback aCallback);
};
```
**Pros**: Simple, functional style
**Cons**: Harder to identify which callback to remove, less structured

**Option C: Event Queue**
```cpp
class StateMachine {
    std::queue<StateChangeEvent> myEventQueue;
    void ProcessEvents();  // Called by command processor
};
```
**Pros**: Decoupled, can batch events
**Cons**: Events must be processed, potential queue growth

**Option D: Hybrid Observer Pattern (Recommended)**
```cpp
struct StateChangeEvent {
    ProgramState oldState;
    ProgramState newState;
    std::shared_ptr<ICommand> triggerCommand;
    std::string reason;  // Optional human-readable reason
};

class IStateObserver {
public:
    virtual ~IStateObserver() = default;
    virtual void OnStateChanged(const StateChangeEvent& aEvent) = 0;
};

class StateMachine {
    void AddObserver(std::weak_ptr<IStateObserver> aObserver);  // Use weak_ptr to avoid leaks
    void NotifyObservers(const StateChangeEvent& aEvent);
};
```
**Pros**: Decoupled, safe memory management with weak_ptr, structured events
**Cons**: Observers must be managed as shared_ptr

**Recommendation**: Option D - Observer pattern with weak_ptr for safe memory management. Components like FlatBuffers handler and program executor can subscribe to state changes.

### 5. Program Storage Interface

`LoadCommand` needs to load programs from storage. Program storage will be a separate component created later.

**Decision**: Create `IProgramStorage` interface in command_system component. The actual implementation will be in a separate component. The state machine will hold the `IProgramStorage` instance, and commands will retrieve it from the state machine.

**Requirements from Proto/API:**
- `ListProgramsRequest` → Returns list with name, size, description (ProgramInfo)
- `GetProgramRequest` → Returns program content as JSON string
- `SaveProgramRequest` → Saves program with name and JSON content
- `DeleteProgramRequest` → Deletes program by name
- `LoadCommand` → Loads program by name (parsed into Program struct)

**Note**: 
- `LoadProgram()` returns parsed `Program` struct for execution
- `GetProgramContent()` returns raw JSON string for web responses
- `SaveProgram()` accepts JSON string (will be parsed by implementation)
- Implementation will handle JSON parsing/serialization

```cpp
struct Program {
    std::string name;
    std::string description;
    std::vector<Segment> segments;
};

struct Segment {
    float target;  // Target temperature in °C
    struct Time {
        int hours;
        int minutes;
        int seconds;
    } rampTime;
    struct Time {
        int hours;
        int minutes;
        int seconds;
    } dwellTime;
};

struct ProgramInfo {
    std::string name;
    uint32_t size;  // Size in bytes
    std::string description;
};

class IProgramStorage {
public:
    virtual ~IProgramStorage() = default;
    
    // Load program for execution (parsed into Program struct)
    // Used by LoadCommand
    virtual std::optional<Program> LoadProgram(const std::string& aName) = 0;
    
    // List all available programs
    // Used by ListProgramsRequest
    virtual std::vector<ProgramInfo> ListPrograms() = 0;
    
    // Get program content as JSON string
    // Used by GetProgramRequest
    virtual std::optional<std::string> GetProgramContent(const std::string& aName) = 0;
    
    // Save program from JSON content string
    // Used by SaveProgramRequest
    virtual bool SaveProgram(const std::string& aName, const std::string& aJsonContent) = 0;
    
    // Delete program by name
    // Used by DeleteProgramRequest
    virtual bool DeleteProgram(const std::string& aName) = 0;
};

class IStateMachine {
public:
    virtual IProgramStorage& GetProgramStorage() = 0;
    // ... other methods
};
```

Commands retrieve `IProgramStorage` from the state machine during `Execute()`.

### 6. Temperature Control

Temperature control will be a separate component. Commands need an interface to interact with it.

**Decision**: Create `ITemperatureController` interface in command_system component. The actual implementation will be in a separate component. The state machine will hold the `ITemperatureController` instance, and commands will retrieve it from the state machine.

```cpp
class ITemperatureController {
public:
    virtual ~ITemperatureController() = default;
    virtual void SetTargetTemperature(float aTemperature) = 0;
    virtual float GetCurrentTemperature() const = 0;
    virtual void SetHeaterPercent(uint8_t aPercent) = 0;  // 0-100
    virtual uint8_t GetHeaterPercent() const = 0;
};

class IStateMachine {
public:
    virtual ITemperatureController& GetTemperatureController() = 0;
    // ... other methods
};
```

Commands retrieve `ITemperatureController` from the state machine during `Execute()`.

### 7. Command Cancellation

**Options for Command Cancellation**:

**Option A: No Mid-Execution Cancellation**
- Commands execute to completion
- Higher priority commands wait in queue
- Commands check state before execution (via `CanExecute()`)
- If state becomes invalid, command is rejected before execution starts

**Pros**: Simple, predictable, no partial state
**Cons**: Emergency commands may wait for long-running commands

**Option B: Cancellation Flag**
```cpp
class ICommand {
    virtual void Cancel() = 0;
    virtual bool IsCancelled() const = 0;
};

// Command checks cancellation during execution
void StartCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    if (IsCancelled()) {
        aCallback(CommandResult{false, "Command cancelled"});
        return;
    }
    // ... do work ...
    if (IsCancelled()) {
        // Rollback partial changes
        aCallback(CommandResult{false, "Command cancelled"});
        return;
    }
    // ... continue ...
}
```
**Pros**: Can interrupt long-running commands
**Cons**: Commands must be cancellation-aware, rollback complexity

**Option C: Priority-Based Preemption**
- Emergency/Critical commands can preempt lower priority commands
- Lower priority command is cancelled before execution
- Preempted command is removed from queue or marked cancelled

**Pros**: Safety commands get immediate attention
**Cons**: More complex queue management

**Option D: Hybrid Approach (Recommended)**
- Commands check `CanExecute()` before execution (reject if state invalid)
- Emergency/Critical commands can preempt queued commands (before execution)
- Once execution starts, commands complete (no mid-execution cancellation)
- Commands should be fast (delegate long operations to other components)

**Why Cancellation?**
- Safety: Emergency stop must be immediate
- State changes: If state changes while command is queued, it may become invalid
- Priority: Critical commands should not wait for normal operations

**Side Effects of Cancellation**:
- Partial state changes (if cancelled mid-execution)
- Rollback complexity
- Resource cleanup (if command acquired resources)

**Recommendation**: Option D - Pre-execution cancellation for safety and state validation, but no mid-execution cancellation to avoid complexity. Commands should be fast and delegate long operations.

### 8. Request/Response Matching

**Decision**: `request_id` is a concern of the web layer (FlatBuffers handler), not the command system. The command system does not need to track `request_id`. The FlatBuffers handler will map `request_id` to commands and handle response matching.

### 9. Threading Model

**Decision**: The command system should **not** create threads itself. Instead, it exposes a function that can be called repeatedly from any thread (ESP32 main loop, FreeRTOS task, or test code).

```cpp
class CommandSystem {
public:
    void ProcessCommands();  // Call this repeatedly from your thread/loop
    
    // For ESP32: Call from FreeRTOS task or main loop
    // For tests: Call directly in test code
};
```

**Implementation**:
- ESP32: Create a FreeRTOS task that calls `ProcessCommands()` in a loop
- Tests: Call `ProcessCommands()` directly in test code to control execution order
- Thread-safe queue allows multiple threads to submit commands concurrently

**Benefits**:
- Testable without threading complexity
- Flexible - can be called from any thread
- ESP32 can use FreeRTOS tasks
- Test code can control execution order

### 10. Error Handling

**Decision**: Option D (Hybrid Approach) - Selected

Since commands are stateless, error handling is simplified. Commands don't need to manage error state between executions.

**Error Handling Options Considered**:

**Option A: Callback-Only Error Reporting (Recommended)**
```cpp
void LoadCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Validate state
    if (aStateMachine.GetCurrentState() == ProgramState::RUNNING) {
        if (aCallback) {
            aCallback(CommandResult{false, "Cannot load program while running"});
        }
        return;
    }
    
    // Attempt operation
    auto& storage = aStateMachine.GetProgramStorage();
    auto program = storage.LoadProgram(myProgramName);
    
    if (!program.has_value()) {
        // Report error via callback
        if (aCallback) {
            aCallback(CommandResult{false, "Program not found: " + myProgramName});
        }
        return;  // No state change, command fails
    }
    
    // Success - proceed with state transition
    auto& executor = aStateMachine.GetProgramExecutor();
    executor.LoadProgram(program.value());
    aStateMachine.TransitionTo(ProgramState::READY, shared_from_this());
    
    if (aCallback) {
        aCallback(CommandResult{true, ""});
    }
}
```
**Pros**: 
- Simple, no exception handling needed
- Errors reported immediately to caller
- No side effects if command fails
- Stateless - no error state to manage
**Cons**: 
- Caller must always provide callback to know about errors
- Errors don't persist (can't query later)

**Option B: Callback + State Machine Error State**
```cpp
void StartCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Attempt to start program
    auto& executor = aStateMachine.GetProgramExecutor();
    
    executor.Start(mySegment, myMinute, 
        [&aStateMachine, aCallback](bool success, const std::string& error) {
            if (success) {
                aStateMachine.TransitionTo(ProgramState::RUNNING, shared_from_this());
                if (aCallback) {
                    aCallback(CommandResult{true, ""});
                }
            } else {
                // Critical error - transition to ERROR state
                aStateMachine.TransitionTo(ProgramState::ERROR, nullptr);
                aStateMachine.SetErrorMessage(error);
                if (aCallback) {
                    aCallback(CommandResult{false, error});
                }
            }
        });
}
```
**Pros**: 
- Critical errors persist in state machine
- Can query error state later
- ERROR state prevents further operations until cleared
**Cons**: 
- More complex - need to manage error state
- Only for critical errors, not validation errors

**Option C: Exception-Based (Not Recommended for Embedded)**
```cpp
void LoadCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    try {
        auto& storage = aStateMachine.GetProgramStorage();
        auto program = storage.LoadProgram(myProgramName);
        
        if (!program.has_value()) {
            throw std::runtime_error("Program not found: " + myProgramName);
        }
        
        // ... proceed ...
    } catch (const std::exception& e) {
        if (aCallback) {
            aCallback(CommandResult{false, e.what()});
        }
    }
}
```
**Pros**: 
- Standard C++ error handling
- Can propagate through call stack
**Cons**: 
- Exceptions can be expensive on embedded systems
- Not always available in embedded environments
- Can complicate control flow

**Option D: Hybrid Approach (Recommended)**
- **Validation Errors**: Reported via callback only (no state change)
  - Invalid state for command
  - Missing parameters
  - Resource not found (non-critical)
  
- **Critical Errors**: Reported via callback + transition to ERROR state
  - Hardware failures
  - Safety violations
  - System errors that prevent operation

- **Success**: State transition + callback

```cpp
void LoadCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Validation error - callback only
    if (aStateMachine.GetCurrentState() == ProgramState::RUNNING) {
        if (aCallback) {
            aCallback(CommandResult{false, "Cannot load program while running"});
        }
        return;  // No state change
    }
    
    // Attempt operation
    auto& storage = aStateMachine.GetProgramStorage();
    auto program = storage.LoadProgram(myProgramName);
    
    if (!program.has_value()) {
        // Validation error - callback only
        if (aCallback) {
            aCallback(CommandResult{false, "Program not found: " + myProgramName});
        }
        return;  // No state change
    }
    
    // Success - state transition
    auto& executor = aStateMachine.GetProgramExecutor();
    executor.LoadProgram(program.value());
    aStateMachine.TransitionTo(ProgramState::READY, shared_from_this());
    
    if (aCallback) {
        aCallback(CommandResult{true, ""});
    }
}

void StartCommand::Execute(IStateMachine& aStateMachine, CommandCallback aCallback) {
    // Validation
    if (!CanExecute(aStateMachine.GetCurrentState())) {
        if (aCallback) {
            aCallback(CommandResult{false, "Cannot start in current state"});
        }
        return;
    }
    
    // Attempt start - may fail critically
    auto& executor = aStateMachine.GetProgramExecutor();
    executor.Start(mySegment, myMinute, 
        [&aStateMachine, aCallback](bool success, const std::string& error) {
            if (success) {
                aStateMachine.TransitionTo(ProgramState::RUNNING, shared_from_this());
                if (aCallback) {
                    aCallback(CommandResult{true, ""});
                }
            } else {
                // Critical error - transition to ERROR state
                aStateMachine.TransitionTo(ProgramState::ERROR, nullptr);
                aStateMachine.SetErrorMessage(error);
                if (aCallback) {
                    aCallback(CommandResult{false, error});
                }
            }
        });
}
```

**Benefits of Stateless Commands for Error Handling**:
1. **No Error State to Clean Up**: Each command execution is independent
2. **Simple Error Reporting**: Just return via callback, no need to track error state
3. **No Partial State**: Command either succeeds (state changes) or fails (no state change)
4. **Easy Testing**: Can test error cases without worrying about residual state
5. **Clear Error Semantics**: Errors are either validation (callback only) or critical (callback + ERROR state)

**Selected Approach**: **Option D (Hybrid Approach)**

**Error Handling Strategy**:
- **Validation Errors**: Reported via callback only, no state change
  - Invalid state for command
  - Missing parameters
  - Resource not found (non-critical)
  - Command rejected by state machine
  
- **Critical Errors**: Reported via callback + transition to ERROR state
  - Hardware failures
  - Safety violations
  - System errors that prevent operation
  - Errors that require user intervention (ClearErrorCommand)
  
- **Success**: State transition + callback

**Implementation Notes**:
- Commands validate before attempting operations
- Validation errors return immediately via callback, no state change
- Critical errors transition state machine to ERROR state and set error message
- `ClearErrorCommand` transitions from ERROR to STOPPED state
- State machine provides `SetErrorMessage()` method for critical errors
- Clear separation between recoverable and critical errors

### 11. Program Data Structure

**Decision**: Create C++ `Program` and `Segment` structures based on the JSON format defined in API.md and used in program files.

```cpp
struct Time {
    int hours = 0;
    int minutes = 0;
    int seconds = 0;
    
    // Convert to total minutes for calculations
    double ToMinutes() const {
        return hours * 60.0 + minutes + seconds / 60.0;
    }
};

struct Segment {
    float target;  // Target temperature in °C
    Time rampTime;
    Time dwellTime;
};

struct Program {
    std::string name;
    std::string description;
    std::vector<Segment> segments;
};
```

This matches the JSON structure:
```json
{
  "description": "...",
  "segments": [
    {
      "target": 95,
      "ramp_time": { "hours": 0, "minutes": 30, "seconds": 0 },
      "dwell_time": { "hours": 0, "minutes": 20, "seconds": 0 }
    }
  ]
}
```

Program storage component will handle JSON parsing/serialization.

### 12. Integration with Other Components

**Decision**: Components communicate via interfaces:
- **FlatBuffers handler**: Submits commands via `ICommandSource`, subscribes to state changes via `IStateObserver`
- **Program executor**: Subscribes to state changes, manages program execution when state is RUNNING (future component)
- **Temperature controller**: Provides `ITemperatureController` interface (future component)
- **Program storage**: Provides `IProgramStorage` interface (future component)

All components are separate and communicate through well-defined interfaces, enabling:
- Independent testing
- Hardware-agnostic design
- Clear separation of concerns

## Testing Strategy

### Three-Tier Testing Approach

1. **Unit Tests with Mocked State Machine**: Test commands in isolation
2. **Unit Tests for Real State Machine**: Test state transition logic independently
3. **Integration Tests**: Test real commands with real state machine (less extensive)

### Why Mock State Machine for Command Tests

Mocking the state machine allows commands to be tested in isolation, focusing on:
- Command parameter validation
- Command execution logic
- Error handling within commands
- Command priority assignment

This enables faster, more focused unit tests without the complexity of state machine interactions.

### Why Test Real State Machine Separately

The state machine is pure logic that manages state transitions based on rules. It should be tested independently to verify:
- All valid state transitions work correctly
- Invalid transitions are rejected
- State validation logic is correct
- State change notifications work

### Why Mock Command Handlers

Command handlers interact with hardware and should be mocked for testing:
- Hardware operations (heater control, thermocouple reads)
- Storage operations (program loading/saving)
- System operations (reboot, firmware update)

### Testing Approach

- **Iterative Development**: Build and test in small units
  1. Create interfaces (ICommand, ICommandSource, IStateMachine)
  2. Write tests for interfaces
  3. Implement StateMachine (functional, no hardware)
  4. Write unit tests for StateMachine transitions (real implementation)
  5. Implement PriorityCommandQueue
  6. Write tests for queue ordering and thread safety
  7. Implement one command at a time (StartCommand first)
  8. Write unit tests for each command with mocked state machine and mocked handlers
  9. Write integration tests for real command + real state machine (key scenarios)
  10. Integrate CommandSystem
  11. Write integration tests for full system

### Test Categories

**Unit Tests - Commands (with Mocked State Machine)**:
- Test each command independently with mocked state machine
- Test command parameter validation
- Test command execution logic with mocked handlers
- Test error handling within commands
- Test command priority assignment
- Extensive coverage of command logic

**Unit Tests - State Machine (Real Implementation)**:
- Test all valid state transitions per SPECIFICATION.md
- Test invalid state transitions are rejected
- Test state validation logic
- Test state change notifications
- Test state machine rules comprehensively

**Integration Tests (Real Commands + Real State Machine)**:
- Test key command sequences (load → start → pause → resume → stop)
- Test priority handling with real state machine
- Test state transitions triggered by commands
- Test error scenarios (invalid commands in wrong states)
- Less extensive than unit tests, focus on critical paths

**Unit Tests - Infrastructure**:
- Test priority queue ordering
- Test thread safety with concurrent command submissions
- Test command cancellation

