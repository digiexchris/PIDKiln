#pragma once
#include <string>
#include <Arduino.h>

#include <esp-max318-thermocouple/max318.hxx>
#include <esp-max318-thermocouple/spimanager.hxx>

using namespace ESP_MAX318_THERMOCOUPLE;

enum class ThermocoupleType
{
    MAX31855,
    MAX31856,
    NONE
};

class DummyThermocouple : public MAX318_Base
{
public:
    DummyThermocouple() : MAX318_Base("Dummy Thermocouple", 0, {}) {}
};

template <typename T>
class Thermocouple
{
public:
    Thermocouple(std::string name, gpio_num_t csPin, uint16_t errorLimit = 5, uint8_t avgSamples = 10);
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
    std::shared_ptr<T> device; // MAX31855 or 31856 device
    std::string name;
    uint8_t _avgSamples;
    uint16_t _errorLimit; // Number of errors before we stop icrementing errors
    uint16_t _errors = 0;

    static SPIManager *spiManager; // SPI manager for shared SPI bus for max31855/max31856

    static spi_bus_config_t spiConfig;

    static SPIManager *getSPIManager();
};