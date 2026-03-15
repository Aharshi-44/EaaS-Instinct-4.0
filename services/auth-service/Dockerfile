# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build shared-types first (needed for TypeScript compilation)
WORKDIR /app/packages/shared-types
COPY packages/shared-types/package*.json packages/shared-types/tsconfig.json ./
RUN npm ci
COPY packages/shared-types/src ./src
RUN npm run build

# Build service
WORKDIR /app/services/auth-service
COPY services/auth-service/package*.json services/auth-service/tsconfig.json ./
RUN npm install
COPY services/auth-service/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Provide local file dependency for production install
COPY --from=builder /app/packages/shared-types /app/packages/shared-types

WORKDIR /app/services/auth-service
COPY services/auth-service/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/services/auth-service/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health/live || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
