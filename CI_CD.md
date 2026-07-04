# CI/CD Pipeline Guide

Complete guide to the GitHub Actions CI/CD pipeline for automated testing, building, and deploying the ERP system.

## Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [GitHub Actions Setup](#github-actions-setup)
4. [Secrets Configuration](#secrets-configuration)
5. [Branch Strategy](#branch-strategy)
6. [Docker Registry](#docker-registry)
7. [Deployment Triggers](#deployment-triggers)
8. [Monitoring Builds](#monitoring-builds)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Push / Pull Request                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
    ┌────▼────────────┐      ┌───────▼──────────┐
    │  Test Workflow  │      │ Deploy Workflow  │
    └────┬────────────┘      └───────┬──────────┘
         │                           │
    ┌────▼────────────────────────────┴────────┐
    │  Lint & Format Check                     │
    │  - ESLint                                │
    │  - Prettier                             │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Unit Tests                               │
    │  - Jest (src/**/*.spec.ts)                │
    │  - Coverage reporting                    │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Integration Tests                        │
    │  - Database tests                        │
    │  - Service tests                         │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Security Audit                           │
    │  - npm audit                             │
    │  - Dependency scanning                   │
    │  - Secret scanning                       │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  E2E Tests (if approved)                  │
    │  - Playwright tests                      │
    │  - Full flow testing                     │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Build Docker Images                      │
    │  - Backend image                         │
    │  - Frontend image                        │
    │  - Push to registry                      │
    └──────────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │  Deploy (Based on branch)                 │
    │  - Staging (develop)                     │
    │  - Production (main)                     │
    └──────────────────────────────────────────┘
```

---

## Workflows

### 1. Test Workflow (test.yml)

Runs on every push and pull request.

**Jobs:**
- `lint-and-format` - ESLint and Prettier checks
- `unit-tests` - Jest unit tests with coverage
- `integration-tests` - Database integration tests
- `security-audit` - npm audit and dependency checks
- `e2e-tests` - Playwright end-to-end tests
- `performance-benchmark` - Load testing
- `test-results` - Summary and PR comments

**Triggers:**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### 2. Deploy Workflow (deploy.yml)

Builds Docker images and deploys.

**Jobs:**
- `build-backend` - Build backend Docker image
- `build-frontend` - Build frontend Docker image
- `deploy-staging` - Deploy to staging (develop branch)
- `deploy-production` - Deploy to production (main branch)

**Triggers:**
```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'frontend/**'
      - 'docker/**'
      - 'package*.json'
```

---

## GitHub Actions Setup

### Initial Setup

1. **Enable Actions**
   - Go to your GitHub repository
   - Settings > Actions > General
   - Enable "Allow all actions and reusable workflows"

2. **Configure Permissions**
   - Settings > Actions > General
   - Workflow permissions: "Read and write permissions"
   - Allow GitHub Actions to create and approve pull requests

3. **Add Secrets**
   - Settings > Secrets and variables > Actions
   - Add secrets (see [Secrets Configuration](#secrets-configuration))

### Workflow Files

Located in `.github/workflows/`:
- `test.yml` - Test and quality assurance
- `deploy.yml` - Docker builds and deployments

### Action Requirements

- `actions/checkout@v4` - Check out code
- `actions/setup-node@v4` - Setup Node.js
- `actions/upload-artifact@v4` - Store artifacts
- `docker/setup-buildx-action@v3` - Docker Buildx
- `docker/login-action@v3` - Registry login
- `docker/build-push-action@v5` - Build and push
- `codecov/codecov-action@v4` - Code coverage
- `actions/github-script@v7` - PR comments
- `trufflesecurity/trufflehog@main` - Secret scanning

---

## Secrets Configuration

### Required Secrets

#### GitHub Container Registry (GHCR)

```
GITHUB_TOKEN - Automatically provided by GitHub
```

No additional setup needed - use `${{ secrets.GITHUB_TOKEN }}` in workflows.

#### Staging Deployment

```
STAGING_WEBHOOK       - Webhook URL for staging deployment
STAGING_SSH_KEY       - SSH private key for staging server
STAGING_JWT_SECRET    - JWT secret for staging
STAGING_DB_PASSWORD   - Database password for staging
```

#### Production Deployment

```
PROD_WEBHOOK          - Webhook URL for production deployment
PROD_SSH_KEY          - SSH private key for production server
PROD_JWT_SECRET       - JWT secret for production (strong!)
PROD_DB_USER          - Database user for production
PROD_DB_PASSWORD      - Database password for production
PROD_SENTRY_DSN       - Sentry error tracking DSN
PROD_SMTP_HOST        - SMTP server for email
PROD_SMTP_PORT        - SMTP port
PROD_SMTP_USER        - SMTP user
PROD_SMTP_PASSWORD    - SMTP password
PROD_REDIS_PASSWORD   - Redis password for production
```

### Add Secrets

1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Enter name and value
4. Click "Add secret"

### Use Secrets in Workflows

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

steps:
  - run: npm run build
    env:
      JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
```

### Organization Secrets

For teams, use organization-level secrets:
1. Go to Organization Settings > Secrets and variables > Actions
2. Create secrets accessible to all repositories

---

## Branch Strategy

### Main Branch (`main`)

- **Purpose**: Production deployment
- **Protection**: 
  - Require pull request reviews (2+)
  - Require status checks to pass
  - Dismiss stale reviews
  - Require up-to-date branches
  - Require signed commits (optional)
- **Deployment**: Automatic to production
- **Docker Tag**: `latest` + version tags

### Develop Branch (`develop`)

- **Purpose**: Staging/integration
- **Protection**:
  - Require pull request reviews (1+)
  - Require status checks to pass
  - Dismiss stale reviews
- **Deployment**: Automatic to staging
- **Docker Tag**: `develop` + short SHA

### Feature Branches

- **Naming**: `feature/*`, `fix/*`, `refactor/*`
- **Base**: Branch from `develop`
- **Pull Request**: To `develop`
- **CI**: Runs tests and builds (no deploy)

### Release Branches

- **Naming**: `release/v*`
- **Base**: Branch from `develop`
- **Purpose**: Final testing before production
- **Merge**: To `main` after approval

### Hotfix Branches

- **Naming**: `hotfix/*`
- **Base**: Branch from `main`
- **Merge**: To both `main` and `develop`

---

## Docker Registry

### GitHub Container Registry (GHCR)

All Docker images are pushed to GHCR automatically.

### Image Names

```
ghcr.io/your-org/erp-backend
ghcr.io/your-org/erp-frontend
```

### Tags

```
# Branch tags
develop
main

# Version tags
v1.0.0
v1.0

# SHA tags (short)
develop-abc123f
main-abc123f

# Latest tag
latest (main branch only)
```

### Example Pull

```bash
# Login to GHCR
echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin

# Pull image
docker pull ghcr.io/your-org/erp-backend:latest

# Run image
docker run -p 3000:3000 ghcr.io/your-org/erp-backend:latest
```

### Make Repository Public

1. Settings > Actions > General > Artifact and log retention
2. Settings > Code and automation > Actions > Visibility: Public

---

## Deployment Triggers

### Automatic Deployments

**Staging (develop branch)**
```bash
git push origin feature-branch:develop
# Triggers: test.yml → deploy.yml → deploy-staging
```

**Production (main branch)**
```bash
git tag v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# Triggers: test.yml → deploy.yml → deploy-production
```

### Manual Deployments

GitHub Actions allows manual workflow dispatch:

1. Go to Actions tab
2. Select workflow (e.g., `deploy.yml`)
3. Click "Run workflow"
4. Select branch and click "Run"

### Conditional Deployments

Workflows check branch and event type:

```yaml
deploy-production:
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

---

## Monitoring Builds

### GitHub Actions Dashboard

1. Go to repository > Actions tab
2. View workflow runs
3. Click on specific run to see details
4. View logs for each job

### Workflow Status Badge

Add to README:
```markdown
[![CI/CD Pipeline](https://github.com/your-org/erp/actions/workflows/test.yml/badge.svg)](https://github.com/your-org/erp/actions)
```

### Build Artifacts

Artifacts are stored for 30 days:

```bash
# Download locally
# Go to Actions > Run > Artifacts
```

Common artifacts:
- `playwright-report/` - E2E test results
- `performance-report.json` - Performance metrics
- `coverage/` - Code coverage reports

### Notifications

#### Email Notifications

1. Go to Settings > Notifications
2. Configure email notifications for:
   - Workflow runs
   - PR reviews
   - CI failures

#### Slack Integration

1. Create Slack app at https://api.slack.com
2. Create webhook URL
3. Add to workflow:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    fields: repo,message,commit
```

#### GitHub Status Pages

- Create GitHub App for CI status
- Integrate with monitoring tools

---

## Troubleshooting

### Workflow Not Triggering

**Problem**: Workflow doesn't run on push

**Solutions**:
1. Check `.github/workflows/` files exist
2. Verify branch name matches (case-sensitive)
3. Check paths filter (if using)
4. Verify Actions is enabled in Settings
5. Check push to main branch (some workflows only run there)

### Secret Not Available

**Problem**: `${{ secrets.MY_SECRET }}` returns empty

**Solutions**:
1. Verify secret is created in Settings
2. Check secret name matches exactly (case-sensitive)
3. Ensure action has `contents: read` permissions
4. For PR from fork, secrets aren't available
5. Recreate secret if modified

### Docker Build Fails

**Problem**: Docker build step fails

**Solutions**:
```bash
# Check Dockerfile syntax
docker build -f docker/backend/Dockerfile .

# Verify build arguments
docker build --build-arg NODE_ENV=production .

# Check base image exists
docker pull node:18-alpine

# View detailed build logs
DOCKER_BUILDKIT=0 docker build --progress=plain .
```

### Tests Fail in CI but Pass Locally

**Common Issues**:
1. Database not initialized - add migration step
2. Environment variables missing - check .env
3. Timezone differences - use UTC
4. Port conflicts - use random ports
5. Node version mismatch - check node version

**Solutions**:
```bash
# Run in Docker like CI does
docker-compose up -d
docker-compose exec backend npm run test

# Check CI logs for details
# Actions tab > specific run > job logs
```

### Deployment Fails

**Check**:
1. Server SSH key is valid
2. Webhook URL is correct
3. Staging/production servers are online
4. Docker registry credentials work
5. Required secrets are set

**Debug**:
1. View full workflow logs
2. Test SSH connection manually
3. Test webhook URL with curl
4. Check server logs

---

## Advanced Configuration

### Custom Actions

Create custom actions in `.github/actions/`:

```yaml
# .github/actions/setup-app/action.yml
name: 'Setup App'
runs:
  using: 'composite'
  steps:
    - run: echo "Setting up..."
```

Use in workflow:
```yaml
- uses: ./.github/actions/setup-app
```

### Reusable Workflows

Create reusable workflow in `.github/workflows/`:

```yaml
# .github/workflows/test.yml
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
```

Call from another workflow:
```yaml
jobs:
  test:
    uses: ./.github/workflows/test.yml
    with:
      node-version: '18'
```

### Matrix Builds

Test against multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Concurrency

Prevent duplicate runs:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

---

## Best Practices

1. **Use secrets** for sensitive data
2. **Cache dependencies** for faster builds
3. **Run tests in parallel** to save time
4. **Use branch protection** rules
5. **Document workflows** in comments
6. **Pin action versions** (not `@main`)
7. **Scan for secrets** in code
8. **Monitor costs** (GitHub Actions included)
9. **Clean up artifacts** regularly
10. **Test locally** before pushing

---

## Performance Tips

### Reduce Build Time

```yaml
# Use cache
- uses: actions/setup-node@v4
  with:
    cache: 'npm'

# Parallel jobs
jobs:
  test: ...
  build: ...
  # Run simultaneously, not sequentially
```

### Reduce Artifact Storage

```yaml
# Set retention
- uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/
    retention-days: 7  # Default is 90
```

### Conditional Steps

```yaml
# Only run on main branch
if: github.ref == 'refs/heads/main'

# Only on pull requests
if: github.event_name == 'pull_request'

# Only on failure
if: failure()
```

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
