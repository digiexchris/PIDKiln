if(DEFINED ENV{IDF_PATH})
    idf_component_register(SRCS "test_main.cpp"
                        INCLUDE_DIRS "."
                        REQUIRES command_system)

    target_compile_options(${COMPONENT_LIB} PRIVATE
        -fexceptions
    )

    target_include_directories(${COMPONENT_LIB} PRIVATE
        ${CMAKE_BINARY_DIR}/_deps/cpputest-src/include
    )

    target_link_libraries(${COMPONENT_LIB} PRIVATE
        ${CMAKE_BINARY_DIR}/_deps/cpputest-build/src/CppUTest/libCppUTest.a
        ${CMAKE_BINARY_DIR}/_deps/cpputest-build/src/CppUTestExt/libCppUTestExt.a
    )
endif()

# target_link_libraries(test_app PRIVATE
#     CppUTest::CppUTest
#     CppUTest::CppUTestExt
# )