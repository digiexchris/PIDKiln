# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src")
  file(MAKE_DIRECTORY "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-src")
endif()
file(MAKE_DIRECTORY
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-build"
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix"
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/tmp"
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/src/cpputest-populate-stamp"
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/src"
  "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/src/cpputest-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/src/cpputest-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/home/chris/repos/PIDKiln/firmware/test-app/build/_deps/cpputest-subbuild/cpputest-populate-prefix/src/cpputest-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
