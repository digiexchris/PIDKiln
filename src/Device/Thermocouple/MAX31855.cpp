#include "MAX31855.h"
#include "Device/SPI.h"

MAX31855::MAX31855(int8_t csPin, std::string name, uint16_t errorLimit, int8_t miso, int8_t sck) : Thermocouple(name, errorLimit)
{
    type = ThermocoupleType::MAX31855;
    _thermocouple = new Adafruit_MAX31855(csPin, SPIDev::getClass(HSPI, sck, miso, -1));
    _thermocouple->begin();
}

bool MAX31855::hasError()
{
    double temp = _thermocouple->readCelsius();
    uint8_t error = _thermocouple->readError();
    Serial.printf("[DEBUG] hasError - temp: %.6f, error flags: 0x%02X\n", temp, error);
    return isnan(temp) || (error != 0);
    // return (_thermocouple->readCelsius() == NAN);
}

std::string MAX31855::getErrorStr()
{
    Serial.println("Thermocouple fault(s) detected!");
    uint8_t e = _thermocouple->readError();

    if (e & MAX31855_FAULT_OPEN)
    {
        return "FAULT: Thermocouple is open - no connections.";
    }

    if (e & MAX31855_FAULT_SHORT_GND)
    {
        return "FAULT: Thermocouple is short-circuited to GND.";
    }
    if (e & MAX31855_FAULT_SHORT_VCC)
    {
        return "FAULT: Thermocouple is short-circuited to VCC.";
    }

    return "Unknown error: " + std::to_string(e);
}

double MAX31855::readCelsius()
{
    return _thermocouple->readCelsius();
}

double MAX31855::readFahrenheit()
{
    return _thermocouple->readFahrenheit();
}

double MAX31855::readInternal()
{
    return _thermocouple->readInternal();
}