# ================================
# Merchant Hub API - Production Dockerfile
# Multi-stage build for optimized image size
# ================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Build
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN pnpm build

# ================================
# Stage 3: Production
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm for production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Set production environment
ENV NODE_ENV=production
ENV PORT=6767

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations (if needed at runtime)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Change ownership to non-root user
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 6767

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:6767/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
