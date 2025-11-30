#pragma once

#include <string>
#ifdef new
#undef new
#endif
#include <functional>
#ifdef CPPUTEST_MEM_LEAK_DETECTION_DISABLED
#define new new(__FILE__, __LINE__)
#endif

namespace command_system
{

struct CommandResult
{
    bool success;
    std::string errorMessage;
};

using CommandCallback = std::function<void(CommandResult)>;

}

