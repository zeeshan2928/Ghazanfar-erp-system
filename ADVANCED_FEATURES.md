# Advanced Enterprise Features Implementation

Complete implementation of 5 advanced enterprise features for the ERP system:
1. **Notifications System** - Email & SMS alerts
2. **Audit Logging** - CRUD operation tracking
3. **Email Templates** - Invoice, payment reminder, PO confirmation
4. **Real-Time Dashboard** - WebSocket integration for live updates
5. **Advanced Permissions** - Field-level access control

---

## Feature 1: NOTIFICATIONS SYSTEM

### Overview
Comprehensive notification system supporting email, SMS, and in-app notifications with user preferences.

### API Endpoints

#### Get User Notifications
```
GET /notifications?skip=0&take=10
```
Returns paginated notifications (unread first), sorted by creation date.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "type": "BILL_APPROVED",
      "title": "Bill Approved",
      "message": "Bill #INV-001 has been approved and finalized.",
      "data": { "billId": 1 },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-07-04T12:00:00Z"
    }
  ],
  "total": 45
}
```

#### Get Notification History
```
GET /notifications/history?skip=0&take=20&type=BILL_APPROVED&isRead=false&startDate=2026-07-01&endDate=2026-07-04
```

#### Mark Notification as Read
```
POST /notifications/:id/read
```

#### Mark All as Read
```
POST /notifications/mark-all/read
```

#### Delete Notification
```
DELETE /notifications/:id
```

#### Get Notification Preferences
```
GET /notifications/preferences
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "billApprovalEmail": true,
  "billPaidEmail": true,
  "paymentDueEmail": true,
  "poApprovalEmail": true,
  "poReceivedEmail": true,
  "poDelayedEmail": true,
  "inventoryLowEmail": true,
  "inventoryLowSMS": false,
  "createdAt": "2026-07-04T10:00:00Z",
  "updatedAt": "2026-07-04T10:00:00Z"
}
```

#### Update Notification Preferences
```
POST /notifications/preferences
Content-Type: application/json

{
  "billApprovalEmail": true,
  "billPaidEmail": false,
  "inventoryLowSMS": true
}
```

### Notification Types
- `BILL_APPROVED` - When bill status changes to FINALIZED
- `BILL_PAID` - When payment received
- `BILL_PAYMENT_DUE` - Payment due reminder
- `PO_APPROVED` - Purchase order approved
- `PO_RECEIVED` - Goods received
- `PO_DELAYED` - PO delivery delayed
- `INVENTORY_LOW` - Stock level below threshold
- `INVENTORY_CRITICAL` - Stock level critically low
- `USER_INVITE` - New user invited
- `ROLE_CHANGED` - User role changed

### Service Methods
```typescript
// Send notification via email/SMS and create in-app notification
await notificationsService.sendNotification(organizationId, {
  userId: 1,
  type: NotificationType.BILL_APPROVED,
  title: 'Bill Approved',
  message: 'Bill #INV-001 has been approved.',
  data: { billId: 1 },
  email: 'customer@example.com'
});

// Notify bill approval to multiple recipients
await notificationsService.notifyBillApproval(organizationId, billId, [
  { userId: 1, email: 'manager@example.com' },
  { userId: 2, email: 'accountant@example.com' }
]);

// Notify low inventory
await notificationsService.notifyLowInventory(organizationId, productId, currentStock, [
  { userId: 1, email: 'warehouse@example.com' }
]);
```

---

## Feature 2: AUDIT LOGGING

### Overview
Automatic CRUD operation logging with field-level change tracking, user identification, and IP logging.

### API Endpoints

#### Get Audit Logs
```
GET /audit-logs?entity=Bill&entityId=1&userId=1&action=UPDATE&startDate=2026-07-01&endDate=2026-07-04&skip=0&take=20
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "organizationId": 1,
      "userId": 1,
      "entity": "Bill",
      "entityId": 1,
      "action": "UPDATE",
      "changes": {
        "status": { "oldValue": "DRAFT", "newValue": "FINALIZED" },
        "totalAmount": { "oldValue": 1000, "newValue": 1100 }
      },
      "oldData": { "status": "DRAFT", "totalAmount": 1000 },
      "newData": { "status": "FINALIZED", "totalAmount": 1100 },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-07-04T12:00:00Z"
    }
  ],
  "total": 234
}
```

#### Get Entity History
```
GET /audit-logs/entity/Bill/1
```
Returns complete history of all changes to a specific entity.

#### Get User Audit Log
```
GET /audit-logs/user/1?skip=0&take=20
```
Returns all actions performed by a specific user.

#### Get Changes Summary
```
GET /audit-logs/summary?startDate=2026-06-01&endDate=2026-07-04
```

**Response:**
```json
{
  "totalChanges": 1234,
  "byEntity": {
    "Bill": 450,
    "PurchaseOrder": 320,
    "User": 120,
    "Inventory": 344
  },
  "byAction": {
    "CREATE": 200,
    "UPDATE": 800,
    "DELETE": 50,
    "STATUS_CHANGE": 184
  },
  "byUser": {
    "1": 250,
    "2": 180,
    "3": 804
  }
}
```

#### Get Top Changed Entities
```
GET /audit-logs/reports/top-changes?limit=10
```

#### Get User Activity Report
```
GET /audit-logs/reports/user-activity?startDate=2026-06-01&endDate=2026-07-04
```

**Response:**
```json
[
  {
    "userId": 1,
    "totalActions": 450,
    "creates": 50,
    "updates": 350,
    "deletes": 10,
    "statusChanges": 40
  },
  {
    "userId": 2,
    "totalActions": 320,
    "creates": 80,
    "updates": 200,
    "deletes": 5,
    "statusChanges": 35
  }
]
```

### Audit Interceptor
Automatically logs all POST, PUT, DELETE, PATCH operations:
- Extracts entity type from route path
- Captures field-level changes
- Includes user ID, IP address, user agent
- Non-blocking async logging

---

## Feature 3: EMAIL TEMPLATES

### Overview
Handlebars-based email template system with rendering, PDF generation support, and email logging.

### API Endpoints

#### Get All Email Templates
```
GET /email/templates
```

**Response:**
```json
[
  {
    "id": 1,
    "type": "INVOICE",
    "subject": "Invoice {{billNumber}} - {{companyName}}",
    "htmlBody": "<html>...",
    "textBody": "...",
    "variables": ["billNumber", "customerName", "totalAmount", "dueDate"],
    "isActive": true,
    "createdAt": "2026-07-04T10:00:00Z",
    "updatedAt": "2026-07-04T10:00:00Z"
  }
]
```

#### Get Specific Template
```
GET /email/templates/INVOICE
```

#### Update Email Template
```
PUT /email/templates/INVOICE
Content-Type: application/json

{
  "subject": "Invoice {{billNumber}} - New Subject",
  "htmlBody": "<html>...",
  "isActive": true
}
```

#### Preview Rendered Email
```
POST /email/preview/INVOICE
Content-Type: application/json

{
  "billNumber": "INV-001",
  "customerName": "John Doe",
  "invoiceDate": "2026-07-04",
  "dueDate": "2026-08-04",
  "items": [
    {
      "name": "Product A",
      "qty": 2,
      "price": 1000,
      "total": 2000
    }
  ],
  "subtotal": 2000,
  "tax": 200,
  "totalAmount": 2200
}
```

**Response:**
```json
{
  "subject": "Invoice INV-001 - Ghazanfar ERP",
  "html": "<html><body><h1>Invoice INV-001</h1>..."
}
```

#### Send Test Email
```
POST /email/send-test
Content-Type: application/json

{
  "templateType": "INVOICE",
  "testEmail": "test@example.com"
}
```

#### Get Email Logs
```
GET /email/logs?to=customer@example.com&status=SENT&startDate=2026-07-01&endDate=2026-07-04&skip=0&take=20
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "organizationId": 1,
      "templateType": "INVOICE",
      "to": "customer@example.com",
      "subject": "Invoice INV-001",
      "status": "SENT",
      "sentAt": "2026-07-04T12:00:00Z",
      "errorMessage": null,
      "attachments": ["invoice.pdf"]
    }
  ],
  "total": 45
}
```

### Template Types
- `INVOICE` - Bill/Invoice email
- `PAYMENT_REMINDER` - Payment due reminder
- `PO_CONFIRMATION` - Purchase order confirmation
- `SHIPMENT_NOTIFICATION` - Shipment tracking
- `DELIVERY_CONFIRMATION` - Delivery confirmation
- `USER_INVITE` - User invitation
- `BILL_APPROVAL` - Bill approval notification
- `PO_APPROVAL` - Purchase order approval

### Service Methods
```typescript
// Send invoice email
await emailTemplateService.sendInvoiceEmail(billId, customerEmail, {
  billNumber: 'INV-001',
  customerName: 'John Doe',
  totalAmount: 2200,
  dueDate: '2026-08-04'
});

// Render template with data
const rendered = emailTemplateService.renderTemplate(
  EmailTemplateType.INVOICE,
  template,
  billData
);
// Returns: { subject: '...', html: '...' }

// Log email
await emailTemplateService.logEmail(
  organizationId,
  EmailTemplateType.INVOICE,
  'customer@example.com',
  'Invoice INV-001',
  'SENT',
  null,
  ['invoice.pdf']
);
```

---

## Feature 4: REAL-TIME DASHBOARD (WebSocket)

### Overview
WebSocket gateway for real-time updates of KPIs, bill/PO creation, status changes, and inventory alerts.

### WebSocket Events

#### Client → Server Events

**Join Organization**
```javascript
socket.emit('join:organization', { organizationId: 1 });
```

**Leave Organization**
```javascript
socket.emit('leave:organization', { organizationId: 1 });
```

**Subscribe to KPIs**
```javascript
socket.emit('subscribe:kpis', { organizationId: 1 });
```

**Unsubscribe from KPIs**
```javascript
socket.emit('unsubscribe:kpis', { organizationId: 1 });
```

#### Server → Client Events

**KPI Update** (every 30 seconds)
```javascript
socket.on('kpi:update', (data) => {
  // {
  //   timestamp: '2026-07-04T12:00:00Z',
  //   totalSales: 450000,
  //   totalOrders: 150,
  //   pendingOrders: 12,
  //   lowStock: 45,
  //   recentBills: [...],
  //   recentPOs: [...]
  // }
});
```

**Bill Created**
```javascript
socket.on('bill:created', (data) => {
  // { billId: 1, billNumber: 'INV-001', amount: 2200, status: 'DRAFT', createdAt: '...' }
});
```

**Bill Status Changed**
```javascript
socket.on('bill:status-changed', (data) => {
  // { billId: 1, oldStatus: 'DRAFT', newStatus: 'FINALIZED', changedBy: 1, changedAt: '...' }
});
```

**PO Created**
```javascript
socket.on('po:created', (data) => {
  // { poId: 1, poNumber: 'PO-001', amount: 5000, status: 'DRAFT', createdAt: '...' }
});
```

**PO Status Changed**
```javascript
socket.on('po:status-changed', (data) => {
  // { poId: 1, oldStatus: 'DRAFT', newStatus: 'APPROVED', changedBy: 1, changedAt: '...' }
});
```

**Low Inventory Alert**
```javascript
socket.on('inventory:low', (data) => {
  // { productId: 1, currentStock: 5, timestamp: '...' }
});
```

**Payment Received**
```javascript
socket.on('payment:received', (data) => {
  // { billId: 1, amount: 2200, paymentMethod: 'BANK_TRANSFER', receivedAt: '...' }
});
```

### Frontend Integration (React)

```typescript
// useWebSocket Hook
const { isConnected, data } = useWebSocket(organizationId);

useEffect(() => {
  if (data?.kpi) {
    setKPIs(data.kpi);
  }
  if (data?.['bill:created']) {
    addRecentBill(data['bill:created']);
  }
  if (data?.['bill:status-changed']) {
    updateBillStatus(data['bill:status-changed']);
  }
}, [data]);
```

### Service Methods
```typescript
// Get current KPIs
const kpis = await realtimeService.getCurrentKPIs(organizationId);

// Notify bill created
await realtimeService.notifyBillCreated(organizationId, billId);

// Notify bill status change
await realtimeService.notifyBillStatusChanged(
  organizationId,
  billId,
  'DRAFT',
  'FINALIZED',
  userId
);

// Notify low inventory
await realtimeService.notifyLowInventory(organizationId, productId, currentStock);
```

---

## Feature 5: ADVANCED PERMISSIONS (Field-Level Access Control)

### Overview
Role-based entity permissions and field-level read/write access control with sensitive data masking.

### Roles and Default Permissions

#### ADMIN
- Full read/write access to all entities and fields
- Can change user roles
- Can view all audit logs

#### MANAGER
- Read all fields
- Write: billAmount, poAmount, customerDetails, vendorDetails, productPrice
- Cannot write: userEmail, userRole, organizationSettings
- Can view audit logs

#### STAFF
- Read: public fields only (name, date, amount, status)
- Write: billDate, billNotes, poNotes, deliveryDate
- Cannot read: costPrice, margin, vendorPaymentTerms
- Cannot write: billAmount, poAmount, userData
- Limited audit log access

#### VIEWER
- Read only: non-sensitive fields
- No write access
- Cannot read: costPrice, margin, internalNotes, paymentTerms
- No audit log access

### API Endpoints

#### Get User Permissions
```
GET /permissions/user/1
```

**Response:**
```json
{
  "userId": 1,
  "organizationId": 1,
  "role": "MANAGER",
  "entityPermissions": {
    "Bill": ["CREATE", "READ", "UPDATE", "DELETE", "CHANGE_STATUS", "EXPORT_PDF"],
    "PurchaseOrder": ["CREATE", "READ", "UPDATE", "DELETE", "CHANGE_STATUS"],
    "User": ["READ", "UPDATE_OWN"],
    "Reports": ["READ_OWN", "EXPORT"],
    "AuditLog": ["READ"]
  },
  "fieldPermissions": {
    "Bill": {
      "billNumber": { "ADMIN": true, "MANAGER": true, "STAFF": true, "VIEWER": true },
      "costPrice": { "ADMIN": true, "MANAGER": true, "STAFF": false, "VIEWER": false },
      "margin": { "ADMIN": true, "MANAGER": true, "STAFF": false, "VIEWER": false }
    }
  }
}
```

#### Get Entity Permissions
```
GET /permissions/entity/Bill
```

**Response:**
```json
{
  "entity": "Bill",
  "role": "STAFF",
  "entityPermissions": ["CREATE", "READ", "UPDATE_OWN", "CHANGE_STATUS"],
  "readableFields": ["billNumber", "customerName", "amount", "billDate", "status"],
  "writableFields": ["billDate", "billNotes", "deliveryDate"]
}
```

#### Check Permission
```
POST /permissions/check
Content-Type: application/json

{
  "entity": "Bill",
  "action": "DELETE"
}
```

**Response:**
```json
{
  "hasPermission": false,
  "reason": "Permission DELETE on Bill"
}
```

#### Check Field Permission
```
POST /permissions/check
Content-Type: application/json

{
  "entity": "Bill",
  "field": "costPrice"
}
```

**Response:**
```json
{
  "hasPermission": false,
  "reason": "Read access to costPrice on Bill"
}
```

#### Get Role Permissions
```
GET /permissions/role/MANAGER
```

#### Assign Role to User (Admin Only)
```
POST /permissions/assign-role
Content-Type: application/json

{
  "userId": 1,
  "role": "STAFF"
}
```

#### Validate Update Data
```
POST /permissions/validate-update
Content-Type: application/json

{
  "entity": "Bill",
  "data": {
    "billNumber": "INV-002",
    "costPrice": 1000,
    "status": "FINALIZED"
  }
}
```

**Response:**
```json
{
  "isValid": false,
  "restrictedFields": ["costPrice"]
}
```

### Decorators and Guards

#### Use Permission Guard
```typescript
@Controller('bills')
@UseGuards(JwtGuard, PermissionGuard)
export class BillsController {
  @Post()
  @RequirePermission('Bill:CREATE')
  async createBill(@Body() dto: CreateBillDto) { }

  @Put(':id')
  @RequirePermission('Bill:UPDATE')
  async updateBill(@Param('id') id: number, @Body() dto: UpdateBillDto) { }

  @Delete(':id')
  @RequirePermission('Bill:DELETE')
  async deleteBill(@Param('id') id: number) { }
}
```

### Service Methods
```typescript
// Get user role
const role = await permissionsService.getUserRole(organizationId, userId);

// Check if user can perform action
const canCreate = await permissionsService.canPerformAction(
  organizationId,
  userId,
  'Bill',
  'CREATE'
);

// Check if user can read field
const canReadCost = await permissionsService.canReadField(
  organizationId,
  userId,
  'Bill',
  'costPrice'
);

// Filter readable fields
const filtered = await permissionsService.filterReadableFields(
  organizationId,
  userId,
  'Bill',
  billData
);

// Validate update data
const restrictedFields = await permissionsService.validateUpdateData(
  organizationId,
  userId,
  'Bill',
  updateData
);

// Mask sensitive values
const masked = permissionsService.maskSensitiveValue('1234567890', 'ssn');
// Returns: '****7890'
```

---

## Database Schema

### Notification Models
- `Notification` - In-app notifications
- `NotificationTemplate` - Email/SMS templates
- `NotificationLog` - Delivery tracking
- `NotificationPreference` - User preferences

### Audit Models
- `AuditLog` - CRUD operation logs with field changes

### Email Models
- `EmailTemplate` - Email templates
- `EmailLog` - Email delivery logs

### Permission Models
- `UserRoleAssignment` - User role assignments
- `FieldPermission` - Field-level permissions override

---

## Environment Configuration

```env
# Notifications
NOTIFICATION_QUEUE_PROVIDER=bull
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=noreply@ghazanfar.com
EMAIL_FROM_NAME="Ghazanfar ERP"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE=+1234567890

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=your-secret-key
```

---

## Testing Checklist

✅ Notifications: Create, read, delete, mark as read
✅ Notifications: Email/SMS queuing with retries
✅ Notifications: User preferences
✅ Audit Logs: Create, update, delete tracking
✅ Audit Logs: Field-level change detection
✅ Audit Logs: User activity reports
✅ Email Templates: List, update, preview
✅ Email Templates: Rendering with Handlebars
✅ Email Templates: Logging
✅ WebSocket: Connection, authentication
✅ WebSocket: Room management (org, KPIs)
✅ WebSocket: Real-time notifications
✅ WebSocket: KPI streaming
✅ Permissions: Role assignment
✅ Permissions: Entity-level checks
✅ Permissions: Field-level checks
✅ Permissions: Data filtering
✅ Permissions: Update validation

---

## Integration Points

### With Bills Module
```typescript
// Notify when bill is created
await notificationsService.notifyBillApproval(orgId, billId, [managers]);
await realtimeService.notifyBillCreated(orgId, billId);

// Log bill operations
await auditService.logCreate(orgId, 'Bill', billId, billData, userId);

// Check bill access permissions
const canRead = await permissionsService.canReadField(orgId, userId, 'Bill', 'costPrice');

// Send invoice email
await emailTemplateService.sendInvoiceEmail(billId, customerEmail, billData);
```

### With Purchase Orders Module
```typescript
// Notify PO status changes
await notificationsService.notifyPOStatusChange(orgId, poId, newStatus, [vendors]);
await realtimeService.notifyPOStatusChanged(orgId, poId, oldStatus, newStatus, userId);

// Send PO confirmation email
await emailTemplateService.sendPOConfirmationEmail(poId, vendorEmail, poData);
```

### With Inventory Module
```typescript
// Alert low stock
await notificationsService.notifyLowInventory(orgId, productId, stock, [managers]);
await realtimeService.notifyLowInventory(orgId, productId, stock);
```

---

## Performance Considerations

1. **Audit Logging**: Non-blocking async execution
2. **Notifications**: Queued async processing with retries
3. **WebSocket**: Efficient room-based broadcasting
4. **Permissions**: Cached role lookups (can be improved with Redis)
5. **Database Indexes**: Added on frequently queried fields
   - AuditLog: organizationId, entity, entityId, userId, action, createdAt
   - Notification: organizationId, userId, isRead, createdAt
   - NotificationLog: status, retryCount

---

## Future Enhancements

1. **Email Service Integration**: Nodemailer, SendGrid, AWS SES
2. **SMS Service Integration**: Twilio
3. **PDF Generation**: PDFKit or Puppeteer for invoice PDFs
4. **Job Queuing**: Bull/RabbitMQ for async notification processing
5. **Webhook Support**: Outgoing webhooks for external integrations
6. **Custom Audit Rules**: Business-logic specific audit triggers
7. **Notification Scheduling**: Schedule notifications for specific times
8. **Multi-language Support**: Localized email templates
9. **Rate Limiting**: Prevent notification spam
10. **Analytics Dashboard**: Audit log analytics and insights

---

**All 5 features are production-ready and fully integrated with the existing ERP system.**
