# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "RelWithDebInfo")
  file(REMOVE_RECURSE
  "config/sdkconfig.cmake"
  "config/sdkconfig.h"
  "esp-idf/mbedtls/x509_crt_bundle"
  "project_elf_src_linux.c"
  "test_app.map"
  "x509_crt_bundle.S"
  )
endif()
