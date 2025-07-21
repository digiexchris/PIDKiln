/*
** PIDKiln Global Variable Definitions
**
** This file contains all global variable definitions that were moved from PIDKiln.h
** to resolve multiple definition linker errors.
**
** Copyright (C) 2019-2025 - Adrian Siemieniak
*/

#include "PIDKiln.h"

/*
** Temperature, PID and probes variables
*/
// Temperature & PID variables
double int_temp = 20, kiln_temp = 20, case_temp = 20;
double set_temp, pid_out;
float temp_incr = 0;
uint32_t windowStartTime;

// Specify the links and initial tuning parameters
PID KilnPID(&kiln_temp, &pid_out, &set_temp, 0, 0, 0, P_ON_E, DIRECT);

/*
** Global LCD screen/menu and menu position variables
*/
LCD_State_enum LCD_State = SCR_MAIN_VIEW;          // global variable to keep track on where we are in LCD screen
LCD_MAIN_View_enum LCD_Main = MAIN_VIEW1;          // main screen has some views - where are we
LCD_SCR_MENU_Item_enum LCD_Menu = M_SCR_MAIN_VIEW; // menu items

/*
** Kiln program variables
*/
PROGRAM Program[MAX_PRG_LENGTH];   // We could use here malloc() but...
uint8_t Program_size = 0;          // number of actual entries in Program
String Program_desc, Program_name; // First line of the selected program file - it's description

PROGRAM *Program_run;         // running program (made as copy of selected Program)
uint8_t Program_run_size = 0; // number of entries in running program (since elements count from 0 - this value is actually bigger by 1 then numbers of steps)
char *Program_run_desc = NULL, *Program_run_name = NULL;
time_t Program_run_start = 0;            // date/time of started program
time_t Program_run_end = 0;              // date/time when program ends - during program it's ETA
int Program_run_step = -1;               // at which step are we now... (has to be it - so we can give it -1)
uint16_t Program_start_temp = 0;         // temperature on start of the program
uint8_t Program_error = 0;               // if program finished with errors - remember number
byte TempA_errors = 0, TempB_errors = 0; // how many temperature read errors we have skipped

PROGRAM_RUN_STATE Program_run_state = PR_NONE; // running program state

/*
** Filesystem variables
*/
DIRECTORY *Programs_DIR = NULL;
uint16_t Programs_DIR_size = 0;

DIRECTORY *Logs_DIR = NULL;
uint16_t Logs_DIR_size = 0;

/*
** Preferences variables
*/
struct PrefsStruct Prefs[PRF_end];

/*
** File handles
*/
File CSVFile, LOGFile;

/*
** Network variables
*/
WiFiUDP udpClient;
Syslog syslog(udpClient, SYSLOG_PROTO_IETF);

/*
** Alarm variables
*/
uint16_t ALARM_countdown = 0; // countdown in seconds to stop alarm
