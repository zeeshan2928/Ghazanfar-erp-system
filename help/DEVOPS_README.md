# DevOps Infrastructure Guide

Complete DevOps and deployment infrastructure for the ERP system.

## Quick Start

### Local Development

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start with Docker Compose
docker-compose up -d

# 3. Run migrations
docker-compose exec backend npm run prisma:migrate

# 4. Access services
# Backend: http://localhost:3000
# Frontend: http://localhost:80 (or 5173 in dev)
# API Docs: http://localhost:3000/api/docs
# Health: http://localhost:3000/health
# DB UI: http://localhost:8080 (with --profile debug)
```

### Staging Deployment

```bash
# Automatic on push to develop branch
git push origin feature-branch:develop
# Deploys to: https://staging.example.com
```

### Production Deployment

```bash
# Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push tag to trigger production deployment
git push origin v1.0.0
# Deploys to: https://example.com
```

---

## Infrastructure Components

### 1. Containerization (Docker)

**Dockerfiles:**
- `docker/backend/Dockerfile` - NestJS backend
- `docker/frontend/Dockerfile` - React frontend with Nginx
- `.dockerignore` - Exclude files from build

**Docker Compose:**
- `docker-compose.yml` - Development environment
- Services: PostgreSQL, Backend, Frontend, Redis, Adminer

**Documentation:** [DOCKER.md](DOCKER.md)

### 2. CI/CD Pipeline (GitHub Actions)

**Workflows:**
- `.github/workflows/test.yml` - Test & QA pipeline
- `.github/workflows/deploy.yml` - Build & deploy pipeline

**Features:**
- Automated testing (lint, unit, integration, E2E)
- Security scanning (npm audit, secret detection)
- Docker image builds and push to GHCR
- Automatic deployment to staging/production

**Documentation:** [CI_CD.md](CI_CD.md)

### 3. Environment Configuration

**Files:**
- `.env.example` - Template with all variables
- `.env.development` - Development settings
- `.env.staging` - Staging settings
- `.env.production` - Production settings (with secrets)

**Key Variables:**
```
NODE_ENV, DATABASE_URL, JWT_SECRET, SENTRY_DSN, LOG_LEVEL
VITE_API_URL, REDIS_HOST, WEBSOCKET_CORS_ORIGIN
```

### 4. Database Management

**Migrations:**
```bash
npm run prisma:migrate      # Apply migrations
npm run prisma:migrate -- --name feature_name  # Create new
npm run seed                # Populate sample data
npm run prisma:reset        # Reset database
```

**Backup/Restore:**
```bash
docker-compose exec postgres pg_dump -U postgres erp_dev > backup.sql
docker-compose exec -i postgres psql -U postgres erp_dev < backup.sql
```

### 5. Monitoring & Logging

**Health Checks:**
- `GET /health` - Overall status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - System metrics

**Logging:**
- Winston logger with file and console output
- Log files: `logs/error.log`, `logs/combined.log`
- Environment: `LOG_LEVEL=debug|info|warn|error`

**Error Tracking:**
- Sentry integration with `SENTRY_DSN`
- Automatic exception reporting
- Performance tracking

**Metrics:**
- `GET /metrics` - JSON format
- `GET /metrics/prometheus` - Prometheus format
- HTTP, database, and cache metrics

**Documentation:** [MONITORING.md](MONITORING.md)

### 6. Kubernetes Support (Optional)

**Manifests:**
- `k8s/deployment.yaml` - Complete K8s setup
- Includes: Deployments, Services, Ingress, HPA, ConfigMap, Secrets

**Deploy to Kubernetes:**
```bash
kubectl create namespace erp
kubectl create secret generic erp-secrets \
  --from-literal=database-url="..." \
  --from-literal=jwt-secret="..." \
  -n erp
kubectl apply -f k8s/deployment.yaml
```

---

## File Structure

```
erp-backend/
├── docker/
│   ├── backend/
│   │   └── Dockerfile          # Backend image
│   ├── frontend/
│   │   ├── Dockerfile          # Frontend image
│   │   └── nginx.conf          # Nginx configuration
│   └── entrypoint.sh           # Container startup script
├── k8s/
│   └── deployment.yaml         # Kubernetes manifests
├── src/
│   ├── modules/
│   │   ├── health/             # Health check endpoints
│   │   └── metrics/            # Metrics endpoints
│   └── common/
│       ├── logger/             # Winston logger
│       ├── middleware/         # Request logging
│       └── metrics/            # Metrics service
├── .github/
│   └── workflows/
│       ├── test.yml            # Test pipeline
│       └── deploy.yml          # Deploy pipeline
├── .env.example                # Template
├── .env.development            # Dev config
├── .env.staging                # Staging config
├── .env.production             # Prod config
├── docker-compose.yml          # Local docker setup
├── .dockerignore               # Docker ignore
├── DEPLOYMENT.md               # Deployment guide
├── DOCKER.md                   # Docker guide
├── CI_CD.md                    # CI/CD guide
├── MONITORING.md               # Monitoring guide
└── DEVOPS_README.md            # This file
```

---

## Key Workflows

### Development

```
Local Machine
    ↓
npm install / npm run dev
    ↓
Docker Compose (localhost)
    ↓
Tests, Debugging
```

### Pull Request

```
Feature Branch
    ↓ (Push to GitHub)
GitHub Actions: test.yml
    ├─ Lint & Format
    ├─ Unit Tests
    ├─ Integration Tests
    ├─ Security Audit
    └─ E2E Tests
        ↓ (All pass)
PR Ready for Review
```

### Staging Deployment

```
Merge PR to develop
    ↓ (Push)
GitHub Actions: deploy.yml
    ├─ Run Tests
    ├─ Build Backend Docker Image
    ├─ Build Frontend Docker Image
    └─ Deploy to Staging
        ↓
https://staging.example.com
```

### Production Deployment

```
Merge PR to main OR Create release tag
    ↓ (Push)
GitHub Actions: deploy.yml
    ├─ Run Tests
    ├─ Build Docker Images
    └─ Deploy to Production
        ↓
https://example.com
```

---

## Environment Setup

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/your-org/erp.git
cd erp

# 2. Copy environment
cp .env.example .env.development

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run seed

# 5. Check health
curl http://localhost:3000/health
```

### GitHub Actions Secrets

**For Staging:**
```
STAGING_WEBHOOK           - Deployment webhook
STAGING_SSH_KEY           - SSH private key
STAGING_JWT_SECRET        - JWT secret
STAGING_DB_PASSWORD       - Database password
```

**For Production:**
```
PROD_WEBHOOK              - Deployment webhook
PROD_SSH_KEY              - SSH private key
PROD_JWT_SECRET           - Strong JWT secret
PROD_DB_USER              - Database user
PROD_DB_PASSWORD          - Strong database password
PROD_SENTRY_DSN           - Sentry DSN
PROD_SMTP_*               - Email configuration
```

Add in: Settings > Secrets and variables > Actions

### Docker Registry

All images pushed to GitHub Container Registry (GHCR):
```
ghcr.io/your-org/erp-backend:latest
ghcr.io/your-org/erp-frontend:latest
```

Pull images:
```bash
docker pull ghcr.io/your-org/erp-backend:latest
docker run -p 3000:3000 ghcr.io/your-org/erp-backend:latest
```

---

## Services & Ports

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend API | 3000 | http://localhost:3000 | REST API |
| Frontend | 80/5173 | http://localhost | Web UI |
| Database | 5432 | postgres://localhost:5432 | PostgreSQL |
| Redis | 6379 | redis://localhost:6379 | Cache |
| Adminer | 8080 | http://localhost:8080 | DB UI (debug) |
| Health | 3000 | /health | Status check |
| Metrics | 3000 | /metrics | Prometheus format |

---

## Common Commands

### Docker Compose

```bash
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f backend          # View logs
docker-compose exec backend bash        # Connect to container
docker-compose ps                       # Show status
docker-compose restart backend          # Restart service
```

### Database

```bash
npm run prisma:migrate                  # Apply migrations
npm run prisma:reset                    # Reset database
npm run seed                            # Seed data
npm run prisma:studio                   # Prisma Studio
```

### Testing

```bash
npm run lint                            # Lint code
npm run test                            # Run unit tests
npm run test:integration                # Integration tests
npm run test:e2e                        # E2E tests
npm run test:cov                        # Coverage report
```

### Build

```bash
npm run build                           # Build backend
docker build -f docker/backend/Dockerfile .        # Build backend image
docker build -f docker/frontend/Dockerfile ./frontend  # Build frontend
```

---

## Deployment Checklist

### Before Staging Deploy

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations tested locally
- [ ] Docker images built locally
- [ ] STAGING secrets configured in GitHub

### Before Production Deploy

- [ ] Staging deployment successful
- [ ] Performance testing completed
- [ ] Security audit passed
- [ ] Database backup created
- [ ] Production secrets configured
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment

---

## Troubleshooting

### Services won't start

```bash
docker-compose logs backend              # Check logs
docker-compose ps                        # Check status
docker-compose down -v && docker-compose up -d  # Reset
```

### Database connection issues

```bash
docker-compose exec postgres psql -U postgres -c "SELECT 1"
docker-compose exec backend psql postgresql://postgres@postgres/erp_dev
```

### CI/CD failures

Check GitHub Actions logs:
1. Go to Actions tab
2. Select workflow run
3. Click on failed job
4. View logs

### Port conflicts

```bash
lsof -i :3000                           # Find process
docker ps -a                            # List containers
docker stop container-name              # Stop container
```

---

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets
2. **Use strong passwords** - Especially in production
3. **Enable HTTPS** - All production endpoints
4. **Rotate secrets regularly** - Every 90 days
5. **Limit Docker registry access** - Private repos
6. **Use network policies** - Restrict pod traffic (K8s)
7. **Scan images for vulnerabilities** - Before deploy
8. **Enable branch protection** - Require reviews
9. **Audit access logs** - Monitor who deployed what
10. **Use SSH keys** - For server deployments

---

## Performance Optimization

### Image Size
- Multi-stage builds: ~100-150MB per image
- Alpine Linux base: Reduced from 900MB to 150MB
- Exclude unnecessary files: `.dockerignore`

### Build Speed
- Enable BuildKit: `DOCKER_BUILDKIT=1`
- Cache dependencies: `npm ci` in separate layer
- Use GitHub Actions cache

### Runtime Performance
- Enable Redis caching
- Implement connection pooling (PgBouncer)
- Use CDN for static assets
- Enable gzip compression
- Monitor with metrics

---

## Additional Resources

- **Docker Guide**: [DOCKER.md](DOCKER.md) - Complete Docker documentation
- **CI/CD Guide**: [CI_CD.md](CI_CD.md) - GitHub Actions setup
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md) - Multi-environment deployment
- **Monitoring Guide**: [MONITORING.md](MONITORING.md) - Logging and observability

---

## Support

For issues or questions:
1. Check relevant documentation file
2. Review GitHub Actions logs
3. Check application logs: `docker-compose logs`
4. Create GitHub Issue with logs

---

## Team

DevOps Infrastructure built with:
- Docker & Docker Compose
- GitHub Actions
- PostgreSQL
- Redis
- Kubernetes (optional)
- Prometheus & Grafana (optional)

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Status:** Production Ready
