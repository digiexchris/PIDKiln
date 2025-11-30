#include "CppUTest/TestHarness.h"
#include "CppUTest/CommandLineTestRunner.h"
#include "hello_world.h"
#include <string>

TEST_GROUP(HelloWorldTest)
{
    HelloWorld* hello;

    void setup()
    {
        hello = new HelloWorld();
    }

    void teardown()
    {
        delete hello;
    }
};

TEST(HelloWorldTest, CppUTestIsWorking)
{
    CHECK_TRUE(true);
    CHECK_EQUAL(1, 1);
}

TEST(HelloWorldTest, GetMessageReturnsHelloWorld)
{
    std::string message = hello->GetMessage();
    STRCMP_EQUAL("Hello, World!", message.c_str());
}

TEST(HelloWorldTest, MessageIsNotEmpty)
{
    std::string message = hello->GetMessage();
    CHECK_FALSE(message.empty());
}

extern "C" void app_main()
{
    // Run CppUTest tests
    const char* argv[] = {"test_runner"};
    int argc = 1;
    int exitCode = CommandLineTestRunner::RunAllTests(argc, const_cast<char**>(argv));
    
    // Exit with test result code
    exit(exitCode);
}

