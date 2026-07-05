# Deployment Guide: Staging Environment

**Project**: Ghazanfar ERP Backend  
**Target Environment**: Staging  
**Date Prepared**: 2026-07-05  
**Status**: ✅ READY FOR DEPLOYMENT

---

## 📋 Pre-Deployment Checklist

```
✅ Phase 2 development complete
✅ Build verification: PASSED
✅ Compilation: ZERO ERRORS
✅ Code review: COMPLETE
✅ Test suite: CREATED (7 new test files)
✅ Documentation: COMPLETE
✅ Git history: CLEAN
✅ Restore points: BACKED UP (5 versions)
```

---

## 🚀 Deployment Steps

### Step 1: Environment Setup

```bash
# 1. Navigate to project
cd /path/to/ghazanfar-erp-backend

# 2. Switch to staging branch (if using branches)
git checkout main
git pull origin main

# 3. Install dependencies
npm install

# 4. Verify build
npm run build
# Expected: "exit code: 0"
```

### Step 2: Database Migration

```bash
# 1. Backup current database
# In your staging DB admin:
# CREATE BACKUP staging_db_2026_07_05

# 2. Run Prisma migrations
npx prisma migrate deploy

# 3. Verify schema
npx prisma studio  # Check that all new tables exist

# 4. Seed data (optional)
npm run seed:staging
```

### Step 3: Docker Build & Push

```bash
# 1. Build Docker image
docker build -t ghazanfar-erp:staging-v2.0 .

# 2. Tag for registry
docker tag ghazanfar-erp:staging-v2.0 your-registry/ghazanfar-erp:staging-v2.0

# 3. Push to registry
docker push your-registry/ghazanfar-erp:staging-v2.0
```

### Step 4: Deploy to Staging

```bash
# Option A: Using docker-compose
docker-compose -f docker-compose.staging.yml up -d

# Option B: Using Kubernetes
kubectl apply -f k8s/staging/
kubectl set image deployment/erp-backend erp-backend=your-registry/ghazanfar-erp:staging-v2.0

# Option C: Manual server deployment
ssh staging-server
cd /opt/ghazanfar-erp
git pull origin main
npm install --production
npm run start:prod
```

### Step 5: Post-Deployment Verification

```bash
# 1. Health check
curl http://staging-api.example.com/health
# Expected: {"status": "ok"}

# 2. Run smoke tests
npm run test:e2e:staging

# 3. Check logs
docker logs ghazanfar-erp-staging
# or
tail -f /var/log/ghazanfar-erp.log

# 4. Monitor metrics
# Check CPU, Memory, Disk usage
# Expected: Normal operation
```

---

## 📊 What's Being Deployed

### New Features (Phase 2)
```
✅ Gate Pass System
   - Auto-trigger on bill confirmation
   - Picking workflow with item tracking
   - QR code scanning support

✅ Inventory Reservation System
   - Reserved vs available calculation
   - Auto-release on confirmation
   - 7-day expiry for old reservations

✅ Reporting Service
   - Gate pass analytics
   - Warehouse performance metrics
   - Shortage detection reports

✅ Notification System
   - Email notifications
   - SMS/WhatsApp support
   - In-app notifications via WebSocket

✅ Labour & Accountant Monitoring (Phase 12)
   - Staff attendance tracking
   - Leave management
   - Multi-factor bonus calculation
   - Audit trail logging
```

### Critical Files

| Path | Purpose | Status |
|------|---------|--------|
| `src/modules/gate-passes/` | Gate pass service | ✅ Ready |
| `src/modules/inventory/` | Inventory reservation | ✅ Ready |
| `src/modules/reporting/` | Reporting service | ✅ Ready |
| `src/modules/notifications/` | Notification system | ✅ Ready |
| `src/modules/labour/` | Labour monitoring | ✅ Ready |
| `prisma/schema.prisma` | Database schema | ✅ Updated |
| `src/common/websocket/` | Real-time updates | ✅ Ready |
| `frontend/src/` | UI components | ✅ Ready |

---

## 🔧 Rollback Plan

If deployment fails:

### Option 1: Quick Rollback (< 5 minutes)
```bash
# Revert to previous Docker image
docker-compose -f docker-compose.staging.yml down
docker run -d --name ghazanfar-erp-staging \
  your-registry/ghazanfar-erp:staging-v1.9  # Previous version
```

### Option 2: Git Rollback
```bash
git revert HEAD  # Create a revert commit
git push origin main
npm run build && npm run start:prod
```

### Option 3: Database Rollback
```bash
# Restore from backup
# In your DB admin: RESTORE DATABASE staging_db FROM BACKUP staging_db_2026_07_04
```

### Option 4: Full Restore
```bash
# Use a restore point
unzip D:\Backups\ghazanfar-erp-backend\RESTORE_POINT_SOURCE_2026-07-05_191925.zip
cd ghazanfar-erp-backend
npm install
npm run build
npm run start:prod
```

---

## 📈 Monitoring After Deployment

### Key Metrics to Watch

```
1. API Response Time
   - Gate Pass endpoints: < 500ms
   - Reporting endpoints: < 2s
   - Notifications: < 1s

2. Database
   - Query performance: < 100ms average
   - Connection pool: 10-50 active
   - Lock wait time: < 100ms

3. Application
   - Error rate: < 0.1%
   - Uptime: > 99.9%
   - CPU usage: < 70%
   - Memory usage: < 80%

4. Business Metrics
   - Gate passes created: Should match bill confirmations
   - Notifications sent: Check email delivery rate
   - Reporting queries: Monitor execution time
```

### Alert Thresholds

```
CRITICAL (Page on-call):
- API error rate > 5%
- Database unavailable
- Memory usage > 90%
- Disk space < 10%

WARNING (Log and notify):
- API response time > 2s
- Error rate > 1%
- CPU usage > 80%
- Database locks > 1s
```

---

## 🧪 Staging Validation Tests

### Automated Tests
```bash
npm run test:e2e:staging
```

### Manual Testing Checklist

```
Gate Pass System:
☐ Create bill → automatically creates gate pass
☐ Update pick quantities → persists correctly
☐ Complete picking → calculates summary
☐ Confirm gate pass → deducts inventory
☐ Reject gate pass → releases reservation

Inventory Reservation:
☐ Available qty calculation: total - reserved
☐ Auto-reserve on bill creation
☐ Auto-release on gate pass confirm
☐ Manual release via API
☐ Shortage detection (< 10 units)

Reporting:
☐ Gate pass analytics loading
☐ Warehouse performance data
☐ Shortage reports accurate
☐ Date range filtering works
☐ Export to CSV/PDF

Notifications:
☐ Email notifications sending
☐ SMS notifications (if configured)
☐ WebSocket events broadcasting
☐ Real-time status updates
☐ Notification history logging

Labour & Accountant:
☐ Staff registration working
☐ Attendance check-in/check-out
☐ Leave application flow
☐ Bonus calculation accurate
☐ Audit trail logging actions
```

---

## 🔐 Security Checks

```
Before going live, verify:
☐ All environment variables set correctly
☐ API keys/secrets not in code
☐ Database credentials encrypted
☐ HTTPS enabled
☐ CORS properly configured
☐ Rate limiting enabled
☐ Input validation active
☐ SQL injection prevention
☐ XSS protection enabled
☐ Authentication/Authorization working
```

---

## 📞 Support & Escalation

**If something goes wrong during deployment:**

1. **Check logs first**
   ```bash
   docker logs ghazanfar-erp-staging
   tail -f /var/log/application.log
   ```

2. **Verify database connection**
   ```bash
   npm run prisma:validate
   ```

3. **Run health checks**
   ```bash
   curl http://staging-api.example.com/health
   npm run test:unit
   ```

4. **Escalate if needed**
   - Check deployment guide issues list
   - Review git commit history for issues
   - Consult team members
   - Review restore points if critical

---

## ✅ Deployment Sign-Off

- **Prepared By**: Claude Code
- **Date**: 2026-07-05
- **Phase 2 Status**: ✅ COMPLETE
- **Ready for Staging**: ✅ YES
- **Ready for Production**: ⏳ After 48h staging validation

---

## 📚 Additional Resources

- PHASE2_COMPILATION_COMPLETE.md - Compilation verification
- PHASE2_PARALLEL_DEVELOPMENT_CHECKPOINT.md - Development checkpoint
- PHASE_2_IMPLEMENTATION_COMPLETE.md - Implementation summary
- Prisma schema: prisma/schema.prisma
- Docker config: Dockerfile, docker-compose.yml
- Environment vars: .env.staging, .env.production

---

**Status**: 🟢 READY TO DEPLOY

