
/*
** LCD Display components
**
*/
#include <Arduino.h>
#include <U8g2lib.h>
#include <Syslog.h>

#include "config.h"

#include "Display/display.h"
#include "Display/st7920.h"
#include "Display/ssd1306.h"
#include "Display/ssd1309.h"
#include "PIDKiln_logs.h"
#include "PIDKiln.h"

#ifdef U8X8_HAVE_HW_SPI
#include <SPI.h>
#endif
#ifdef U8X8_HAVE_HW_I2C
#include <Wire.h>
#endif

#define FONT4 u8g2_font_p01type_tr
#define FONT5 u8g2_font_micro_tr
#define FONT6 u8g2_font_5x8_tr
#define FONT7 u8g2_font_6x10_tr
#define FONT8 u8g2_font_bitcasual_tr
/*
** Setup LCD screen
**
*/
void Setup_LCD(void)
{

    switch (LCD_Type)
    {
    case LCDType::ST7920_HW:
        display = new ST7920_HW_Display(ST7920_HW_CS, ST7920_HW_RESET);
        break;
    case LCDType::ST7920_SW:
        display = new ST7920_SW_Display(ST7920_SW_CLOCK, ST7920_SW_DATA, ST7920_SW_CS, ST7920_SW_RESET);
        break;
    case LCDType::SSD1306:
        display = new SSD1306Display(SSD1306_I2C_ADDRESS, SSD1306_SCL, SSD1306_SDA);
        break;
    case LCDType::SSD1309:
        display = new SSD1309Display(SSD1306_I2C_ADDRESS, SSD1306_SCL, SSD1306_SDA);
        break;
    case LCDType::NONE:
        DBG dbgLog(LOG_ERR, "[LCD] No LCD type defined!\n");
        return;
    default:
        DBG dbgLog(LOG_ERR, "[LCD] Unsupported LCD type!\n");
        return;
    }

    display->Display_Start(); // show the starting screen
}
