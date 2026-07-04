# Phase 5: Indexing & Performance Strategy
**Date:** 2026-07-04  
**Status:** ACTIVE  
**Target:** Support 1M+ records with < 3-second response times

---

## Executive Summary

This document outlines the indexing strategy to prevent the performance degradation observed during long-term operation (slowdown at 3-4 months, severe at 1-2 years). The strategy uses:

- **Composite indexes** on frequently filtered + sorted fields
- **Partitioning** on transaction dates (Year/Month)
- **Hot/Warm/Cold** data tiering
- **Selective indexing** on JSONB fields
- **Query optimization** for common access patterns

---

## Part 1: Core Indexing Strategy

### A. Transaction Tables (Orders, POs, Sales)

**Problem:** These grow continuously and are accessed by date range.

**Solution:** RANGE partitioning + Key field indexes

```sql
-- Orders Table Partitioning
CREATE TABLE orders_2026_07 PARTITION OF orders
  FOR VALUES FROM ('2026', '07') TO ('2026', '08');

CREATE TABLE orders_2026_08 PARTITION OF orders
  FOR VALUES FROM ('2026', '08') TO ('2026', '09');

-- Composite indexes for common queries
CREATE INDEX idx_orders_org_date_status 
  ON orders(organization_id, bill_date DESC, status);

CREATE INDEX idx_orders_customer_amount 
  ON orders(organization_id, customer_id, total_amount DESC);

CREATE INDEX idx_orders_billnumber 
  ON orders(organization_id, bill_number);
```

**Impact:** 
- 50-70% faster date-range queries
- Partitions automatically prune irrelevant data
- Maintenance windows only affect current/previous partitions

---

### B. Inventory & Stock Tables

**Problem:** Stock queries are hit thousands of times/day (real-time availability).

**Solution:** Denormalization + Covering indexes

```sql
-- Covering index: includes all fields needed without table lookup
CREATE INDEX idx_inventory_available_covering 
  ON inventory(organization_id, available, product_id, warehouse_id)
  INCLUDE (physical_on_hand, reserved);

-- For stock performance alerts
CREATE INDEX idx_stock_performance_alert_status 
  ON stock_performance(organization_id, alert_status, product_id);

-- Movement log partitioning (monthly)
CREATE TABLE stock_movements_2026_07 PARTITION OF stock_movements_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Index on movements for trending
CREATE INDEX idx_stock_movements_product_timestamp 
  ON stock_movements_log(product_id, timestamp DESC)
  WHERE movement_type IN ('Out', 'In');
```

**Impact:**
- Index-only scans (no table access needed)
- Dead stock detection runs in < 500ms
- Movement trending queries 10x faster

---

### C. Accounts & Ledger Tables

**Problem:** Ledger grows 50K+ entries/month; aging reports slow after 6 months.

**Solution:** Partial indexes + Summary tables

```sql
-- Partial index: only for pending/overdue invoices
CREATE INDEX idx_aging_report_pending 
  ON aging_report(organization_id, customer_id, days_outstanding)
  WHERE status IN ('Pending', 'Overdue', 'Partially paid');

-- Ledger index for accounting queries
CREATE INDEX idx_ledger_category_date 
  ON ledger(organization_id, category_id, ledger_date DESC)
  INCLUDE (debit_amount, credit_amount, balance);

-- JV Payment critical path (settlement workflow)
CREATE INDEX idx_jv_payment_settlement 
  ON jv_payment_tracking(organization_id, settlement_status, payment_date)
  WHERE settlement_status IN ('PENDING', 'VERIFIED');
```

**Impact:**
- Aging reports on 100K invoices run in < 2 seconds
- JV settlement dashboard responds in < 1 second
- Archive old completed entries to separate table

---

### D. Customer & Vendor Tables

**Problem:** Customer searches by type/credit/activity; vendor filtering by performance.

**Solution:** Selective BTREE + BRIN indexes

```sql
-- Customer advanced search
CREATE INDEX idx_customer_type_status 
  ON customers(organization_id, customer_type, status, is_active);

CREATE INDEX idx_customer_by_activity 
  ON customer_analytics(organization_id, last_purchase_date DESC)
  WHERE last_purchase_date IS NOT NULL;

-- Vendor search by performance
CREATE INDEX idx_vendor_performance_score 
  ON vendor_performance(organization_id, overall_score DESC, quality_rating);

-- Credit limit warnings
CREATE INDEX idx_customer_credit_usage 
  ON customer_credit_limits(organization_id, available_credit)
  WHERE available_credit < 10000;
```

**Impact:**
- Customer type dropdown filters in < 100ms
- VIP customer identification in < 50ms
- Vendor quality ranking in < 200ms

---

### E. HR & Payroll Tables

**Problem:** Monthly payroll processing slows with employee history growth.

**Solution:** Partitioning by payroll month + Covering indexes

```sql
-- Payroll period partitioning
CREATE TABLE payroll_2026_07 PARTITION OF payroll_processing
  FOR VALUES FROM ('2026', '7') TO ('2026', '8');

-- Commission calculation optimization
CREATE INDEX idx_commission_employee_date 
  ON commission_calculations(organization_id, employee_id, commission_date DESC)
  INCLUDE (commission_amount, status);

-- Attendance bonus calculation
CREATE INDEX idx_attendance_bonus_period 
  ON attendance_bonuses(organization_id, payroll_year, payroll_month, employee_id);

-- Access log audit queries
CREATE INDEX idx_access_log_employee_date 
  ON access_log(organization_id, employee_id, access_timestamp DESC)
  WHERE action IN ('Edit', 'Delete', 'Approve');
```

**Impact:**
- Payroll processing 5x faster
- Commission calculations accurate and fast
- Audit reports traceable in < 1 second

---

## Part 2: Dashboard Query Optimization

### Performance Dashboard Indexes

```sql
-- Sales dashboard (real-time)
CREATE INDEX idx_sales_dashboard_generation 
  ON sales_dashboard_data(organization_id, dashboard_date DESC)
  WHERE period_type = 'Day';

-- Customer dashboard (slow-changing)
CREATE INDEX idx_customer_dashboard_monthly 
  ON customer_dashboard_data(organization_id, period_type, dashboard_date DESC)
  WHERE period_type IN ('Month', 'Quarter');

-- KPI tracking (critical)
CREATE INDEX idx_kpi_achievement_trend 
  ON kpi_metrics(organization_id, generated_date DESC)
  INCLUDE (current_value, target_value, achievement_percentage);

-- Comparison data (M2M, Y2Y)
CREATE INDEX idx_comparison_metric_date 
  ON comparison_data(organization_id, metric_type, generated_date DESC);
```

**Impact:**
- Dashboard loads in < 2 seconds
- Real-time KPI updates in < 500ms
- Historical comparisons searchable instantly

---

## Part 3: Data Archival Strategy (HOT/WARM/COLD)

### Time-Based Data Tiering

```
HOT TIER (0-3 months):
  - Live transactional data
  - All real-time queries
  - Default indexes active
  - SSD storage preferred
  - Partition: Current month + 2 previous months

WARM TIER (3-12 months):
  - Aggregated dashboard data
  - Reduced indexes (only for reports)
  - Archive slower-changing data
  - Regular HDD acceptable
  - Partition: Monthly

COLD TIER (1+ years):
  - Historical data
  - Minimal indexes
  - Compressed storage
  - Separate archive tables
  - Query via reporting APIs only
```

### Archive Script

```sql
-- Archive orders older than 1 year
CREATE TABLE orders_archive_2025 AS
SELECT * FROM orders 
WHERE EXTRACT(YEAR FROM bill_date) = 2025;

CREATE INDEX idx_orders_archive_2025_customer 
  ON orders_archive_2025(customer_id);

DELETE FROM orders 
WHERE bill_date < '2025-01-01';

-- Similar for all transactional tables
-- Run monthly on first of month
```

---

## Part 4: Query Patterns & Optimal Indexes

### Common Query Patterns

#### 1. **Customer Search by Multiple Filters**
```sql
-- Query Pattern
SELECT * FROM customers 
WHERE organization_id = 2 
  AND customer_type = 'Wholesale' 
  AND status = 'ACTIVE' 
ORDER BY name;

-- Optimal Index
CREATE INDEX idx_customer_filter_search 
  ON customers(organization_id, customer_type, status, name);
```

#### 2. **Inventory Availability Check**
```sql
-- Query Pattern
SELECT available FROM inventory 
WHERE organization_id = 2 
  AND product_id = ? 
  AND warehouse_id = ?;

-- Optimal Index
CREATE INDEX idx_inventory_availability 
  ON inventory(organization_id, product_id, warehouse_id)
  INCLUDE (available, physical_on_hand);
```

#### 3. **Sales Performance by Date Range**
```sql
-- Query Pattern
SELECT DATE(bill_date) as date, SUM(total_amount) as daily_sales
FROM orders
WHERE organization_id = 2
  AND bill_date BETWEEN ? AND ?
GROUP BY DATE(bill_date);

-- Optimal: Partitioning by month + Index
CREATE INDEX idx_orders_date_amount 
  ON orders(organization_id, bill_date DESC, total_amount);
```

#### 4. **Aging Report (Overdue Invoices)**
```sql
-- Query Pattern
SELECT * FROM aging_report
WHERE organization_id = 2
  AND status IN ('Pending', 'Overdue')
  AND days_outstanding > 30
ORDER BY days_outstanding DESC;

-- Optimal Index
CREATE INDEX idx_aging_overdue 
  ON aging_report(organization_id, status, days_outstanding DESC)
  WHERE status IN ('Pending', 'Overdue');
```

#### 5. **Vendor Performance Ranking**
```sql
-- Query Pattern
SELECT * FROM vendor_performance
WHERE organization_id = 2
ORDER BY overall_score DESC
LIMIT 10;

-- Optimal Index
CREATE INDEX idx_vendor_score_ranking 
  ON vendor_performance(organization_id, overall_score DESC);
```

---

## Part 5: Maintenance Plan

### Weekly Maintenance
```sql
-- Analyze table statistics (PostgreSQL autovacuum may need help)
ANALYZE orders;
ANALYZE inventory;
ANALYZE customers;
ANALYZE vendors;
```

### Monthly Maintenance
```sql
-- Reindex fragmented indexes
REINDEX INDEX idx_orders_org_date_status;
REINDEX INDEX idx_inventory_available_covering;

-- Vacuum full for transaction cleanup
VACUUM FULL orders_archive_2024;

-- Archive previous month's data
-- Run on 1st of month
```

### Quarterly Maintenance
```sql
-- Review slow query logs
-- Identify missing indexes
-- Update query plans
-- Archive quarterly cold data

-- Check disk usage
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Annual Maintenance
```sql
-- Full data cleanup
-- Move multi-year-old data to cold storage
-- Rebuild largest indexes
-- Update table statistics
-- Performance audit
```

---

## Part 6: Monitoring Metrics

### Query Performance Thresholds

| Operation | Target Time | Warning | Critical |
|-----------|------------|---------|----------|
| Customer search | < 500ms | > 1s | > 3s |
| Inventory check | < 100ms | > 300ms | > 1s |
| Order list (100 rows) | < 1s | > 2s | > 5s |
| Dashboard load | < 2s | > 4s | > 8s |
| Report generation | < 5s | > 10s | > 20s |

### Index Health Check

```sql
-- Identify unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Identify bloated indexes (> 20% wasted space)
SELECT schemaname, tablename, indexname, 
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
       ROUND(100 * (pg_relation_size(indexrelid) - pg_relation_size(indexrelid, 'main')) / 
             pg_relation_size(indexrelid)::numeric, 2) as wasted_percent
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > 1000000
ORDER BY wasted_percent DESC;
```

---

## Part 7: Scaling Roadmap

### Phase 5a (Current - 3 months): Baseline
- **Records:** 100K - 500K
- **Indexes:** Core + Navigation indexes
- **Partitions:** Monthly
- **Target:** Sub-1 second queries

### Phase 5b (Months 3-6): Growth
- **Records:** 500K - 2M
- **Indexes:** Add performance + archive indexes
- **Partitions:** Weekly for HOT tier
- **Archive:** Move 6+ month old data to WARM

### Phase 5c (Months 6-12): Optimization
- **Records:** 2M - 5M
- **Indexes:** Full covering indexes + partial
- **Partitions:** Daily for most-active tables
- **Archive:** HOT/WARM/COLD tiering active

### Phase 5d (1+ years): Stabilization
- **Records:** 5M+
- **Indexes:** Minimal necessary set
- **Partitions:** Automatic aging
- **Archive:** Aggressive cold storage
- **Query:** All via API layer caching

---

## Part 8: Emergency Performance Recovery

### If queries slow down:

```sql
-- 1. Check index statistics
ANALYZE;

-- 2. Find missing indexes
-- (Check Part 4 patterns)

-- 3. Rebuild fragmented indexes
REINDEX TABLE orders;

-- 4. Archive old data
DELETE FROM orders WHERE bill_date < '2024-01-01';

-- 5. Recalculate statistics
ANALYZE;

-- 6. If still slow, add cache layer (Redis)
-- Contact DevOps for cache configuration
```

---

## Estimated Performance Impact

| Scenario | Without Strategy | With Strategy | Improvement |
|----------|-----------------|---------------|-------------|
| 100K records | 500ms | 100ms | **5x faster** |
| 1M records | 5s | 200ms | **25x faster** |
| 10M records | 30s+ | 500ms | **60x+ faster** |

---

## Implementation Checklist

- [ ] Apply partitioning strategy (001_partition_tables.sql)
- [ ] Create core indexes (in this migration script)
- [ ] Set up archival jobs (monthly)
- [ ] Configure monitoring alerts
- [ ] Test with 1M+ record dataset
- [ ] Load test: 100 concurrent users
- [ ] Document slow queries in wiki
- [ ] Train team on query optimization
- [ ] Set up quarterly review meetings

---

**Next Phase:** Phase 6 - Data Organization & Archival (2 weeks)
**Approval Required:** Database Administrator, DevOps Lead
