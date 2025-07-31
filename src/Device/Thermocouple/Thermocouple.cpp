#include "Thermocouple.h"
#include "config.h"

#include "esp-max318-thermocouple/spimanager.hxx"

using namespace ESP_MAX318_THERMOCOUPLE;

template <typename T>
Thermocouple<T>::Thermocouple(std::string name, gpio_num_t csPin, uint16_t errorLimit, uint8_t avgSamples)
    : name(name), _avgSamples(avgSamples), _errorLimit(errorLimit)
{
    auto manager = getSPIManager();

    device = manager->CreateDevice<T>(csPin);
}

template <typename T>
SPIManager *Thermocouple<T>::getSPIManager()
{
    if (!spiManager)
    {
        spiConfig = SPIManager::defaultSpiBusConfig;

        spiConfig.mosi_io_num = HSPI_MOSI;
        spiConfig.miso_io_num = HSPI_MISO;
        spiConfig.sclk_io_num = HSPI_CLK;

        spiManager = new SPIManager(HSPI_HOST, true, spiConfig);
    }
    return spiManager;
}