#pragma once

#include <Arduino.h>
#include <U8g2lib.h>
#include "display.h"

class SSD1306Display : public Display
{
public:
    SSD1306Display(uint8_t i2c_address, uint8_t scl, uint8_t sda)
    {
        // Wire.setPins(4,5);
        u8g2 = new U8G2_SSD1306_128X64_NONAME_1_HW_I2C(U8G2_R2, /* reset=*/U8X8_PIN_NONE, /* clock=*/scl, /* data=*/sda);
        lcd_type = LCDType::SSD1306;
        u8g2->begin();
    }
};