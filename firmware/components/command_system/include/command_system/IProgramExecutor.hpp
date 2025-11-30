#pragma once

#include <string>

namespace command_system
{

class IProgramExecutor
{
public:
    virtual ~IProgramExecutor() = default;

    // Start program execution from the beginning of the currently loaded program
    virtual void Start() = 0;
    virtual void Pause() = 0;
    virtual void Resume() = 0;
    virtual void Stop() = 0;
    virtual void LoadProgram(const std::string& aName) = 0;
    virtual void UnloadProgram() = 0;
};

}
