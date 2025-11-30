#pragma once

#include <Arduino.h>
#include <U8g2lib.h>
#include "Display/display.h"

// You can switch hardware or software SPI interface to LCD. HW can be up to x10 faster - but requires special pins (and has some errors for me on 5V).

class ST7920_HW_Display : public Display
{
public:
    ST7920_HW_Display(uint8_t cs, uint8_t reset)
    {
        u8g2 = new U8G2_ST7920_128X64_F_HW_SPI(U8G2_R2, /* CS=*/cs, /* reset=*/reset);
        lcd_type = LCDType::ST7920_HW;
        u8g2->begin();
        u8g2->setBusClock(1000000); // Set bus clock to 1MHz
    }
};

class ST7920_SW_Display : public Display
{
public:
    ST7920_SW_Display(uint8_t clock, uint8_t data, uint8_t cs, uint8_t reset)
    {
        u8g2 = new U8G2_ST7920_128X64_F_SW_SPI(U8G2_R2, /* clock=*/clock, /* data=*/data, /* CS=*/cs, /* reset=*/reset);
        lcd_type = LCDType::ST7920_SW;
        u8g2->begin();
        u8g2->setBusClock(1000000); // Set bus clock to 1MHz
    }
};