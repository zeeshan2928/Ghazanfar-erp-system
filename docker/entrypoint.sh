#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Wait for database to be ready
log_info "Waiting for database to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if npx prisma db execute --stdin <<EOF > /dev/null 2>&1
SELECT 1;
EOF
  then
    log_info "Database is ready!"
    break
  fi

  if [ $attempt -eq $max_attempts ]; then
    log_error "Database failed to start within timeout"
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 2
done

# Run migrations
if [ "$NODE_ENV" = "production" ]; then
  log_info "Running database migrations (production)..."
  npx prisma migrate deploy
else
  log_info "Running database migrations (development)..."
  npx prisma migrate dev --skip-generate --skip-seed
fi

# Seed database if seed file exists and not in production
if [ -f "prisma/seed.ts" ] && [ "$NODE_ENV" != "production" ]; then
  log_info "Seeding database..."
  npm run seed || log_warn "Seed script failed or not available"
fi

log_info "Starting application..."
exec "$@"
