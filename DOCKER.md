# Docker Setup & Configuration

Complete guide to building, running, and managing Docker containers for the ERP system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building Images](#building-images)
3. [Running Containers](#running-containers)
4. [Docker Compose](#docker-compose)
5. [Environment Configuration](#environment-configuration)
6. [Networking](#networking)
7. [Volumes & Data](#volumes--data)
8. [Debugging](#debugging)
9. [Performance](#performance)
10. [Security](#security)

---

## Prerequisites

### System Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 2GB disk space minimum

### Installation

**Windows/Mac:**
```bash
# Download Docker Desktop
https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER

# Verify
docker --version
docker-compose --version
```

---

## Building Images

### Build Backend Image

```bash
# Development build
docker build -t erp-backend:dev -f docker/backend/Dockerfile .

# Production build with specific node env
docker build --build-arg NODE_ENV=production \
  -t erp-backend:latest \
  -f docker/backend/Dockerfile .

# With buildkit (faster)
DOCKER_BUILDKIT=1 docker build -t erp-backend:latest -f docker/backend/Dockerfile .
```

### Build Frontend Image

```bash
# Frontend build
docker build -t erp-frontend:latest -f docker/frontend/Dockerfile ./frontend

# With custom API URL
docker build --build-arg VITE_API_URL=https://api.example.com \
  -t erp-frontend:latest \
  -f docker/frontend/Dockerfile ./frontend
```

### Multi-stage Build Optimization

The provided Dockerfiles use multi-stage builds:

1. **Builder Stage**: Install dependencies, build application
2. **Runtime Stage**: Copy only built artifacts, minimal runtime

Benefits:
- Smaller final image size (backend ~200MB → ~100MB)
- Faster deployment
- Smaller attack surface

### View Image Layers

```bash
# See layers and sizes
docker history erp-backend:latest

# Inspect image details
docker inspect erp-backend:latest
```

---

## Running Containers

### Run Backend Container

```bash
# Interactive (with logs)
docker run -it \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/erp_dev \
  -e JWT_SECRET=your-secret \
  erp-backend:latest

# Detached
docker run -d \
  --name erp-backend \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/erp_dev \
  erp-backend:latest

# With all environment variables from file
docker run -d \
  --name erp-backend \
  -p 3000:3000 \
  --env-file .env.production \
  erp-backend:latest
```

### Run Frontend Container

```bash
# Interactive
docker run -it \
  -p 80:80 \
  -e VITE_API_URL=http://localhost:3000 \
  erp-frontend:latest

# Detached
docker run -d \
  --name erp-frontend \
  -p 80:80 \
  -e VITE_API_URL=http://backend:3000 \
  --network erp-network \
  erp-frontend:latest
```

### Container Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# View container logs
docker logs -f erp-backend

# Execute command in container
docker exec -it erp-backend npm run prisma:migrate

# Stop container
docker stop erp-backend

# Remove container
docker rm erp-backend

# Inspect container
docker inspect erp-backend
```

---

## Docker Compose

### Start All Services

```bash
# Build and start
docker-compose up -d

# With logs
docker-compose up

# Rebuild images
docker-compose up --build

# Force recreate containers
docker-compose up --force-recreate
```

### Services Overview

```yaml
Services in docker-compose.yml:
- postgres (Database) - port 5432
- backend (API) - port 3000
- frontend (Web) - port 80
- redis (Cache) - port 6379
- adminer (DB UI) - port 8080 (debug profile)
```

### Service Commands

```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Execute command
docker-compose exec backend npm run prisma:migrate

# Restart service
docker-compose restart backend

# Stop services
docker-compose stop

# Stop and remove
docker-compose down

# Remove with volumes
docker-compose down -v
```

### Profiles

Use profiles to selectively start services:

```bash
# Start with debug profile (includes adminer)
docker-compose --profile debug up -d

# Start only core services
docker-compose up -d  # No profile specified
```

---

## Environment Configuration

### Environment Files

```bash
.env              # Default (loaded first)
.env.development  # Development overrides
.env.staging      # Staging overrides
.env.production   # Production overrides
```

### Loading Priority

1. `.env` (lowest priority)
2. `.env.{NODE_ENV}` 
3. Environment variables (highest priority)

### Examples

**.env.development**
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/erp_dev
JWT_SECRET=dev-secret
LOG_LEVEL=debug
```

**.env.production**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/erp_prod
JWT_SECRET=${JWT_SECRET}
LOG_LEVEL=warn
SENTRY_DSN=${SENTRY_DSN}
```

### Pass Environment Variables

```bash
# Via env-file
docker-compose --env-file .env.production up -d

# Via -e flag
docker run -e NODE_ENV=production -e JWT_SECRET=xyz erp-backend:latest

# Via environment section in compose
services:
  backend:
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
```

---

## Networking

### Network Types

```bash
# Default bridge network (docker-compose creates automatically)
docker network ls

# View network details
docker network inspect erp-network

# Create custom network
docker network create erp-network

# Connect container to network
docker network connect erp-network container-name
```

### Service Discovery

In docker-compose, services can reach each other by name:

```
http://backend:3000    # From frontend
http://postgres:5432   # From backend
http://redis:6379      # From any service
```

### Expose Ports

Only expose necessary ports:

```yaml
# Local only (no port binding)
ports:
  - "5432:5432"

# Expose from container, not host
expose:
  - "3000"
```

### Network Modes

```bash
# Host network (performance, but less isolation)
docker run --network host erp-backend:latest

# Custom network
docker run --network erp-network erp-backend:latest

# Link containers (deprecated, use networks instead)
docker run --link postgres:postgres erp-backend:latest
```

---

## Volumes & Data

### Persistent Storage

```bash
# Named volume
docker volume create erp-postgres-data

# Volume mount
docker run -v erp-postgres-data:/var/lib/postgresql/data postgres:14

# Bind mount
docker run -v $(pwd)/data:/app/data erp-backend:latest
```

### In Docker Compose

```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
    driver: local
```

### Backup & Restore

```bash
# Backup database
docker exec erp-postgres pg_dump -U postgres erp_dev > backup.sql

# Restore database
docker exec -i erp-postgres psql -U postgres erp_dev < backup.sql

# Backup volume
docker run --rm -v erp-postgres-data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v erp-postgres-data:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/postgres-backup.tar.gz -C /data
```

### Cleanup

```bash
# Remove dangling volumes
docker volume prune

# Remove specific volume
docker volume rm erp-postgres-data

# Remove all unused resources
docker system prune -a
```

---

## Debugging

### View Logs

```bash
# Real-time logs
docker-compose logs -f backend

# Last 50 lines
docker-compose logs --tail=50 backend

# Timestamp logs
docker-compose logs -t backend

# From specific time
docker-compose logs --since 2024-01-01 backend
```

### Execute Commands

```bash
# Interactive shell
docker exec -it erp-backend /bin/sh

# Run npm scripts
docker exec erp-backend npm run test

# Check database
docker exec erp-postgres psql -U postgres -c "SELECT version();"
```

### Health Checks

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' erp-backend

# View health check details
docker inspect --format='{{.State.Health}}' erp-backend

# Manual health check
docker exec erp-backend curl http://localhost:3000/health
```

### Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Memory usage
docker stats --no-stream | grep erp-backend

# Watch CPU/memory
docker stats erp-backend --no-stream

# Top processes in container
docker top erp-backend
```

### Build Debugging

```bash
# Verbose build output
DOCKER_BUILDKIT=0 docker build --progress=plain -t erp-backend .

# Interactive debugging
docker run -it --entrypoint /bin/sh erp-backend:latest

# Build with buildkit debugging
DOCKER_BUILDKIT=1 docker build --progress=plain -t erp-backend .
```

---

## Performance

### Optimize Image Size

**Before:**
- Node image: 900MB+
- With node_modules: 500MB+

**After (multi-stage):**
- Final image: ~100-150MB

### Caching Strategies

```dockerfile
# Good: Dependencies change rarely
COPY package*.json ./
RUN npm ci
COPY . .  # Copy source code after dependencies

# Bad: Invalidates cache on every change
COPY . .
RUN npm ci
```

### Build Speed

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -t erp-backend .

# Enable inline cache
docker build -t erp-backend --cache-from=erp-backend:latest .

# Parallel builds
docker-compose build --parallel
```

### Runtime Performance

```bash
# Use Alpine Linux (smaller, faster)
FROM node:18-alpine  # 150MB vs 900MB

# Use node_modules caching in Docker Compose
services:
  backend:
    volumes:
      - /app/node_modules  # Don't mount, use container version
```

### Database Performance

```bash
# Increase shared buffers
-c shared_buffers=256MB

# Enable work memory
-c work_mem=4MB

# Connection pooling (add PgBouncer)
services:
  pgbouncer:
    image: pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
```

---

## Security

### Image Security

```bash
# Run as non-root user
USER nodejs  # In Dockerfile

# Scan for vulnerabilities
docker scan erp-backend:latest

# Use fixed base image versions
FROM node:18.17.1-alpine  # Not 'latest'
```

### Container Security

```bash
# Read-only filesystem
docker run --read-only erp-backend:latest

# Drop capabilities
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE erp-backend:latest

# No privilege escalation
docker run --security-opt=no-new-privileges erp-backend:latest
```

### Network Security

```bash
# Expose only necessary ports
docker run -p 3000:3000  # Not -P (all ports)

# Use custom network
docker network create erp-secure
docker run --network erp-secure erp-backend:latest

# Disable internet access for database
docker run --network erp-network postgres:14
```

### Secrets Management

```bash
# Use secrets (in production with Docker Swarm/Kubernetes)
docker secret create jwt-secret /path/to/secret.txt

# In docker-compose, use .env file (local development only)
docker-compose --env-file .env.production up

# Never hardcode secrets in Dockerfile
# Bad: RUN echo $JWT_SECRET > /app/.env
# Good: Use runtime environment variables
```

### Vulnerability Scanning

```bash
# Trivy scan
trivy image erp-backend:latest

# Docker Scout (Docker subscription)
docker scout cves erp-backend:latest

# Aqua Grype
grype erp-backend:latest
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs erp-backend

# Inspect container
docker inspect erp-backend

# Try with verbose logging
docker run -e LOG_LEVEL=debug erp-backend:latest
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
services:
  backend:
    ports:
      - "3001:3000"  # Use 3001 instead
```

### Database Connection Issues

```bash
# Test connection from backend container
docker-compose exec backend psql postgresql://postgres@postgres/erp_dev

# Check postgres logs
docker-compose logs postgres

# Verify network connection
docker-compose exec backend ping postgres
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Settings > Resources > Memory Limit (Docker Desktop)

# Set container memory limit
docker run --memory=1g erp-backend:latest
```

### Permission Issues

```bash
# Fix volume permissions
docker-compose exec postgres chown -R postgres:postgres /var/lib/postgresql/data

# Fix bind mount permissions
sudo chown -R $USER:$USER ./logs
```

---

## Best Practices

1. **Use tags**: Always tag images with versions, not just 'latest'
2. **Health checks**: Implement and test health checks
3. **Logging**: Log to stdout/stderr (Docker captures it)
4. **Signals**: Handle SIGTERM properly for graceful shutdown
5. **Layers**: Keep Dockerfile layers small and logical
6. **Security**: Run as non-root user, drop capabilities
7. **Networking**: Use custom networks for better isolation
8. **Volumes**: Use named volumes for persistence
9. **Documentation**: Document environment variables and ports
10. **Testing**: Test images locally before pushing

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
