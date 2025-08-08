#include "webserver.h"
#include "mongoose.h"

// Connection event handler function
void Webserver::evHandler(struct mg_connection *c, int ev, void *ev_data)
{
    if (ev == MG_EV_ACCEPT)
    {
        if (numconns(c->mgr) > 10)
        {
            MG_ERROR(("Too many connections"));
            c->is_closing = 1;
        }
    }
    else if (ev == MG_EV_READ)
    {
        if (c->recv.len > 1024 * 2)
        {
            MG_ERROR(("Msg too large"));
            c->is_draining = 1;
        }
    }

    if (ev == MG_EV_HTTP_MSG)
    {                                                                   // New HTTP request received
        struct mg_http_message *hm = (struct mg_http_message *)ev_data; // Parsed HTTP request
        if (mg_match(hm->uri, mg_str("/api/hello"), NULL))
        {                                                                // REST API call?
            mg_http_reply(c, 200, "", "{%m:%d}\n", MG_ESC("status"), 1); // Yes. Respond JSON
        }
        else
        {
            struct mg_http_serve_opts opts = {.root_dir = ".", .fs = &mg_fs_posix};
            mg_http_serve_dir(c, hm, &opts); // For all other URLs, Serve static files
        }
    }
}

void Webserver::mongooseTask(void *pvParams)
{
    struct mg_mgr mgr; // Mongoose event manager. Holds all connections
    mg_mgr_init(&mgr); // Initialise event manager
    mg_http_listen(&mgr, "http://0.0.0.0:8000", ev_handler, NULL);
    for (;;)
    {
        mg_mgr_poll(&mgr, 1000); // Infinite event loop
    }
}

std::string Webserver::staticFile(const std::string &path)
{
    return std::string();
}