#pragma once

#include <Arduino.h>

extern double Energy_Usage;

// Log file management
void Init_log_file();
void Add_log_line();
void Close_log_file();
void Clean_LOGS();
uint8_t Load_LOGS_Dir();

// Logging functions
void dbgLog(uint16_t pri, const char *fmt, ...);

// Setup functions
void initSysLog();
void initSerial();
