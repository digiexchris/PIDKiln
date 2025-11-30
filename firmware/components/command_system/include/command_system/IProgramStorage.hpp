#pragma once

#include "Program.hpp"
#include <string>
#include <vector>
#include <optional>

namespace command_system
{

class IProgramStorage
{
public:
    virtual ~IProgramStorage() = default;

    virtual std::optional<Program> LoadProgram(const std::string& aName) = 0;
    virtual std::vector<std::string> ListPrograms() = 0;
    virtual std::optional<Program> GetProgram(const std::string& aName) = 0;
    virtual bool SaveProgram(const std::string& aName, const Program& aProgram) = 0;
    virtual bool DeleteProgram(const std::string& aName) = 0;
};

}
