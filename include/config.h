#pragma once
#include "Device/Thermocouple/Thermocouple.h"
#include <esp-max318-thermocouple/max31856.hxx>
#include "Display/display.h"

/*
** Some definitions - usually you should not edit this, but you may want to
*/
// Swap these pins if your encoder turns backwards
#define ENCODER0_PINA 35
#define ENCODER0_PINB 34
#define ENCODER0_BUTTON 32
#define ENCODER_BUTTON_DELAY 150 // 150ms between button press readout
#define ENCODER_ROTATE_DELAY 120 // 120ms between rotate readout
const uint16_t Long_Press = 400; // long press button takes about 0,9 second

// Other variables
//

// LCD options
// LCD type, can be LCDType::ST7920_SW, ST7920_HW, LCDType::SSD1306, LCDType::SSD1309, or LCDType::NONE
// Hardware spi for the ST7920 is faster, but requires specific pins and doesn't work well on some hardware
// constexpr LCDType LCD_Type = LCDType::ST7920_HW;
constexpr LCDType LCD_Type = LCDType::SSD1309;

// ST7920_SW LCD pins
#define ST7920_SW_RESET 4  // RST on LCD
#define ST7920_SW_CS 5     // RS on LCD
#define ST7920_SW_CLOCK 18 // E on LCD
#define ST7920_SW_DATA 23  // R/W on LCD

// ST7920_HW LCD pins
#define ST7920_HW_RESET 4 // RST on LCD
#define ST7920_HW_CS 5    // RS on LCD

// SSD1306 and SSD1309 LCD pins
#define SSD1306_I2C_ADDRESS 0x3C // I2C address for SSD1306/SSD1309
#define SSD1306_SDA 4            // SDA on LCD
#define SSD1306_SCL 5            // SCL on LCD

// Relay pins
#define EMR_RELAY_PIN 21
#define SSR1_RELAY_PIN 19
// #define SSR2_RELAY_PIN 22   // if you want to use additional SSR for second heater, uncoment this

// Thermocouple IC type
// Can be ThermocoupleType::MAX31855, ThermocoupleType::MAX31856 or NONE
// More can be implemented, see MAX31855.h and Thermocouple.h for the api.
constexpr ThermocoupleType ChamberThermocoupleType = ThermocoupleType::MAX31856;
constexpr ThermocoupleType CaseThermocoupleType = ThermocoupleType::MAX31855;

/*
If you use a MAX31865 for any of the above thermocouples, se the appropriate type below.
Valud values are:
- MAX31856::ProbeType::TYPE_B
- MAX31856::ProbeType::TYPE_E
- MAX31856::ProbeType::TYPE_J
- MAX31856::ProbeType::TYPE_K
- MAX31856::ProbeType::TYPE_N
- MAX31856::ProbeType::TYPE_R
- MAX31856::ProbeType::TYPE_S
- MAX31856::ProbeType::TYPE_T
- MAX31856::ProbeType::TYPE_VOLTAGE_GAIN_X8
- MAX31856::ProbeType::TYPE_VOLTAGE_GAIN_X32
If you use a MAX31855, This is ignored.
*/
constexpr MAX31856::ThermocoupleType Chamber_Thermocouple_MAX31856_Type = MAX31856::ThermocoupleType::TYPE_K;
constexpr MAX31856::ThermocoupleType Case_Thermocouple_MAX31856_Type = MAX31856::ThermocoupleType::TYPE_K;

// Set it to FILTER_50HZ or FILTER_60HZ hz depending on your mains frequency
constexpr bool LineFrequencyFilter = FILTER_60HZ;

// MAX31855/MAX31856 variables/defs
#define SPI2_MISO 12 // MISO pin
#define SPI2_MOSI 13 // MOSI pin
#define SPI2_CLK 14  // CLK pin
#define CHAMBER_CS 27
#define CASE_CS 15

// If you have power meter - uncoment this
#define ENERGY_MON_PIN 33       // if you don't use - comment out
#define ENERGY_MON_AMPS 33      // how many amps produces 1V on your meter (usualy with voltage output meters it's their max value).
#define EMERGY_MON_VOLTAGE 230  // what is your mains voltage
#define ENERGY_IGNORE_VALUE 1.4 // if measured current is below this - ignore it (it's just noise)

#define ALARM_PIN 26 // Pin goes high on abort

// Less used options

// If you have Wrover with PSRAM
// #define MALLOC ps_malloc
// #define REALLOC ps_realloc

// or without PSRAM
#define MALLOC malloc
#define REALLOC realloc

// WIFI hostname
#define HOSTNAME "pidkiln.local"