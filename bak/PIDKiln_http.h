#pragma once

#include <Arduino.h>
#include <ESPAsyncWebServer.h>

// Parser functions
String Preferences_parser(const String &var);
String Debug_ESP32(const String &var);
String Chart_parser(const String &var);
String About_parser(const String &var);
String handleVars(const String &var);

// Generator functions
void Generate_INDEX();
void Generate_LOGS_INDEX();

// Request handlers
void handleUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
void POST_Handle_Delete(AsyncWebServerRequest *request);
void GET_Handle_Delete(AsyncWebServerRequest *request);
void GET_Handle_Load(AsyncWebServerRequest *request);
void handlePrefs(AsyncWebServerRequest *request);
void handleIndexPost(AsyncWebServerRequest *request);
void do_screenshot(AsyncWebServerRequest *request);
void handleDoUpdate(AsyncWebServerRequest *request, const String &filename, size_t index, uint8_t *data, size_t len, bool final);

// Authentication
bool _webAuth(AsyncWebServerRequest *request);

// Output function
void out(const char *s);

// Server setup/teardown
void SETUP_WebServer(void);
void STOP_WebServer();
