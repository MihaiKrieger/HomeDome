# Multi-stage production build for HomeDome Smart Tracker
# Stage 1: Dependency resolution and compilation
FROM node:22 AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Clean install of all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy the entire source tree
COPY . .

# Build Vite frontend assets and bundle Express backend server
RUN npm run build

# Remove development-only dependencies to minimize production runtime footprint
RUN npm prune --production

# Stage 2: Clean, secure production runtime environment
FROM node:22-slim AS runner

WORKDIR /app

# Establish environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy only compiled outputs and production node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Setup persistent directory for SQLite database storage and give Node user ownership
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use a non-root system user for secure container execution
USER node

# Port 3000 is exposed for external routing (matches custom server binding)
EXPOSE 3000

# Volume mount point for external databases/backups
VOLUME ["/app/data"]

# Run server
CMD ["node", "dist/server.cjs"]
