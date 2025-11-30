#pragma once

#include "ICommand.hpp"
#include "CommandPriority.hpp"
#include <queue>
#include <memory>
#include <mutex>

namespace command_system
{

class PriorityCommandQueue
{
public:
    PriorityCommandQueue() = default;
    ~PriorityCommandQueue() = default;

    void Push(std::shared_ptr<ICommand> aCommand);
    std::shared_ptr<ICommand> Pop();
    bool IsEmpty() const;
    size_t Size() const;
    void Clear();

private:
    struct CommandComparator
    {
        bool operator()(const std::shared_ptr<ICommand>& aLeft, 
                       const std::shared_ptr<ICommand>& aRight) const noexcept
        {
            if (!aLeft || !aRight)
            {
                return false;
            }
            uint8_t leftPriority = static_cast<uint8_t>(aLeft->GetPriority());
            uint8_t rightPriority = static_cast<uint8_t>(aRight->GetPriority());
            // std::priority_queue is a max-heap: comparator returns true if left should be below right
            // Lower enum value = higher priority. We want lower values at top.
            // comp(Emergency=0, Critical=1) = 0 > 1 = false → Emergency not below Critical ✓
            // comp(Critical=1, Emergency=0) = 1 > 0 = true → Critical below Emergency ✓
            return leftPriority > rightPriority;
        }
    };

    mutable std::mutex myMutex;
    std::priority_queue<std::shared_ptr<ICommand>, 
                       std::vector<std::shared_ptr<ICommand>>, 
                       CommandComparator> myQueue;
};

}

