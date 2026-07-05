# Deployment Guide

This guide covers deployment strategies for the ERP system across different environments.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Compose](#docker-compose)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Database Migrations](#database-migrations)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.development
# Edit .env.development with local database credentials

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run seed

# Start backend in development mode
npm run start:dev

# In another terminal, start frontend
cd frontend
npm run dev
```

### Access

- Backend API: http://localhost:3000
- Frontend: http://localhost:5173
- API Documentation: http://localhost:3000/api/docs (if configured)
- Health Check: http://localhost:3000/health

---

## Docker Compose

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Quick Start

```bash
# Copy environment file
cp .env.example .env

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend npm run prisma:migrate

# Seed database
docker-compose exec backend npm run seed
```

### Services

- **postgres**: Database on port 5432
- **backend**: API on port 3000
- **frontend**: Web app on port 80 (or 5173 in dev)
- **redis**: Cache on port 6379
- **adminer**: Database management on port 8080 (debug profile)

### Stop Services

```bash
docker-compose down

# With volume cleanup
docker-compose down -v
```

### Environment Variables

Create `.env` file (see `.env.example`):

```env
NODE_ENV=development
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=erp_dev
JWT_SECRET=your-secret-key
```

---

## Staging Deployment

### Prerequisites

- SSH access to staging server
- Docker and Docker Compose on staging server
- GitHub Actions secrets configured

### Configuration

1. Set GitHub Actions Secrets:
   - `STAGING_WEBHOOK`: Webhook URL for deployments
   - `STAGING_SSH_KEY`: SSH private key
   - `STAGING_JWT_SECRET`: JWT secret for staging
   - `STAGING_DB_PASSWORD`: Database password

2. Update `.env.staging`:

```bash
NODE_ENV=staging
API_URL=https://staging-api.example.com
```

### Deployment

Staging deploys automatically on push to `develop` branch:

```bash
# Trigger deployment by pushing to develop
git push origin feature-branch:develop
```

### Monitor Deployment

```bash
# View GitHub Actions
# https://github.com/your-org/erp/actions

# SSH to staging server
ssh deploy@staging-server

# View logs
docker-compose logs -f backend

# Check service health
curl https://staging-api.example.com/health
```

---

## Production Deployment

### Prerequisites

- SSH access to production server
- Docker and Docker Compose on production server
- Load balancer configured (optional)
- SSL certificates configured

### Security Checklist

- [ ] Database password is strong and unique
- [ ] JWT secret is long and random
- [ ] All sensitive data in GitHub Secrets
- [ ] CORS origins correctly configured
- [ ] HTTPS enabled
- [ ] Rate limiting enabled
- [ ] Backups configured
- [ ] Monitoring and alerting setup

### Configuration

1. Set GitHub Actions Secrets:
   - `PROD_WEBHOOK`: Webhook URL
   - `PROD_SSH_KEY`: SSH private key
   - `PROD_JWT_SECRET`: Strong JWT secret
   - `PROD_DB_USER`: Database user
   - `PROD_DB_PASSWORD`: Strong database password
   - `PROD_SENTRY_DSN`: Sentry error tracking DSN

2. Update `.env.production`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-postgres:5432/erp_prod
JWT_SECRET=${PROD_JWT_SECRET}
SENTRY_DSN=${PROD_SENTRY_DSN}
```

### Deployment

Production deploys on push to `main` branch:

```bash
# Create release tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag to trigger deployment
git push origin v1.0.0
```

### Post-Deployment

```bash
# SSH to production server
ssh deploy@prod-server

# Verify services are running
docker-compose ps

# Check application health
curl https://api.example.com/health

# View logs
docker-compose logs -f backend
```

---

## Kubernetes Deployment

### Prerequisites

- kubectl 1.20+
- Kubernetes cluster (1.20+)
- Helm 3+ (optional)

### Prepare Cluster

```bash
# Create namespace
kubectl create namespace erp

# Create secrets
kubectl create secret generic erp-secrets \
  --from-literal=db-user=postgres \
  --from-literal=db-password=strong-password \
  --from-literal=database-url="postgresql://postgres:password@postgres:5432/erp_prod" \
  --from-literal=jwt-secret=strong-jwt-secret \
  --namespace=erp

# Create configmap
kubectl create configmap erp-config \
  --from-literal=db-name=erp_prod \
  --from-literal=api-url=https://api.example.com \
  --from-literal=websocket-cors-origin=https://example.com \
  --namespace=erp
```

### Deploy

```bash
# Apply all manifests
kubectl apply -f k8s/deployment.yaml

# Wait for deployment to be ready
kubectl rollout status deployment/erp-backend -n erp
kubectl rollout status deployment/erp-frontend -n erp

# Check pod status
kubectl get pods -n erp

# View logs
kubectl logs -f deployment/erp-backend -n erp
```

### Scale Deployment

```bash
# Scale backend to 5 replicas
kubectl scale deployment erp-backend --replicas=5 -n erp

# View HorizontalPodAutoscaler
kubectl get hpa -n erp
```

### Update Deployment

```bash
# Update image
kubectl set image deployment/erp-backend backend=ghcr.io/your-org/erp-backend:v2.0.0 -n erp

# Rollout status
kubectl rollout status deployment/erp-backend -n erp

# Rollback if needed
kubectl rollout undo deployment/erp-backend -n erp
```

### Access Services

```bash
# Port forward to backend
kubectl port-forward svc/backend 3000:3000 -n erp

# Port forward to frontend
kubectl port-forward svc/frontend 8080:80 -n erp

# Access via load balancer
# Get external IP
kubectl get ingress -n erp
```

---

## Database Migrations

### Prisma Migrations

```bash
# Create a new migration
npm run prisma:migrate -- --name add_new_table

# Apply all pending migrations
npm run prisma:migrate

# Reset database (development only)
npm run prisma:reset

# View migration status
npm run prisma:status
```

### In Docker

```bash
# Run migrations in container
docker-compose exec backend npm run prisma:migrate

# Seed database
docker-compose exec backend npm run seed
```

### In Kubernetes

```bash
# Create migration job
kubectl run -it --rm --restart=Never \
  erp-migration \
  --image=ghcr.io/your-org/erp-backend:latest \
  --command -- npm run prisma:migrate \
  -n erp
```

### Backup Before Migration

```bash
# Backup PostgreSQL
pg_dump postgresql://user:password@localhost:5432/erp_prod > backup-$(date +%s).sql

# Restore from backup
psql postgresql://user:password@localhost:5432/erp_prod < backup.sql
```

---

## Monitoring & Logs

### Health Checks

```bash
# Overall health
curl http://localhost:3000/health

# Readiness (for k8s)
curl http://localhost:3000/health/ready

# Liveness (for k8s)
curl http://localhost:3000/health/live

# Metrics
curl http://localhost:3000/metrics
```

### Viewing Logs

#### Docker Compose

```bash
# Backend logs
docker-compose logs -f backend

# All services
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50 backend
```

#### Kubernetes

```bash
# Pod logs
kubectl logs -f pod/erp-backend-xxxxx -n erp

# Deployment logs (all replicas)
kubectl logs -f deployment/erp-backend -n erp

# Previous logs (if pod crashed)
kubectl logs --previous pod/erp-backend-xxxxx -n erp
```

#### Files

Logs are written to:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs

### Sentry Integration

Set `SENTRY_DSN` environment variable to enable error tracking:

```bash
SENTRY_DSN=https://key@sentry.io/project-id
```

Errors will be automatically reported to Sentry.

---

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check connection string
echo $DATABASE_URL
```

### Application Won't Start

```bash
# Check logs
docker-compose logs backend

# Run migrations manually
docker-compose exec backend npm run prisma:migrate

# Seed database
docker-compose exec backend npm run seed
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start

# In Docker, update compose file:
# environment:
#   NODE_OPTIONS: --max-old-space-size=4096
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Slow Queries

```bash
# Enable query logging
LOG_LEVEL=debug

# Check Prisma logs
PRISMA_DEBUG=* npm start

# Run performance analysis
npm run perf:analyze
```

### Recovery

```bash
# Force rebuild
docker-compose up --build --force-recreate

# Reset everything
docker-compose down -v
docker-compose up -d

# Check service health
docker-compose exec backend curl http://localhost:3000/health
```

---

## Performance Optimization

### Database

- Create indexes on frequently queried columns
- Use connection pooling (PgBouncer)
- Monitor slow queries

### Backend

- Enable caching with Redis
- Implement rate limiting
- Use compression middleware
- Monitor heap memory

### Frontend

- Enable gzip compression in nginx
- Cache static assets
- Lazy load components
- Minify CSS/JS

### Deployment

- Use multi-stage Docker builds
- Enable Docker layer caching
- Use CDN for static files
- Implement auto-scaling

---

## Support & Documentation

- Backend API: [docs/API.md](docs/API.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Issues: [GitHub Issues](https://github.com/your-org/erp/issues)
