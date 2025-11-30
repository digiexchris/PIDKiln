#pragma once

#include "TemperatureReading.hpp"
#include <cstdint>

namespace command_system
{

class ITemperatureController
{
public:
    virtual ~ITemperatureController() = default;

    virtual void SetTargetTemperature(float aTemperature) = 0;
    virtual TemperatureReading GetCurrentTemperature() const = 0;
    virtual uint8_t GetPIDOutput() const = 0;  // Returns percentage of power (0-100) currently being output by the PID cycle
};

}
