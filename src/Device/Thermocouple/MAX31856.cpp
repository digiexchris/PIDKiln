#include "MAX31856.h"

MAX31856::MAX31856(int8_t csPin, std::string name, ProbeType probeType) : Thermocouple(name), _probeType(probeType)
{
    // The parent class's type
    type = ThermocoupleType::MAX31856;
    _thermocouple = new Adafruit_MAX31856(csPin);
    _thermocouple->begin();
    _thermocouple->setThermocoupleType(MAX31856_TCTYPE_K);
}

bool MAX31856::hasError()
{
    _fault = _thermocouple->readFault();
    if (_fault)
    {
        return true;
    }
    return false;
}

std::string MAX31856::getErrorStr()
{
    if (_fault)
    {
        if (_fault & MAX31856_FAULT_CJRANGE)
        {
            return "Cold Junction Range Fault: " + std::to_string(_thermocouple->readCJTemperature());
        }
        if (_fault & MAX31856_FAULT_TCRANGE)
        {
            return "Thermocouple Range Fault: " + std::to_string(_thermocouple->readThermocoupleTemperature());
        }
        if (_fault & MAX31856_FAULT_CJHIGH)
        {
            return "Cold Junction High Fault: " + std::to_string(_thermocouple->readCJTemperature());
        }
        if (_fault & MAX31856_FAULT_CJLOW)
        {
            return "Cold Junction Low Fault: " + std::to_string(_thermocouple->readCJTemperature());
        }
        if (_fault & MAX31856_FAULT_TCHIGH)
        {
            return "Thermocouple High Fault: " + std::to_string(_thermocouple->readThermocoupleTemperature());
        }
        if (_fault & MAX31856_FAULT_TCLOW)
        {
            return "Thermocouple Low Fault: " + std::to_string(_thermocouple->readThermocoupleTemperature());
        }
        if (_fault & MAX31856_FAULT_OVUV)
        {
            return "Over/Under Voltage Fault: " + std::to_string(_thermocouple->readThermocoupleTemperature());
        }
        if (_fault & MAX31856_FAULT_OPEN)
        {
            return "Thermocouple Open Fault";
        }
    }

    return "NONE";
}

double MAX31856::readCelsius()
{
    return _thermocouple->readThermocoupleTemperature();
}

double MAX31856::readFahrenheit()
{
    return _thermocouple->readThermocoupleTemperature() * 9.0 / 5.0 + 32.0;
}

double MAX31856::readInternal()
{
    return _thermocouple->readCJTemperature();
}