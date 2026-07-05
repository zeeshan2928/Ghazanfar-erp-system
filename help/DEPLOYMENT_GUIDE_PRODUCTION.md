# Deployment Guide: Production Environment

**Project**: Ghazanfar ERP Backend - Phase 2 Complete  
**Target Environment**: Production  
**Date Prepared**: 2026-07-05  
**Approval Required**: YES - Requires sign-off from Tech Lead & DevOps

---

## 🔴 CRITICAL: PRODUCTION DEPLOYMENT CHECKLIST

**This is a production deployment. All items MUST be verified before proceeding.**

```
PRE-DEPLOYMENT (48+ hours before)
☐ Staging deployment successful (48h+ validation)
☐ All staging tests passing
☐ Zero critical bugs in staging logs
☐ Performance metrics acceptable in staging
☐ Database migrations tested in staging
☐ Rollback procedure tested
☐ Communication sent to stakeholders
☐ Maintenance window scheduled
☐ On-call engineer notified
☐ All team members aware

DEPLOYMENT DAY
☐ Final backup taken
☐ Deployment window confirmed
☐ All services operational
☐ Monitoring alerts configured
☐ Slack/PagerDuty notifications enabled
☐ Business stakeholders standing by
```

---

## 🚀 Production Deployment Steps

### Phase 1: Pre-Deployment (T-24 hours)

```bash
# 1. Create final backup
mysqldump -u root -p ghazanfar_erp > /backups/production_2026-07-05_final.sql
# Or for PostgreSQL:
pg_dump -U postgres ghazanfar_erp > /backups/production_2026-07-05_final.sql

# 2. Verify database integrity
npm run prisma:validate

# 3. Run full test suite one more time
npm run test:all

# 4. Verify all environment variables are set
npm run config:validate

# 5. Audit security
npm run security:check

# 6. Performance baseline
npm run perf:analyze
```

### Phase 2: Blue-Green Deployment (RECOMMENDED)

**Blue-Green allows instant rollback if issues occur.**

```bash
# 1. Build new image (Green)
docker build -t ghazanfar-erp:production-v2.0 .
docker tag ghazanfar-erp:production-v2.0 your-registry/ghazanfar-erp:production-v2.0
docker push your-registry/ghazanfar-erp:production-v2.0

# 2. Start Green environment in parallel (with same DB as Blue)
docker-compose -f docker-compose.production.green.yml up -d
# Health check Green
curl http://green-api.example.com/health

# 3. Run smoke tests on Green
npm run test:e2e:production

# 4. Switch load balancer to Green (traffic routing)
# Update nginx/HAProxy/CloudFlare to point to Green
# OR use Kubernetes: kubectl set image deployment/erp-backend erp-backend=...:production-v2.0

# 5. Monitor Green for 10 minutes
# Check error rates, response times, database load
# If all OK → Green becomes Blue
# If issues → instant rollback to old Blue

# 6. Verify production is healthy
curl http://api.example.com/health
npm run test:smoke:production
```

### Phase 3: Database Migration (If Needed)

```bash
# 1. Run migrations with zero-downtime approach
# DO NOT use: ALTER TABLE ... ADD COLUMN (blocking)
# DO use: Add column, backfill in batches, add constraints

npm run prisma:migrate:deploy

# 2. Verify schema
npx prisma db pull
# Compare with schema.prisma

# 3. Run data validation
npm run db:validate:production

# 4. Check replication lag (if using replicas)
# Your replication lag should be < 1 second
```

### Phase 4: Post-Deployment Verification

```bash
# 1. Health checks
curl -v http://api.example.com/health
curl -v http://api.example.com/api/v1/status

# 2. Smoke tests
npm run test:smoke:production

# 3. Business logic validation
# Test critical paths:
npm run test:e2e:production:gate-pass
npm run test:e2e:production:inventory
npm run test:e2e:production:reporting

# 4. Monitor metrics for 30 minutes
# Check: Error rate, latency, CPU, memory, connections

# 5. Verify webhooks/notifications working
# Send test notification to check email/SMS delivery

# 6. Log verification
tail -f /var/log/ghazanfar-erp/production.log
# Should show: "Server running on port 3000"
# Should NOT show: errors, exceptions
```

---

## 📊 Production Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Load Balancer (Nginx/HAProxy)       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐    ┌──────────────────┐     │
│  │  API Server 1    │    │  API Server 2    │     │
│  │  (Production)    │    │  (Production)    │     │
│  └──────────────────┘    └──────────────────┘     │
│           │                       │                │
│           └───────────┬───────────┘                │
│                       │                            │
│           ┌───────────▼──────────┐               │
│           │  Primary Database    │               │
│           │  (Read/Write)        │               │
│           └───────────┬──────────┘               │
│                       │                          │
│           ┌───────────▼──────────┐               │
│           │  Replica Database    │               │
│           │  (Read-Only)         │               │
│           └──────────────────────┘               │
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │  Redis Cache     │    │  Message Queue   │  │
│  └──────────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Rollback Procedures

### Option 1: Instant Rollback (Blue-Green)
**Time to recovery: < 2 minutes**

```bash
# Switch load balancer back to Blue
# Point traffic back to old container
docker-compose -f docker-compose.production.blue.yml up -d

# Or with Kubernetes
kubectl set image deployment/erp-backend erp-backend=your-registry/ghazanfar-erp:production-v1.9

# Verify
curl http://api.example.com/health
```

### Option 2: Database Rollback
**If migrations caused issues**

```bash
# Restore from backup
mysql -u root -p ghazanfar_erp < /backups/production_2026-07-05_final.sql

# Or PostgreSQL
psql -U postgres ghazanfar_erp < /backups/production_2026-07-05_final.sql

# Verify data integrity
npm run db:validate:production
```

### Option 3: Complete Rollback
**If everything needs to be reverted**

```bash
# 1. Switch to previous version
git checkout production-v1.9

# 2. Rebuild
npm install --production
npm run build

# 3. Restart services
docker-compose -f docker-compose.production.yml restart

# 4. Verify
npm run test:smoke:production
```

---

## 📈 Production Monitoring

### Critical Metrics to Track (24/7)

```
API Performance:
├─ Response Time (p99): < 500ms
├─ Error Rate: < 0.1%
├─ Requests/sec: Normal baseline
└─ Latency (p95): < 200ms

Database:
├─ Connection Pool: 20-100 active
├─ Query Time (p95): < 100ms
├─ Replication Lag: < 1s
└─ Disk Space: > 30% free

System:
├─ CPU Usage: < 75%
├─ Memory Usage: < 80%
├─ Disk I/O: < 70%
└─ Network: Normal throughput

Business:
├─ Gate Passes Created: Matches bills
├─ Notifications Sent: Check delivery rate
├─ Reporting Queries: Monitor execution
└─ Errors Logged: Zero critical
```

### Alert Configuration

```
CRITICAL (Page on-call immediately):
- API error rate > 5%
- Database unavailable
- Memory usage > 95%
- Disk space < 10%
- Replication lag > 10s
- Any exception in logs

WARNING (Log and notify team):
- API response time > 2s (p99)
- Error rate > 1%
- CPU usage > 80%
- Database locks > 5s
- Slow queries detected
```

---

## ✅ Success Criteria

Production deployment is successful if:

```
Within 1 hour:
✅ All health checks passing
✅ Error rate < 0.1%
✅ Response times normal
✅ Database replication in sync
✅ No exceptions in logs

Within 24 hours:
✅ Zero critical bugs reported
✅ All features working as expected
✅ Monitoring showing stable performance
✅ Business users report no issues
✅ Backup verification successful

Within 7 days:
✅ All edge cases tested
✅ Performance baseline established
✅ Team confident in stability
✅ Ready to close deployment ticket
```

---

## 🚨 Emergency Procedures

### If Critical Issue Occurs

**Step 1: Immediate Actions (< 5 minutes)**
```
1. Page on-call engineer
2. Notify tech lead
3. Post to #incidents Slack channel
4. Trigger blue-green rollback
5. Verify old version stable
```

**Step 2: Investigation (5-30 minutes)**
```
1. Gather error logs
2. Check metrics at time of incident
3. Identify root cause
4. Document findings
```

**Step 3: Resolution (30+ minutes)**
```
1. Fix issue
2. Test fix in staging (if time allows)
3. Re-deploy
4. Verify stability
5. Post-mortem within 24h
```

---

## 📋 Production Deployment Sign-Off

**This deployment requires approval:**

```
Tech Lead Sign-Off:
Name: ________________     Date: ________     Signature: ________________

DevOps Sign-Off:
Name: ________________     Date: ________     Signature: ________________

Business Owner Sign-Off:
Name: ________________     Date: ________     Signature: ________________
```

---

## 📞 Support Contacts

```
During Deployment:
- Tech Lead: [phone/slack]
- DevOps Engineer: [phone/slack]
- Database Admin: [phone/slack]

During First 24 Hours:
- On-Call Engineer: [phone/pagerduty]
- Engineering Manager: [phone/slack]

Escalation:
- CTO: [phone/email]
- VP Engineering: [phone/email]
```

---

## 🎯 Final Checklist

```
BEFORE DEPLOYMENT:
☐ Staging validated (48h+)
☐ Database backed up
☐ Rollback tested
☐ Team briefed
☐ Maintenance window communicated
☐ All checks green

DURING DEPLOYMENT:
☐ Monitoring dashboard open
☐ On-call standing by
☐ Slack channel active
☐ Health checks passing
☐ Smoke tests passing

AFTER DEPLOYMENT:
☐ All metrics normal
☐ Error rate acceptable
☐ Users reporting no issues
☐ Business confirms features work
☐ Monitoring set to alert
☐ Deployment logged
☐ Team notified success
```

---

**Status**: 🟡 **READY FOR PRODUCTION AFTER STAGING VALIDATION (48h)**

**Next Step**: Complete staging validation, then follow this guide.

