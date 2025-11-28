# PIDKiln Simulator - Development Server
# Build: docker compose build
# Run:   docker compose up

FROM node:22-alpine

WORKDIR /app

# Copy package.json and install dependencies
# This layer is cached unless package.json changes
COPY package.json ./

# Generate lock file and install dependencies
RUN npm install

# Copy application code
COPY server.js mock-data.js ./

# Expose the server port
EXPOSE 3000

# Default command: run the server
CMD ["node", "server.js"]

