# Claude AI Configuration for PIDKiln Project

This document provides configuration and guidelines for Claude AI when working on the project.

---

## Communication Style

- Do not apologize or say sorry
- Be direct and concise
- State corrections matter-of-factly without hedging

---

## Code Comments

- Avoid adding unnecessary comments unless it is important for readability
- Avoid removing existing comments unless they are no longer relevant

---

## Context Search Rules

- Do not search or use any files in the `bak/` directory for any purpose
- The `bak/` directory is ignored during indexing

---

## C++ Coding Standards

These standards apply to all C++ code in the project, particularly firmware components.

### Language Version & Preferences

- Prefer C++23 standard
- Prefer C++ style casts and features over C features when possible
- Prefer object-oriented design common with C++23 projects

### Code Style & Formatting

- A brace related to a block should be on its own line
- New C++ headers and source files should use `.hpp` or `.cpp` as extensions

### Naming Conventions

#### Classes
- Class names start with a capital letter, and are CamelCase
- Example: `class MyClass { };`

#### Methods
- Class method names start with a capital letter, and are CamelCase
- Private and protected class methods follow the same standard, but are prefixed with the word "Priv"
- Example: `void PublicMethod();` or `void PrivPrivateMethod();`

#### Member Variables
- Class member variables are camelCase but start with a lower case letter, and are prefixed with the word "my"
- Example: `int myClassMember;`

#### Local Variables
- Function or block local variables are camelCase and start with a lowercase letter, and do not need to be prefixed with "my"
- Local variables do not start with a countable noun unless required for clarity
- Example: `int localVariable;`

#### Parameters
- Function and method parameter names are camelCase, and start with a countable noun, such as "a", "an", "some", "any"
- Example: `void ProcessData(int aParameterName);`

### Design Principles

- Design code to be maintainable, reusable, and extendable
- Organize class member variables in order of best memory packing
- Consider ESP32 performance when designing systems and implementing code, but prefer memory safety and type safety over performance if both cannot be achieved at the same time
- Design for testability in mind. Suggest designs that are easier to unit test, and write tests for any code you write where possible. Notify the user when it is not possible to write tests.

---

## ESP32 Framework

### Version
- Use ESP-IDF v5.5.1 for any code generated
- Ensure all code conforms to the v5.5.x API

### Installation Paths
- ESP-IDF: `/home/chris/esp/v5.5.1/esp-idf`
- ESP Tools: `/home/chris/.espressif/`

### API Documentation
- Official v5.5.1 documentation: https://docs.espressif.com/projects/esp-idf/en/v5.5.1/esp32/api-guides/index.html

### File Scope
These ESP32 rules apply to files matching: `**/*.cpp`, `**/*.h`, `**/*.hpp`, `**/*.cxx`, `**/*.hxx`

---

## Project Documentation References

Please consult these files for detailed information about different aspects of the project:

### Core Documentation
- [API.md](API.md) - Complete API reference for HTTP and WebSocket interfaces, FlatBuffers protocol, program format
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview, component diagrams, frontend architecture, state management
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development workflow, Docker setup, npm commands, testing procedures

### Firmware Documentation
- [firmware/README.md](firmware/README.md) - Firmware development guide, ESP-IDF setup, project structure, component organization, testing

### Quick Navigation

**Working on the API?** → See [API.md](API.md)
**Need architectural context?** → See [ARCHITECTURE.md](ARCHITECTURE.md)
**Setting up development environment?** → See [DEVELOPMENT.md](DEVELOPMENT.md)
**Working on ESP32 firmware?** → See [firmware/README.md](firmware/README.md)

---

## Project Overview

(Furnace) is a programmable kiln controller system consisting of:

1. **ESP32 Backend** - C++ firmware running ESP-IDF v5.5.1
2. **Frontend SPA** - TypeScript web interface (esbuild + uPlot)
3. **Simulator** - Node.js/TypeScript development mock server
4. **Communication Protocol** - FlatBuffers over WebSocket

The system provides PID-based temperature control, multi-segment firing programs, real-time monitoring, and comprehensive safety features.

---

## Development Targets

The firmware supports two build targets:

- **ESP32** - Production hardware target (`firmware/esp32/`)
- **Linux** - Unit testing target with CppUTest (`firmware/test-app/`)

Components in `firmware/components/` must be hardware-agnostic and work with both targets. ESP32-specific components go in `firmware/esp32/components/`.
