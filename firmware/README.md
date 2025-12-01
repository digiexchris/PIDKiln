# Firmware Development

## Prerequisites

### ESP-IDF 5.5.1

ESP-IDF v5.5.1 must be installed and configured. It is recommended to use vscode and the Espressif ESP-IDF extension.

For other systems, install ESP-IDF following the [official guide](https://docs.espressif.com/projects/esp-idf/en/v5.5.1/esp32/get-started/index.html).

### System Dependencies

Install required system packages:

```bash
sudo apt-get install libbsd-dev cmake ninja-build
```

## Project Structure

```
firmware/
├── components/          # Hardware-agnostic components (safe for Linux target)
├── esp32/              # Main ESP32 application
│   └── components/     # ESP32-specific components
└── test-app/           # Unit test application (Linux target)
```

## Setup

1. Activate ESP-IDF environment:
```bash
source /home/chris/esp/v5.5.1/esp-idf/export.sh
```

2. For test-app (Linux target):
```bash
cd firmware/test-app
idf.py --preview set-target linux
idf.py build
idf.py monitor
```

3. For esp32 app (ESP32 hardware):
```bash
cd firmware/esp32
idf.py set-target esp32
idf.py build
idf.py flash
idf.py monitor
```

## Component Organization

- **`firmware/components/`**: Hardware-agnostic components that work with both ESP32 and Linux targets. Use only standard C/C++ libraries, no ESP-IDF hardware APIs.
- **`firmware/esp32/components/`**: ESP32-specific components that require hardware drivers or ESP-IDF APIs not available on Linux.

## Testing

The test-app uses CppUTest for unit testing and runs on the Linux host target. Tests can use components from `firmware/components/` but not from `firmware/esp32/components/`.

## CMake Presets

CMake presets are configured in `CMakePresets.json`:
- `esp32`: Builds the ESP32 application
- `test-app`: Builds the test application for Linux

