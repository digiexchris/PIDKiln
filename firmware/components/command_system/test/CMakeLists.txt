idf_component_register(
    SRCS "test_interfaces.cpp"
    INCLUDE_DIRS "."
    REQUIRES command_system
)

target_include_directories(${COMPONENT_LIB} PRIVATE
    ${CMAKE_SOURCE_DIR}/build/_deps/cpputest-src/include
)

target_link_libraries(${COMPONENT_LIB} PRIVATE
    CppUTest::CppUTest
    CppUTest::CppUTestExt
)

