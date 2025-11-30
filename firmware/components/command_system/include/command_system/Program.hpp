#pragma once

#include <string>
#include <vector>

namespace command_system
{

struct Time
{
    int hours = 0;
    int minutes = 0;
    int seconds = 0;

    double ToMinutes() const
    {
        return hours * 60.0 + minutes + seconds / 60.0;
    }
};

struct Segment
{
    float target;
    Time rampTime;
    Time dwellTime;
};

struct Program
{
    std::string name;
    std::string description;
    std::vector<Segment> segments;
};

}

