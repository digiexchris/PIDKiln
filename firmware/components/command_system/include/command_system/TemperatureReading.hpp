#pragma once

namespace command_system
{

struct TemperatureReading
{
    float chamber;      // Chamber temperature in °C
    float caseTemp;     // Case temperature in °C
    float environment;  // Environment temperature in °C
};

}

