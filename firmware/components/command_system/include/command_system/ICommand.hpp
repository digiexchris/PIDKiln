#pragma once

#include "CommandPriority.hpp"
#include "CommandType.hpp"
#include "ProgramState.hpp"
#include "CommandResult.hpp"
#include <memory>
#include <functional>

namespace command_system
{

class IStateMachine;

class ICommand
{
public:
    virtual ~ICommand() = default;

    virtual CommandPriority GetPriority() const = 0;
    virtual bool CanExecute(ProgramState aState) const = 0;
    virtual void Execute(IStateMachine& aStateMachine, CommandCallback aCallback = nullptr) = 0;
    virtual void Cancel() = 0;
    virtual CommandType GetType() const = 0;
};

}

