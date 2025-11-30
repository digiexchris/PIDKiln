#pragma once

#include "ICommand.hpp"
#include <memory>

namespace command_system
{

class ICommandSource
{
public:
    virtual ~ICommandSource() = default;

    virtual void SubmitCommand(std::shared_ptr<ICommand> aCommand) = 0;
};

}

