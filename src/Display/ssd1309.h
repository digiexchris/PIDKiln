#pragma once

#include <Arduino.h>
#include <U8g2lib.h>
#include "display.h"

class SSD1309Display : public Display
{
public:
    SSD1309Display(uint8_t i2c_address, uint8_t scl, uint8_t sda)
    {
        // Wire.setPins(4,5);
        u8g2 = new U8G2_SSD1309_128X64_NONAME0_F_HW_I2C(U8G2_R0, /* reset=*/U8X8_PIN_NONE, /* clock=*/scl, /* data=*/sda);
        lcd_type = LCDType::SSD1309;
        u8g2->begin();
    }
};