#pragma once

#include "ProgramState.hpp"
#include "ICommand.hpp"
#include "IProgramExecutor.hpp"
#include "ITemperatureController.hpp"
#include "IProgramStorage.hpp"
#include "IStateObserver.hpp"
#include <string>
#include <memory>

namespace command_system
{

class IStateMachine
{
public:
    virtual ~IStateMachine() = default;

    virtual ProgramState GetCurrentState() const = 0;
    virtual void TransitionTo(ProgramState aNewState, std::shared_ptr<ICommand> aTrigger) = 0;

    virtual void SetErrorMessage(const std::string& aMessage) = 0;
    virtual std::string GetErrorMessage() const = 0;
    virtual void ClearErrorMessage() = 0;

    virtual IProgramExecutor& GetProgramExecutor() = 0;
    virtual ITemperatureController& GetTemperatureController() = 0;
    virtual IProgramStorage& GetProgramStorage() = 0;

    virtual void AddObserver(std::weak_ptr<IStateObserver> aObserver) = 0;
    virtual void RemoveObserver(std::weak_ptr<IStateObserver> aObserver) = 0;
};

}

