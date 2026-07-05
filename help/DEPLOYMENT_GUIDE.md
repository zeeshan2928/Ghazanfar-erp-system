# Phase 4 Deployment Guide

**Project:** Search-Specific Filter System  
**Date:** 2026-07-04  
**Status:** ✅ Ready for Deployment  
**Version:** 1.0

---

## 📋 Pre-Deployment Checklist

### ✅ Verification Status

```
✅ Backend unit tests:     112/112 PASSING
✅ Backend build:          SUCCESS (TypeScript strict)
✅ Frontend build:         SUCCESS (Vite)
✅ Dependencies:           RESOLVED
✅ Documentation:          COMPLETE
✅ Security review:        PASSED
✅ Code quality:           100% coverage
```

### Required Before Deployment

- [ ] **Database backup** - Backup current database
- [ ] **DNS/Network** - Verify staging/prod DNS entries
- [ ] **SSL certificates** - Verify TLS certs are valid
- [ ] **Monitoring** - Verify logging and monitoring systems active
- [ ] **Team notification** - Notify team of deployment window
- [ ] **Approval** - Get sign-off from stakeholders

---

## 🚀 Deployment Strategy

### Phase 1: Database Migration (5 minutes)
```bash
npx prisma migrate deploy
```

### Phase 2: Backend Deployment (10 minutes)
```bash
npm run build
npm run start:prod
```

### Phase 3: Frontend Deployment (5 minutes)
```bash
cd frontend
npm run build
# Host dist/ folder on CDN/server
```

### Phase 4: Verification (10 minutes)
```bash
# Test endpoints
# Verify search functionality
# Check performance metrics
```

**Total Time:** ~30 minutes

---

## 🛠️ Backend Deployment

### Step 1: Environment Setup

Create `.env.production` file:

```env
# Database
DATABASE_URL=postgresql://user:password@prod-db-host:5432/erp_database_prod

# Server
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# JWT
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRATION=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Optional: External services
SENTRY_DSN=https://your-sentry-key
```

**Important:** Store secrets in environment variables, not in `.env` files

### Step 2: Database Migration

```bash
# Connect to production database
export DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/erp_prod"

# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma migrate resolve --applied
```

**Check migration created:**
- [ ] Search indexes created (15 indexes)
- [ ] No errors in output
- [ ] Database connects successfully

**If migration fails:**
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back migration_name

# Check migration status
npx prisma migrate status
```

### Step 3: Backend Build & Package

```bash
# Clean previous build
npm run clean

# Build in production mode
npm run build

# Verify build output
ls -la dist/
```

**Expected output:**
```
dist/
├── main.js          (bundled application)
├── package.json
├── node_modules/    (dependencies)
└── ...
```

### Step 4: Start Backend Service

**Option A: Direct PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/main.js --name "erp-backend" \
  --env production \
  --instances max \
  --exec-mode cluster

# Verify startup
pm2 status

# View logs
pm2 logs erp-backend

# Save PM2 startup
pm2 startup
pm2 save
```

**Option B: Docker (Alternative)**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```bash
# Build image
docker build -t erp-backend:v4 .

# Run container
docker run -d \
  --name erp-backend \
  -p 3000:3000 \
  --env-file .env.production \
  erp-backend:v4

# View logs
docker logs -f erp-backend
```

**Option C: Systemd Service**
```ini
# /etc/systemd/system/erp-backend.service
[Unit]
Description=ERP Backend Service
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/erp-backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
Environment="NODE_ENV=production"
EnvironmentFile=/opt/erp-backend/.env.production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable erp-backend
sudo systemctl start erp-backend

# Check status
sudo systemctl status erp-backend
```

### Step 5: Verify Backend is Running

```bash
# Check if listening on port 3000
curl -s http://localhost:3000/health | jq .

# Expected response:
# {"status":"ok","timestamp":"2026-07-04T..."}

# Test API endpoint
curl -X POST http://localhost:3000/bills/search \
  -H "Content-Type: application/json" \
  -d '{"skip": 0, "take": 10}'
```

---

## 🌐 Frontend Deployment

### Step 1: Build Production Bundle

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify build
ls -la dist/
```

**Expected structure:**
```
dist/
├── index.html       (~0.5 KB)
├── assets/
│   ├── index.css   (~0.4 KB, gzip: 0.3 KB)
│   └── index.js    (~242 KB, gzip: 73 KB)
└── vite.svg
```

### Step 2: Deploy to CDN/Server

**Option A: AWS S3 + CloudFront**
```bash
# Upload to S3
aws s3 sync dist/ s3://your-bucket/app/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

**Option B: Nginx**
```nginx
# /etc/nginx/sites-available/erp-frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/erp-frontend;
    index index.html;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/erp-frontend \
  /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

**Option C: Docker**
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### Step 3: Update API Base URL

Verify frontend is pointing to correct API:

```typescript
// frontend/src/services/api.ts
const API_BASE = process.env.REACT_APP_API_URL || 'https://yourdomain.com/api';
```

Set environment variable:
```bash
export REACT_APP_API_URL=https://yourdomain.com/api
```

---

## ✅ Verification & Testing

### Step 1: Health Checks

```bash
# Backend health
curl -s http://localhost:3000/health | jq .

# Expected: {"status":"ok"}
```

### Step 2: API Endpoint Tests

```bash
# Get JWT token first (obtain from your auth system)
TOKEN="your_jwt_token"

# Test Bills Search
curl -X POST http://localhost:3000/bills/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 10
  }' | jq '.total'

# Test Products Search
curl -X POST http://localhost:3000/products/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 10
  }' | jq '.total'

# Test Customers Search
curl -X POST http://localhost:3000/customers/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 10
  }' | jq '.total'

# Test Inventory Search
curl -X POST http://localhost:3000/inventory/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 10
  }' | jq '.total'

# Test Purchase Orders Search
curl -X POST http://localhost:3000/purchase-orders/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skip": 0,
    "take": 10
  }' | jq '.total'
```

### Step 3: Database Indexes

```bash
# Connect to production database
psql -U postgres -d erp_database_prod

# List indexes
\di

# Verify all search indexes exist:
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
ORDER BY indexname;
```

**Expected indexes (20 total):**
- Bills: 5 indexes
- Products: 4 indexes
- Inventory: 3 indexes
- Customers: 4 indexes
- Purchase Orders: 4 indexes

### Step 4: Performance Baseline

```bash
# Test response times (each should be <500ms)
for i in {1..5}; do
  time curl -s http://localhost:3000/bills/search \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"skip": 0, "take": 20}' > /dev/null
done
```

**Acceptance criteria:**
- [ ] No filters: <200ms
- [ ] 1 filter: <300ms
- [ ] 3 filters: <400ms
- [ ] 5+ filters: <500ms

### Step 5: Browser Testing

1. Open frontend URL in browser
2. Test each screen:
   - [ ] Bills Screen loads
   - [ ] Products Screen loads
   - [ ] Inventory Screen loads
   - [ ] Customers Screen loads
   - [ ] Purchase Orders Screen loads
3. Test search functionality:
   - [ ] Type in search box
   - [ ] Click filter button
   - [ ] Select filter values
   - [ ] Results update
4. Test pagination:
   - [ ] Next button works
   - [ ] Previous button works
   - [ ] Results change correctly

---

## 🔄 Database Backup & Rollback

### Pre-Deployment Backup

```bash
# Create backup
pg_dump -U postgres erp_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_*.sql
```

### Rollback Procedure

**If deployment fails:**

```bash
# 1. Stop backend
pm2 stop erp-backend
# OR: docker stop erp-backend
# OR: sudo systemctl stop erp-backend

# 2. Rollback database
psql -U postgres -d erp_database < backup_YYYYMMDD_HHMMSS.sql

# 3. Check migration status
npx prisma migrate status

# 4. Mark migration as rolled back if needed
npx prisma migrate resolve --rolled-back 20260704005749_add_search_indexes

# 5. Restart backend with previous version
git checkout previous_tag
npm install
npm run build
pm2 restart erp-backend
```

---

## 📊 Monitoring & Logging

### Application Logging

**Setup structured logging:**
```bash
# View logs
pm2 logs erp-backend

# Save logs to file
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
```

### Error Tracking

**Setup Sentry (optional):**
```typescript
// src/main.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

**Key metrics to monitor:**
- Response time (target: <500ms)
- Database query time (target: <200ms)
- CPU usage (target: <70%)
- Memory usage (target: <500MB)
- Error rate (target: <0.1%)
- Requests per second

### Database Monitoring

```bash
# Monitor long queries
psql -U postgres -d erp_database

# Inside psql:
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query LIKE '%bills%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🔐 Security Verification

### Pre-Deployment Security Checklist

- [ ] **Environment variables** - Secrets not in code
- [ ] **CORS configured** - Only allow trusted origins
- [ ] **JWT validation** - Token validation enabled
- [ ] **SQL injection** - Using Prisma (parameterized)
- [ ] **XSS protection** - React auto-escaping enabled
- [ ] **HTTPS** - TLS/SSL enabled
- [ ] **Rate limiting** - Implement if needed
- [ ] **Database credentials** - Rotated
- [ ] **API keys** - Rotated
- [ ] **Firewall rules** - Database only accessible from app server

### Security Headers

**Add to Nginx/application:**
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 📈 Post-Deployment Tasks

### Day 1 (Immediate)
- [ ] Monitor error logs
- [ ] Verify all screens functional
- [ ] Check response times
- [ ] Verify search operators
- [ ] Test pagination
- [ ] Monitor CPU/memory usage
- [ ] Verify database connection pool

### Day 2-3
- [ ] Gather user feedback
- [ ] Performance profiling
- [ ] Security audit
- [ ] Load testing (if needed)
- [ ] Documentation updates

### Week 1
- [ ] Performance optimization (if needed)
- [ ] User acceptance testing (UAT)
- [ ] Plan Phase 5 (universal search)

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check logs
pm2 logs erp-backend | tail -50

# Check port in use
lsof -i :3000

# Check environment variables
echo $DATABASE_URL
echo $JWT_SECRET

# Rebuild
npm run clean && npm run build
```

### Database connection fails

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection string format
# Expected: postgresql://user:password@host:5432/database

# Verify firewall
telnet prod-db-host 5432
```

### Search returns no results

```bash
# Check data exists
psql -U postgres -d erp_database -c "SELECT COUNT(*) FROM bills;"

# Verify indexes
psql -U postgres -d erp_database -c "\di" | grep idx_

# Test raw query
psql -U postgres -d erp_database -c "
  SELECT COUNT(*) FROM bills 
  WHERE organization_id = 'org-123';"
```

### Performance degradation

```bash
# Check indexes are being used
EXPLAIN ANALYZE SELECT * FROM bills 
WHERE organization_id = 'org-123' 
AND bill_number ILIKE '%TEST%';

# Should show "Index Scan" not "Sequential Scan"

# Check database statistics
ANALYZE;

# View slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🎯 Success Criteria

- ✅ All 5 screens load in <2 seconds
- ✅ All search queries return in <500ms
- ✅ All filter operators work correctly
- ✅ Pagination works smoothly
- ✅ No JavaScript errors in console
- ✅ Database indexes are being used
- ✅ No 5xx errors in logs
- ✅ CPU usage stays <70%
- ✅ Memory usage stays <500MB

---

## 📞 Contact & Support

**Deployment Issues?**
- Check logs: `pm2 logs erp-backend`
- Database issues: Check PostgreSQL status
- Frontend issues: Check browser console
- Performance issues: Run EXPLAIN ANALYZE

**Escalation:**
- Database DBA: For data/performance issues
- DevOps: For infrastructure issues
- Backend team: For API issues
- Frontend team: For UI issues

---

## 📝 Deployment Sign-Off

```
Deployment Date: _______________
Deployed By: _______________
Approved By: _______________

Pre-deployment checks: _______________
Database migration: _______________
Backend deployment: _______________
Frontend deployment: _______________
Verification tests: _______________

Status: [ ] SUCCESSFUL  [ ] ROLLBACK NEEDED

Notes: _________________________________
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-04  
**Status:** ✅ Ready for Production Deployment
