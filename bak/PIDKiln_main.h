#pragma once

#include <Arduino.h>
#include <SPIFFS.h>

// File management functions
boolean delete_file(File &newFile);

// Validation functions
boolean check_valid_chars(byte a);
boolean valid_filename(char *file);

// Main Arduino functions
void setup();
void loop();
