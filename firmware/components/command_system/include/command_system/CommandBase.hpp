#pragma once

#include "ICommand.hpp"

namespace command_system
{

class EmergencyCommand : public ICommand
{
    public:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Emergency;
    }
};

class CriticalCommand : public ICommand
{
public:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Critical;
    }
};

class HighPriorityCommand : public ICommand
{
    public:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::High;
    }
};

class NormalPriorityCommand : public ICommand
{
    public:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Normal;
    }
};

}

