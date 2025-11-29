# Furnace Frontend Simulator

A mock server that simulates ESP32 API endpoints for frontend development.

## Quick Start (Docker)

```bash
cd simulator
docker-compose up --build
```

Then open http://localhost:3000 in your browser.

**Live development:**
- Frontend changes (`data/` directory: HTML/CSS/JS) are reflected immediately on refresh
- Backend changes (`server.js`, `mock-data.js`) require a container restart: Ctrl+C, then `docker-compose up`

## Docker Commands

```bash
# Build and start
docker-compose up --build

# Start (after initial build)
docker-compose up

# Start in background
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Run npm commands inside the container
docker-compose run --rm sim npm <command>

# Get a shell
docker-compose run --rm sim sh
```

## Without Docker

If you have Node.js installed locally:

```bash
cd simulator
npm install
npm start
```

## Features

- **Live data simulation**: Temperature values update realistically when a program is running
- **Program management**: Upload, edit, delete program files (stored in memory)
- **All API endpoints**: Mirrors the real ESP32 HTTP server responses
- **Static file serving**: Serves files from `../data/` directory (or `DATA_DIR` env var)

## API Endpoints

See [API.md](../API.md) for complete documentation.

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:3000/ws` | Real-time state updates and commands |

### HTTP
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programs/` | List program files (JSON) |
| GET | `/programs/:filename` | Get program content |
| POST | `/upload` | Upload program file |
| POST | `/delete` | Delete program file |
| GET | `/logs/` | List log files (JSON) |
| GET | `/logs/:filename` | Get log content (CSV) |
| GET | `/etc/pidkiln.conf` | Get config file |
| GET | `/api/preferences` | Get preferences (JSON) |
| POST | `/api/preferences` | Save preferences (JSON) |
| GET | `/api/debug` | Get debug info (JSON) |
| GET | `/api/history` | Temperature history (24h) |
| POST | `/api/temperature` | Set target temperature |
| POST | `/api/reboot` | Reboot device |
| POST | `/update-firmware` | Upload firmware |

### Legacy (Deprecated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/PIDKiln_vars.json` | Use WebSocket instead |
| POST | `/api/program/:action` | Use WebSocket instead |

## Program Status Codes

| Code | Status |
|------|--------|
| 0 | NONE |
| 1 | READY |
| 2 | RUNNING |
| 3 | PAUSED |
| 4 | STOPPED |
| 5 | ERROR |
| 6 | WAITING_THRESHOLD |
| 7 | FINISHED |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `DATA_DIR` | `../data` | Path to frontend files |

## Simulator Configuration

The simulator can be configured via `config.json` in the simulator directory:

```json
{
  "time": {
    "timeScale": 1.0,      // Simulation speed multiplier (1.0 = real-time, up to 25x)
    "tickIntervalMs": 1000 // Real-world ms between simulation ticks
  },
  "thermal": {
    "heaterPower": 0.5,        // Max heating rate at full power (°C/second simulated)
    "coolingCoefficient": 0.0001, // Newton's cooling coefficient
    "thermalMass": 100,        // Thermal inertia (higher = slower response)
    "ambientTemp": 20.0,       // Environment temperature (°C)
    "ambientVariation": 0.5,   // Random variation in ambient temp (°C)
    "caseHeatTransfer": 0.03,  // How much kiln temp affects case temp
    "caseBaseTemp": 25.0       // Base case temperature (°C)
  }
}
```

### Time Acceleration

When connected to the simulator, the frontend shows a "SIMULATED" badge and a time scale slider (1x-25x). This allows testing long programs quickly:

- The simulator maintains its own "simulated clock" that advances faster than real time
- All timestamps in state updates use simulated time
- The frontend chart uses simulated time for the "Now" marker
- History data uses simulated timestamps for correct chart alignment

## Notes

- File uploads are limited to 10KB (same as ESP32)
- Filenames must be max 20 characters, alphanumeric with `.json` extension
- Programs are stored on the filesystem in `../data/programs/`
- Logs and preferences are stored in memory; restarting resets them to defaults
