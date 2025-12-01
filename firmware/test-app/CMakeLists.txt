# The following lines of boilerplate have to be in your project's
# CMakeLists in this exact order for cmake to work correctly
cmake_minimum_required(VERSION 3.16)

# if(DEFINED ENV{IDF_PATH})
#     include($ENV{IDF_PATH}/tools/cmake/version.cmake)
#     set(EXTRA_COMPONENT_DIRS "../components")
# endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

FetchContent_Declare(
    CppUTest
    GIT_REPOSITORY https://github.com/cpputest/cpputest.git
    GIT_TAG        v4.0
)

FetchContent_MakeAvailable(CppUTest)

# if(DEFINED ENV{IDF_PATH})
#     include($ENV{IDF_PATH}/tools/cmake/project.cmake)
#     project(test_app)
# else()
    project(test_app)
    
    add_subdirectory(../lib/Furnace Furnace)
    
    add_executable(test_app
        main/test_main.cpp
    )
    
    target_link_libraries(test_app
        Furnace
        CppUTest
        CppUTestExt
    )
    
    target_include_directories(test_app PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
    )
    
    set_target_properties(test_app PROPERTIES
        CXX_STANDARD 23
        CXX_STANDARD_REQUIRED ON
    )
# endif()



