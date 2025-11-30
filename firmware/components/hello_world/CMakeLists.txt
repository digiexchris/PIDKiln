# CMakeLists.txt for hello_world component
# This component can be used both in ESP-IDF projects and standard CMake projects

# For ESP-IDF projects, this will be included via idf_component_register
# For standard CMake projects, this will be included via add_subdirectory

# Check if we're in an ESP-IDF project by checking if idf_component_register function exists
# or if IDF_PATH is set
if(COMMAND idf_component_register)
    # ESP-IDF project
    idf_component_register(
        SRCS "hello_world.cpp"
        INCLUDE_DIRS "."
    )
else()
    # Standard CMake project (for host-based testing)
    add_library(hello_world_lib STATIC
        hello_world.cpp
    )
    
    target_include_directories(hello_world_lib PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}
    )
    
    set_target_properties(hello_world_lib PROPERTIES
        CXX_STANDARD 23
        CXX_STANDARD_REQUIRED ON
    )
endif()

