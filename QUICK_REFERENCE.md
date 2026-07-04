# Advanced Features - Quick Reference Guide

## Quick Setup

```bash
# 1. Install dependencies
npm install @nestjs/websockets socket.io handlebars

# 2. Run migration
npx prisma migrate deploy

# 3. Add environment variables (see .env.example)
# 4. Start server
npm start
```

---

## Notification Examples

### Send Notification
```typescript
await notificationsService.sendNotification(orgId, {
  userId: 1,
  type: NotificationType.BILL_APPROVED,
  title: 'Bill Approved',
  message: 'Bill #INV-001 has been approved.',
  data: { billId: 1 },
  email: 'user@example.com'
});
```

### Notify Multiple Recipients
```typescript
await notificationsService.notifyBillApproval(orgId, billId, [
  { userId: 1, email: 'manager@example.com' },
  { userId: 2, email: 'accountant@example.com' }
]);
```

### API: Get Notifications
```bash
GET /notifications?skip=0&take=10
```

### API: Mark as Read
```bash
POST /notifications/:id/read
```

---

## Audit Logging Examples

### Log Operation (Automatic via Interceptor)
The AuditInterceptor automatically logs all POST, PUT, DELETE, PATCH requests.

### Manual Logging
```typescript
// Log create
await auditService.logCreate(orgId, 'Bill', billId, billData, userId);

// Log update
await auditService.logUpdate(orgId, 'Bill', billId, oldData, newData, userId);

// Log delete
await auditService.logDelete(orgId, 'Bill', billId, deletedData, userId);

// Log status change
await auditService.logStatusChange(orgId, 'Bill', billId, 'DRAFT', 'FINALIZED', userId);
```

### API: Get Audit Logs
```bash
# All logs
GET /audit-logs

# Entity history
GET /audit-logs/entity/Bill/1

# User actions
GET /audit-logs/user/1

# Summary
GET /audit-logs/summary?startDate=2026-07-01&endDate=2026-07-04

# Top changes
GET /audit-logs/reports/top-changes?limit=10

# User activity
GET /audit-logs/reports/user-activity
```

---

## Email Template Examples

### Send Invoice Email
```typescript
await emailTemplateService.sendInvoiceEmail(billId, 'customer@example.com', {
  billNumber: 'INV-001',
  customerName: 'John Doe',
  invoiceDate: '2026-07-04',
  dueDate: '2026-08-04',
  items: [{ name: 'Product A', qty: 2, price: 1000, total: 2000 }],
  subtotal: 2000,
  tax: 200,
  totalAmount: 2200
});
```

### Render Template
```typescript
const template = await emailTemplateService.getTemplate(EmailTemplateType.INVOICE);
const rendered = emailTemplateService.renderTemplate(
  EmailTemplateType.INVOICE,
  template,
  billData
);
// Returns: { subject: '...', html: '...' }
```

### API: Get Templates
```bash
GET /email/templates
```

### API: Preview Template
```bash
POST /email/preview/INVOICE
Content-Type: application/json
{ "billNumber": "INV-001", "customerName": "John", "totalAmount": 2200 }
```

### API: Send Test Email
```bash
POST /email/send-test
Content-Type: application/json
{ "templateType": "INVOICE", "testEmail": "test@example.com" }
```

---

## WebSocket Examples

### Frontend Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Join organization
socket.emit('join:organization', { organizationId: 1 });

// Subscribe to KPIs
socket.emit('subscribe:kpis', { organizationId: 1 });

// Listen for updates
socket.on('kpi:update', (data) => console.log('KPIs:', data));
socket.on('bill:created', (data) => console.log('Bill:', data));
socket.on('bill:status-changed', (data) => console.log('Status:', data));
```

### Backend Broadcast
```typescript
// Notify bill created
await realtimeService.notifyBillCreated(orgId, billId);

// Notify status change
await realtimeService.notifyBillStatusChanged(orgId, billId, 'DRAFT', 'FINALIZED', userId);

// Broadcast KPIs
const kpis = await realtimeService.getCurrentKPIs(orgId);
realtimeGateway.broadcastKPIUpdate(orgId, kpis);

// Notify low inventory
await realtimeService.notifyLowInventory(orgId, productId, currentStock);
```

---

## Permission Examples

### Check Entity Action
```typescript
const canCreate = await permissionsService.canPerformAction(
  orgId, userId, 'Bill', 'CREATE'
);
```

### Check Field Read Access
```typescript
const canReadCost = await permissionsService.canReadField(
  orgId, userId, 'Bill', 'costPrice'
);
```

### Check Field Write Access
```typescript
const canWriteCost = await permissionsService.canWriteField(
  orgId, userId, 'Bill', 'costPrice'
);
```

### Filter Readable Fields
```typescript
const filtered = await permissionsService.filterReadableFields(
  orgId, userId, 'Bill', billData
);
```

### Validate Update Data
```typescript
const restricted = await permissionsService.validateUpdateData(
  orgId, userId, 'Bill', { billNumber: 'INV-002', costPrice: 1000 }
);
// Returns: ['costPrice'] if STAFF user
```

### Assign Role
```typescript
await permissionsService.assignRole(orgId, userId, UserRole.MANAGER);
```

### API: Check Permission
```bash
POST /permissions/check
{ "entity": "Bill", "action": "DELETE" }
```

### API: Get User Permissions
```bash
GET /permissions/user/1
```

### API: Get Entity Permissions
```bash
GET /permissions/entity/Bill
```

---

## Role-Based Access

### ADMIN
- ✅ All read/write on all entities
- ✅ All field access
- ✅ Can change user roles
- ✅ Can view all audit logs

### MANAGER
- ✅ Read all fields
- ✅ Write most fields (except role, email)
- ✅ Cannot see cost price
- ✅ Can view organization audit logs

### STAFF
- ✅ Read public fields only
- ✅ Write limited fields (dates, notes)
- ✅ Cannot see cost, margin, payment terms
- ✅ No audit log access

### VIEWER
- ✅ Read-only access
- ✅ Limited fields only
- ✅ No sensitive data access
- ✅ No write access

---

## Decorator Usage

### Require Permission
```typescript
@Post()
@RequirePermission('Bill:CREATE')
async createBill(@Body() dto: CreateBillDto) { }

@Put(':id')
@RequirePermission('Bill:UPDATE')
async updateBill(@Param('id') id: number, @Body() dto: UpdateBillDto) { }

@Delete(':id')
@RequirePermission('Bill:DELETE')
async deleteBill(@Param('id') id: number) { }
```

---

## Integration Checklist

### When Creating a Resource
```typescript
async createBill(orgId, userId, dto) {
  // 1. Create resource
  const bill = await this.prisma.bill.create({ data: { ...dto } });

  // 2. Log operation
  await this.auditService.logCreate(orgId, 'Bill', bill.id, bill, userId);

  // 3. Notify users
  const recipients = await this.getRelevantUsers(orgId);
  await this.notificationsService.notifyBillCreated(orgId, bill.id, recipients);

  // 4. Broadcast real-time
  await this.realtimeService.notifyBillCreated(orgId, bill.id);

  return bill;
}
```

### When Updating a Resource
```typescript
async updateBill(orgId, billId, userId, dto) {
  // 1. Get old data
  const oldBill = await this.prisma.bill.findUnique({ where: { id: billId } });

  // 2. Validate permissions
  const canUpdate = await this.permissionsService.canPerformAction(orgId, userId, 'Bill', 'UPDATE');
  if (!canUpdate) throw new ForbiddenException();

  // 3. Validate field permissions
  const restricted = await this.permissionsService.validateUpdateData(orgId, userId, 'Bill', dto);
  if (restricted.length > 0) throw new ForbiddenException(`Cannot write: ${restricted}`);

  // 4. Update resource
  const newBill = await this.prisma.bill.update({ where: { id: billId }, data: dto });

  // 5. Log operation
  await this.auditService.logUpdate(orgId, 'Bill', billId, oldBill, newBill, userId);

  // 6. Broadcast
  await this.realtimeService.notifyBillStatusChanged(orgId, billId, oldBill.status, newBill.status, userId);

  return newBill;
}
```

### When Changing Status
```typescript
async changeBillStatus(orgId, billId, userId, newStatus) {
  const oldBill = await this.prisma.bill.findUnique({ where: { id: billId } });
  
  const bill = await this.prisma.bill.update({
    where: { id: billId },
    data: { status: newStatus }
  });

  // Log status change
  await this.auditService.logStatusChange(orgId, 'Bill', billId, oldBill.status, newStatus, userId);

  // Special handling for finalization
  if (newStatus === 'FINALIZED') {
    const recipients = await this.getRelevantUsers(orgId);
    await this.notificationsService.notifyBillApproval(orgId, billId, recipients);
    await this.emailTemplateService.sendInvoiceEmail(billId, recipients[0].email, oldBill);
  }

  // Broadcast
  await this.realtimeService.notifyBillStatusChanged(orgId, billId, oldBill.status, newStatus, userId);

  return bill;
}
```

---

## Database Queries

### Get User Notifications
```sql
SELECT * FROM "Notification" 
WHERE "organizationId" = 1 AND "userId" = 1 
ORDER BY "isRead" ASC, "createdAt" DESC 
LIMIT 10;
```

### Get Audit Trail
```sql
SELECT * FROM "AuditLog" 
WHERE "organizationId" = 1 AND "entity" = 'Bill' AND "entityId" = 1 
ORDER BY "createdAt" DESC;
```

### Get User Role
```sql
SELECT role FROM "UserRoleAssignment" 
WHERE "organizationId" = 1 AND "userId" = 1;
```

### Get Field Permissions
```sql
SELECT * FROM "FieldPermission" 
WHERE "organizationId" = 1 AND "entity" = 'Bill' AND "role" = 'STAFF';
```

---

## Environment Variables

```env
# JWT
JWT_SECRET=your-secret
JWT_EXPIRATION=7d

# Notifications
NOTIFICATION_QUEUE_PROVIDER=bull
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=password
EMAIL_FROM_ADDRESS=noreply@erp.com
EMAIL_FROM_NAME="ERP System"

# SMS
TWILIO_ACCOUNT_SID=sid
TWILIO_AUTH_TOKEN=token
TWILIO_PHONE=+1234567890

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

## Common Patterns

### Notify on Event
```typescript
// In any event handler
await notificationsService.notifyBillApproval(orgId, billId, recipients);
```

### Check Permission Before Action
```typescript
const can = await permissionsService.canPerformAction(orgId, userId, entity, action);
if (!can) throw new ForbiddenException();
```

### Broadcast to All Users
```typescript
realtimeGateway.broadcastKPIUpdate(orgId, kpis);
```

### Log Complex Change
```typescript
await auditService.logUpdate(orgId, 'Bill', billId, oldBill, newBill, userId);
// Field-level changes are automatically detected
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check JWT token |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Check resource ID |
| 422 | Validation | Check request data |
| 500 | Server Error | Check logs |

---

## File Locations

| Component | Path |
|-----------|------|
| Notifications | `src/modules/notifications/` |
| Audit | `src/modules/audit/` |
| Email | `src/modules/email/` |
| WebSocket | `src/modules/websocket/` |
| Permissions | `src/modules/permissions/` |
| Guards | `src/common/guards/` |
| Decorators | `src/common/decorators/` |
| Interceptors | `src/common/interceptors/` |
| Schema | `prisma/schema.prisma` |
| Migration | `prisma/migrations/20260704183830_*/` |

---

## Debugging

### Check Logs
```bash
tail -f logs/*.log
```

### View Notifications
```sql
SELECT * FROM "Notification" WHERE "organizationId" = 1 LIMIT 10;
```

### View Audit Trail
```sql
SELECT * FROM "AuditLog" WHERE "organizationId" = 1 ORDER BY "createdAt" DESC LIMIT 20;
```

### Check WebSocket Connections
```bash
# Server logs will show connections/disconnections
# Check: "User 1 connected (socketId)"
```

### Verify Permission
```bash
curl -H "Authorization: Bearer $TOKEN" \
  -X POST -H "Content-Type: application/json" \
  -d '{"entity":"Bill","action":"DELETE"}' \
  http://localhost:3000/permissions/check
```

---

## Performance Tips

1. **Cache user roles** - Frequently accessed, use Redis
2. **Batch notifications** - Send multiple at once
3. **Index audit logs** - Already done, but add more if needed
4. **Paginate results** - Always use skip/take
5. **Use WebSocket rooms** - Don't broadcast to everyone

---

## Testing Commands

```bash
# Test notifications
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/notifications

# Test audit logs
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/audit-logs

# Test permissions
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/permissions/user/1

# Test email templates
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/email/templates

# Test WebSocket
npx socket.io-client http://localhost:3000 -a token=$TOKEN
```

---

**For detailed documentation, see ADVANCED_FEATURES.md and IMPLEMENTATION_GUIDE.md**
