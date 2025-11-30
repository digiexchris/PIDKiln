#pragma once

#include "ICommand.hpp"

namespace command_system
{

class EmergencyCommand : public ICommand
{
protected:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Emergency;
    }
};

class CriticalCommand : public ICommand
{
protected:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Critical;
    }
};

class HighPriorityCommand : public ICommand
{
protected:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::High;
    }
};

class NormalPriorityCommand : public ICommand
{
protected:
    CommandPriority GetPriority() const override
    {
        return CommandPriority::Normal;
    }
};

}

