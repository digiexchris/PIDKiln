#include "hello_world.h"
#include <cstdio>

extern "C" void app_main()
{
    HelloWorld hello;
    hello.PrintMessage();
    
    std::string message = hello.GetMessage();
    printf("Message retrieved: %s\n", message.c_str());
}

