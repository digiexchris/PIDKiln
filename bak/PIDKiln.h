#pragma once

#include <PID_v1.h>
#include <Syslog.h>
#include <Arduino.h>
#include <WiFiUdp.h>
#include <FS.h>
#include "Device/Thermocouple/Thermocouple.h"
#include "config.h"
#include "unordered_map"

// NOTE: Common user configuration options are in include/config.h

const int MAX_Prog_File_Size = 10240; // maximum file size (bytes) that can be uploaded as program, this limit is also defined in JS script (js/program.js)

extern uint16_t ALARM_countdown; // countdown in seconds to stop alarm

/*
** Temperature, PID and probes variables/definitions
*/
// Temperature & PID variables
extern double int_temp, kiln_temp, case_temp;
extern double set_temp, pid_out;
extern float temp_incr;
extern uint32_t windowStartTime;
#define PID_WINDOW_DIVIDER 1

// Specify the links and initial tuning parameters
extern PID KilnPID;

/*
** Global value of LCD screen/menu and menu position
**
*/
typedef enum
{
  SCR_MAIN_VIEW,      // group of main screens showing running program
  SCR_MENU,           // menu
  SCR_PROGRAM_LIST,   // list of all programs
  SCR_PROGRAM_SHOW,   // showing program content
  SCR_PROGRAM_DELETE, // deleting program
  SCR_PROGRAM_FULL,   // step by step program display
  SCR_QUICK_PROGRAM,  // set manually desire, single program step
  SCR_ABOUT,          // short info screen
  SCR_PREFERENCES,    // show current preferences
  SCR_OTHER           // some other screens like about that are stateless
} LCD_State_enum;

typedef enum
{ // different main screens
  MAIN_VIEW1,
  MAIN_VIEW2,
  MAIN_VIEW3,
  MAIN_end
} LCD_MAIN_View_enum;

typedef enum
{ // menu positions
  M_SCR_MAIN_VIEW,
  M_LIST_PROGRAMS,
  M_QUICK_PROGRAM,
  M_INFORMATIONS,
  M_PREFERENCES,
  M_CONNECT_WIFI,
  M_ABOUT,
  M_RESTART,
  M_END
} LCD_SCR_MENU_Item_enum;

extern LCD_State_enum LCD_State;        // global variable to keep track on where we are in LCD screen
extern LCD_MAIN_View_enum LCD_Main;     // main screen has some views - where are we
extern LCD_SCR_MENU_Item_enum LCD_Menu; // menu items

constexpr const char *Menu_Names[] = {"1) Main view", "2) List programs", "3) Quick program", "4) Information", "5) Preferences", "6) Reconnect WiFi", "7) About", "8) Restart"};

typedef enum
{ // program menu positions
  P_EXIT,
  P_SHOW,
  P_LOAD,
  P_DELETE,
  P_end
} LCD_PSCR_MENU_Item_enum;

constexpr const char *Prog_Menu_Names[] = {"Exit", "Show", "Load", "Del."};
const uint8_t Prog_Menu_Size = 4;

#define SCREEN_W 128 // LCD screen width and height
#define SCREEN_H 64
#define MAX_CHARS_PL SCREEN_W / 3 // char can have min. 3 points on screen

const uint8_t SCR_MENU_LINES = 5;  // how many menu lines should be print
const uint8_t SCR_MENU_SPACE = 2;  // pixels spaces between lines
const uint8_t SCR_MENU_MIDDLE = 3; // middle of the menu, where choosing will be possible

/*
** Kiln program variables
**
*/
struct PROGRAM
{
  uint16_t temp;
  uint16_t togo;
  uint16_t dwell;
};
// maxinum number of program lines (this goes to memory - so be careful)
#define MAX_PRG_LENGTH 40

extern PROGRAM Program[MAX_PRG_LENGTH];   // We could use here malloc() but...
extern uint8_t Program_size;              // number of actual entries in Program
extern String Program_desc, Program_name; // First line of the selected program file - it's description

extern PROGRAM *Program_run;     // running program (made as copy of selected Program)
extern uint8_t Program_run_size; // number of entries in running program (since elements count from 0 - this value is actually bigger by 1 then numbers of steps)
extern char *Program_run_desc, *Program_run_name;
extern time_t Program_run_start;        // date/time of started program
extern time_t Program_run_end;          // date/time when program ends - during program it's ETA
extern int Program_run_step;            // at which step are we now... (has to be it - so we can give it -1)
extern uint16_t Program_start_temp;     // temperature on start of the program
extern uint8_t Program_error;           // if program finished with errors - remember number
extern byte TempA_errors, TempB_errors; // how many temperature read errors we have skipped

typedef enum
{ // program menu positions
  PR_NONE,
  PR_READY,
  PR_RUNNING,
  PR_PAUSED,
  PR_ABORTED,
  PR_ENDED,
  PR_THRESHOLD,
  PR_end
} PROGRAM_RUN_STATE;
extern PROGRAM_RUN_STATE Program_run_state; // running program state
constexpr const char *Prog_Run_Names[] = {"unknown", "Ready", "Running", "Paused", "Aborted", "Ended", "Waiting"};

/*
**  Program errors:
*/
typedef enum
{
  PR_ERR_FILE_LOAD,       // failed to load file
  PR_ERR_TOO_LONG_LINE,   // program line too long (there is error probably in the line - it should be max. 1111:1111:1111 - so 14 chars, if there where more PIDKiln will throw error without checking why
  PR_ERR_BAD_CHAR,        // not allowed character in program (only allowed characters are numbers and separator ":")
  PR_ERR_TOO_HOT,         // exceeded max temperature defined in MAX_Temp
  PR_ERR_TOO_COLD,        // temperature redout below MIN_Temp
  PR_ERR_TOO_HOT_HOUSING, // housing temperature exceeded
  PR_ERR_MAX31A_NC,       // MAX31855 A not connected
  PR_ERR_MAX31A_INT_ERR,  // failed to read MAX31855 internal temperature on kiln
  PR_ERR_MAX31A_KPROBE,   // failed to read K-probe temperature on kiln
  PR_ERR_MAX31B_NC,       // MAX31855 B not connected
  PR_ERR_MAX31B_INT_ERR,  // failed to read MAX31855 internal temperature on case
  PR_ERR_MAX31B_KPROBE,   // failed to read K-probe temperature on case
  PR_ERR_USER_ABORT,      // user aborted
  PR_ERR_end
} PROGRAM_ERROR_STATE;

const std::unordered_map<PROGRAM_ERROR_STATE, const char *> Program_Error_Names = {
    {PR_ERR_FILE_LOAD, "Failed to load file"},
    {PR_ERR_TOO_LONG_LINE, "Program line too long"},
    {PR_ERR_BAD_CHAR, "Not allowed character in program"},
    {PR_ERR_TOO_HOT, "Exceeded max chamber temperature"},
    {PR_ERR_TOO_COLD, "Chamber temperature below min temperature"},
    {PR_ERR_TOO_HOT_HOUSING, "Housing temperature exceeded"},
    {PR_ERR_MAX31A_NC, "Chamber MAX31855 not connected"},
    {PR_ERR_MAX31A_INT_ERR, "Failed to read MAX31855 internal temperature on chamber"},
    {PR_ERR_MAX31A_KPROBE, "Failed to read K-probe temperature on chamber"},
    {PR_ERR_MAX31B_NC, "Case MAX31855 not connected"},
    {PR_ERR_MAX31B_INT_ERR, "Failed to read MAX31855 internal temperature on case"},
    {PR_ERR_MAX31B_KPROBE, "Failed to read K-probe temperature on case"},
    {PR_ERR_USER_ABORT, "User aborted"}};

/*
** Filesystem definintions
**
*/
#define MAX_FILENAME 30 // directory+name can be max 32 on SPIFFS
#define MAX_PROGNAME 20 //  - cos we already have /programs/ directory...

const char allowed_chars_in_filename[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890._";

struct DIRECTORY
{
  char filename[MAX_PROGNAME + 1];
  uint16_t filesize = 0;
  uint8_t sel = 0;
};

extern DIRECTORY *Programs_DIR;
extern uint16_t Programs_DIR_size;

extern DIRECTORY *Logs_DIR;
extern uint16_t Logs_DIR_size;

/* Directory loading errors:
** 1 - cant open "/programs" directory
** 2 - file name is too long or too short (this should not happened)
** 3 -
*/

/*
** Spiffs settings
**
*/
#define PRG_DIRECTORY "/programs"
#define PRG_DIRECTORY_X(x) PRG_DIRECTORY x
constexpr const char *PRG_Directory = PRG_DIRECTORY; // I started to use it so often... so this will take less RAM then define

constexpr const char *LOG_Directory = "/logs";

#define FORMAT_SPIFFS_IF_FAILED true

/*
**  Preference definitions
*/
#define PREFS_FILE "/etc/pidkiln.conf"

// Other variables
//
typedef enum
{ // program menu positions
  PRF_NONE,
  PRF_WIFI_SSID,
  PRF_WIFI_PASS,
  PRF_WIFI_MODE, // 0 - connect to AP if failed, be AP; 1 - connect only to AP; 2 - be only AP
  PRF_WIFI_RETRY_CNT,
  PRF_WIFI_AP_NAME,
  PRF_WIFI_AP_USERNAME,
  PRF_WIFI_AP_PASS,

  PRF_HTTP_JS_LOCAL,

  PRF_AUTH_USER,
  PRF_AUTH_PASS,

  PRF_NTPSERVER1,
  PRF_NTPSERVER2,
  PRF_NTPSERVER3,
  PRF_GMT_OFFSET,
  PRF_DAYLIGHT_OFFSET,
  PRF_INIT_DATE,
  PRF_INIT_TIME,

  PRF_PID_WINDOW,
  PRF_PID_KP,
  PRF_PID_KI,
  PRF_PID_KD,
  PRF_PID_POE,
  PRF_PID_TEMP_THRESHOLD,

  PRF_LOG_WINDOW,
  PRF_LOG_LIMIT,

  PRF_MIN_TEMP,
  PRF_MAX_TEMP,
  PRF_MAX_HOUSING_TEMP,
  PRF_THERMAL_RUN,
  PRF_ALARM_TIMEOUT,
  PRF_ERROR_GRACE_COUNT,

  PRF_DBG_SERIAL,
  PRF_DBG_SYSLOG,
  PRF_SYSLOG_SRV,
  PRF_SYSLOG_PORT,

  PRF_end
} PREFERENCES;

constexpr const char *PrefsName[] = {
    "None",
    "WiFi_SSID",
    "WiFi_Password",
    "WiFi_Mode",
    "WiFi_Retry_cnt",
    "WiFi_AP_Name",
    "WiFi_AP_Username",
    "WiFi_AP_Pass",
    "HTTP_Local_JS",
    "Auth_Username",
    "Auth_Password",
    "NTP_Server1",
    "NTP_Server2",
    "NTP_Server3",
    "GMT_Offset_sec",
    "Daylight_Offset_sec",
    "Initial_Date",
    "Initial_Time",
    "PID_Window",
    "PID_Kp",
    "PID_Ki",
    "PID_Kd",
    "PID_POE",
    "PID_Temp_Threshold",
    "LOG_Window",
    "LOG_Files_Limit",
    "MIN_Temperature",
    "MAX_Temperature",
    "MAX_Housing_Temperature",
    "Thermal_Runaway",
    "Alarm_Timeout",
    "MAX31855_Error_Grace_Count",
    "DBG_Serial",
    "DBG_Syslog",
    "DBG_Syslog_Srv",
    "DBG_Syslog_Port",
};

// Preferences types definitions
typedef enum
{
  NONE, // when this value is set - prefs item is off
  UINT8,
  UINT16,
  INT16,
  INT32,
  STRING,
  VFLOAT,
} TYPE;

// Structure for keeping preferences values
struct PrefsStruct
{
  TYPE type = NONE;
  union
  {
    uint8_t uint8;
    uint16_t uint16;
    int16_t int16;
    int32_t int32;
    char *str;
    double vfloat;
  } value;
};

extern struct PrefsStruct Prefs[PRF_end];

// Pointer to a log file
extern File CSVFile, LOGFile;

/*
** Other stuff
**
*/
constexpr const char *PVer = "PIDKiln v1.6";
constexpr const char *PDate = "2025.07.20";

#define DEBUG true
// #define DEBUG false

// If defined debug - do debug, otherwise comment out all debug lines
#define DBG if (DEBUG)

// Empty syslog instance
extern WiFiUDP udpClient;
extern Syslog syslog;

#define JS_JQUERY "https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"
#define JS_CHART "https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.bundle.min.js"
#define JS_CHART_DS "https://cdn.jsdelivr.net/npm/chartjs-plugin-datasource"

/*
** Function defs
**
*/
// These function declarations have been moved to their respective header files:
// - PIDKiln_LCD.h
// - PIDKiln_program.h
// - PIDKiln_prefs.h
// - PIDKiln_logs.h
// - PIDKiln_net.h
// - PIDKiln_http.h
// - PIDKiln_input.h
// - PIDKiln_addons.h
// - PIDKiln_main.h