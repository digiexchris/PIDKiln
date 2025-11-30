# Install script for directory: /home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/src/CppUTestExt

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/usr/local")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "RelWithDebInfo")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Install shared libraries without execute permission?
if(NOT DEFINED CMAKE_INSTALL_SO_NO_EXE)
  set(CMAKE_INSTALL_SO_NO_EXE "1")
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

# Set path to fallback-tool for dependency-resolution.
if(NOT DEFINED CMAKE_OBJDUMP)
  set(CMAKE_OBJDUMP "/usr/bin/objdump")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib" TYPE STATIC_LIBRARY FILES "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-build/src/CppUTestExt/libCppUTestExt.a")
endif()

if(CMAKE_INSTALL_COMPONENT STREQUAL "Unspecified" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/CppUTestExt" TYPE FILE FILES
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/CodeMemoryReportFormatter.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/IEEE754ExceptionsPlugin.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MemoryReportAllocator.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockExpectedCall.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockCheckedExpectedCall.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockExpectedCallsList.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockSupportPlugin.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MemoryReportFormatter.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockFailure.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockSupport.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockSupport_c.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/GMock.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/GTest.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/GTestSupport.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MemoryReporterPlugin.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/OrderedTest.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/GTestConvertor.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockActualCall.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockCheckedActualCall.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockNamedValue.h"
    "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src/include/CppUTestExt/MockSupport.h"
    )
endif()

