#pragma once

#include <Arduino.h>

// Menu and button handling
void pressed_menu();
void button_Short_Press();
void button_Long_Press();

// Rotary encoder handling
void Rotate();

// Task and interrupt handling
void Input_Loop(void *parameter);
void handleInterrupt();

// Setup function
void Setup_Input();
