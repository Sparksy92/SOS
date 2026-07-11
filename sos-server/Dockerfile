FROM node:22-bullseye-slim

WORKDIR /app

# Install system dependencies needed for SQLite and python sidecars
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3001

CMD ["node", "index.js"]
