#pragma once

#include <SPI.h>
#include <array>

class SPIDev
{
public:
    static SPIClass *getClass(uint8_t spi_bus = VSPI, int8_t sck = -1, int8_t miso = -1, int8_t mosi = -1)
    {
        if (instance == nullptr)
        {
            instance = new SPIDev();
        }
        if (instance->spiClass[spi_bus] == nullptr)
        {
            instance->spiClass[spi_bus] = new SPIClass(spi_bus);
            instance->spiClass[spi_bus]->begin(sck, miso, mosi);
        }
        return instance->spiClass[spi_bus];
    }

    static SPIDev *instance;

    SPIDev()
    {
        instance = this;
    }

private:
    std::array<SPIClass *, 4> spiClass = {};
};