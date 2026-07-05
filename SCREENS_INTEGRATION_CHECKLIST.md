# Screens Integration Checklist

**Project**: Ghazanfar ERP Backend  
**Phase**: 12 - Labour & Accountant System  
**Date**: July 5, 2026

---

## ✅ Quick Start (5 minutes)

### Step 1: Verify Backend Services
```bash
# Check that labour services compile
npm run build

# Should show: ✅ BUILD SUCCESSFUL - No errors
```

- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No runtime errors

### Step 2: Verify API Endpoints
```bash
# Start development server
npm run start:dev

# Check that routes are mapped
# Look for in console:
# [RouterExplorer] Mapped {/labour/staff/:organizationId, GET} route
# [RouterExplorer] Mapped {/labour/leaves/pending/:organizationId, GET} route
# [RouterExplorer] Mapped {/labour/attendance/:organizationId, GET} route
```

- [ ] Server starts without errors
- [ ] All labour routes mapped
- [ ] Database connected

### Step 3: Test One API Endpoint
```bash
# Get staff for organization (requires auth token)
curl -X GET http://localhost:3000/labour/staff/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Should return:
# {
#   "status": "success",
#   "data": [...],
#   "count": 0
# }
```

- [ ] Endpoint responds with 200
- [ ] Response format matches documentation
- [ ] Error handling works (test without token)

---

## 📋 SCREEN 1: Frontend Integration Checklist

### 1. File Setup
- [ ] Copy `LabourDashboard.tsx` to `frontend/src/screens/labour/`
- [ ] Create directory if not exists: `mkdir -p frontend/src/screens/labour`
- [ ] Verify file location: `frontend/src/screens/labour/LabourDashboard.tsx`

### 2. Dependencies Check
```bash
# Verify all imports are available
# In frontend package.json, check for:
```

- [ ] `@mui/material` installed
- [ ] `@mui/icons-material` installed
- [ ] `styled-components` installed
- [ ] `react-router-dom` installed
- [ ] TypeScript: `^4.x`

### 3. Setup Context & Services
- [ ] `AuthContext` exists at `frontend/src/contexts/AuthContext.tsx`
- [ ] `apiClient` exists at `frontend/src/services/api.ts`
- [ ] API client configured with base URL: `http://localhost:3000`

### 4. Add Route to App
```typescript
// In frontend/src/App.tsx or routing configuration
import LabourDashboard from './screens/labour/LabourDashboard';

// Add route:
<Route path="/labour/dashboard/:organizationId" element={<LabourDashboard />} />
```

- [ ] Route added to main App component
- [ ] Route matches path pattern: `/labour/dashboard/:organizationId`
- [ ] Component can be navigated to

### 5. Test Frontend Component
```bash
# Navigate to: http://localhost:3000/labour/dashboard/1
# Check for:
```

- [ ] Dashboard loads without errors
- [ ] Statistics cards display
- [ ] Tables render (even if empty)
- [ ] Add Staff button is clickable
- [ ] No console errors

### 6. Test API Calls
- [ ] Click "Add Staff Member" → Dialog opens
- [ ] Fill form and submit → Staff added
- [ ] Leave request table loads → Shows pending leaves
- [ ] Approve/Reject buttons work → Leave updates
- [ ] Error messages display properly

### 7. Styling & UX
- [ ] Gradient stat cards display correctly
- [ ] Status chips have correct colors
- [ ] Responsive layout works on mobile
- [ ] Hover effects on buttons
- [ ] Loading spinner shows during requests

---

## 🔧 SCREEN 2: Backend Integration Checklist

### 1. Module Configuration
- [ ] `LabourModule` imported in `app.module.ts`
- [ ] Services provided in labour.module.ts:
  - [ ] LabourStaffService
  - [ ] AttendanceService
  - [ ] LeaveService
  - [ ] BonusCalculationService
- [ ] Controller registered in labour.module.ts

### 2. Database Setup
```bash
# Regenerate Prisma client
npx prisma generate

# Run any pending migrations
npx prisma migrate dev
```

- [ ] Prisma client generated successfully
- [ ] All labour models accessible in Prisma
- [ ] Database tables exist for:
  - [ ] Employee
  - [ ] Attendance
  - [ ] LeaveManagement
  - [ ] AttendanceBonus
  - [ ] etc.

### 3. Authentication Setup
- [ ] JWT strategy configured in `JwtGuard`
- [ ] Guard decorators work: `@UseGuards(JwtGuard)`
- [ ] Token validation functioning

### 4. Test Each Endpoint Group

#### Staff Endpoints
```bash
POST /labour/staff                    # Register staff
GET /labour/staff/:organizationId     # Get all staff
GET /labour/staff/:organizationId/:id # Get one staff
PUT /labour/staff/:employeeId         # Update staff
```

- [ ] All endpoints respond with 200/201
- [ ] Error responses are descriptive
- [ ] Validation rejects invalid data

#### Attendance Endpoints
```bash
POST /labour/attendance/check-in            # Check-in
GET /labour/attendance/:organizationId      # Get records
GET /labour/attendance/:id/monthly          # Monthly stats
POST /labour/attendance/bulk-update         # Bulk update
```

- [ ] Check-in records successfully
- [ ] Attendance history returns correct data
- [ ] Monthly stats calculated correctly
- [ ] Bulk updates work for multiple records

#### Leave Endpoints
```bash
POST /labour/leaves                         # Apply
GET /labour/leaves/pending/:organizationId  # Pending
GET /labour/leaves/:organizationId/:id      # History
POST /labour/leaves/:leaveId/approve        # Approve
POST /labour/leaves/:leaveId/reject         # Reject
```

- [ ] Leave applications submit successfully
- [ ] Pending leaves filter correctly
- [ ] Approval/rejection updates status
- [ ] Days calculation is accurate

#### Bonus Endpoints
```bash
POST /labour/bonus/calculate         # Calculate
GET /labour/bonus/:id/history        # History
GET /labour/bonus/:organizationId/summary  # Summary
```

- [ ] Bonus calculation works
- [ ] History retrieval returns results
- [ ] Summary aggregates correctly

### 5. Error Scenarios
- [ ] Test without authentication → 401
- [ ] Test with invalid data → 400
- [ ] Test non-existent resource → 404
- [ ] Test database errors → 500 with message

### 6. Logging
- [ ] Errors logged to console
- [ ] Request tracking implemented
- [ ] Performance metrics logged

---

## ✅ SCREEN 3: Test Integration Checklist

### 1. Test File Setup
- [ ] All test files in `src/modules/labour/__tests__/`
- [ ] File structure matches:
  - [ ] `labour-staff.service.spec.ts`
  - [ ] `attendance.service.spec.ts`
  - [ ] `labour-staff.controller.spec.ts`
  - [ ] `labour.integration.spec.ts`

### 2. Test Dependencies
```json
{
  "devDependencies": {
    "@nestjs/testing": "^latest",
    "jest": "^latest",
    "@types/jest": "^latest"
  }
}
```

- [ ] @nestjs/testing installed
- [ ] Jest configured
- [ ] TypeScript for tests
- [ ] supertest for API testing

### 3. Jest Configuration
- [ ] `jest.config.js` exists
- [ ] Test file patterns configured
- [ ] Coverage thresholds set
- [ ] moduleNameMapper for aliases

### 4. Run Unit Tests
```bash
npm test -- labour-staff.service.spec
npm test -- attendance.service.spec
npm test -- labour-staff.controller.spec
```

**Expected Results**:
- [ ] Service tests: 9 passing
- [ ] Service tests: 10 passing
- [ ] Controller tests: 14 passing
- [ ] No errors or warnings

### 5. Run Integration Tests
```bash
npm test -- labour.integration.spec
```

**Expected Results**:
- [ ] All 25+ integration tests passing
- [ ] API responses match documentation
- [ ] Error handling validated
- [ ] Database interactions working

### 6. Test Coverage Report
```bash
npm test -- labour --coverage
```

**Expected Metrics**:
- [ ] Statements: > 80%
- [ ] Branches: > 75%
- [ ] Functions: > 80%
- [ ] Lines: > 80%

### 7. Continuous Testing
- [ ] Watch mode works: `npm test -- labour --watch`
- [ ] Tests re-run on file changes
- [ ] No stale test issues

---

## 🔄 Integration Workflow

### Phase 1: Setup (10 minutes)
1. [ ] Copy frontend component
2. [ ] Verify backend module loaded
3. [ ] Run `npm run build` ✅
4. [ ] Start dev server ✅

### Phase 2: Testing (15 minutes)
1. [ ] Run all tests: `npm test -- labour`
2. [ ] Verify coverage > 80%
3. [ ] Test individual endpoints
4. [ ] Test error scenarios

### Phase 3: Frontend Integration (10 minutes)
1. [ ] Add routes to app
2. [ ] Verify component renders
3. [ ] Test API integration
4. [ ] Check responsive design

### Phase 4: Validation (5 minutes)
1. [ ] E2E flow test (add staff → check attendance)
2. [ ] Error handling verification
3. [ ] Performance check
4. [ ] Cross-browser testing

**Total Time**: ~40 minutes

---

## 🐛 Troubleshooting

### Issue: "Module not found" for LabourModule
```bash
# Solution: Ensure file exists
ls src/modules/labour/labour.module.ts

# Rebuild
npm run build
```

### Issue: Tests fail with "Cannot find module"
```bash
# Solution: Clear jest cache
jest --clearCache

# Reinstall
npm install
```

### Issue: API returns 401 Unauthorized
```bash
# Solution: Check JWT token
# Valid token header format:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Test without auth to verify endpoint:
curl http://localhost:3000/labour/staff/1
```

### Issue: Database query fails
```bash
# Solution: Regenerate Prisma
npx prisma generate

# Check connection
npx prisma db push
```

### Issue: Frontend component not loading
```bash
# Solution: Verify imports
# Check that AuthContext and apiClient exist

# Verify route
# Check browser console for errors
```

---

## 📞 Support Commands

### Quick Diagnostics
```bash
# Check everything
npm run build && npm test -- labour --coverage

# Run one test
npm test -- labour-staff.service.spec -t "should return employee stats"

# Check API schema
curl http://localhost:3000/labour/staff/1 -H "Authorization: Bearer TEST"
```

### Documentation
- **API Routes**: See `src/modules/labour/LABOUR_API_ROUTES.md`
- **Types**: See `src/modules/labour/types/labour.types.ts`
- **Phase Info**: See `PHASE_12_LABOUR_ACCOUNTANT_SYSTEM.md`

---

## ✨ Success Criteria

### All Three Screens Integrated When:
- [ ] Frontend dashboard displays at `/labour/dashboard/:organizationId`
- [ ] All 25+ API endpoints respond correctly
- [ ] 58+ tests pass with >80% coverage
- [ ] E2E flow works: Add staff → Record attendance → Apply leave → Calculate bonus
- [ ] Error handling shows user-friendly messages
- [ ] Documentation matches implementation
- [ ] No console errors or warnings

---

## 📊 Status Tracking

| Component | Status | Verified |
|-----------|--------|----------|
| Frontend (LabourDashboard.tsx) | ✅ Ready | [ ] |
| Backend (labour-staff.controller.ts) | ✅ Ready | [ ] |
| Services (4 services) | ✅ Ready | [ ] |
| Unit Tests (33 cases) | ✅ Ready | [ ] |
| Integration Tests (25+ cases) | ✅ Ready | [ ] |
| Types & Interfaces | ✅ Ready | [ ] |
| API Documentation | ✅ Ready | [ ] |
| Build Status | ✅ Passing | [ ] |

---

**Next Step**: Start with "Quick Start (5 minutes)" section above ⬆️
