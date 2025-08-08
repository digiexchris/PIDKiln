#pragma once

#include <string>
#include "mongoose.h"

class Webserver
{
public:
    void begin();
    void end();

private:
    static void evHandler(struct mg_connection *c, int ev, void *ev_data);

    // this task needs 8k stack
    static void mongooseTask(void *pvParams);

    std::string staticFile(const std::string &path);

    // void getIndex(void *request);
    // void getVars(void *request);
    // void getLogs(void *request);
    // void getPrograms(void *request);
    // void postUpload(void *request);
    // void handlePrefs(void *request);
    // void postIndex(void *request);
    // void doScreenshot(void *request);
    // void postUpdate();
    // bool isAuthenticated(void *request);
};