#ifndef HELLO_WORLD_H
#define HELLO_WORLD_H

#include <string>

class HelloWorld
{
public:
    HelloWorld();
    ~HelloWorld();

    std::string GetMessage() const;
    void PrintMessage() const;

private:
    std::string myMessage;
};

#endif // HELLO_WORLD_H

