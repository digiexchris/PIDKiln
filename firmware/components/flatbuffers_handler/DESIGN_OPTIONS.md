# FlatBuffers Handler Component - Design Options

## Requirements Summary

- Process all FlatBuffers messages from `proto/furnace.fbs`
- Handle ClientEnvelope (commands + requests) and ServerEnvelope (responses + broadcasts)
- Route messages to appropriate handlers
- Support request/response matching via request_id
- Hardware-agnostic (shareable between test-app and esp32)
- Testable with CppUTest
- Follow C++23 standards

## Message Types

**Client → Server:**
- Commands: StartCommand, PauseCommand, ResumeCommand, StopCommand, LoadCommand, UnloadCommand, SetTempCommand, ClearErrorCommand, SetTimeScaleCommand
- Requests: HistoryRequest, ListProgramsRequest, GetProgramRequest, SaveProgramRequest, DeleteProgramRequest, GetPreferencesRequest, SavePreferencesRequest, GetDebugInfoRequest, ListLogsRequest, GetLogRequest

**Server → Client:**
- Responses: Ack, HistoryResponse, ProgramListResponse, ProgramContentResponse, PreferencesResponse, DebugInfoResponse, LogListResponse, LogContentResponse, Error
- Broadcasts: State (request_id = 0)

---

## Option A: Router with Handler Interface Pattern

### Architecture
```
MessageRouter
  ├── registerHandler(MessageType, IMessageHandler*)
  ├── processClientEnvelope(ClientEnvelope) -> ServerEnvelope
  └── broadcastState(State)

IMessageHandler (interface)
  └── handle(ClientMessage) -> ServerMessage

ConcreteHandlers:
  ├── CommandHandler (abstract)
  │   ├── StartCommandHandler
  │   ├── PauseCommandHandler
  │   └── ...
  └── RequestHandler (abstract)
      ├── HistoryRequestHandler
      ├── ProgramRequestHandler
      └── ...
```

### Pros
- Clear separation of concerns
- Easy to add new message types
- Handlers can be mocked for testing
- Follows Open/Closed Principle
- Each handler is independently testable

### Cons
- More classes/files
- Requires handler registration
- Slight overhead for message type lookup

### Implementation Notes
- Use std::unordered_map<MessageType, IMessageHandler*> for routing
- Handlers receive dependencies via constructor injection
- Router manages request_id matching

---

## Option B: Command Pattern with Dispatcher

### Architecture
```
MessageDispatcher
  ├── dispatch(ClientEnvelope) -> ServerEnvelope
  └── registerCommand(MessageType, ICommand*)

ICommand (interface)
  └── execute(ClientMessage, Callback) -> void

ConcreteCommands:
  ├── StartCommand
  ├── PauseCommand
  ├── HistoryRequestCommand
  └── ...

ResponseBuilder
  └── buildResponse(CommandResult, request_id) -> ServerEnvelope
```

### Pros
- Classic design pattern
- Commands can be queued/logged/undone (if needed later)
- Clear execution flow
- Easy to add middleware (logging, validation)

### Cons
- More abstraction layers
- Commands need callback mechanism for async responses
- Slightly more complex for simple operations

### Implementation Notes
- Commands execute asynchronously and call callback with result
- Dispatcher manages request_id and response building
- Commands can be stateful if needed

---

## Option C: Strategy Pattern with Message Processor

### Architecture
```
MessageProcessor
  ├── processMessage(ClientEnvelope) -> ServerEnvelope
  └── setStrategy(MessageType, IMessageStrategy*)

IMessageStrategy (interface)
  └── process(ClientMessage) -> ServerMessage

ConcreteStrategies:
  ├── CommandStrategy
  │   └── routeToCommandHandler(CommandType)
  ├── RequestStrategy
  │   └── routeToRequestHandler(RequestType)
  └── ...
```

### Pros
- Flexible routing logic
- Can change strategy at runtime
- Good for different processing modes
- Clear separation between routing and processing

### Cons
- Additional abstraction layer
- May be overkill for simple routing
- Strategy selection logic needed

### Implementation Notes
- Strategies handle groups of related messages
- Processor delegates to appropriate strategy
- Strategies can have their own sub-routing

---

## Option D: Single Handler Class with Switch-Based Routing

### Architecture
```
FlatBuffersHandler
  ├── processClientEnvelope(ClientEnvelope) -> ServerEnvelope
  ├── PrivHandleCommand(ClientMessage) -> ServerMessage
  ├── PrivHandleRequest(ClientMessage) -> ServerMessage
  └── buildServerEnvelope(ServerMessage, request_id) -> ServerEnvelope

Dependencies (injected):
  ├── ICommandExecutor (for commands)
  ├── IRequestProcessor (for requests)
  └── IStateProvider (for state broadcasts)
```

### Pros
- Simple, straightforward
- All routing logic in one place
- Easy to understand flow
- Minimal overhead
- Matches simulator pattern

### Cons
- Large switch statements
- Harder to test individual routes
- Violates Single Responsibility Principle
- Adding new messages requires modifying main class

### Implementation Notes
- Use switch on ClientMessage union type
- Delegate actual work to injected interfaces
- Interfaces allow mocking for tests

---

## Option E: Visitor Pattern with Message Types

### Architecture
```
MessageVisitor (interface)
  ├── visit(StartCommand&)
  ├── visit(PauseCommand&)
  ├── visit(HistoryRequest&)
  └── ...

MessageRouter : MessageVisitor
  └── process(ClientEnvelope) -> ServerEnvelope

HandlerVisitor : MessageVisitor
  └── delegates to specific handlers
```

### Pros
- Type-safe message handling
- Compile-time dispatch possible
- Extensible without modifying router
- Good for complex message hierarchies

### Cons
- More complex setup
- Requires visitor pattern implementation
- May be overkill for flat union structure
- Less intuitive for simple cases

### Implementation Notes
- Each message type accepts visitor
- Router visits message, routes to handler
- Handlers also implement visitor pattern

---

## State Machine Integration Requirements

The component must integrate with a state machine system where:
- Hardware state changes trigger state machine transitions
- Some state changes take priority over handlers (e.g., emergency stop)
- Some handlers take priority over state changes (e.g., user commands)
- Coordination needed between handlers and state machine

### Integration Considerations

**Priority Levels Needed:**
1. **Emergency/Critical**: Hardware safety events (thermal runaway, max temp)
2. **User Commands**: Direct user actions (start, stop, pause)
3. **State Machine Transitions**: Program execution state changes
4. **Requests**: Data queries (history, preferences)

**Coordination Mechanisms:**
- Queue with priority levels
- State machine can interrupt lower-priority handlers
- Handlers can check state machine before executing
- Handlers can trigger state machine transitions
- State machine can defer handler execution

---

## Recommendation Matrix

| Criteria | Option A | Option B | Option C | Option D | Option E |
|----------|----------|----------|----------|----------|----------|
| **Simplicity** | Medium | Medium | Low | High | Low |
| **Testability** | High | High | Medium | Medium | High |
| **Extensibility** | High | High | High | Low | High |
| **Performance** | Medium | Medium | Medium | High | Medium |
| **Maintainability** | High | High | Medium | Medium | Medium |
| **State Machine Integration** | Medium | **High** | Low | Low | Medium |
| **Priority Handling** | Medium | **High** | Low | Low | Medium |
| **Matches Simulator** | No | No | No | Yes | No |

---

## Recommended Approach: **Option B (Command Pattern with Priority Queue)**

### Rationale for State Machine Integration
1. **Priority Queue**: Commands can be queued with priority levels, allowing state machine to process critical events first
2. **Conditional Execution**: Commands can check state machine state before executing (can be deferred if state machine is busy)
3. **State Transitions**: Commands can trigger state machine transitions as part of execution
4. **Cancellation**: Commands can be cancelled if state machine transitions to incompatible state
5. **Event Integration**: Commands can be treated as events in the state machine's event queue
6. **Testability**: Commands are independently testable with mocked state machine
7. **Coordination**: Clear interface between handlers and state machine

### Enhanced Architecture for State Machine Integration

```
PriorityCommandQueue
  ├── enqueue(ICommand*, Priority)
  ├── dequeue() -> ICommand*
  └── cancel(Predicate)

ICommand (interface)
  ├── execute(StateMachine&, Callback) -> void
  ├── canExecute(StateMachineState) -> bool
  ├── getPriority() -> Priority
  └── cancel() -> void

StateMachine
  ├── processEvent(ICommand*)
  ├── getCurrentState() -> State
  ├── transition(State, ICommand*)
  └── canAcceptCommand(ICommand*) -> bool

MessageDispatcher
  ├── dispatch(ClientEnvelope) -> void
  ├── setStateMachine(StateMachine*)
  └── setCommandQueue(PriorityCommandQueue*)
```

### Priority Levels
```cpp
enum class CommandPriority {
    Emergency = 0,    // Hardware safety, thermal runaway
    Critical = 1,    // User stop, emergency stop
    High = 2,        // User commands (start, pause, resume)
    Normal = 3,     // Set temp, load program
    Low = 4          // Data requests (history, preferences)
};
```

### Command Execution Flow
1. Message arrives → Create Command object
2. Check if state machine can accept command (based on current state)
3. If yes: Enqueue with priority, or execute immediately if high priority
4. If no: Defer or reject with error
5. State machine processes command queue (respecting priorities)
6. Command executes, may trigger state transition
7. Response sent back via callback

### Alternative: **Option A with Priority Queue Wrapper**

If you prefer Option A's simplicity but need state machine integration:
- Add PriorityQueue wrapper around handlers
- Handlers check state machine before execution
- Router enqueues handlers instead of executing directly
- State machine processes handler queue

### Rationale for Option A (if simpler approach preferred)
1. **Testability**: Each handler can be unit tested independently
2. **Extensibility**: New message types = new handler class, no modification to router
3. **Separation of Concerns**: Router handles routing, handlers handle business logic
4. **Dependency Injection**: Handlers receive dependencies, easy to mock
5. **C++23 Friendly**: Uses modern C++ features (interfaces, smart pointers, etc.)

### Implementation Structure (Option B - Recommended)

```
components/flatbuffers_handler/
├── include/
│   └── flatbuffers_handler/
│       ├── MessageDispatcher.h
│       ├── ICommand.h
│       ├── PriorityCommandQueue.h
│       ├── CommandPriority.h
│       ├── commands/
│       │   ├── StartCommand.h
│       │   ├── PauseCommand.h
│       │   ├── HistoryRequestCommand.h
│       │   └── ...
│       └── IStateMachine.h (interface for state machine)
├── src/
│   ├── MessageDispatcher.cpp
│   ├── PriorityCommandQueue.cpp
│   ├── commands/
│   │   ├── StartCommand.cpp
│   │   ├── PauseCommand.cpp
│   │   └── ...
│   └── flatbuffers_handler.cpp
└── CMakeLists.txt
```

### State Machine Interface

```cpp
class IStateMachine {
public:
    virtual ~IStateMachine() = default;
    virtual bool CanAcceptCommand(CommandType aType, StateMachineState aCurrentState) = 0;
    virtual void ProcessCommand(std::shared_ptr<ICommand> aCommand) = 0;
    virtual StateMachineState GetCurrentState() const = 0;
    virtual void TransitionTo(StateMachineState aNewState, std::shared_ptr<ICommand> aTrigger) = 0;
};
```

### Command Interface

```cpp
class ICommand {
public:
    virtual ~ICommand() = default;
    virtual CommandPriority GetPriority() const = 0;
    virtual bool CanExecute(StateMachineState aState) const = 0;
    virtual void Execute(IStateMachine& aStateMachine, std::function<void(ServerMessage)> aCallback) = 0;
    virtual void Cancel() = 0;
    virtual CommandType GetType() const = 0;
};
```

### Alternative: **Option A with Priority Queue Wrapper**

If you prefer Option A's handler-based approach but need state machine integration:

```
components/flatbuffers_handler/
├── include/
│   └── flatbuffers_handler/
│       ├── MessageRouter.h
│       ├── PriorityHandlerQueue.h
│       ├── IMessageHandler.h
│       ├── IStateMachine.h
│       └── handlers/
│           ├── CommandHandlerBase.h
│           ├── RequestHandlerBase.h
│           └── ...
└── src/
    ├── MessageRouter.cpp
    ├── PriorityHandlerQueue.cpp
    └── handlers/
        └── ...
```

### Alternative: **Option D (Single Handler)** if simplicity is priority

If you prefer a simpler approach that matches the simulator pattern, Option D is viable with proper dependency injection for testability, but state machine integration will be more ad-hoc.

