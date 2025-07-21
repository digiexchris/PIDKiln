#pragma once
#include <string>
// #include "PIDKiln.h"

enum class ThermocoupleType
{
    MAX31855,
    MAX31856,
    NONE
};

class Thermocouple
{
public:
    Thermocouple(std::string name) : name(name) {}
    virtual bool hasError() = 0;
    virtual std::string getErrorStr() = 0;
    virtual double readCelsius() = 0;
    virtual double readFahrenheit() = 0;
    virtual double readInternal() = 0;
    ThermocoupleType getType() const { return type; }
    std::string getName() const { return name; }

protected:
    ThermocoupleType type = ThermocoupleType::NONE;
    std::string name;
};