#pragma once

#include <stdint.h>
#include <string>
#include <Adafruit_MAX31856.h>
#include "Thermocouple.h"

/*
Pins:
- CS: GPIO 27 or 15 depending on case or chamber thermocouple
- SCK: GPIO 14
- MISO: GPIO 12
- MOSI: GPIO 13
*/

class MAX31856 : public Thermocouple
{
public:
    enum class ProbeType
    {
        TYPE_B,
        TYPE_E,
        TYPE_J,
        TYPE_K,
        TYPE_N,
        TYPE_R,
        TYPE_S,
        TYPE_T,
        TYPE_VOLTAGE_GAIN_X8,
        TYPE_VOLTAGE_GAIN_X32
    };

    MAX31856(int8_t csPin, std::string name, ProbeType type);

    virtual bool hasError() override;
    virtual std::string getErrorStr() override;
    virtual double readCelsius() override;
    virtual double readFahrenheit() override;
    virtual double readInternal() override;

private:
    Adafruit_MAX31856 *_thermocouple;
    ProbeType _probeType = ProbeType::TYPE_K;
    uint8_t _fault;
};