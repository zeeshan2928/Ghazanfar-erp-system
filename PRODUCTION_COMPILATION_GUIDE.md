# PRODUCTION COMPILATION & DEPLOYMENT GUIDE

**Purpose:** Build, test, and deploy all 3 screens to production  
**Timeline:** 1-2 hours  
**Audience:** DevOps / Lead Developer

---

## 🔨 BUILD PROCESS

### Step 1: Pre-Build Verification

```bash
# Check git status
git status

# Ensure no uncommitted changes
git diff --exit-code

# Run tests
npm test -- --passWithNoTests

# Check linting
npm run lint
```

**Expected:** All passing, no errors

### Step 2: Clean Build

```bash
# Remove old build artifacts
rm -rf dist/ build/ .next/ node_modules/.cache

# Install dependencies (if needed)
npm ci

# TypeScript compilation check
npm run type-check
```

**Expected:** No TypeScript errors

### Step 3: Build Frontend

```bash
# Production build
npm run build

# Check bundle size
npm run build:analyze
```

**Expected:**
- Build completes without errors
- Bundle size < 500KB (gzipped)
- No warnings in output

### Step 4: Build Backend

```bash
cd backend/

# Compile TypeScript
npm run build

# Check for errors
npm run type-check
```

**Expected:** No errors or warnings

---

## ✅ PRE-DEPLOYMENT TESTS

### Unit Tests

```bash
# Run all tests
npm test

# Coverage report
npm test -- --coverage
```

**Expected:**
- All tests pass
- Coverage > 80%
- No flaky tests

### Integration Tests

```bash
# Start test database
docker-compose -f docker-compose.test.yml up

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

**Expected:** All integration tests pass

### Build Verification

```bash
# Verify production build can start
npm run build
npm run preview  # or npm start
```

**Expected:** App starts without errors, loads in browser

---

## 🚀 DEPLOYMENT CHECKLIST

### Environment Setup

```bash
# Set production environment variables
export NODE_ENV=production
export REACT_APP_API_URL=https://api.production.com
export REACT_APP_WS_URL=wss://ws.production.com

# Verify critical variables set
env | grep REACT_APP_
env | grep NODE_ENV
```

**Required Variables:**
- [ ] REACT_APP_API_URL
- [ ] REACT_APP_WS_URL
- [ ] NODE_ENV=production
- [ ] DATABASE_URL (backend)
- [ ] JWT_SECRET (backend)

### Database Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy

# Verify schema
npx prisma db push --skip-generate
```

**Expected:** All migrations applied, schema up-to-date

### Backend Deployment

```bash
# Build backend
npm run build

# Run database migrations
npm run db:migrate:prod

# Start backend service
npm run start:prod

# Verify health check
curl http://localhost:3000/health
```

**Expected:** Backend running, health check OK

### Frontend Deployment

```bash
# Build frontend
npm run build

# Deploy to CDN/hosting
npm run deploy:prod

# Verify deployment
curl https://app.production.com

# Check assets loaded
# Open DevTools, verify no 404s on resources
```

**Expected:**
- [ ] App loads at production URL
- [ ] No 404 errors
- [ ] Assets load correctly
- [ ] API calls to correct endpoint

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Frontend

```bash
# Check JavaScript loads and runs
# Open https://app.production.com in browser
# Open DevTools Console - no errors
# Check Network tab - all requests succeed

# Test key workflows
1. Login successfully
2. View gate pass list (warehouse staff)
3. View inventory dashboard (manager)
4. Create adjustment (manager)
5. Scan QR code (warehouse)
6. Go offline and back online
```

### Backend

```bash
# Check API health
curl https://api.production.com/health

# Check database connection
curl https://api.production.com/db/status

# Check WebSocket
wscat -c wss://ws.production.com

# Monitor logs
tail -f logs/production.log
```

### Monitoring

```bash
# Check error tracking (Sentry, etc.)
# No critical errors in dashboard
# Error rate < 0.1%

# Check performance metrics
# Page load time < 3s
# API response time < 500ms
# WebSocket latency < 200ms
```

---

## 📊 PRODUCTION CHECKLIST

### Code Quality
- [ ] TypeScript strict mode: ✅
- [ ] All linting errors resolved: ✅
- [ ] Test coverage > 80%: ✅
- [ ] No console.log() in production code: ✅
- [ ] No exposed secrets: ✅

### Performance
- [ ] Bundle size < 500KB: ✅
- [ ] Images optimized: ✅
- [ ] Code splitting enabled: ✅
- [ ] Caching headers configured: ✅
- [ ] CDN configured: ✅

### Security
- [ ] HTTPS/TLS enabled: ✅
- [ ] CORS configured: ✅
- [ ] CSP headers set: ✅
- [ ] Authentication working: ✅
- [ ] Authorization enforced: ✅
- [ ] Input validation present: ✅

### Operations
- [ ] Database backups configured: ✅
- [ ] Log aggregation enabled: ✅
- [ ] Error tracking enabled: ✅
- [ ] Monitoring alerts configured: ✅
- [ ] Runbook documented: ✅

### Data
- [ ] Database migrations applied: ✅
- [ ] Data validation passed: ✅
- [ ] Backup created before deploy: ✅
- [ ] Rollback procedure tested: ✅

---

## 🚨 ROLLBACK PROCEDURE

If deployment fails:

```bash
# 1. Stop current deployment
CTRL+C

# 2. Check current status
git status
npm run build --dry-run

# 3. Revert to last working version
git revert <commit-hash>

# 4. Rebuild and redeploy
npm run build
npm run deploy:prod

# 5. Verify recovery
curl https://app.production.com
```

---

## 📈 POST-DEPLOYMENT MONITORING (1 Hour)

Monitor closely after deployment:

```bash
# Watch error logs
tail -f logs/production.log | grep ERROR

# Monitor API response times
watch -n 1 'curl -w "%{time_total}\n" -o /dev/null -s https://api.production.com/health'

# Check WebSocket connections
netstat -an | grep 'wss' | wc -l

# Monitor CPU/Memory
top -p $(pgrep -f 'node.*prod')
```

**Watch for:**
- [ ] No spike in errors
- [ ] Response times normal
- [ ] Memory usage stable
- [ ] CPU usage < 50%

---

## ✨ SUCCESS CRITERIA

All 3 screens deployed successfully when:

✅ **Warehouse Staff Screen**
- QR scanner working
- Gate pass list loads
- Picking interface functional
- Offline mode operational

✅ **Inventory Manager Screen**
- Dashboard KPIs accurate
- Stock levels correct
- Adjustments save
- Movement history accessible

✅ **Real-time Sync**
- WebSocket connected
- Gate pass updates in real-time
- Inventory updates sync
- Conflict resolution works

✅ **Production Ready**
- No critical errors
- Performance acceptable
- Security verified
- Monitoring active

---

## 📞 SUPPORT CONTACTS

**Issues during deployment:**
- Code: DevOps team
- Database: DBA
- Frontend: Frontend lead
- Backend: Backend lead
- Monitoring: Ops team

**Escalation:** On-call engineer if critical error

---

**Deployed by:** ________________  
**Date/Time:** ________________  
**Commit:** ________________  
**Status:** [ ] Success  [ ] Partial  [ ] Rollback  

**Notes:** ____________________________________
