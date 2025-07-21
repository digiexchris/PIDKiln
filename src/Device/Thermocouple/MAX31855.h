#pragma once

#include <stdint.h>
#include <string>
#include <Adafruit_MAX31855.h>
#include "Thermocouple.h"

/*
Pins:
- CS: GPIO 27 or 15 depending on case or chamber thermocouple
- SCK: GPIO 14
- MISO: GPIO 12
- MOSI: GPIO 13 (not used)
*/

class MAX31855 : public Thermocouple
{
public:
    MAX31855(int8_t csPin, std::string name);

    virtual bool hasError() override;
    virtual std::string getErrorStr() override;
    virtual double readCelsius() override;
    virtual double readFahrenheit() override;
    virtual double readInternal() override;

private:
    Adafruit_MAX31855 _thermocouple; // Defaults to using SPIClass::HSPI (ie. spi2) via the arduinoesp32 library
};