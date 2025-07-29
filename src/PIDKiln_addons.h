#pragma once

#include <Arduino.h>
#include "Device/Thermocouple/Thermocouple.h"
#include <memory>
#include "esp-max318-thermocouple/max318.h"
#include "Device/Thermocouple/MAX31855.h"
#include "Device/Thermocouple/MAX31856.h"

extern std::unique_ptr<MAX318> ChamberThermocouple;
extern std::unique_ptr<Thermocouple> CaseThermocouple;

// SSR control functions
void Enable_SSR();
void Disable_SSR();

// EMR control functions
void Enable_EMR();
void Disable_EMR();

// Utility functions
void print_bits(uint32_t raw);

// Temperature monitoring
void Update_Temperature(Thermocouple *thermocouple, double &anOutTemp, double &anOutIntTemp);

// Energy monitoring
void Read_Energy_INPUT();

// Task functions
void Power_Loop(void *parameter);

// Alarm functions
void STOP_Alarm();
void START_Alarm();

// Setup function
void Setup_Addons();
