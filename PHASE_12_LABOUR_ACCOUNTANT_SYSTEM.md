# Phase 12: Labour Staff & Accountant Monitoring System

## Overview
Complete HR management system for tracking labour staff performance, leave management, bonus calculations, and accountant activities with admin-only visibility.

---

## System Components

### 1. Labour Staff Performance Monitoring

#### Features
- **Attendance Tracking**
  - Check-in/Check-out times
  - Daily presence tracking
  - Monthly attendance summary
  
- **Leave Management**
  - Apply for leave
  - Leave approval workflow
  - Leave balance tracking
  - Leave type categorization (casual, sick, annual, unpaid)

- **Bonus Calculation System**
  - **No-Leave Bonus**: Full month without any leave = bonus amount
  - **On-Time Arrival Bonus**: Daily bonus for arriving before cutoff time (e.g., 9:00 AM)
  - **Early Arrival Bonus**: Extra bonus for arriving 15+ min early
  - **Late Penalty Reduction**: No penalty if leave is approved for that day

- **Performance Metrics**
  - Monthly attendance %
  - Leave days taken
  - Bonus earned (breakdown)
  - Total earnings (base salary + bonuses)

#### Access Control
- **Admin**: Full visibility of all staff
- **Manager**: Own team only (if applicable)
- **Staff**: Own data only
- **Accountant**: Cannot view labour details

---

### 2. Accountant Monitoring System

#### Features
- **Activity Audit Trail**
  - All accountant actions logged
  - Modifications tracked with before/after values
  - Print history (gate pass, invoices)
  - Data access log

- **Approval Tracking**
  - Invoices approved/rejected
  - Modification requests processed
  - Commission approvals
  - Bill corrections

- **Financial Actions Log**
  - Discounts applied
  - Adjustments made
  - Refunds processed
  - Write-offs

- **Performance Metrics**
  - Invoices processed per day
  - Average processing time
  - Error rate (rejections/corrections)
  - Approval efficiency

#### Access Control
- **Admin**: Full visibility of all accountants
- **Accountant**: Cannot view own audit log (privacy)
- **Other Staff**: No access
- **Manager**: Cannot view

---

### 3. Role & Permission Framework

#### Roles
```
ADMIN - Full system access including monitoring
MANAGER - Team management (labour + sales)
ACCOUNTANT - Financial operations (cannot be monitored by themselves)
SALESMAN - Sales operations
WAREHOUSE_STAFF - Inventory management
LABOUR_STAFF - Labour operations (monitored)
STAFF - General staff (monitored)
VIEWER - Read-only access
```

#### Permission Matrix

| Feature | Admin | Manager | Accountant | Salesman | Labour | Staff | Viewer |
|---------|-------|---------|------------|----------|--------|-------|--------|
| View Labour Dashboard | ✅ | ✅ (own team) | ❌ | ❌ | Own data | Own data | ❌ |
| View Accountant Audit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Leave | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Bonuses | ✅ | ✅ (own team) | ❌ | ❌ | Own data | Own data | ❌ |
| Modify Attendance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Prisma Schema Updates

### New Models

```prisma
// Labour Staff
model LabourStaff {
  id String @id @default(cuid())
  organizationId String
  userId String @unique
  user User @relation("labour_staff", fields: [userId], references: [id])
  
  // Personal Info
  baseSalary Int // in paisa
  department String
  position String
  joinDate DateTime
  
  // Leave Entitlements (annual)
  casualLeaveDays Int @default(12)
  sickLeaveDays Int @default(10)
  annualLeaveDays Int @default(15)
  unpaidLeaveAllowed Boolean @default(false)
  
  // Bonus Configuration
  noLeaveBonus Int // in paisa (monthly bonus if zero leaves taken)
  onTimeBonus Int // in paisa (daily bonus for on-time arrival)
  earlyBonus Int // in paisa (daily bonus for 15+ min early)
  onTimeThreshold DateTime // e.g., 9:00 AM cutoff
  earlyThreshold Int // minutes early, e.g., 15
  
  // Tracking
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  attendances Attendance[]
  leaves Leave[]
  bonuses Bonus[]
  organization Organization @relation("labour_staff", fields: [organizationId], references: [id])
}

model Attendance {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id])
  
  date DateTime
  checkIn DateTime?
  checkOut DateTime?
  status String // PRESENT, ABSENT, LEAVE, HALFDAY
  
  // Bonus Eligibility
  onTimeBonus Boolean @default(false)
  earlyBonus Boolean @default(false)
  
  notes String?
  modifiedBy String? // Admin modification
  modifiedAt DateTime?
  
  createdAt DateTime @default(now())
  organization Organization @relation("attendance", fields: [organizationId], references: [id])
  
  @@unique([labourStaffId, date])
}

model Leave {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id])
  
  leaveType String // CASUAL, SICK, ANNUAL, UNPAID
  fromDate DateTime
  toDate DateTime
  reason String
  attachmentUrl String?
  
  // Workflow
  status String // PENDING, APPROVED, REJECTED, CANCELLED
  approvedBy String?
  approvedAt DateTime?
  rejectionReason String?
  
  daysTaken Int // calculated on creation
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation("leaves", fields: [organizationId], references: [id])
  
  @@index([labourStaffId, status])
}

model Bonus {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id])
  
  month Int
  year Int
  
  // Bonus Breakdown
  noLeaveBonus Int @default(0) // If zero leaves in month
  onTimeBonusTotal Int @default(0) // Sum of daily bonuses
  earlyBonusTotal Int @default(0) // Sum of daily bonuses
  otherBonuses Int @default(0) // Manual adjustments
  
  totalBonus Int // Sum of all bonuses
  totalDeductions Int @default(0) // Penalties
  
  netBonus Int // Total - Deductions
  
  // Metadata
  onTimeDays Int @default(0) // Count of on-time days
  earlyDays Int @default(0) // Count of early days
  daysPresent Int @default(0)
  daysAbsent Int @default(0)
  dayLeave Int @default(0)
  
  status String @default("CALCULATED") // CALCULATED, APPROVED, PAID, REJECTED
  approvedBy String?
  approvedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation("bonuses", fields: [organizationId], references: [id])
  
  @@unique([labourStaffId, month, year])
  @@index([organizationId, status])
}

model AccountantAudit {
  id String @id @default(cuid())
  organizationId String
  accountantId String
  accountant User @relation("accountant_audits", fields: [accountantId], references: [id])
  
  // Action Details
  action String // INVOICE_APPROVED, COMMISSION_APPROVED, DISCOUNT_APPLIED, etc.
  entityType String // Invoice, CommissionTransaction, Bill, etc.
  entityId String
  
  // Data Changes
  beforeValue String? // JSON snapshot
  afterValue String? // JSON snapshot
  
  // Context
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  organization Organization @relation("accountant_audits", fields: [organizationId], references: [id])
  
  @@index([accountantId, createdAt])
  @@index([organizationId, createdAt])
}

model PrintHistory {
  id String @id @default(cuid())
  organizationId String
  printedBy String
  user User @relation("print_history", fields: [printedBy], references: [id])
  
  documentType String // GatePass, Invoice, Bill, etc.
  documentId String
  documentNumber String
  
  isDuplicate Boolean @default(false)
  reason String? // REPRINT, CORRECTION, etc.
  
  createdAt DateTime @default(now())
  organization Organization @relation("print_history", fields: [organizationId], references: [id])
  
  @@index([printedBy, createdAt])
  @@index([organizationId, documentType])
}
```

---

## Backend Services

### LabourStaffService
```typescript
Methods:
- registerLabourStaff(data) - Create new labour staff
- getLabourStaff(staffId) - Get staff details
- getOrganizationLabourStaff(orgId) - Get all org staff
- updateLabourStaff(staffId, data) - Update configuration

Attendance:
- recordCheckIn(staffId, time) - Check-in
- recordCheckOut(staffId, time) - Check-out
- getAttendanceHistory(staffId, month, year) - Monthly records
- modifyAttendance(staffId, date, data) - Admin override
- calculateMonthlyAttendance(staffId, month, year) - Stats

Leave:
- applyForLeave(staffId, data) - Request leave
- getLeaveBalance(staffId) - Available leave days
- getLeaveHistory(staffId) - All leaves
- approveLeave(leaveId, adminId) - Manager approval
- rejectLeave(leaveId, reason) - Manager rejection
- getTeamLeaves(managerId) - Manager's team leaves

Bonus:
- calculateMonthlyBonus(staffId, month, year) - Auto-calculate
- getMonthlyBonus(staffId, month, year) - Retrieve bonus
- approveBonus(bonusId, adminId) - Admin approval
- markAsPaid(bonusId) - Update status
- getBonusHistory(staffId) - All bonuses
- exportBonusReport(orgId, month, year) - For accounting

Dashboard:
- getLabourDashboard(orgId) - Admin dashboard
- getStaffDashboard(staffId) - Personal dashboard
```

### AccountantAuditService
```typescript
Methods:
- logAction(accountantId, action, entityType, entityId, before, after)
- getAuditTrail(accountantId, fromDate, toDate) - All actions
- getOrganizationAuditTrail(orgId, fromDate, toDate) - Org-wide
- getAuditStats(accountantId, month) - Monthly stats
- detectAnomalies(accountantId) - Unusual patterns
- generateAuditReport(orgId, fromDate, toDate) - For admin
```

### BonusCalculationEngine
```typescript
Methods:
- calculateDailyBonus(staffId, date) - Single day
- calculateMonthlyBonus(staffId, month, year) - Full month
- getNoLeaveBonusEligibility(staffId, month, year) - Check zero leaves
- getOnTimeBonusDays(staffId, month, year) - Count on-time arrivals
- getEarlyBonusDays(staffId, month, year) - Count early arrivals
- applyPenalties(staffId, month, year) - Late arrival penalties
```

---

## Controllers

### LabourStaffController (Admin & Manager Only)
```
POST   /api/v1/labour - Create labour staff
GET    /api/v1/labour - List all labour staff (admin) / team (manager)
GET    /api/v1/labour/:id - Get staff details
PUT    /api/v1/labour/:id - Update staff configuration

GET    /api/v1/labour/:id/attendance/:month/:year - Monthly attendance
POST   /api/v1/labour/:id/attendance/check-in - Record check-in
POST   /api/v1/labour/:id/attendance/check-out - Record check-out
PUT    /api/v1/labour/:id/attendance/:date - Admin modify attendance

POST   /api/v1/labour/:id/leave - Apply for leave
GET    /api/v1/labour/:id/leave/balance - Remaining leave days
GET    /api/v1/labour/:id/leave/history - All leaves
PUT    /api/v1/labour/:id/leave/:leaveId/approve - Manager approval
PUT    /api/v1/labour/:id/leave/:leaveId/reject - Manager rejection

GET    /api/v1/labour/:id/bonus/:month/:year - Get monthly bonus
GET    /api/v1/labour/:id/bonus/history - All bonuses
POST   /api/v1/labour/:id/bonus/:month/:year/calculate - Trigger calculation
PUT    /api/v1/labour/:id/bonus/:bonusId/approve - Admin approval
PUT    /api/v1/labour/:id/bonus/:bonusId/mark-paid - Mark paid

GET    /api/v1/labour/dashboard - Admin labour dashboard
GET    /api/v1/labour/report/monthly - Monthly report
GET    /api/v1/labour/report/export - Export for accounting
```

### AccountantAuditController (Admin Only)
```
GET    /api/v1/accountant/audit - All audit logs
GET    /api/v1/accountant/audit/:accountantId - Specific accountant
GET    /api/v1/accountant/audit/:accountantId/stats - Monthly stats
GET    /api/v1/accountant/audit/:accountantId/anomalies - Unusual activities
GET    /api/v1/accountant/dashboard - Admin accountant dashboard
GET    /api/v1/accountant/report - Audit report
```

---

## Bonus Calculation Formula

```
Total Monthly Bonus = 
  (No-Leave Bonus * (has zero leaves ? 1 : 0)) +
  (On-Time Bonus * count of on-time days) +
  (Early Bonus * count of early days) +
  Other Bonuses +
  - Penalties

Where:
- No-Leave Bonus = configured amount (e.g., 5000 paisa)
- On-Time Bonus = daily amount (e.g., 100 paisa per day)
- Early Bonus = daily amount (e.g., 200 paisa per day)
- On-Time = arrival <= 9:00 AM
- Early = arrival <= (9:00 AM - 15 minutes) = 8:45 AM
```

### Example Calculation
```
Staff: Qurban
Month: July 2026
Configuration:
  - Base Salary: 50,000 paisa
  - No-Leave Bonus: 5,000 paisa
  - On-Time Bonus: 100 paisa/day
  - Early Bonus: 200 paisa/day

July Metrics:
  - Days Present: 26
  - Days Leave: 0
  - Days Absent: 4
  - On-Time Days: 22
  - Early Days: 8

Calculation:
  - No-Leave Bonus: 5,000 (zero leaves)
  - On-Time Bonus: 22 × 100 = 2,200
  - Early Bonus: 8 × 200 = 1,600
  - Total Bonus: 8,800 paisa (88 rupees)
  
Monthly Earnings: 50,000 + 8,800 = 58,800 paisa (588 rupees)
```

---

## Access Control Rules

### Viewing Labour Data
- **Admin**: View all staff, all data
- **Manager**: View own team only (if team assigned)
- **Labour Staff**: View own data only
- **Others**: No access (show error 403)

### Viewing Accountant Audit
- **Admin**: View all accountants
- **Accountant**: Cannot view own audit (audit isolation)
- **Everyone else**: No access

### Modifying Data
- **Admin**: Can modify all attendance, approve all leaves/bonuses
- **Manager**: Can approve leaves for own team
- **Labour Staff**: Can only apply for leaves (read-only for rest)
- **Accountant**: Cannot access labour system

---

## Implementation Files

### Backend
1. `src/modules/labour/labour-staff.service.ts`
2. `src/modules/labour/labour-staff.controller.ts`
3. `src/modules/labour/attendance.service.ts`
4. `src/modules/labour/leave.service.ts`
5. `src/modules/labour/bonus-calculation.service.ts`
6. `src/modules/labour/labour.module.ts`
7. `src/modules/accountant/accountant-audit.service.ts`
8. `src/modules/accountant/accountant-audit.controller.ts`
9. `src/modules/accountant/accountant.module.ts`
10. Updated `prisma/schema.prisma`
11. Updated `src/app.module.ts`

### Frontend (React)
1. `frontend/src/pages/LabourDashboard.tsx`
2. `frontend/src/pages/StaffPerformance.tsx`
3. `frontend/src/pages/AttendanceManagement.tsx`
4. `frontend/src/pages/LeaveManagement.tsx`
5. `frontend/src/pages/BonusCalculation.tsx`
6. `frontend/src/pages/AccountantAudit.tsx`

### Mobile (React Native)
1. `mobile/src/screens/labour/AttendanceScreen.tsx`
2. `mobile/src/screens/labour/LeaveScreen.tsx`
3. `mobile/src/screens/labour/BonusScreen.tsx`

---

## Integration Points

### With Existing Systems
- **Salesman Commission** ↔ Labour Bonus (separate but parallel tracking)
- **User Management** ↔ Labour Staff (one-to-one relationship via userId)
- **Role & Permissions** ↔ Access Control (enforce admin-only views)
- **Accountant Actions** ↔ Audit Trail (auto-log all modifications)

### Real-Time Updates
- WebSocket: Attendance status updates
- WebSocket: Bonus calculation notifications
- WebSocket: Leave approval notifications

---

## Rollout Plan

### Phase 12A: Labour Management (Week 1-2)
1. Create labour staff records
2. Attendance tracking system
3. Leave management workflow
4. Basic bonus calculation

### Phase 12B: Accountant Monitoring (Week 3)
1. Audit trail logging
2. Activity dashboard
3. Report generation

### Phase 12C: Admin Dashboard (Week 4)
1. Labour overview dashboard
2. Accountant oversight dashboard
3. Reports & exports

---

## Success Criteria

✅ Labour staff can clock in/out
✅ Leave applications work with approval workflow
✅ Bonuses calculate automatically monthly
✅ Admin can view all labour data
✅ Accountant activities fully logged
✅ No role permission violations
✅ All calculations verified by test cases
✅ Real-time updates via WebSocket
✅ Export to CSV/Excel for accounting

---

## Notes

- All amounts in **paisa** (smallest currency unit)
- Bonuses calculated on 1st day of next month
- Leave balance resets annually (configurable)
- Attendance auto-marked if no check-out by end of day
- Accountant audit isolated (they don't see their own logs)
- Admin must approve bonus payments for accounting
