#pragma once
#include <string>
#include <Arduino.h>

enum class ThermocoupleType
{
    MAX31855,
    MAX31856,
    NONE
};

class Thermocouple
{
public:
    Thermocouple(std::string name, uint16_t errorLimit = 5, uint8_t avgSamples = 10) : name(name), _avgSamples(avgSamples) {}
    virtual bool hasError() = 0;
    virtual std::string getErrorStr() = 0;
    virtual double readCelsius() = 0;
    virtual double readFahrenheit() = 0;
    virtual double readInternal() = 0;
    ThermocoupleType getType() const { return type; }
    std::string getName() const { return name; }

    bool updateTemperature(double &anOutTemp, double &anOutIntTemp, std::string &anOutError)
    {
        if (hasError())
        {
            anOutTemp = 0.0;
            anOutIntTemp = 0.0;
            anOutError = getErrorStr();
            if (!isAtErrorLimit())
            {
                _errors++;
            }
            return false;
        }

        anOutTemp = 0.0;
        anOutIntTemp = 0.0;

        for (uint8_t i = 0; i < _avgSamples; ++i)
        {
            anOutTemp += readCelsius();
            anOutIntTemp += readInternal();
        }
        anOutTemp /= _avgSamples;
        anOutIntTemp /= _avgSamples;

        if (_errors > 0)
        {
            _errors--; // decrement errors after successful read
        }

        return true;
    }

    bool isAtErrorLimit()
    {
        if (_errors >= _errorLimit)
        {
            return true;
        }
        return false;
    }

protected:
    ThermocoupleType type = ThermocoupleType::NONE;
    std::string name;
    uint8_t _avgSamples;
    uint16_t _errorLimit; // Number of errors before we stop icrementing errors
    uint16_t _errors = 0;
};