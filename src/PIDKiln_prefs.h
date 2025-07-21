#pragma once

#include <Arduino.h>

// Preference management
boolean Change_prefs_value(String item, String value);
void Save_prefs();
void Load_prefs();
void Prefs_updated_hook();

// Setup function
void Setup_prefs(void);
