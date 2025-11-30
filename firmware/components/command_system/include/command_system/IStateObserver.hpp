#pragma once

#include "ProgramState.hpp"
#include "ICommand.hpp"
#include <string>
#include <memory>

namespace command_system
{

struct StateChangeEvent
{
    ProgramState oldState;
    ProgramState newState;
    std::shared_ptr<ICommand> triggerCommand;
    std::string reason;
};

class IStateObserver
{
public:
    virtual ~IStateObserver() = default;

    virtual void OnStateChanged(const StateChangeEvent& aEvent) = 0;
};

}

