#include "command_system/PriorityCommandQueue.hpp"
#include <algorithm>

namespace command_system
{

void PriorityCommandQueue::Push(std::shared_ptr<ICommand> aCommand)
{
    std::lock_guard<std::mutex> lock(myMutex);
    myQueue.push(aCommand);
}

std::shared_ptr<ICommand> PriorityCommandQueue::Pop()
{
    std::lock_guard<std::mutex> lock(myMutex);
    if (myQueue.empty())
    {
        return nullptr;
    }
    
    auto command = myQueue.top();
    myQueue.pop();
    return command;
}

bool PriorityCommandQueue::IsEmpty() const
{
    std::lock_guard<std::mutex> lock(myMutex);
    return myQueue.empty();
}

size_t PriorityCommandQueue::Size() const
{
    std::lock_guard<std::mutex> lock(myMutex);
    return myQueue.size();
}

void PriorityCommandQueue::Clear()
{
    std::lock_guard<std::mutex> lock(myMutex);
    while (!myQueue.empty())
    {
        myQueue.pop();
    }
}

}

