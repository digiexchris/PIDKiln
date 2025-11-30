#pragma once
#include <Arduino.h>
#include <U8g2lib.h>

enum class LCDType
{
    ST7920_HW,
    ST7920_SW,
    SSD1306,
    SSD1309,
    NONE
};

class Display
{
public:
    // Helper functions
    boolean return_LCD_string(char *msg, char *rest, int mod, uint16_t screen_w);
    void load_msg(char msg[]);
    void DrawVline(uint16_t x, uint16_t y, uint16_t h);
    void Draw_Marked_string(char *str, uint8_t pos);
    void DrawMenuEl(char *msg, uint16_t y, uint8_t cnt, uint8_t el, boolean sel);

    // Main LCD display functions
    void LCD_display_mainv3(int dir = 0, byte ctrl = 0);
    void LCD_display_mainv2();
    void LCD_display_mainv1();
    void LCD_display_main_view();

    // Menu display functions
    void LCD_display_menu();
    void LCD_display_programs();

    // Program display functions
    void LCD_Display_program_delete(int dir = 0, boolean pressed = 0);
    void LCD_Display_program_full(int dir = 0);
    void LCD_Display_program_summary(int dir = 0, byte load_prg = 0);
    void LCD_Display_quick_program(int dir, byte pos);

    // Info display functions
    void LCD_Display_info();
    void LCD_Display_prefs(int dir = 0);
    void LCD_Display_about();

    // System functions
    void Restart_ESP();
    void LCD_Reconect_WiFi();

    // Setup function
    void Setup_LCD(void);

    void Display_Start(void);

    void WriteScreenshot(void out(const char *s));

protected:
    U8G2 *u8g2 = nullptr;
    LCDType lcd_type = LCDType::NONE; // This Display class can't be used directly, it needs to be derived for specific LCD types.
};

extern Display *display;