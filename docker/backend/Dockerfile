# Multi-stage build for optimized production image
# Stage 1: Builder
FROM node:18-alpine as builder

WORKDIR /app

# Install build dependencies - openssl must be here too, not just in the
# runtime stage: `npm ci` triggers `prisma generate`, and Prisma detects
# which OpenSSL-suffixed engine binary to build for at generate time, in
# this stage. Without it here, Prisma silently falls back to generating
# a plain "linux-musl" binary with no openssl suffix, ignoring the
# linux-musl-openssl-3.0.x entry in binaryTargets.
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install security updates and runtime dependencies - openssl is required
# by Prisma's query engine binary (linux-musl-openssl-3.0.x target), not
# just a "nice to have" security update; without it Prisma can't detect
# any OpenSSL version at all and refuses to start.
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl openssl && \
    rm -rf /var/cache/apk/*

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
