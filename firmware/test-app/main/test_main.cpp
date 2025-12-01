// clang-format off
#include "CppUTest/TestHarness.h"
#include "CppUTest/CommandLineTestRunner.h"
#include <string>
// clang-format on

extern "C" int main(int argc, char **argv) {

  int exitCode = CommandLineTestRunner::RunAllTests(argc, argv);

  return (exitCode);
}