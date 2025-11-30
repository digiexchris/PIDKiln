#include "hello_world.h"
#include <cstdio>

HelloWorld::HelloWorld()
    : myMessage("Hello, World!")
{
}

HelloWorld::~HelloWorld()
{
}

std::string HelloWorld::GetMessage() const
{
    return myMessage;
}

void HelloWorld::PrintMessage() const
{
    printf("%s\n", myMessage.c_str());
}

