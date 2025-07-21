#pragma once

#include <Arduino.h>
#include <WiFi.h>

// Time functions
void printLocalTime();
void Setup_start_date();

// Network functions
void Return_Current_IP(IPAddress &lip);
void Disable_WiFi();
boolean Start_WiFi_AP();
boolean Start_WiFi_CLIENT();
boolean Setup_WiFi();
boolean Restart_WiFi();
