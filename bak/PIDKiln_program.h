#pragma once

#include <Arduino.h>

// Program line processing
byte add_program_line(String &linia);

// Program loading functions
uint8_t Load_program(char *file);
uint8_t Load_programs_dir();

// Program step management
void Update_program_step(uint8_t sstep, uint16_t stemp, uint16_t stime, uint16_t sdwell);

// Program memory management
void Initialize_program_to_run();
void Load_program_to_run();

// Program selection functions
int Find_selected_program();
void rotate_selected_program(int dir);

// Program cleanup and file management
byte Cleanup_program(byte err = 0);
boolean Erase_program_file();

// Program execution control
void END_Program();
void ABORT_Program(uint8_t error);
void PAUSE_Program();
void RESUME_Program();

// Program calculation functions
void Program_recalculate_ETA(boolean dwell = false);
void Program_calculate_steps(boolean prg_start = false);
void START_Program();

// Safety functions
void SAFETY_Check();

// Task functions
void Program_Loop(void *parameter);

// Setup function
void Program_Setup();
