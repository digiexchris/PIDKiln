# ESP32 Workspace Setup with CppUTest

## Overview
Transform the firmware workspace to support both ESP32 application development and host-based unit testing with CppUTest, using CMake presets to select between projects.

## Project Structure
```
firmware/
├── CMakeLists.txt              # Root CMakeLists with preset support
├── CMakePresets.json           # CMake presets for esp32 and test-app
├── components/                  # Shared components
│   ├── hello_world/            # Hello world component
│   ├── command_system/         # Command pattern + state machine
│   └── flatbuffers_handler/    # Web handler for FlatBuffers messages
├── esp32/                      # Main ESP32 application
│   ├── CMakeLists.txt
│   └── main/
│       └── main.cpp
├── test-app/                   # Renamed from unity-app
│   ├── CMakeLists.txt
│   └── main/
│       └── test_main.cpp
├── .devcontainer/              # Moved from root (if exists)
└── .vscode/                    # Moved from unity-app (if exists)
```

## Implementation Steps

### 1. Rename unity-app to test-app ✅
- Rename `firmware/unity-app/` directory to `firmware/test-app/`
- Update any references in existing files
- **Status:** Completed

### 2. Create Root CMakeLists.txt ✅
- Create `firmware/CMakeLists.txt` that uses CMake presets to select source directory
- Configure to work with ESP-IDF project structure
- Use `CMAKE_SOURCE_DIR` from preset to point to either `esp32/` or `test-app/`
- For Option B: Root CMakeLists.txt acts as a dispatcher that includes the appropriate subdirectory's CMakeLists.txt based on preset
- **Status:** Completed

### 3. Create CMakePresets.json ✅
- Create `firmware/CMakePresets.json` with two presets:
  - `esp32`: Points to `esp32/` directory, uses ESP-IDF toolchain
  - `test-app`: Points to `test-app/` directory, uses ESP-IDF Linux target for host-based testing
- Configure build directories appropriately (separate build dirs for each preset)
- **Status:** Completed

### 4. Create ESP32 App CMakeLists.txt ✅
- Create `firmware/esp32/CMakeLists.txt`
- Configure as standard ESP-IDF project
- Set `EXTRA_COMPONENT_DIRS` to `../components` and `components` (shared + ESP32-specific)
- Project name: `esp32_app`
- Follow ESP-IDF v5.5.1 conventions
- **Status:** Completed

### 5. Configure Test App with CppUTest ✅
- Update `firmware/test-app/CMakeLists.txt`
- Remove Unity framework references
- Add CMake `FetchContent` to download CppUTest
- Configure CppUTest to only be available for test-app (not esp32)
- Set up host-based testing using ESP-IDF Linux target (`idf.py --preview set-target linux`)
- Include shared components from `../components`
- Use ESP-IDF project.cmake for test-app (Linux target)
- **Status:** Completed

### 6. Update Test App Main ✅
- Convert `firmware/test-app/main/test_app_main.c` to C++ (`test_main.cpp`)
- Replace Unity includes with CppUTest includes
- Replace Unity test macros with CppUTest test macros
- Create basic test runner using CppUTest with `app_main()` entry point
- **Status:** Completed

### 7. Move Development Container Configuration ✅
- Move `.devcontainer/` from project root to `firmware/` directory
- Update paths in configuration files to work from new location
- Ensure ESP-IDF extension settings point to correct paths
- **Status:** Completed

### 8. Create Hello World Component ✅
- Create `firmware/components/hello_world/` directory
- Create `hello_world.h` with C++ interface (following coding standards)
- Create `hello_world.cpp` with implementation
- Create `CMakeLists.txt` for the component
- Component should return a string or print "Hello, World!"
- Follow C++23 standards and naming conventions from `.cursor/rules/cpp.mdc`
- **Status:** Completed

### 9. Create ESP32 Hello World App ✅
- Create `firmware/esp32/main/main.cpp`
- Include hello_world component
- Implement `app_main()` to use hello_world component
- Create `firmware/esp32/main/CMakeLists.txt` to register main component
- **Status:** Completed

### 10. Create Basic CppUTest Test ✅
- Update or create test in `firmware/test-app/main/test_main.cpp`
- Test the hello_world component functionality
- Ensure CppUTest framework is working correctly
- Test should verify hello_world component behavior
- **Status:** Completed - All 3 tests passing

### 11. Design Command System and State Machine Component
- Design a C++ OOP component implementing the command pattern with a central state machine
- Component must be hardware-agnostic and shareable between test-app and esp32 firmware
- Place in `firmware/components/command_system/` directory
- Review ARCHITECTURE.md, API.md, and simulator/SPECIFICATION.md for state machine requirements
- Component should handle:
  - Command pattern implementation with priority queue
  - State machine managing program execution states (NONE, READY, RUNNING, PAUSED, STOPPED, ERROR, WAITING_THRESHOLD, FINISHED)
  - State transition rules and validation per SPECIFICATION.md
  - Priority-based command processing (Emergency, Critical, High, Normal, Low)
  - Multiple command sources:
    - Hardware UI (physical buttons) - via ICommandSource interface
    - Internal hardware monitoring threads (thermocouple, safety checks) - via ICommandSource interface
    - Web frontend (via FlatBuffers handler component) - via ICommandSource interface
  - Command cancellation when state becomes incompatible
  - State change notifications/observers for components that need to react to state changes
  - Thread-safe command queue for multi-threaded command sources
- Follow C++23 standards and coding conventions from `.cursor/rules/cpp.mdc`
- Design for testability with CppUTest
- Use dependency injection for hardware-specific operations (allows mocking in tests)
- Design ICommandSource interface to allow multiple input channels
- **Status:** Pending

### 12. Design Program Executor Component
- Design a C++ OOP component for executing furnace programs
- Component manages segment timing, temperature ramping, and step tracking
- Component subscribes to state changes from Command System
- Component controls temperature via ITemperatureController interface
- Component runs program execution logic when state is RUNNING
- Component detects program completion and triggers state transitions
- Place in `firmware/components/` directory (exact location TBD)
- **Status:** Pending (Future step - after command system)

### 13. Design FlatBuffers Web Handler Component
- Design a C++ OOP component for processing FlatBuffers messages from `proto/furnace.fbs`
- Component must be hardware-agnostic and shareable between test-app and esp32 firmware
- Place in `firmware/components/flatbuffers_handler/` directory
- Review ARCHITECTURE.md and API.md for message flow and protocol requirements
- Component serves as the web handler for communication with the frontend
- Component should handle:
  - Encoding/decoding ClientEnvelope and ServerEnvelope messages
  - Processing all routes/message types defined in the schema (commands, requests, responses)
  - Converting FlatBuffers commands to Command System commands (inserts into command queue)
  - Routing incoming messages to appropriate handlers
  - Type-safe access to FlatBuffers data structures
  - Error handling for malformed messages
  - Request/response matching via request_id
  - Zero-copy reads where possible (FlatBuffers advantage)
  - WebSocket message framing and protocol management
  - Integration with Command System component (acts as ICommandSource)
- Follow C++23 standards and coding conventions from `.cursor/rules/cpp.mdc`
- Design for testability with CppUTest
- Consider integration with FlatBuffers code generation (C++ bindings from schema)
- Design with dependency injection for Command System integration (allows mocking in tests)
- **Status:** Pending

## Technical Details

### CppUTest Integration
- Use `FetchContent_Declare` and `FetchContent_MakeAvailable` in test-app CMakeLists.txt
- CppUTest repository: `https://github.com/cpputest/cpputest.git`
- Only include CppUTest in test-app, not in esp32 app
- Configure for C++23 standard

### Host-Based Testing
- Test app uses ESP-IDF Linux target (`idf.py --preview set-target linux`)
- Uses ESP-IDF project.cmake for consistency with esp32 app
- Components are included via `EXTRA_COMPONENT_DIRS` pointing to `../components`
- Requires `libbsd-dev` system package for Linux target

### CMake Presets Structure (Option B - Separate Projects)
- Each app (`esp32/` and `test-app/`) is a separate ESP-IDF/CMake project
- Root `CMakeLists.txt` uses presets to select which subdirectory to build
- Presets use `sourceDir` to point to subdirectories (`esp32/` or `test-app/`)
- Each preset has its own `binaryDir` (e.g., `build/esp32/` and `build/test-app/`)
- ESP32 preset: Uses ESP-IDF project structure, includes ESP-IDF toolchain
- Test-app preset: Uses standard CMake for host-based testing, includes CppUTest via FetchContent
- This approach follows ESP-IDF conventions where each app is a separate project

### Coding Standards
- Follow C++23 standards from `.cursor/rules/cpp.mdc`
- Use CamelCase for classes and methods
- Use camelCase with "my" prefix for member variables
- Use camelCase for local variables
- Parameters start with countable nouns (a, an, some, any)
- Braces on their own line
- ESP-IDF v5.5.1 API compliance

## Notes
- ESP-IDF tooling is installed at `/home/chris/esp/v5.5.1/esp-idf`
- ESP-IDF documentation: https://docs.espressif.com/projects/esp-idf/en/v5.5.1/esp32/api-guides/index.html
- This setup allows running `idf.py` commands from within each app directory
- CMake presets enable VS Code and other IDEs to easily switch between projects

