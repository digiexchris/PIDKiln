#pragma once

namespace command_system
{

enum class CommandPriority : uint8_t
{
    Emergency = 0,
    Critical = 1,
    High = 2,
    Normal = 3,
    Low = 4
};

}

