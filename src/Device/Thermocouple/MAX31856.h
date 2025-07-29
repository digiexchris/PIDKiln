#pragma once

#include <stdint.h>
#include <string>
#include <unordered_map>
#include <utility>
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

    enum class FilterHz
    {
        FILTER_50HZ,
        FILTER_60HZ
    };

    const std::unordered_map<ProbeType, std::pair<int16_t, int16_t>> ProbeTypeRanges = {
        {ProbeType::TYPE_B, {0, 1800}},
        {ProbeType::TYPE_E, {-200, 1000}},
        {ProbeType::TYPE_J, {-210, 1200}},
        {ProbeType::TYPE_K, {-270, 1372}},
        {ProbeType::TYPE_N, {-200, 1300}},
        {ProbeType::TYPE_R, {0, 1768}},
        {ProbeType::TYPE_S, {0, 1768}},
        {ProbeType::TYPE_T, {-270, 400}},
        {ProbeType::TYPE_VOLTAGE_GAIN_X8, {-1280, 1280}},
        {ProbeType::TYPE_VOLTAGE_GAIN_X32, {-32000, 32000}}};

    MAX31856(int8_t csPin, std::string name, ProbeType type, FilterHz filter, uint16_t errorLimit, int8_t miso = -1, int8_t mosi = -1, int8_t sck = -1);

    virtual bool hasError() override;
    virtual std::string getErrorStr() override;
    virtual double readCelsius() override;
    virtual double readFahrenheit() override;
    virtual double readInternal() override;

private:
    Adafruit_MAX31856 *_thermocouple;
    ProbeType _probeType = ProbeType::TYPE_K;
    uint8_t _fault;
    uint8_t _avgSamples = 10;
};