#pragma once

namespace command_system
{

enum class ProgramState : uint8_t
{
    None = 0,
    Ready = 1,
    Running = 2,
    Paused = 3,
    Stopped = 4,
    Error = 5,
    Finished = 7
};

}

