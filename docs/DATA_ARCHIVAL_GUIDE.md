# Data Archival & Cleanup Guide

## Overview

The data archival system manages data retention, cleanup, and compliance with configurable policies. It includes automatic scheduled jobs and manual operations for data management.

## Retention Policies

### Standard Retention Periods

```
BILLS:
├── DRAFT bills: 30 days
├── APPROVED bills: 365 days (1 year)
└── PAID bills: 1,825 days (5 years)

PURCHASE ORDERS:
├── DRAFT POs: 30 days
├── APPROVED POs: 90 days
└── RECEIVED POs: 730 days (2 years)

INVENTORY HISTORY:
├── Stock movements: 90 days
└── Stock adjustments: 180 days

NOTIFICATIONS:
├── Read notifications: 90 days
└── Unread notifications: 180 days

AUDIT LOGS:
├── General operations: 365 days (1 year)
├── Critical operations: 2,190 days (6 years)
└── Financial operations: 2,555 days (7 years)
```

### Compliance Requirements

These retention periods comply with:
- Pakistani tax authorities (5-7 year requirement)
- International accounting standards
- GDPR data minimization principles
- Industry best practices

## Archival Service

### REST API Endpoints

#### Manual Archival Operations

**Archive Completed Bills**
```
POST /data-management/archive/bills/{daysOld}

Parameters:
  daysOld: Days to keep (default: 365)
  
Response:
{
  "entity": "Bills",
  "archivedCount": 150,
  "deletedCount": 0,
  "duration": 5432,
  "timestamp": "2026-07-04T10:30:00Z"
}
```

**Archive Purchase Orders**
```
POST /data-management/archive/purchase-orders/{daysOld}

Parameters:
  daysOld: Days to keep (default: 180)
```

**Purge Old Notifications**
```
POST /data-management/purge/notifications/{daysOld}

Parameters:
  daysOld: Days to keep (default: 90)
  
Effect: Deletes read notifications older than specified days
```

**Purge Old Audit Logs**
```
POST /data-management/purge/audit-logs/{daysOld}

Parameters:
  daysOld: Days to keep (default: 365)
  
Note: Critical and financial logs are preserved longer
```

**Cleanup Failed Transactions**
```
POST /data-management/cleanup/failed-transactions/{hoursOld}

Parameters:
  hoursOld: Hours to keep (default: 24)
  
Effect: Removes DRAFT bills and POs older than specified hours
```

### Reporting Endpoints

**Get Archive Report**
```
GET /data-management/reports/archive

Response:
{
  "report": {
    "bills": 5000,
    "purchaseOrders": 2500,
    "notifications": 10000,
    "auditLogs": 50000,
    "totalRecords": 67500
  },
  "retentionPolicies": {...},
  "timestamp": "2026-07-04T10:30:00Z",
  "orgId": "all"
}
```

**Get Storage Statistics**
```
GET /data-management/reports/storage

Response:
{
  "organizationId": 1,
  "timestamp": "2026-07-04T10:30:00Z",
  "data": {
    "bills": 2500000,
    "purchaseOrders": 1200000,
    "notifications": 800000,
    "auditLogs": 5000000
  }
}
```

**Organization-Specific Report**
```
GET /data-management/reports/archive/{orgId}

Parameters:
  orgId: Organization ID
```

## Scheduled Tasks

The system runs automatic cleanup and archival via cron jobs:

### Daily Cleanup (2:00 AM)
```
✓ Archive completed bills older than 365 days
✓ Cleanup failed transactions older than 24 hours
✓ Purge read notifications older than 90 days
✓ Log summary and send alerts if errors occur

Duration: ~1-2 minutes
```

### Weekly Maintenance (Sunday 3:00 AM)
```
✓ Generate archival statistics
✓ Collect storage statistics
✓ Archive closed POs older than 180 days
✓ Optimize database indexes

Duration: ~5-10 minutes
```

### Monthly Archival (1st of month 4:00 AM)
```
✓ Archive month-old bills (30+ days)
✓ Archive old audit logs (365+ days)
✓ Generate compliance report
✓ Backup archived data

Duration: ~10-20 minutes
```

## Configuration

### Adjust Retention Policies

Edit retention policies in `src/modules/data-management/services/archival.service.ts`:

```typescript
const RETENTION_POLICIES = {
  BILLS: {
    DRAFT: 30,      // Reduce from 30 to 7 days
    FINALIZED: 365, // Reduce from 365 to 180 days
    PAID: 1825,     // Keep 5 years for compliance
  },
  // ... other policies
};
```

### Modify Cron Schedules

Edit cron expressions in `archival.service.ts`:

```typescript
// Change daily cleanup time
@Cron('0 3 * * *') // 3 AM instead of 2 AM
async dailyCleanup() { ... }

// Change weekly maintenance to Mondays
@Cron('0 3 * * 1') // Monday at 3 AM
async weeklyMaintenance() { ... }

// Change monthly archival to 15th of month
@Cron('0 4 15 * *') // 15th at 4 AM
async monthlyArchival() { ... }
```

**Cron Format**: `seconds minutes hours dayOfMonth month dayOfWeek`

Common patterns:
- `0 2 * * *` - Daily at 2 AM
- `0 3 * * 0` - Sunday at 3 AM
- `0 4 1 * *` - 1st of month at 4 AM
- `0 * * * *` - Every hour

## Data Archival Strategy

### Tiered Archival Approach

**Tier 1: Hot Data (Last 30 days)**
- Bills in progress
- Recent transactions
- Active notifications
- Frequently accessed

**Tier 2: Warm Data (30-365 days)**
- Finalized bills awaiting payment
- Closed purchase orders
- Read notifications
- Stored in main database

**Tier 3: Cold Data (365+ days)**
- Paid bills (historical)
- Completed transactions
- Archived notifications
- Kept for compliance/reference

**Tier 4: Archive (5+ years)**
- Financial records (compliance)
- Audit trails (legal requirement)
- Tax documents
- Stored separately with limited access

### Implementation

```typescript
// Archive to separate schema
async archiveCompletedBills(daysOld: number) {
  // 1. Copy to archive table
  await this.prisma.$executeRaw`
    INSERT INTO bill_archive
    SELECT * FROM bill
    WHERE bill_date < NOW() - INTERVAL '${daysOld} days'
    AND status IN ('APPROVED', 'PAID')
  `;
  
  // 2. Delete from main table
  await this.prisma.bill.deleteMany({
    where: {
      bill_date: { lte: cutoffDate },
      status: { in: ['APPROVED', 'PAID'] }
    }
  });
}
```

## Compliance & Legal

### Tax Compliance (Pakistan)

**FBR Requirements**:
- Keep bills and invoices: 5 years minimum
- Keep payment records: 5 years minimum
- Keep audit logs: 5+ years minimum

**Implementation**:
```typescript
// Financial records marked as CRITICAL
action: 'DELETE' | 'APPROVE' | 'PAYMENT'
// These have extended retention (7 years)
```

### Data Privacy (GDPR/Local Laws)

**Retention Principles**:
- Keep only necessary data
- Purge read notifications regularly
- Allow right-to-deletion for customers
- Maintain audit trail for compliance

**Implementation**:
```typescript
// Delete personal data of inactive customers
async deleteCustomerData(customerId: number) {
  // Anonymize or delete sensitive data
  await this.prisma.customer.update({
    where: { id: customerId },
    data: {
      email: 'deleted@archive.local',
      phone: null,
      isActive: false
    }
  });
}
```

## Monitoring & Alerts

### Database Storage Monitoring

```typescript
// Check storage growth
async monitorStorageGrowth() {
  const stats = await this.getStorageStats();
  const yesterday = await this.getStorageStats(lastDay);
  
  const growth = stats.totalSize - yesterday.totalSize;
  
  if (growth > THRESHOLD) {
    await this.alertAdmin('Storage growing rapidly', growth);
  }
}
```

### Archival Job Monitoring

```typescript
// Track daily cleanup
async dailyCleanup() {
  const report = {
    timestamp: new Date(),
    billsArchived: 0,
    notificationsDeleted: 0,
    errors: []
  };
  
  // ... perform archival
  
  // Alert if errors
  if (report.errors.length > 0) {
    await this.sendAlert('Cleanup failed', report);
  }
}
```

## Disaster Recovery

### Backup Before Archival

```bash
# Manual backup before major archival
pg_dump -d erp_db -t bill -t bill_archive > bills_backup.sql

# Perform archival
curl -X POST http://localhost:3000/data-management/archive/bills/365

# Verify archive
psql -d erp_db -c "SELECT COUNT(*) FROM bill_archive;"
```

### Recovery Procedures

**Restore from Archive**:
```sql
-- If data was incorrectly archived
INSERT INTO bill
SELECT * FROM bill_archive
WHERE bill_date > '2026-01-01'
  AND bill_number = 'BILL-2026-070001';
```

**Point-in-Time Recovery**:
```bash
# Restore database to specific date
pg_restore -d erp_db -t bill \
  --backup-backup.sql --data-only
```

## Performance Tuning

### Index Optimization

```sql
-- Create indexes to speed up archival queries
CREATE INDEX idx_bill_status_date 
ON bill(status, bill_date);

CREATE INDEX idx_notification_read_date 
ON notification(isRead, createdAt);

CREATE INDEX idx_auditlog_action_date 
ON audit_log(action, timestamp);
```

### Batch Processing

```typescript
// Process in batches to avoid locking
async archiveBillsInBatches(daysOld: number, batchSize = 1000) {
  let processed = 0;
  let toArchive = true;
  
  while (toArchive) {
    const bills = await this.prisma.bill.findMany({
      where: { bill_date: { lte: cutoffDate } },
      take: batchSize
    });
    
    if (bills.length === 0) toArchive = false;
    
    // Archive batch
    await this.archiveBatch(bills);
    processed += bills.length;
  }
  
  return processed;
}
```

## Examples

### Example 1: Archive 2-Year-Old Bills

```bash
# Calculate days: 2 years = 730 days
curl -X POST http://localhost:3000/data-management/archive/bills/730

# Response:
# {
#   "entity": "Bills",
#   "archivedCount": 2500,
#   "deletedCount": 0,
#   "duration": 15234,
#   "timestamp": "2026-07-04T10:30:00Z"
# }
```

### Example 2: Cleanup Failed Transactions

```bash
# Clean up DRAFT transactions from last 48 hours
curl -X POST http://localhost:3000/data-management/cleanup/failed-transactions/48

# Response:
# {
#   "entity": "FailedTransactions",
#   "archivedCount": 0,
#   "deletedCount": 23,
#   "duration": 2345,
#   "timestamp": "2026-07-04T10:30:00Z"
# }
```

### Example 3: Check Storage Usage

```bash
curl -X GET http://localhost:3000/data-management/reports/storage

# Response shows:
# Bills: 2.5 MB
# PurchaseOrders: 1.2 MB
# Notifications: 0.8 MB
# AuditLogs: 5.0 MB
# Total: 9.5 MB
```

## Best Practices

1. **Regular Archival**: Run archival monthly
2. **Backup First**: Always backup before deleting
3. **Monitor Growth**: Track database size growth
4. **Compliance Review**: Quarterly audit of retention
5. **Automate Tasks**: Use cron for automatic cleanup
6. **Document Changes**: Track retention policy changes
7. **Test Recovery**: Periodically test data recovery
8. **Alert Setup**: Configure alerts for failures

## Troubleshooting

### Issue: Archival Job Failed

**Check logs**:
```bash
# View NestJS logs
tail -f logs/error.log | grep archival
```

**Verify database connection**:
```bash
psql -d erp_db -c "SELECT COUNT(*) FROM bill;"
```

### Issue: Slow Archival

**Add indexes**:
```sql
CREATE INDEX idx_bill_date ON bill(bill_date);
CREATE INDEX idx_po_status ON purchase_order(status);
```

### Issue: Storage Not Decreasing

**Check if data was really deleted**:
```bash
VACUUM ANALYZE; -- Reclaim disk space in PostgreSQL
```

## Related Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Initial setup
- [BULK_IMPORT_GUIDE.md](./BULK_IMPORT_GUIDE.md) - Bulk imports
- [SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md) - Seed documentation
