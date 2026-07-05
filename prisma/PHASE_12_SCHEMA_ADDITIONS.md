# Phase 12 Schema Additions

Add these enums to the ENUMS section:

```prisma
enum LeaveType {
  CASUAL
  SICK
  ANNUAL
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LEAVE
  HALFDAY
}

enum BonusStatus {
  CALCULATED
  APPROVED
  PAID
  REJECTED
}

enum AuditAction {
  INVOICE_APPROVED
  COMMISSION_APPROVED
  DISCOUNT_APPLIED
  ADJUSTMENT_MADE
  REFUND_PROCESSED
  WRITE_OFF
  MODIFICATION_REQUEST_CREATED
  MODIFICATION_APPROVED
  BILL_PRINTED
  GATE_PASS_PRINTED
}
```

---

Add these to Organization relationships (around line 180-185):

```prisma
  // PHASE 12: LABOUR STAFF & ACCOUNTANT MONITORING
  labourStaff             LabourStaff[]
  attendances             Attendance[]
  leaves                  Leave[]
  bonuses                 Bonus[]
  accountantAudits        AccountantAudit[]
  printHistories          PrintHistory[]
```

---

Add these models at the end of the file (after Phase 6):

```prisma
// ================================================================================
//                    PHASE 12: LABOUR & ACCOUNTANT MONITORING
// ================================================================================

model LabourStaff {
  id String @id @default(cuid())
  organizationId String
  userId String @unique
  user User @relation("labour_staff", fields: [userId], references: [id], onDelete: Cascade)
  
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
  onTimeThreshold String // "09:00" format (HH:MM)
  earlyThreshold Int // minutes early, e.g., 15
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  attendances Attendance[]
  leaves Leave[]
  bonuses Bonus[]
  organization Organization @relation("labour_staff", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([organizationId, userId])
  @@index([organizationId])
}

model Attendance {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id], onDelete: Cascade)
  
  date DateTime
  checkIn DateTime?
  checkOut DateTime?
  status String // PRESENT, ABSENT, LEAVE, HALFDAY
  
  // Bonus Eligibility
  onTimeBonus Boolean @default(false)
  earlyBonus Boolean @default(false)
  
  notes String?
  modifiedBy String? // User ID
  modifiedAt DateTime?
  
  createdAt DateTime @default(now())
  organization Organization @relation("attendances", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([labourStaffId, date])
  @@index([labourStaffId, date])
  @@index([organizationId])
}

model Leave {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id], onDelete: Cascade)
  
  leaveType String // CASUAL, SICK, ANNUAL, UNPAID
  fromDate DateTime
  toDate DateTime
  reason String
  attachmentUrl String?
  
  // Workflow
  status String // PENDING, APPROVED, REJECTED, CANCELLED
  approvedBy String? // User ID
  approvedAt DateTime?
  rejectionReason String?
  
  daysTaken Int // calculated on creation
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation("leaves", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([labourStaffId, status])
  @@index([organizationId])
}

model Bonus {
  id String @id @default(cuid())
  organizationId String
  labourStaffId String
  labourStaff LabourStaff @relation(fields: [labourStaffId], references: [id], onDelete: Cascade)
  
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
  daysLeave Int @default(0)
  
  status String @default("CALCULATED") // CALCULATED, APPROVED, PAID, REJECTED
  approvedBy String? // User ID
  approvedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation("bonuses", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([labourStaffId, month, year])
  @@index([organizationId, status])
  @@index([labourStaffId])
}

model AccountantAudit {
  id String @id @default(cuid())
  organizationId String
  accountantId String
  accountant User @relation("accountant_audits", fields: [accountantId], references: [id], onDelete: SetNull)
  
  action String // INVOICE_APPROVED, COMMISSION_APPROVED, etc.
  entityType String // Invoice, CommissionTransaction, Bill, etc.
  entityId String
  
  // Data Changes
  beforeValue String? // JSON snapshot
  afterValue String? // JSON snapshot
  
  // Context
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  organization Organization @relation("accountant_audits", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([accountantId, createdAt])
  @@index([organizationId, createdAt])
}

model PrintHistory {
  id String @id @default(cuid())
  organizationId String
  printedBy String
  user User @relation("print_history", fields: [printedBy], references: [id], onDelete: SetNull)
  
  documentType String // GatePass, Invoice, Bill, etc.
  documentId String
  documentNumber String
  
  isDuplicate Boolean @default(false)
  reason String? // REPRINT, CORRECTION, etc.
  
  createdAt DateTime @default(now())
  organization Organization @relation("print_history", fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([printedBy, createdAt])
  @@index([organizationId, documentType])
}
```

---

Update User model to include:

```prisma
  // Labour Staff relationship
  labour_staff LabourStaff?

  // Accountant audit relationships
  accountant_audits AccountantAudit[] @relation("accountant_audits")
  print_history PrintHistory[] @relation("print_history")
```
