# Multi-stage build for frontend
# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/. .

# Vite inlines import.meta.env.VITE_API_URL into the static JS bundle at
# build time - setting it as a runtime docker-compose `environment:` var
# (as this repo did before) has no effect at all, since the built bundle
# never reads process.env again after this step. Must come in as a build
# arg instead.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Runs as the base image's default user (root master process, unprivileged
# nginx worker processes via the "user nginx;" directive in nginx.conf) -
# a custom non-root USER here broke nginx's own privilege-drop mechanism:
# it couldn't write its pid file or reload config, and failed to start.

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
