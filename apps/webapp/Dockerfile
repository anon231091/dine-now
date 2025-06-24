# Web App Dockerfile (Next.js Telegram Mini App)
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root package.json and turbo config
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/webapp/package.json ./apps/webapp/

# Install dependencies
RUN pnpm install

# Build shared packages
RUN pnpm --filter=@dine-now/shared build

# Development stage
FROM base AS development

# Install development dependencies
RUN pnpm install

# Copy webapp source
COPY apps/webapp ./apps/webapp

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "--filter=@dine-now/webapp", "dev"]

# Production dependencies stage
FROM base AS deps

# Copy package files
COPY apps/webapp/package.json ./apps/webapp/

# Install production dependencies
RUN pnpm --filter=@dine-now/webapp install --prod

# Builder stage
FROM base AS builder

# Copy webapp source
COPY apps/webapp ./apps/webapp

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN pnpm run build --workspace=@dine-now/webapp

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/webapp/node_modules ./apps/webapp/node_modules
COPY --from=deps /app/packages ./packages

# Copy built application
COPY --from=builder /app/apps/webapp/public ./apps/webapp/public
COPY --from=builder /app/apps/webapp/.next ./apps/webapp/.next
COPY --from=builder /app/apps/webapp/package.json ./apps/webapp/

# Create .next cache directory
RUN mkdir .next/cache

# Change ownership
RUN chown -R nextjs:nodejs /app

# Change to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"

# Start production server
CMD ["dumb-init", "node", "apps/webapp/server.js"]
