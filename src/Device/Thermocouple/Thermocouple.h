#pragma once
#include <string>
#include <Arduino.h>

#include <esp-max318-thermocouple/max318.hxx>
#include <esp-max318-thermocouple/spimanager.hxx>

#define FILTER_60HZ true
#define FILTER_50HZ false

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
    DummyThermocouple() : MAX318_Base({}) {}
    bool read(Result &anOutResult) override
    {
        // Dummy implementation, always returns no error and 0 temperature
        anOutResult = {};
        return true;
    }

    bool configure(const MAX318Config *aConfig, const spi_device_handle_t &aHandle) override
    {
        // Dummy implementation, does nothing
        mySpiDeviceHandle = aHandle;
        return true;
    }
};

class Thermocouple
{
public:
    Thermocouple(ThermocoupleType aType, std::string name, gpio_num_t csPin, uint16_t maxTemp, uint8_t minTemp, uint8_t errorLimit = 5, uint8_t avgSamples = 16); // avgSamples must be one of {1, 2, 4, 8, 16
    std::string getName() const { return name; }

    bool updateTemperature(double &anOutTemp, double &anOutIntTemp, std::string &anOutError)
    {

        anOutTemp = 0.0;
        anOutIntTemp = 0.0;

        Result result = {};
        bool success = device->read(result);
        if (!success || !result.spi_success)
        {
            anOutError = "SPI communication error";
            if (isAtErrorLimit())
            {
                anOutError = "Error limit reached";
            }
            else
            {
                _errors++;
            }
            return false;
        }

        if (result.coldjunction_c > maxTemp || result.coldjunction_c < 0) // simple cold junction function check
        {
            anOutError = "Cold junction temperature out of range";

            if (isAtErrorLimit())
            {
                anOutError = "Error limit reached";
            }
            else
            {
                _errors++;
            }

            return false;
        }

        anOutTemp = result.thermocouple_c;
        anOutIntTemp = result.coldjunction_c;

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
    std::shared_ptr<MAX318_Base> device; // MAX31855 or 31856 device
    ThermocoupleType type;
    std::string name;
    uint16_t _errorLimit; // Number of errors before we stop icrementing errors
    uint16_t _errors = 0;
    uint16_t maxTemp;
    MAX318Config *config;
    spi_device_interface_config_t spiDeviceConfig;

    static SPIManager *spiManager; // SPI manager for shared SPI bus for max31855/max31856

    static spi_bus_config_t spiConfig;

    static SPIManager *getSPIManager();

    AveragingSamples uintToAveragingSamples(uint8_t avgSamples);
};