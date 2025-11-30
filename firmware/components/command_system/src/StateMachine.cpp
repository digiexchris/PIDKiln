#include "command_system/StateMachine.hpp"
#include "command_system/ICommand.hpp"
#include <algorithm>

namespace command_system
{

StateMachine::StateMachine(IProgramExecutor& aProgramExecutor,
                           ITemperatureController& aTemperatureController,
                           IProgramStorage& aProgramStorage)
    : myCurrentState(ProgramState::None)
    , myProgramExecutor(aProgramExecutor)
    , myTemperatureController(aTemperatureController)
    , myProgramStorage(aProgramStorage)
{
}

ProgramState StateMachine::GetCurrentState() const
{
    return myCurrentState;
}

void StateMachine::TransitionTo(ProgramState aNewState, std::shared_ptr<ICommand> aTrigger)
{
    if (myCurrentState == aNewState)
    {
        return;
    }

    ProgramState oldState = myCurrentState;
    myCurrentState = aNewState;

    StateChangeEvent event;
    event.oldState = oldState;
    event.newState = aNewState;
    event.triggerCommand = aTrigger;
    event.reason = "";

    NotifyObservers(event);
}

void StateMachine::SetErrorMessage(const std::string& aMessage)
{
    myErrorMessage = aMessage;
}

std::string StateMachine::GetErrorMessage() const
{
    return myErrorMessage;
}

void StateMachine::ClearErrorMessage()
{
    myErrorMessage.clear();
}

IProgramExecutor& StateMachine::GetProgramExecutor()
{
    return myProgramExecutor;
}

ITemperatureController& StateMachine::GetTemperatureController()
{
    return myTemperatureController;
}

IProgramStorage& StateMachine::GetProgramStorage()
{
    return myProgramStorage;
}

void StateMachine::AddObserver(std::weak_ptr<IStateObserver> aObserver)
{
    myObservers.push_back(aObserver);
}

void StateMachine::RemoveObserver(std::weak_ptr<IStateObserver> aObserver)
{
    myObservers.erase(
        std::remove_if(myObservers.begin(), myObservers.end(),
            [&aObserver](const std::weak_ptr<IStateObserver>& weakObs) {
                auto obs = weakObs.lock();
                auto targetObs = aObserver.lock();
                return !obs || !targetObs || obs == targetObs;
            }),
        myObservers.end()
    );
}

void StateMachine::NotifyObservers(const StateChangeEvent& aEvent)
{
    myObservers.erase(
        std::remove_if(myObservers.begin(), myObservers.end(),
            [&aEvent](std::weak_ptr<IStateObserver>& weakObs) {
                auto obs = weakObs.lock();
                if (obs)
                {
                    obs->OnStateChanged(aEvent);
                    return false;
                }
                return true;
            }),
        myObservers.end()
    );
}

}

