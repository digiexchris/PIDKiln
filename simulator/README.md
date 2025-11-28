# PIDKiln Frontend Simulator

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/PIDKiln_vars.json` | Live temperature/status data |
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
| POST | `/api/program/:action` | Control program (start/pause/stop/abort/load) |

## Program Status Codes

| Code | Status |
|------|--------|
| 0 | NONE |
| 1 | READY |
| 2 | RUNNING |
| 3 | PAUSED |
| 4 | STOPPED |
| 5 | ABORTED |
| 6 | WAITING_THRESHOLD |
| 7 | FINISHED |
| 8 | FAILED |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `DATA_DIR` | `../data` | Path to frontend files |

## Notes

- File uploads are limited to 10KB (same as ESP32)
- Filenames must be max 20 characters, alphanumeric with `.txt` extension
- The simulator stores all data in memory; restarting resets to defaults
