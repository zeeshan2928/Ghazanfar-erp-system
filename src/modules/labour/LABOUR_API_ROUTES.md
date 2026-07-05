# Labour Module API Routes Documentation

## Base URL: `/labour`

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Staff Management

### 1. Register Staff Member
- **Method**: `POST`
- **URL**: `/labour/staff`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "department": "Engineering",
  "position": "Software Developer",
  "salary": 50000
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Staff member registered successfully",
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "position": "Software Developer",
      "salary": 50000,
      "isActive": true,
      "createdAt": "2026-07-05T00:00:00Z",
      "updatedAt": "2026-07-05T00:00:00Z"
    }
  ]
}
```

**Error Response** (400):
```json
{
  "status": "error",
  "message": "Failed to register staff: [error details]"
}
```

---

### 2. Get Organization Staff
- **Method**: `GET`
- **URL**: `/labour/staff/:organizationId`
- **Auth**: Required (JWT)

**Query Parameters**: None

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "position": "Software Developer",
      "salary": 50000,
      "isActive": true
    }
  ],
  "count": 1
}
```

---

### 3. Get Staff Details
- **Method**: `GET`
- **URL**: `/labour/staff/:organizationId/:employeeId`
- **Auth**: Required (JWT)

**Response**:
```json
{
  "status": "success",
  "data": {
    "employee": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "department": "Engineering",
      "salary": 50000
    },
    "attendanceThisMonth": 20,
    "totalLeaves": 2
  }
}
```

---

### 4. Update Staff
- **Method**: `PUT`
- **URL**: `/labour/staff/:employeeId`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "salary": 60000
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Staff member updated successfully"
}
```

---

## Attendance Management

### 1. Record Check-In
- **Method**: `POST`
- **URL**: `/labour/attendance/check-in`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "employeeId": 1,
  "date": "2026-07-05"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Check-in recorded",
  "data": {
    "id": 1,
    "organizationId": 1,
    "employeeId": 1,
    "status": "PRESENT",
    "attendanceDate": "2026-07-05T00:00:00Z"
  }
}
```

---

### 2. Get Attendance Records
- **Method**: `GET`
- **URL**: `/labour/attendance/:organizationId`
- **Auth**: Required (JWT)

**Query Parameters**:
- `employeeId` (optional): Filter by employee
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response** (with employeeId):
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "status": "PRESENT",
      "attendanceDate": "2026-07-05T00:00:00Z",
      "hoursWorked": 8
    }
  ],
  "count": 1
}
```

**Response** (without employeeId - Organization stats):
```json
{
  "status": "success",
  "data": {
    "total": 100,
    "present": 85,
    "absent": 10,
    "leave": 5,
    "attendancePercentage": 85
  }
}
```

---

### 3. Get Monthly Attendance Stats
- **Method**: `GET`
- **URL**: `/labour/attendance/:organizationId/:employeeId/monthly`
- **Auth**: Required (JWT)

**Query Parameters**:
- `month` (required): Month (1-12)
- `year` (required): Year (YYYY)

**Response**:
```json
{
  "status": "success",
  "data": {
    "month": 7,
    "year": 2026,
    "total": 22,
    "present": 20,
    "absent": 1,
    "leave": 1,
    "attendancePercentage": 90.91
  }
}
```

---

### 4. Bulk Update Attendance
- **Method**: `POST`
- **URL**: `/labour/attendance/bulk-update`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "updates": [
    {
      "employeeId": 1,
      "date": "2026-07-05",
      "status": "PRESENT"
    },
    {
      "employeeId": 2,
      "date": "2026-07-05",
      "status": "ABSENT"
    }
  ]
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Updated 2 attendance records",
  "data": [
    { "id": 1, "status": "PRESENT" },
    { "id": 2, "status": "ABSENT" }
  ]
}
```

---

## Leave Management

### 1. Apply for Leave
- **Method**: `POST`
- **URL**: `/labour/leaves`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "employeeId": 1,
  "leaveType": "CASUAL",
  "startDate": "2026-07-10",
  "endDate": "2026-07-12"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Leave application submitted",
  "data": {
    "id": 1,
    "organizationId": 1,
    "employeeId": 1,
    "leaveType": "CASUAL",
    "startDate": "2026-07-10T00:00:00Z",
    "endDate": "2026-07-12T00:00:00Z",
    "daysUsed": 3,
    "approvalStatus": "PENDING"
  }
}
```

---

### 2. Get Pending Leaves
- **Method**: `GET`
- **URL**: `/labour/leaves/pending/:organizationId`
- **Auth**: Required (JWT)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "leaveType": "CASUAL",
      "startDate": "2026-07-10T00:00:00Z",
      "endDate": "2026-07-12T00:00:00Z",
      "daysUsed": 3,
      "approvalStatus": "PENDING"
    }
  ],
  "count": 1
}
```

---

### 3. Get Leave History
- **Method**: `GET`
- **URL**: `/labour/leaves/:organizationId/:employeeId`
- **Auth**: Required (JWT)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "leaveType": "CASUAL",
      "startDate": "2026-07-10T00:00:00Z",
      "endDate": "2026-07-12T00:00:00Z",
      "approvalStatus": "APPROVED"
    }
  ],
  "count": 1
}
```

---

### 4. Get Leave Balance
- **Method**: `GET`
- **URL**: `/labour/leaves/:organizationId/:employeeId/balance`
- **Auth**: Required (JWT)

**Response**:
```json
{
  "status": "success",
  "data": {
    "employeeId": 1,
    "totalLeavesApproved": 5,
    "totalDaysUsed": 12,
    "leaves": [
      {
        "id": 1,
        "leaveType": "CASUAL",
        "daysUsed": 3,
        "approvalStatus": "APPROVED"
      }
    ]
  }
}
```

---

### 5. Approve Leave
- **Method**: `POST`
- **URL**: `/labour/leaves/:leaveId/approve`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "approvedBy": 5
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Leave approved",
  "data": {
    "id": 1,
    "approvalStatus": "APPROVED",
    "approvedBy": 5
  }
}
```

---

### 6. Reject Leave
- **Method**: `POST`
- **URL**: `/labour/leaves/:leaveId/reject`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "reason": "Insufficient notice"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Leave rejected"
}
```

---

## Bonus Management

### 1. Calculate Individual Bonus
- **Method**: `POST`
- **URL**: `/labour/bonus/calculate`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "employeeId": 1,
  "month": 7,
  "year": 2026,
  "baseBonus": 1000
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Bonus calculated",
  "data": {
    "id": 1,
    "organizationId": 1,
    "employeeId": 1,
    "bonusMonth": "2026-07-01T00:00:00Z",
    "bonusAmount": 1500,
    "createdAt": "2026-07-05T00:00:00Z"
  }
}
```

---

### 2. Calculate All Bonuses
- **Method**: `POST`
- **URL**: `/labour/bonus/calculate-all`
- **Auth**: Required (JWT)

**Request Body**:
```json
{
  "organizationId": 1,
  "month": 7,
  "year": 2026,
  "baseBonus": 1000
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Calculated bonuses for 25 employees",
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "bonusAmount": 1500
    }
  ],
  "count": 25
}
```

---

### 3. Get Bonus History
- **Method**: `GET`
- **URL**: `/labour/bonus/:organizationId/:employeeId/history`
- **Auth**: Required (JWT)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "employeeId": 1,
      "bonusMonth": "2026-07-01T00:00:00Z",
      "bonusAmount": 1500
    }
  ],
  "count": 1
}
```

---

### 4. Get Organization Bonus Summary
- **Method**: `GET`
- **URL**: `/labour/bonus/:organizationId/summary`
- **Auth**: Required (JWT)

**Query Parameters**:
- `month` (required): Month (1-12)
- `year` (required): Year (YYYY)

**Response**:
```json
{
  "status": "success",
  "data": {
    "month": 7,
    "year": 2026,
    "totalBonuses": 25,
    "totalAmount": 37500,
    "averageBonus": 1500,
    "details": [
      {
        "id": 1,
        "employeeId": 1,
        "bonusAmount": 1500
      }
    ]
  }
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

---

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Example Request (cURL)

```bash
curl -X POST http://localhost:3000/labour/attendance/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "organizationId": 1,
    "employeeId": 1,
    "date": "2026-07-05"
  }'
```

---

## Batch Operations

For bulk operations affecting multiple records, send arrays in the request body and the API will process them in a transaction.

Example: Bulk attendance update processes all records and returns results for each.

---

## Rate Limiting

- **Limit**: 100 requests per minute per user
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Pagination (Future)

Some endpoints will support pagination with query parameters:
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20, max: 100)
