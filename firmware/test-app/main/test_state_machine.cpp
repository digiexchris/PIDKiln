#include "CppUTest/TestHarness.h"
#include "command_system/StateMachine.hpp"
#include "command_system/IProgramExecutor.hpp"
#include "command_system/ITemperatureController.hpp"
#include "command_system/IProgramStorage.hpp"
#include "command_system/IStateObserver.hpp"
#include "command_system/ProgramState.hpp"
#include "command_system/ICommand.hpp"
#include "command_system/CommandPriority.hpp"
#include "command_system/CommandType.hpp"
#include "command_system/TemperatureReading.hpp"
#include "command_system/Program.hpp"
#include <memory>

using namespace command_system;

class MockProgramExecutor : public IProgramExecutor
{
public:
    void Start() override {}
    void Pause() override {}
    void Resume() override {}
    void Stop() override {}
    void LoadProgram(const std::string&) override {}
    void UnloadProgram() override {}
};

class MockTemperatureController : public ITemperatureController
{
public:
    void SetTargetTemperature(float) override {}
    TemperatureReading GetCurrentTemperature() const override { return TemperatureReading{0, 0, 0}; }
    uint8_t GetPIDOutput() const override { return 0; }
};

class MockProgramStorage : public IProgramStorage
{
public:
    std::optional<Program> LoadProgram(const std::string&) override { return std::nullopt; }
    std::vector<std::string> ListPrograms() override { return {}; }
    std::optional<Program> GetProgram(const std::string&) override { return std::nullopt; }
    bool SaveProgram(const std::string&, const Program&) override { return false; }
    bool DeleteProgram(const std::string&) override { return false; }
};

class MockCommand : public ICommand
{
public:
    CommandPriority GetPriority() const override { return CommandPriority::Normal; }
    bool CanExecute(ProgramState) const override { return true; }
    void Execute(IStateMachine&, CommandCallback) override {}
    void Cancel() override {}
    CommandType GetType() const override { return CommandType::Start; }
};

class MockStateObserver : public IStateObserver
{
public:
    void OnStateChanged(const StateChangeEvent& aEvent) override
    {
        lastEvent = aEvent;
        callCount++;
    }
    
    StateChangeEvent lastEvent;
    int callCount = 0;
};

TEST_GROUP(StateMachineTest)
{
    MockProgramExecutor* mockExecutor;
    MockTemperatureController* mockTempController;
    MockProgramStorage* mockStorage;
    StateMachine* stateMachine;

    void setup()
    {
        mockExecutor = new MockProgramExecutor();
        mockTempController = new MockTemperatureController();
        mockStorage = new MockProgramStorage();
        stateMachine = new StateMachine(*mockExecutor, *mockTempController, *mockStorage);
    }

    void teardown()
    {
        delete stateMachine;
        delete mockStorage;
        delete mockTempController;
        delete mockExecutor;
    }
};

TEST(StateMachineTest, InitialStateIsNone)
{
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::None), static_cast<uint8_t>(stateMachine->GetCurrentState()));
}

TEST(StateMachineTest, TransitionToNewState)
{
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Ready, command);
    
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Ready), static_cast<uint8_t>(stateMachine->GetCurrentState()));
}

TEST(StateMachineTest, TransitionToSameStateDoesNothing)
{
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Ready, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Ready), static_cast<uint8_t>(stateMachine->GetCurrentState()));
    
    stateMachine->TransitionTo(ProgramState::Ready, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Ready), static_cast<uint8_t>(stateMachine->GetCurrentState()));
}

TEST(StateMachineTest, ErrorMessageManagement)
{
    STRCMP_EQUAL("", stateMachine->GetErrorMessage().c_str());
    
    stateMachine->SetErrorMessage("Test error");
    STRCMP_EQUAL("Test error", stateMachine->GetErrorMessage().c_str());
    
    stateMachine->ClearErrorMessage();
    STRCMP_EQUAL("", stateMachine->GetErrorMessage().c_str());
}

TEST(StateMachineTest, DependencyAccess)
{
    CHECK_EQUAL(mockExecutor, &stateMachine->GetProgramExecutor());
    CHECK_EQUAL(mockTempController, &stateMachine->GetTemperatureController());
    CHECK_EQUAL(mockStorage, &stateMachine->GetProgramStorage());
}

TEST(StateMachineTest, ObserverNotification)
{
    auto observer = std::make_shared<MockStateObserver>();
    stateMachine->AddObserver(observer);
    
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Ready, command);
    
    CHECK_EQUAL(1, observer->callCount);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::None), static_cast<uint8_t>(observer->lastEvent.oldState));
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Ready), static_cast<uint8_t>(observer->lastEvent.newState));
    CHECK_EQUAL(command.get(), observer->lastEvent.triggerCommand.get());
}

TEST(StateMachineTest, MultipleObservers)
{
    auto observer1 = std::make_shared<MockStateObserver>();
    auto observer2 = std::make_shared<MockStateObserver>();
    stateMachine->AddObserver(observer1);
    stateMachine->AddObserver(observer2);
    
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Running, command);
    
    CHECK_EQUAL(1, observer1->callCount);
    CHECK_EQUAL(1, observer2->callCount);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Running), static_cast<uint8_t>(observer1->lastEvent.newState));
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Running), static_cast<uint8_t>(observer2->lastEvent.newState));
}

TEST(StateMachineTest, ObserverRemoval)
{
    auto observer = std::make_shared<MockStateObserver>();
    stateMachine->AddObserver(observer);
    
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Ready, command);
    CHECK_EQUAL(1, observer->callCount);
    
    stateMachine->RemoveObserver(observer);
    stateMachine->TransitionTo(ProgramState::Running, command);
    CHECK_EQUAL(1, observer->callCount);
}

TEST(StateMachineTest, WeakObserverExpired)
{
    auto observer = std::make_shared<MockStateObserver>();
    stateMachine->AddObserver(observer);
    
    auto command = std::make_shared<MockCommand>();
    stateMachine->TransitionTo(ProgramState::Ready, command);
    CHECK_EQUAL(1, observer->callCount);
    
    observer.reset();
    stateMachine->TransitionTo(ProgramState::Running, command);
}

TEST(StateMachineTest, MultipleStateTransitions)
{
    auto command = std::make_shared<MockCommand>();
    
    stateMachine->TransitionTo(ProgramState::Ready, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Ready), static_cast<uint8_t>(stateMachine->GetCurrentState()));
    
    stateMachine->TransitionTo(ProgramState::Running, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Running), static_cast<uint8_t>(stateMachine->GetCurrentState()));
    
    stateMachine->TransitionTo(ProgramState::Paused, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Paused), static_cast<uint8_t>(stateMachine->GetCurrentState()));
    
    stateMachine->TransitionTo(ProgramState::Stopped, command);
    CHECK_EQUAL(static_cast<uint8_t>(ProgramState::Stopped), static_cast<uint8_t>(stateMachine->GetCurrentState()));
}

