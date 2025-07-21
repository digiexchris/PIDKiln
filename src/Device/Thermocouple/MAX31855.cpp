#include "MAX31855.h"

MAX31855::MAX31855(int8_t csPin, std::string name) : Thermocouple(name), _thermocouple(csPin)
{
    type = ThermocoupleType::MAX31855;
    _thermocouple.begin();
}

bool MAX31855::hasError()
{
    return (_thermocouple.readError() == NAN);
}

std::string MAX31855::getErrorStr()
{
    Serial.println("Thermocouple fault(s) detected!");
    uint8_t e = _thermocouple.readError();

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

    return "NONE";
}

double MAX31855::readCelsius()
{
    return _thermocouple.readCelsius();
}

double MAX31855::readFahrenheit()
{
    return _thermocouple.readFahrenheit();
}

double MAX31855::readInternal()
{
    return _thermocouple.readInternal();
}