# Root CMakeLists.txt for ESP32 workspace
# This file uses CMake presets to select between esp32 and test-app projects
# Each preset points to a different source directory

cmake_minimum_required(VERSION 3.16)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/firmware/lib)

if (NOT DEFINED ENV{IDF_PATH})
project(test_app)
add_subdirectory(firmware/test-app)
endif()
# CMake presets will set CMAKE_SOURCE_DIR to point to either esp32/ or test-app/
# This root file acts as a dispatcher - the actual project configuration
# is in the subdirectory's CMakeLists.txt

# For Option B: Each app is a separate project
# The preset's sourceDir will point directly to esp32/ or test-app/
# So this root CMakeLists.txt may not be directly used, but is here for reference
# The actual build happens in the subdirectories based on preset configuration

