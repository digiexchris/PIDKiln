#pragma once

#include <Arduino.h>

// Parser functions
String Preferences_parser(const String &var);
String Debug_ESP32(const String &var);
String Chart_parser(const String &var);
String About_parser(const String &var);
String handleVars(const String &var);

// Generator functions
void Generate_INDEX();
void Generate_LOGS_INDEX();

// Connection event handler function
static void ev_handler(struct mg_connection *c, int ev, void *ev_data);

// Request handlers
void handleUpload(void *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
void POST_Handle_Delete(void *request);
void GET_Handle_Delete(void *request);
void GET_Handle_Load(void *request);
void handlePrefs(void *request);
void handleIndexPost(void *request);
void do_screenshot(void *request);
void handleDoUpdate(void *request, const String &filename, size_t index, uint8_t *data, size_t len, bool final);

// Authentication
bool _webAuth(void *request);

// Output function
void out(const char *s);

// Server setup/teardown
void SETUP_WebServer(void);
void STOP_WebServer();
