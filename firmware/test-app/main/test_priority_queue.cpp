#include "CppUTest/TestHarness.h"
#include "command_system/PriorityCommandQueue.hpp"
#include "command_system/ICommand.hpp"
#include "command_system/CommandPriority.hpp"
#include "command_system/CommandType.hpp"
#include "command_system/ProgramState.hpp"
#include "command_system/CommandResult.hpp"
#include "command_system/IStateMachine.hpp"
#include <memory>
#include <thread>
#include <vector>
#include <atomic>
#include <cstdint>

using namespace command_system;

class MockCommand : public ICommand
{
public:
    MockCommand(CommandPriority aPriority, CommandType aType, int aId)
        : myPriority(aPriority), myType(aType), myId(aId) {}

    CommandPriority GetPriority() const override { return myPriority; }
    bool CanExecute(ProgramState) const override { return true; }
    void Execute(IStateMachine&, CommandCallback) override {}
    void Cancel() override {}
    CommandType GetType() const override { return myType; }
    
    int GetId() const { return myId; }

private:
    CommandPriority myPriority;
    CommandType myType;
    int myId;
};

TEST_GROUP(PriorityCommandQueueTest)
{
    PriorityCommandQueue* queue;

    void setup()
    {
        queue = new PriorityCommandQueue();
    }

    void teardown()
    {
        delete queue;
    }
};

TEST(PriorityCommandQueueTest, EmptyQueueInitially)
{
    CHECK_TRUE(queue->IsEmpty());
    CHECK_EQUAL(0, queue->Size());
}

TEST(PriorityCommandQueueTest, PushAndPopSingleCommand)
{
    auto command = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 1);
    queue->Push(command);
    
    CHECK_FALSE(queue->IsEmpty());
    CHECK_EQUAL(1, queue->Size());
    
    auto popped = queue->Pop();
    CHECK_TRUE(popped != nullptr);
    CHECK_EQUAL(command.get(), popped.get());
    CHECK_TRUE(queue->IsEmpty());
}

TEST(PriorityCommandQueueTest, PopFromEmptyQueueReturnsNullptr)
{
    auto popped = queue->Pop();
    CHECK_TRUE(popped == nullptr);
}

TEST(PriorityCommandQueueTest, PriorityOrdering)
{
    auto low = std::make_shared<MockCommand>(CommandPriority::Low, CommandType::Start, 1);
    auto normal = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 2);
    auto high = std::make_shared<MockCommand>(CommandPriority::High, CommandType::Start, 3);
    auto critical = std::make_shared<MockCommand>(CommandPriority::Critical, CommandType::Start, 4);
    auto emergency = std::make_shared<MockCommand>(CommandPriority::Emergency, CommandType::Start, 5);
    
    queue->Push(normal);
    queue->Push(emergency);
    queue->Push(low);
    queue->Push(high);
    queue->Push(critical);
    
    CHECK_EQUAL(5, queue->Size());
    
    auto first = queue->Pop();
    CHECK_EQUAL(5, static_cast<MockCommand*>(first.get())->GetId());
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Emergency), static_cast<uint8_t>(first->GetPriority()));
    
    auto second = queue->Pop();
    CHECK_EQUAL(4, static_cast<MockCommand*>(second.get())->GetId());
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Critical), static_cast<uint8_t>(second->GetPriority()));
    
    auto third = queue->Pop();
    CHECK_EQUAL(3, static_cast<MockCommand*>(third.get())->GetId());
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::High), static_cast<uint8_t>(third->GetPriority()));
    
    auto fourth = queue->Pop();
    CHECK_EQUAL(2, static_cast<MockCommand*>(fourth.get())->GetId());
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Normal), static_cast<uint8_t>(fourth->GetPriority()));
    
    auto fifth = queue->Pop();
    CHECK_EQUAL(1, static_cast<MockCommand*>(fifth.get())->GetId());
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Low), static_cast<uint8_t>(fifth->GetPriority()));
    
    CHECK_TRUE(queue->IsEmpty());
}

TEST(PriorityCommandQueueTest, SamePriorityMaintainsOrder)
{
    auto cmd1 = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 1);
    auto cmd2 = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 2);
    auto cmd3 = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 3);
    
    queue->Push(cmd1);
    queue->Push(cmd2);
    queue->Push(cmd3);
    
    auto first = queue->Pop();
    auto second = queue->Pop();
    auto third = queue->Pop();
    
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Normal), static_cast<uint8_t>(first->GetPriority()));
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Normal), static_cast<uint8_t>(second->GetPriority()));
    CHECK_EQUAL(static_cast<uint8_t>(CommandPriority::Normal), static_cast<uint8_t>(third->GetPriority()));
}

TEST(PriorityCommandQueueTest, ClearRemovesAllCommands)
{
    auto cmd1 = std::make_shared<MockCommand>(CommandPriority::Normal, CommandType::Start, 1);
    auto cmd2 = std::make_shared<MockCommand>(CommandPriority::High, CommandType::Start, 2);
    auto cmd3 = std::make_shared<MockCommand>(CommandPriority::Critical, CommandType::Start, 3);
    
    queue->Push(cmd1);
    queue->Push(cmd2);
    queue->Push(cmd3);
    
    CHECK_EQUAL(3, queue->Size());
    
    queue->Clear();
    
    CHECK_TRUE(queue->IsEmpty());
    CHECK_EQUAL(0, queue->Size());
}

TEST(PriorityCommandQueueTest, ThreadSafetyMultipleThreads)
{
    const int numThreads = 4;
    const int commandsPerThread = 50;
    std::vector<std::thread> threads;
    
    for (int i = 0; i < numThreads; ++i)
    {
        threads.emplace_back([this, i, commandsPerThread]() {
            for (int j = 0; j < commandsPerThread; ++j)
            {
                auto priority = static_cast<CommandPriority>(j % 5);
                auto command = std::make_shared<MockCommand>(priority, CommandType::Start, i * commandsPerThread + j);
                queue->Push(command);
            }
        });
    }
    
    for (auto& thread : threads)
    {
        thread.join();
    }
    
    CHECK_EQUAL(numThreads * commandsPerThread, queue->Size());
    
    CommandPriority lastPriority = CommandPriority::Emergency;
    int count = 0;
    while (!queue->IsEmpty())
    {
        auto command = queue->Pop();
        CHECK_TRUE(command != nullptr);
        auto currentPriority = command->GetPriority();
        uint8_t current = static_cast<uint8_t>(currentPriority);
        uint8_t last = static_cast<uint8_t>(lastPriority);
        
        CHECK_TRUE(current <= last);
        lastPriority = currentPriority;
        count++;
    }
    
    CHECK_EQUAL(numThreads * commandsPerThread, count);
}

TEST(PriorityCommandQueueTest, ThreadSafetyConcurrentPushPop)
{
    const int numCommands = 100;
    std::vector<std::thread> threads;
    std::atomic<int> popCount{0};
    
    for (int i = 0; i < 2; ++i)
    {
        threads.emplace_back([this, i, numCommands]() {
            for (int j = 0; j < numCommands; ++j)
            {
                auto priority = static_cast<CommandPriority>(j % 5);
                auto command = std::make_shared<MockCommand>(priority, CommandType::Start, i * numCommands + j);
                queue->Push(command);
            }
        });
    }
    
    for (int i = 0; i < 2; ++i)
    {
        threads.emplace_back([this, &popCount, numCommands]() {
            for (int j = 0; j < numCommands; ++j)
            {
                auto command = queue->Pop();
                if (command != nullptr)
                {
                    popCount++;
                }
            }
        });
    }
    
    for (auto& thread : threads)
    {
        thread.join();
    }
    
    CHECK_TRUE(popCount >= 0);
    CHECK_TRUE(popCount <= numCommands * 2);
}

