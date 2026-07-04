# Database Setup and Seeding Guide

## Overview

The ERP system includes a comprehensive data setup and seeding suite designed to populate your database with realistic, interconnected demo data. This guide covers setup, seeding, and data management strategies.

## Quick Start

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Create database and apply schema
npx prisma migrate deploy

# Seed database with demo data
npm run seed
```

### 2. Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Seeding Details

### What Gets Seeded?

The seed script creates realistic data across your entire ERP system:

#### Organizations (4 total)
- **Primary Organization**: Ghazanfar ERP (primary business)
- **Demo Org 1**: Karachi Trading Co (manufacturing)
- **Demo Org 2**: Lahore Wholesale Hub (distribution)
- **Demo Org 3**: Islamabad Retail Chain (retail)

#### Users (10 per organization)
- **1 Admin**: Full system access
- **2 Managers**: Can approve bills, manage reports
- **5 Staff**: Can create bills, limited access
- **2 Viewers**: Read-only access

**Default Password**: `Demo@12345` (for testing only)

#### Vendors (8 per organization)
- Raw material suppliers (textile mills, chemical plants)
- Packaging suppliers (carton manufacturers, label printers)
- Equipment vendors (machinery, maintenance)

#### Customers (18 per organization)
- Wholesale customers (credit limits: 1-2.5M PKR)
- Retail customers (credit limits: 50-300K PKR)
- Corporate/Direct customers (bulk buyers, institutions)

#### Products
- Links existing 2,382 products from catalog
- Assigns 1-3 vendors per product with pricing variations
- Creates realistic sourcing scenarios

#### Inventory
- Stock levels across warehouses
- Distribution pattern:
  - 30% Low stock (0-10 units)
  - 40% Normal (50-200 units)
  - 20% High (200-1000 units)
  - 10% Out of stock

#### Transactions
- **100 Bills** per organization
  - 40 DRAFT (current work)
  - 50 FINALIZED (awaiting payment)
  - 10 PAID (completed)
- **50 Purchase Orders** per organization
  - Various statuses (DRAFT, SENT, RECEIVED)
  - Realistic delivery dates

#### Financial Records
- Payment history (50% of approved bills)
- Notifications (5-15 per user)
- Audit logs (100+ per organization)

### Seed Statistics

After seeding, per organization:
- 10 users
- 8 vendors
- 18 customers
- 100 bills
- 50 purchase orders
- 500+ inventory records
- 100+ notifications
- 1000+ audit logs

**Total across 4 organizations**:
- 40 users
- 32 vendors
- 72 customers
- 400 bills
- 200 POs
- 2,000+ inventory records
- Rich transaction history

## Seed Script Options

The seed script supports several options:

```typescript
interface SeedOptions {
  resetData?: boolean;      // Clear existing data before seeding
  createDemoOrgs?: boolean; // Create demo organizations (default: true)
  verbose?: boolean;        // Detailed logging (default: true)
}
```

### Usage Examples

```bash
# Standard seed with demo organizations
npm run seed

# Seed specific organization only
ts-node prisma/seed.ts --org-id=1

# Reset data and re-seed
npm run seed:reset
```

## Seeding Performance

Expected seeding times:
- **Small setup** (1 organization): 30-45 seconds
- **Full setup** (4 organizations): 2-3 minutes
- With existing data: Additional 1-2 minutes

**Database size after seeding**:
- Approximately 5-10 MB (depends on existing product catalog)

## Data Relationships

The seed maintains referential integrity:

```
Organization
├── Users
├── Warehouses
│   └── Inventory
├── Vendors
│   └── VendorProducts
├── Customers
│   └── Bills
│       └── BillLines
├── PurchaseOrders
│   └── POItems
├── Payments
│   └── PaymentHistory
├── Notifications
└── AuditLogs
```

## Default Test Accounts

### Admin Users
```
Organization 1 (Ghazanfar ERP):
Email: admin@org1.local
Password: Demo@12345

Organization 2 (Karachi Trading):
Email: admin@org2.local
Password: Demo@12345

Organization 3 (Lahore Wholesale):
Email: admin@org3.local
Password: Demo@12345

Organization 4 (Islamabad Retail):
Email: admin@org4.local
Password: Demo@12345
```

### Sample Staff Users
```
staff1@org1.local - Demo@12345
staff2@org1.local - Demo@12345
manager1@org1.local - Demo@12345
viewer1@org1.local - Demo@12345
```

## Data Cleanup

The system includes automatic cleanup with retention policies:

### Retention Periods
- **Draft Bills**: 30 days
- **Approved Bills**: 1 year
- **Paid Bills**: 5 years
- **Received POs**: 2 years
- **Notifications (Read)**: 90 days
- **Audit Logs**: 1 year (general), 5+ years (financial)

### Manual Cleanup

```bash
# Archive old bills
curl -X POST http://localhost:3000/data-management/archive/bills/365

# Purge old notifications
curl -X POST http://localhost:3000/data-management/purge/notifications/90

# Cleanup failed transactions
curl -X POST http://localhost:3000/data-management/cleanup/failed-transactions/24
```

### Automatic Cleanup (Cron Jobs)

The system runs automatic cleanup:
- **Daily at 2 AM**: Archive completed bills, purge old notifications
- **Weekly (Sunday 3 AM)**: Maintenance, storage optimization
- **Monthly (1st at 4 AM)**: Archive old data, backup

## Troubleshooting

### Issue: Seed Script Fails

**Check database connection**:
```bash
# Test connection
npx prisma db execute --stdin < test_connection.sql
```

**Verify schema is up to date**:
```bash
npx prisma migrate status
npx prisma migrate deploy
```

### Issue: Duplicate Key Error

**Clear existing data**:
```bash
# Delete all data (careful!)
npx prisma db execute --stdin < scripts/clear_database.sql

# Re-seed
npm run seed
```

### Issue: Slow Seeding

The seed script can be optimized:

```typescript
// Reduce data volume in seed.ts
const billCount = 50; // Instead of 100
const vendorCount = 5; // Instead of 8
```

## Next Steps

1. **Review Demo Data**: Log in to test different user roles
2. **Run Imports**: Test bulk import functionality
3. **Test Transactions**: Create bills and POs
4. **Monitor Cleanup**: Check archival and retention policies
5. **Customize**: Modify seed data for your business needs

## Related Documentation

- [BULK_IMPORT_GUIDE.md](./BULK_IMPORT_GUIDE.md) - Bulk import utilities
- [DATA_ARCHIVAL_GUIDE.md](./DATA_ARCHIVAL_GUIDE.md) - Archival & cleanup
- [SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md) - Detailed seed documentation
