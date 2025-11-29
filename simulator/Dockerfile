# Furnace Simulator - Development Server
# Build: docker compose build
# Run:   docker compose up

FROM node:22-alpine

WORKDIR /app

# Copy and install simulator dependencies
COPY simulator/package.json ./simulator/
WORKDIR /app/simulator
RUN npm install

# Copy and install frontend dependencies
WORKDIR /app
COPY frontend/package.json ./frontend/
WORKDIR /app/frontend
RUN npm install

# Copy application code (will be overridden by volume mounts in dev)
WORKDIR /app
COPY simulator/server.js simulator/mock-data.js ./simulator/
COPY frontend/ ./frontend/

# Build frontend initially
WORKDIR /app/frontend
RUN npm run build

# Expose the server port
EXPOSE 3000

WORKDIR /app

# Start frontend watch and simulator server
CMD sh -c "cd /app/frontend && npm run watch & sleep 2 && cd /app/simulator && node server.js"
