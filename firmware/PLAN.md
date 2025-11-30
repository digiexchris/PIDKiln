# ESP32 Workspace Setup with CppUTest

## Overview
Transform the firmware workspace to support both ESP32 application development and host-based unit testing with CppUTest, using CMake presets to select between projects.

## Project Structure
```
firmware/
├── CMakeLists.txt              # Root CMakeLists with preset support
├── CMakePresets.json           # CMake presets for esp32 and test-app
├── components/                  # Shared components
│   ├── hello_world/            # New hello world component
│   └── esp-max318-thermocouple/
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

### 1. Rename unity-app to test-app
- Rename `firmware/unity-app/` directory to `firmware/test-app/`
- Update any references in existing files

### 2. Create Root CMakeLists.txt
- Create `firmware/CMakeLists.txt` that uses CMake presets to select source directory
- Configure to work with ESP-IDF project structure
- Use `CMAKE_SOURCE_DIR` from preset to point to either `esp32/` or `test-app/`
- For Option B: Root CMakeLists.txt acts as a dispatcher that includes the appropriate subdirectory's CMakeLists.txt based on preset

### 3. Create CMakePresets.json
- Create `firmware/CMakePresets.json` with two presets:
  - `esp32`: Points to `esp32/` directory, uses ESP-IDF toolchain
  - `test-app`: Points to `test-app/` directory, uses host toolchain for native testing
- Configure build directories appropriately (separate build dirs for each preset)

### 4. Create ESP32 App CMakeLists.txt
- Create `firmware/esp32/CMakeLists.txt`
- Configure as standard ESP-IDF project
- Set `EXTRA_COMPONENT_DIRS` to `../components`
- Project name: `esp32_app`
- Follow ESP-IDF v5.5.1 conventions

### 5. Configure Test App with CppUTest
- Update `firmware/test-app/CMakeLists.txt`
- Remove Unity framework references
- Add CMake `FetchContent` to download CppUTest
- Configure CppUTest to only be available for test-app (not esp32)
- Set up host-based testing (native build, not ESP-IDF project)
- Include shared components from `../components`
- Use standard CMake (not ESP-IDF project.cmake) for test-app

### 6. Update Test App Main
- Convert `firmware/test-app/main/test_app_main.c` to C++ (`test_main.cpp`)
- Replace Unity includes with CppUTest includes
- Replace Unity test macros with CppUTest test macros
- Create basic test runner using CppUTest

### 7. Move Development Container Configuration
- Move `.devcontainer/` from project root to `firmware/` directory (if it exists at root)
- Move `.vscode/` from `unity-app/` to `firmware/` directory (if it exists)
- Update paths in configuration files to work from new location
- Ensure ESP-IDF extension settings point to correct paths

### 8. Create Hello World Component
- Create `firmware/components/hello_world/` directory
- Create `hello_world.h` with C++ interface (following coding standards)
- Create `hello_world.cpp` with implementation
- Create `CMakeLists.txt` for the component
- Component should return a string or print "Hello, World!"
- Follow C++23 standards and naming conventions from `.cursor/rules/cpp.mdc`

### 9. Create ESP32 Hello World App
- Create `firmware/esp32/main/main.cpp`
- Include hello_world component
- Implement `app_main()` to use hello_world component
- Create `firmware/esp32/main/CMakeLists.txt` to register main component

### 10. Create Basic CppUTest Test
- Update or create test in `firmware/test-app/main/test_main.cpp`
- Test the hello_world component functionality
- Ensure CppUTest framework is working correctly
- Test should verify hello_world component behavior

## Technical Details

### CppUTest Integration
- Use `FetchContent_Declare` and `FetchContent_MakeAvailable` in test-app CMakeLists.txt
- CppUTest repository: `https://github.com/cpputest/cpputest.git`
- Only include CppUTest in test-app, not in esp32 app
- Configure for C++23 standard

### Host-Based Testing
- Test app should build as native executable (not ESP-IDF project)
- Use standard CMake for test-app, not ESP-IDF project.cmake
- Components should be included via `add_subdirectory` or `target_include_directories`

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

