/*
** Function for relays (SSR, EMR) and temperature sensors
**
*/
#include <Arduino.h>
#include "PIDKiln.h"
#include "Device/Thermocouple/Thermocouple.h"
#include "PIDKiln.h"
#include "PIDKiln_addons.h"
#include "PIDKiln_logs.h"
#include "PIDKiln_program.h"

// Initialize MAX31855
Thermocouple *ChamberThermocouple = nullptr;
Thermocouple *CaseThermocouple = nullptr;
// If we have defines power meter pins
#ifdef ENERGY_MON_PIN
#include <EmonLib.h>

EnergyMonitor emon1;
#endif
uint16_t Energy_Wattage = 0; // keeping present power consumtion in Watts
double Energy_Usage = 0;     // total energy used (Watt/time)

boolean SSR_On; // just to narrow down state changes.. I don't know if this is needed/faster

// Simple functions to enable/disable SSR - for clarity, everything is separate
//
void Enable_SSR()
{
  if (!SSR_On)
  {
    digitalWrite(SSR1_RELAY_PIN, HIGH);
#ifdef SSR2_RELAY_PIN
    digitalWrite(SSR2_RELAY_PIN, HIGH);
#endif
    SSR_On = true;
  }
}

void Disable_SSR()
{
  if (SSR_On)
  {
    digitalWrite(SSR1_RELAY_PIN, LOW);
#ifdef SSR2_RELAY_PIN
    digitalWrite(SSR2_RELAY_PIN, LOW);
#endif
    SSR_On = false;
  }
}

void Enable_EMR()
{
  digitalWrite(EMR_RELAY_PIN, HIGH);
}

void Disable_EMR()
{
  digitalWrite(EMR_RELAY_PIN, LOW);
}

void print_bits(uint32_t raw)
{
  for (int i = 31; i >= 0; i--)
  {
    bool b = bitRead(raw, i);
    Serial.print(b);
  }

  Serial.println();
}

// Thermocouple temperature readout
//
void Update_Temperature(Thermocouple *thermocouple, double &anOutTemp, double &anOutIntTemp)
{

  if (thermocouple == nullptr)
  {
    DBG dbgLog(LOG_ERR, "[ADDONS] Thermocouple is null pointer\n\r");
    return;
  }

  std::string name = thermocouple->getName();

  std::string err;
  if (!thermocouple->updateTemperature(anOutTemp, anOutIntTemp, err))
  {

    DBG dbgLog(LOG_ERR, "[ADDONS] %s error: %s\n\r", name.c_str(), err.c_str());

    if (thermocouple->isAtErrorLimit())
    {
      DBG dbgLog(LOG_ERR, "[ADDONS] %s has too many errors, aborting program\n\r", name.c_str());
      ABORT_Program(PR_ERR_MAX31A_INT_ERR);
      return;
    }
    else
    {
      DBG dbgLog(LOG_ERR, "[ADDONS] %s had an error but we are still below grace threshold - continue. \n\r", name.c_str());
    }
  }

  DBG dbgLog(LOG_DEBUG, "[ADDONS] %s readout: Internal temp = %.1f \t Last temp = %.1f\n\r", name.c_str(), anOutIntTemp, anOutTemp);
}

// Measure current power usage - to be expanded
//
void Read_Energy_INPUT()
{
  double Irms;
  static uint8_t cnt = 0;
  static uint32_t last = 0;

#ifdef ENERGY_MON_PIN
  Irms = emon1.calcIrms(512); // Calculate Irms only; 512 = number of samples (internaly ESP does 8 samples per measurement)
  if (Irms < ENERGY_IGNORE_VALUE)
  {
    Energy_Wattage = 0;
    return; // In my case everything below 0,3A is just noise. Comparing to 10-30A we are going to use we can ignore it. Final readout is correct.
  }
  Energy_Wattage = (uint16_t)(Energy_Wattage + Irms * EMERGY_MON_VOLTAGE) / 2; // just some small hysteresis
  if (last)
  {
    uint16_t ttime;
    ttime = millis() - last;
    Energy_Usage += (double)(Energy_Wattage * ttime) / 3600000; // W/h - 60*60*1000 (miliseconds)
  }
  last = millis();

  if (cnt++ > 20)
  {
    DBG dbgLog(LOG_DEBUG, "[ADDONS] VCC is set:%d ; RAW Power: %.1fW, Raw current: %.2fA, Power global:%d W/h:%.6f\n\r", emon1.readVcc(), Irms * EMERGY_MON_VOLTAGE, Irms, Energy_Wattage, Energy_Usage);
    cnt = 0;
  }

#else
  return;
#endif
}

// Power metter loop - read energy consumption
//
void Power_Loop(void *parameter)
{
  for (;;)
  {
    Read_Energy_INPUT(); // current redout takes around 3-5ms - so we will do it 10 times a second.
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

// Stops Alarm
//
void STOP_Alarm()
{
  ALARM_countdown = 0;
  digitalWrite(ALARM_PIN, LOW);
}
// Start Alarm
//
void START_Alarm()
{
  if (!Prefs[PRF_ALARM_TIMEOUT].value.uint16)
    return;
  ALARM_countdown = Prefs[PRF_ALARM_TIMEOUT].value.uint16;
  digitalWrite(ALARM_PIN, HIGH);
}

void Setup_Addons()
{
  pinMode(EMR_RELAY_PIN, OUTPUT);
  pinMode(SSR1_RELAY_PIN, OUTPUT);
#ifdef SSR2_RELAY_PIN
  pinMode(SSR2_RELAY_PIN, OUTPUT);
#endif

  pinMode(ALARM_PIN, OUTPUT);

  SSR_On = false;

  if (ChamberThermocoupleType == ThermocoupleType::MAX31855)
  {
    ChamberThermocouple = new Thermocouple(
        ThermocoupleType::MAX31855,
        "Chamber Thermocouple",
        static_cast<gpio_num_t>(CHAMBER_CS),
        Prefs[PRF_MAX_TEMP].value.uint16,
        Prefs[PRF_MIN_TEMP].value.uint8,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }
  else if (ChamberThermocoupleType == ThermocoupleType::MAX31856)
  {
    ChamberThermocouple = new Thermocouple(
        ThermocoupleType::MAX31856,
        "Chamber Thermocouple",
        static_cast<gpio_num_t>(CHAMBER_CS),
        Prefs[PRF_MAX_TEMP].value.uint16,
        Prefs[PRF_MIN_TEMP].value.uint8,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }
  else
  {
    ChamberThermocouple = new Thermocouple(
        ThermocoupleType::NONE,
        "Chamber Thermocouple",
        static_cast<gpio_num_t>(CHAMBER_CS),
        0,
        0,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }

  if (CaseThermocoupleType == ThermocoupleType::MAX31855)
  {
    CaseThermocouple = new Thermocouple(
        ThermocoupleType::MAX31855,
        "Case Thermocouple",
        static_cast<gpio_num_t>(CASE_CS),
        Prefs[PRF_MAX_HOUSING_TEMP].value.uint16,
        Prefs[PRF_MIN_TEMP].value.uint8,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }
  else if (CaseThermocoupleType == ThermocoupleType::MAX31856)
  {
    CaseThermocouple = new Thermocouple(
        ThermocoupleType::MAX31856,
        "Case Thermocouple",
        static_cast<gpio_num_t>(CASE_CS),
        Prefs[PRF_MAX_HOUSING_TEMP].value.uint16,
        Prefs[PRF_MIN_TEMP].value.uint8,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }
  else
  {
    CaseThermocouple = new Thermocouple(
        ThermocoupleType::NONE,
        "Case Thermocouple",
        static_cast<gpio_num_t>(CASE_CS),
        0,
        0,
        Prefs[PRF_ERROR_GRACE_COUNT].value.uint8);
  }

#ifdef ENERGY_MON_PIN
  emon1.current(ENERGY_MON_PIN, ENERGY_MON_AMPS);
  xTaskCreatePinnedToCore(
      Power_Loop,     /* Task function. */
      "Power_metter", /* String with name of task. */
      8192,           /* Stack size in bytes. */
      NULL,           /* Parameter passed as input of the task */
      2,              /* Priority of the task. */
      NULL, 1);       /* Task handle. */

#endif
}
