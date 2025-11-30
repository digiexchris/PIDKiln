# Required Interfaces for Command System and State Machine Component

This document lists all interfaces that must be defined in Step 11 (Design Command System and State Machine Component).

## Core Interfaces

### 1. ICommand
**Purpose**: Base interface for all commands

```cpp
class ICommand {
public:
    virtual ~ICommand() = default;
    virtual CommandPriority GetPriority() const = 0;
    virtual bool CanExecute(ProgramState aState) const = 0;
    virtual void Execute(IStateMachine& aStateMachine, CommandCallback aCallback = nullptr) = 0;
    virtual void SetCallback(CommandCallback aCallback) = 0;
    virtual void Cancel() = 0;
    virtual CommandType GetType() const = 0;
};
```

**Note on CanExecute() vs CanAcceptCommand()**:
- `CanExecute(ProgramState)` on ICommand: Command validates if it can execute in given state
- This is the primary validation mechanism
- `CanAcceptCommand()` on IStateMachine was removed - redundant with command's `CanExecute()`
- CommandProcessor checks `command->CanExecute(stateMachine.GetCurrentState())` before execution
- `TransitionTo()` assumes transition is valid (command already validated)

### 2. ICommandSource
**Purpose**: Interface for submitting commands to the command system

```cpp
class ICommandSource {
public:
    virtual ~ICommandSource() = default;
    virtual void SubmitCommand(std::shared_ptr<ICommand> aCommand) = 0;
};
```

### 3. IStateMachine
**Purpose**: State machine interface for state management and dependency access

```cpp
class IStateMachine {
public:
    virtual ~IStateMachine() = default;
    
    // State Management
    virtual ProgramState GetCurrentState() const = 0;
    virtual void TransitionTo(ProgramState aNewState, std::shared_ptr<ICommand> aTrigger) = 0;
    // Note: TransitionTo() assumes transition is valid (command already validated via CanExecute())
    
    // Error Management (for critical errors)
    virtual void SetErrorMessage(const std::string& aMessage) = 0;
    virtual std::string GetErrorMessage() const = 0;
    virtual void ClearErrorMessage() = 0;
    
    // Dependency Access
    virtual IProgramExecutor& GetProgramExecutor() = 0;
    virtual ITemperatureController& GetTemperatureController() = 0;
    virtual IProgramStorage& GetProgramStorage() = 0;
    
    // Observer Management
    virtual void AddObserver(std::weak_ptr<IStateObserver> aObserver) = 0;
    virtual void RemoveObserver(std::weak_ptr<IStateObserver> aObserver) = 0;
};
```

### 4. IStateObserver
**Purpose**: Interface for components that need to react to state changes

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
```

## Dependency Interfaces (To Be Implemented Later)

These interfaces are defined in this step but will be implemented in future steps.

### 5. IProgramExecutor
**Purpose**: Interface for program execution (segment timing, temperature ramping)

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
```

### 6. ITemperatureController
**Purpose**: Interface for temperature and heater control

```cpp
class ITemperatureController {
public:
    virtual ~ITemperatureController() = default;
    virtual void SetTargetTemperature(float aTemperature) = 0;
    virtual float GetCurrentTemperature() const = 0;
    virtual void SetHeaterPercent(uint8_t aPercent) = 0;  // 0-100
    virtual uint8_t GetHeaterPercent() const = 0;
};
```

### 7. IProgramStorage
**Purpose**: Interface for program storage operations

**Requirements from Proto/API:**
- `ListProgramsRequest` → Returns list of programs with name, size, description
- `GetProgramRequest` → Returns program content as JSON string
- `SaveProgramRequest` → Saves program with name and JSON content
- `DeleteProgramRequest` → Deletes program by name
- `LoadCommand` → Loads program by name (parsed into Program struct)

```cpp
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
```

**Note**: 
- `LoadProgram()` returns parsed `Program` struct for execution
- `GetProgramContent()` returns raw JSON string for web responses
- `SaveProgram()` accepts JSON string (will be parsed by implementation)
- Implementation will handle JSON parsing/serialization

## Supporting Types

### CommandResult
```cpp
struct CommandResult {
    bool success;
    std::string errorMessage;  // Empty if success
};
```

### CommandCallback
```cpp
using CommandCallback = std::function<void(CommandResult)>;
```

### Program and Segment Structures
```cpp
struct Time {
    int hours = 0;
    int minutes = 0;
    int seconds = 0;
    
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

### Enums
```cpp
enum class ProgramState : uint8_t {
    None = 0,        // Initial state, no program loaded
    Ready = 1,
    Running = 2,
    Paused = 3,
    Stopped = 4,
    Error = 5,
    Finished = 7
    // Note: WaitingThreshold = 6 is not currently used
};

enum class CommandPriority : uint8_t {
    Emergency = 0,
    Critical = 1,
    High = 2,
    Normal = 3,
    Low = 4
};

enum class CommandType {
    Start,
    Pause,
    Resume,
    Stop,
    Load,
    Unload,
    SetTemp,
    ClearError,
    SetTimeScale
};
```

## Summary

**Interfaces to Define in This Step:**
1. ✅ ICommand
2. ✅ ICommandSource
3. ✅ IStateMachine
4. ✅ IStateObserver
5. ✅ IProgramExecutor (interface only, implementation later)
6. ✅ ITemperatureController (interface only, implementation later)
7. ✅ IProgramStorage (interface only, implementation later)

**Command Base Classes (Priority Groups):**
- EmergencyCommand (Emergency priority)
- CriticalCommand (Critical priority)
- HighPriorityCommand (High priority)
- NormalPriorityCommand (Normal priority)

**Supporting Types:**
- CommandResult
- CommandCallback
- Program, Segment, Time structures
- ProgramState enum (initial state: None)
- CommandPriority enum
- CommandType enum

**Implementation Details:**
- Priority queue: `std::priority_queue` with mutex
- State validation: Commands use `CanExecute()` before execution
- State transitions: `TransitionTo()` assumes validity (command already validated)
- StateMachine constructor: Takes all required dependencies (IProgramExecutor, ITemperatureController, IProgramStorage)

**Note**: The implementations of IProgramExecutor, ITemperatureController, and IProgramStorage will be created in future steps. For this step, we only need to define the interfaces so that commands can use them.

