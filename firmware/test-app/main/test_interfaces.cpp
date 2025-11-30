#include "CppUTest/TestHarness.h"
#include "command_system/CommandPriority.hpp"
#include "command_system/ProgramState.hpp"
#include "command_system/CommandType.hpp"
#include "command_system/CommandResult.hpp"
#include "command_system/Program.hpp"
#include "command_system/ICommand.hpp"
#include "command_system/ICommandSource.hpp"
#include "command_system/IStateMachine.hpp"
#include "command_system/IStateObserver.hpp"
#include "command_system/IProgramExecutor.hpp"
#include "command_system/ITemperatureController.hpp"
#include "command_system/IProgramStorage.hpp"
#include "command_system/CommandBase.hpp"
#include <memory>

using namespace command_system;

TEST_GROUP(InterfaceDefinitions)
{
};

TEST(InterfaceDefinitions, CommandPriorityEnumValues)
{
    CHECK_EQUAL(0, static_cast<uint8_t>(CommandPriority::Emergency));
    CHECK_EQUAL(1, static_cast<uint8_t>(CommandPriority::Critical));
    CHECK_EQUAL(2, static_cast<uint8_t>(CommandPriority::High));
    CHECK_EQUAL(3, static_cast<uint8_t>(CommandPriority::Normal));
    CHECK_EQUAL(4, static_cast<uint8_t>(CommandPriority::Low));
}

TEST(InterfaceDefinitions, ProgramStateEnumValues)
{
    CHECK_EQUAL(0, static_cast<uint8_t>(ProgramState::None));
    CHECK_EQUAL(1, static_cast<uint8_t>(ProgramState::Ready));
    CHECK_EQUAL(2, static_cast<uint8_t>(ProgramState::Running));
    CHECK_EQUAL(3, static_cast<uint8_t>(ProgramState::Paused));
    CHECK_EQUAL(4, static_cast<uint8_t>(ProgramState::Stopped));
    CHECK_EQUAL(5, static_cast<uint8_t>(ProgramState::Error));
    CHECK_EQUAL(7, static_cast<uint8_t>(ProgramState::Finished));
}

TEST(InterfaceDefinitions, CommandResultStructure)
{
    CommandResult result{true, ""};
    CHECK_TRUE(result.success);
    STRCMP_EQUAL("", result.errorMessage.c_str());

    CommandResult error{false, "Test error"};
    CHECK_FALSE(error.success);
    STRCMP_EQUAL("Test error", error.errorMessage.c_str());
}

TEST(InterfaceDefinitions, TimeStructure)
{
    Time time{1, 30, 45};
    CHECK_EQUAL(1, time.hours);
    CHECK_EQUAL(30, time.minutes);
    CHECK_EQUAL(45, time.seconds);

    double minutes = time.ToMinutes();
    DOUBLES_EQUAL(90.75, minutes, 0.01);
}

TEST(InterfaceDefinitions, SegmentStructure)
{
    Segment segment;
    segment.target = 500.0f;
    segment.rampTime = Time{1, 0, 0};
    segment.dwellTime = Time{0, 30, 0};

    DOUBLES_EQUAL(500.0, segment.target, 0.1);
    CHECK_EQUAL(1, segment.rampTime.hours);
    CHECK_EQUAL(30, segment.dwellTime.minutes);
}

TEST(InterfaceDefinitions, ProgramStructure)
{
    Program program;
    program.name = "test_program";
    program.description = "Test description";
    program.segments.push_back(Segment{500.0f, Time{1, 0, 0}, Time{0, 30, 0}});

    STRCMP_EQUAL("test_program", program.name.c_str());
    STRCMP_EQUAL("Test description", program.description.c_str());
    CHECK_EQUAL(1, program.segments.size());
    DOUBLES_EQUAL(500.0, program.segments[0].target, 0.1);
}

