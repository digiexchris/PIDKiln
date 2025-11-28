# Dev Container Plan

Docker-based development environment for PIDKiln frontend work.

## Status: COMPLETE

## Overview

A Docker Compose setup that provides:
- Node.js 22 runtime (for simulator)
- Dependencies installed at build time (fast subsequent starts)
- Port 3000 forwarded for simulator
- Live volume mount for `data/` directory

## Files

| File | Status | Purpose |
|------|--------|---------|
| `simulator/Dockerfile` | ✅ Done | Node 22 Alpine with dependencies |
| `simulator/docker-compose.yml` | ✅ Done | Container orchestration |
| `simulator/.dockerignore` | ✅ Done | Exclude unnecessary files from build |

## Usage

```bash
cd simulator

# Build and start (first time, or after changing Dockerfile/package.json)
docker-compose up --build

# Start (subsequent times)
docker-compose up

# Start in background
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Run npm commands inside the container
docker-compose run --rm sim npm <command>

# Get a shell inside the container
docker-compose run --rm sim sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Docker Container (node:22-alpine)                      │
│                                                         │
│  /app (built into image)                                │
│  ├── server.js                                          │
│  ├── mock-data.js                                       │
│  ├── package.json                                       │
│  └── node_modules/                                      │
│                                                         │
│  /frontend (volume mount from ../data/, read-only)      │
│  └── *.html, css/, js/, icons/, etc.                    │
│                                                         │
│  Port 3000 ─────────────────────────────────────────▶   │
└─────────────────────────────────────────────────────────┘
```

## Live Reloading

The `data/` directory is mounted as a volume at `/frontend`. Changes to HTML, CSS, and JavaScript files are immediately visible when you refresh the browser — no container rebuild needed.

To apply changes to the simulator code (`server.js`, `mock-data.js`), restart the container:
```bash
docker-compose restart
```

## Dependencies

None. This is the base layer.

## Downstream Dependents

- [Simulator Plan](simulator/PLAN_SIMULATOR.md) - Mock API server
- [SPA Frontend](data/PLAN_SPA.md) - Web frontend

## Related Documentation

- [API Reference](API.md) - Complete HTTP and WebSocket API documentation
