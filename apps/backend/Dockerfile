# Backend Dockerfile
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    bash
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root package.json and turbo config
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install

# Build shared packages
RUN pnpm --filter=@dine-now/shared build
RUN pnpm --filter=@dine-now/database build

# Development stage
FROM base AS development

# Install development dependencies
RUN pnpm install

# Copy backend source
COPY apps/backend ./apps/backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start development server
CMD ["pnpm", "--filter=@dine-now/backend", "dev"]

# Production build stage
FROM base AS builder

# Copy backend source
COPY apps/backend ./apps/backend

# Build the application
RUN pnpm run build --workspace=@dine-now/backend

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages ./packages

# Install production dependencies only
RUN pnpm --filter=@dine-now/backend install --prod && pnpm cache delete

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Change to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start production server
CMD ["dumb-init", "node", "apps/backend/dist/index.js"]
