# Furnace Development Guide

Guide for developers working on the Furnace frontend and simulator.

---

## Prerequisites

- Docker and Docker Compose (v2+)
- Git

No local Node.js installation is required - all npm commands run inside the Docker container.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Saur0o0n/pidkiln.git
cd pidkiln

# Start the development environment
cd simulator
docker-compose up --build

# Open in browser
open http://localhost:3000
```

The first build takes a few minutes to install dependencies. Subsequent starts are faster.

---

## Project Structure

```
PIDKiln/
├── frontend/               # Web frontend (TypeScript SPA)
│   ├── src/               # Source code
│   ├── dist/              # Build output (generated)
│   ├── programs/          # Firing program files (*.json)
│   ├── index.html         # HTML template
│   ├── build.js           # esbuild configuration
│   └── package.json
├── simulator/             # Development mock server
│   ├── src/               # TypeScript source
│   ├── dist/              # Build output (generated)
│   ├── config.json        # Simulator configuration
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── package.json
├── proto/                 # FlatBuffers schema
│   └── furnace.fbs
├── bdd/                   # Gherkin feature specifications
├── src/                   # ESP32 backend (C++)
├── API.md                 # API reference
├── ARCHITECTURE.md        # System architecture
└── DEVELOPMENT.md         # This file
```

---

## Docker Commands

All commands are run from the `simulator/` directory.

### Container Management

```bash
# Build and start (first time or after Dockerfile changes)
docker-compose up --build

# Start (after initial build)
docker-compose up

# Start in background
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Running npm Commands

Since npm is not installed locally, all npm commands run through the container:

```bash
# Frontend commands
docker-compose exec sim sh -c "cd /app/frontend && npm run <command>"

# Simulator commands
docker-compose exec sim sh -c "cd /app/simulator && npm run <command>"

# Get a shell inside the container
docker-compose exec sim sh
```

---

## Development Workflow

### Live Reloading

The Docker setup includes watch mode for both frontend and simulator:

- **Frontend changes** (`frontend/src/*.ts`): Automatically rebuilt by esbuild, refresh browser to see changes
- **Simulator changes** (`simulator/src/*.ts`): Automatically rebuilt, server restarts automatically
- **HTML/CSS changes**: Refresh browser to see changes

### Type Checking

```bash
# Check frontend TypeScript
docker-compose exec sim sh -c "cd /app/frontend && npm run typecheck"

# Check simulator TypeScript
docker-compose exec sim sh -c "cd /app/simulator && npm run typecheck"
```

### Building

```bash
# Build frontend (production)
docker-compose exec sim sh -c "cd /app/frontend && npm run build"

# Build simulator
docker-compose exec sim sh -c "cd /app/simulator && npm run build"
```

---

## FlatBuffers Schema

The communication protocol is defined in `proto/furnace.fbs`. When you modify the schema:

### Regenerate TypeScript Types

```bash
# Regenerate frontend types
docker-compose exec sim sh -c "cd /app/frontend && npm run generate"

# Regenerate simulator types
docker-compose exec sim sh -c "cd /app/simulator && npm run generate"
```

The `generate` script:
1. Runs `flatc` to generate TypeScript from the schema
2. Adds `// @ts-nocheck` to generated files (they don't pass strict type checking)

### Schema Location

- **Schema file**: `proto/furnace.fbs`
- **Generated frontend types**: `frontend/src/generated/furnace/`
- **Generated simulator types**: `simulator/src/generated/furnace/`

---

## Simulator Configuration

The simulator can be configured via `simulator/config.json`:

```json
{
  "time": {
    "timeScale": 1.0,      // Simulation speed (1.0 = real-time, up to 25x)
    "tickIntervalMs": 1000 // Real-world ms between simulation ticks
  },
  "thermal": {
    "heaterPower": 0.5,        // Max heating rate (°C/second simulated)
    "coolingCoefficient": 0.0001, // Newton's cooling coefficient
    "thermalMass": 100,        // Thermal inertia (higher = slower)
    "ambientTemp": 20.0,       // Environment temperature (°C)
    "ambientVariation": 0.5,   // Random variation (°C)
    "caseHeatTransfer": 0.03,  // Kiln-to-case heat transfer fraction
    "caseBaseTemp": 25.0       // Base case temperature (°C)
  }
}
```

### Time Acceleration

The simulator supports accelerated time for testing long programs:

- When connected to the simulator, the frontend shows a "SIMULATED" badge
- A slider (1x-25x) controls simulation speed
- All timestamps use simulated time, so the chart displays correctly
- The frontend's "Now" marker uses simulated time when in simulator mode

---

## Adding New Features

### Adding a New WebSocket Command

1. **Update the schema** (`proto/furnace.fbs`):
   ```flatbuffers
   table MyNewCommand {
     some_field: string;
   }
   
   union ClientMessage {
     // ... existing commands ...
     MyNewCommand,
   }
   ```

2. **Regenerate types**:
   ```bash
   docker-compose exec sim sh -c "cd /app/frontend && npm run generate"
   docker-compose exec sim sh -c "cd /app/simulator && npm run generate"
   ```

3. **Add encoder in frontend** (`frontend/src/flatbuffers.ts`):
   ```typescript
   export function encodeMyNewCommand(someField: string): Uint8Array {
     const builder = new flatbuffers.Builder(128);
     // ... encoding logic ...
   }
   ```

4. **Add decoder in simulator** (`simulator/src/flatbuffers.ts`):
   ```typescript
   export interface DecodedMyNewCommand {
     type: 'my_new';
     requestId: number;
     someField: string;
   }
   ```

5. **Handle in simulator server** (`simulator/src/server.ts`):
   ```typescript
   case 'my_new': {
     // Handle the command
     ws.send(encodeAck(msg.requestId, true));
     break;
   }
   ```

6. **Update documentation**:
   - `API.md`: Document the new command
   - `ARCHITECTURE.md`: Update if architectural changes
   - `bdd/`: Add feature specifications

### Adding a New View

1. **Create view file** (`frontend/src/views/myview.ts`):
   ```typescript
   export function loadMyView() {
     const content = document.getElementById('viewContent');
     if (!content) return;
     content.innerHTML = `<h2>My View</h2>`;
   }
   ```

2. **Add to router** (`frontend/src/router.ts`):
   ```typescript
   case '/myview':
     loadMyView();
     break;
   ```

3. **Add navigation link** (`frontend/index.html`):
   ```html
   <a class="nav-item" href="#/myview" data-view="myview">
     <span class="icon">📌</span>
     <span>My View</span>
   </a>
   ```

4. **Export from main** (`frontend/src/main.ts`) if needed for onclick handlers

---

## Testing

### Manual Testing

1. Start the simulator: `docker-compose up`
2. Open http://localhost:3000
3. Test features manually

### BDD Specifications

Feature specifications are in `bdd/` directory using Gherkin syntax:

```gherkin
Feature: Dashboard
  Scenario: View current temperature
    Given I am on the dashboard
    Then I should see the current kiln temperature
```

These serve as documentation and can be used with testing frameworks like Cucumber.

---

## Troubleshooting

### Container won't start

```bash
# Check for port conflicts
lsof -i :3000

# Rebuild from scratch
docker-compose down
docker volume rm simulator_frontend_node_modules simulator_simulator_node_modules
docker-compose up --build
```

### TypeScript errors after schema change

```bash
# Regenerate types
docker-compose exec sim sh -c "cd /app/frontend && npm run generate"
docker-compose exec sim sh -c "cd /app/simulator && npm run generate"

# Rebuild
docker-compose exec sim sh -c "cd /app/frontend && npm run build"
```

### Changes not appearing

- **Frontend**: Refresh browser (F5 or Cmd+R)
- **Simulator**: Restart container (`docker-compose restart`)
- **Schema**: Regenerate types and rebuild

### Permission errors on mounted volumes

```bash
# Fix ownership (Linux)
sudo chown -R $USER:$USER frontend/ simulator/
```

---

## Code Style

### TypeScript

- Strict mode enabled
- No implicit any
- Prefer `const` over `let`
- Use type imports: `import type { X } from './types'`

### Naming Conventions

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

### Documentation

- Update `API.md` when changing endpoints
- Update `ARCHITECTURE.md` for structural changes
- Update `bdd/` for feature changes
- Keep this file (`DEVELOPMENT.md`) current with workflow changes

---

## Related Documentation

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System architecture overview |
| `API.md` | Complete API reference |
| `simulator/README.md` | Simulator-specific documentation |
| `frontend/PLAN_SPA.md` | Frontend development roadmap |
| `bdd/` | Feature specifications |

