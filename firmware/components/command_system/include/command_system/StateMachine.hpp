#pragma once

#include "IStateMachine.hpp"
#include "IStateObserver.hpp"
#include "ProgramState.hpp"
#include "ICommand.hpp"
#include <string>
#include <vector>
#include <memory>

namespace command_system
{

class StateMachine : public IStateMachine
{
public:
    StateMachine(IProgramExecutor& aProgramExecutor,
                 ITemperatureController& aTemperatureController,
                 IProgramStorage& aProgramStorage);

    ProgramState GetCurrentState() const override;
    void TransitionTo(ProgramState aNewState, std::shared_ptr<ICommand> aTrigger) override;

    void SetErrorMessage(const std::string& aMessage) override;
    std::string GetErrorMessage() const override;
    void ClearErrorMessage() override;

    IProgramExecutor& GetProgramExecutor() override;
    ITemperatureController& GetTemperatureController() override;
    IProgramStorage& GetProgramStorage() override;

    void AddObserver(std::weak_ptr<IStateObserver> aObserver) override;
    void RemoveObserver(std::weak_ptr<IStateObserver> aObserver) override;

private:
    ProgramState myCurrentState;
    std::string myErrorMessage;
    
    IProgramExecutor& myProgramExecutor;
    ITemperatureController& myTemperatureController;
    IProgramStorage& myProgramStorage;
    
    std::vector<std::weak_ptr<IStateObserver>> myObservers;
    
    void NotifyObservers(const StateChangeEvent& aEvent);
};

}

