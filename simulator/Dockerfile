# Furnace Simulator - Development Server
# Build: docker compose build
# Run:   docker compose up

FROM node:22-alpine

# Install flatc compiler for FlatBuffers code generation
RUN apk add --no-cache flatbuffers-dev

WORKDIR /app

# Copy schema file (shared between frontend and simulator)
COPY proto/ ./proto/

# Copy and install simulator dependencies (npm ci verifies integrity hashes)
COPY simulator/package.json simulator/package-lock.json ./simulator/
WORKDIR /app/simulator
RUN npm ci

# Copy and install frontend dependencies (npm ci verifies integrity hashes)
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Copy simulator source and build
WORKDIR /app
COPY simulator/build.js simulator/tsconfig.json ./simulator/
COPY simulator/src/ ./simulator/src/

WORKDIR /app/simulator
RUN npm run build

# Copy frontend source and build
WORKDIR /app
COPY frontend/ ./frontend/

WORKDIR /app/frontend
RUN npm run build

# Expose the server port
EXPOSE 3000

WORKDIR /app

# Start frontend watch, simulator watch, and simulator server
CMD sh -c "cd /app/frontend && npm run watch & cd /app/simulator && npm run watch & sleep 3 && node /app/simulator/dist/server.js"
