FROM node:20-alpine AS builder
WORKDIR /app

# Build shared-types first (needed for TypeScript compilation)
WORKDIR /app/packages/shared-types
COPY packages/shared-types/package*.json packages/shared-types/tsconfig.json ./
RUN npm ci
COPY packages/shared-types/src ./src
RUN npm run build

# Build service
WORKDIR /app/services/subscription-service
COPY services/subscription-service/package*.json services/subscription-service/tsconfig.json ./
RUN npm ci
COPY services/subscription-service/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init

# Provide local file dependency for production install
COPY --from=builder /app/packages/shared-types /app/packages/shared-types

WORKDIR /app/services/subscription-service
COPY services/subscription-service/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/services/subscription-service/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
