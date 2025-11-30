#include "Thermocouple.h"
#include "config.h"

#include <esp-max318-thermocouple/spimanager.hxx>
#include <esp-max318-thermocouple/max31855.hxx>
#include <esp-max318-thermocouple/max31856.hxx>

using namespace ESP_MAX318_THERMOCOUPLE;

SPIManager* Thermocouple::spiManager = nullptr;
spi_bus_config_t Thermocouple::spiConfig = {};

Thermocouple::Thermocouple(ThermocoupleType aType, std::string name, gpio_num_t csPin, uint16_t maxTemp, uint8_t minTemp, uint8_t errorLimit, uint8_t avgSamples)
    : type(aType), name(name), _errorLimit(errorLimit), maxTemp(maxTemp), config(nullptr)
{
    auto manager = getSPIManager();

    switch (type)
    {
    case ThermocoupleType::MAX31855:
    {
        config = new MAX31855::MAX31855Config();
        auto c = static_cast<MAX31855::MAX31855Config *>(config);
        c->temp_fault_high = maxTemp;
        c->temp_fault_low = minTemp;
        c->averaging_samples = uintToAveragingSamples(avgSamples);
        spiDeviceConfig = MAX31855::MAX31855::defaultSpiDeviceConfig;
        spiDeviceConfig.spics_io_num = csPin;
        device = manager->CreateDevice<MAX31855>(*config, spiDeviceConfig);
    }

    break;
    case ThermocoupleType::MAX31856:
    {
        config = new MAX31856::MAX31856Config();
        auto c = static_cast<MAX31856::MAX31856Config *>(config);
        c->temp_fault_high = maxTemp;
        c->temp_fault_low = minTemp;
        c->averaging_samples = uintToAveragingSamples(avgSamples);
        spiDeviceConfig = MAX31856::MAX31856::defaultSpiDeviceConfig;
        spiDeviceConfig.spics_io_num = csPin;
        device = manager->CreateDevice<MAX31856>(*config, spiDeviceConfig);
    }

    break;
    case ThermocoupleType::NONE:
        device = std::make_shared<DummyThermocouple>();
        break;
    }
}

SPIManager *Thermocouple::getSPIManager()
{
    if (!spiManager)
    {
        spiConfig = SPIManager::defaultBusConfig;

        spiConfig.mosi_io_num = SPI2_MOSI;
        spiConfig.miso_io_num = SPI2_MISO;
        spiConfig.sclk_io_num = SPI2_CLK;

        spiManager = new SPIManager(SPI2_HOST, spiConfig);
    }
    return spiManager;
}

AveragingSamples Thermocouple::uintToAveragingSamples(uint8_t avgSamples)
{
    switch (avgSamples)
    {
    case 1:
        return AveragingSamples::AVG_1;
    case 2:
    case 3:
        return AveragingSamples::AVG_2;
    case 4:
    case 5:
    case 6:
    case 7:
        return AveragingSamples::AVG_4;
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
        return AveragingSamples::AVG_8;
    case 16:
        return AveragingSamples::AVG_16;
    default:
        return AveragingSamples::AVG_16;
    }
}