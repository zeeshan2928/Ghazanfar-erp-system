# Quick Start: Development Servers

**Time to complete:** 5 minutes  
**Prerequisites:** Node.js, npm, PostgreSQL running locally

---

## 🚀 Step 1: Verify Prerequisites

### Check Node & npm
```powershell
node --version      # Should be v18+
npm --version       # Should be v9+
```

### Check PostgreSQL
```powershell
psql --version      # Should be v12+

# Connect to local database
psql -U postgres -d erp_database
# Type: \q to exit
```

---

## 📂 Step 2: Open 3 Terminal Windows

### **Terminal 1: Backend**
```powershell
cd D:\ghazanfar-erp-backend

# Build once
npm run build

# Start in dev mode
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - 07/04/2026, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 07/04/2026, 10:30:01 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 07/04/2026, 10:30:01 AM     LOG [RoutesResolver] BillsController...
[Nest] 12345  - 07/04/2026, 10:30:01 AM     LOG [Nest] Nest application successfully started
```

✅ **Backend ready on:** `http://localhost:3000`

---

### **Terminal 2: Frontend**
```powershell
cd D:\ghazanfar-erp-backend\frontend

# First time only: install dependencies
npm install

# Start dev server
npm run dev
```

**Expected output:**
```
  VITE v5.4.21  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

✅ **Frontend ready on:** `http://localhost:5173`

---

### **Terminal 3: Monitor (Optional)**
```powershell
# Keep this open to monitor for errors
# Just watch the backend terminal output

# Or tail logs if redirected
Get-Content backend.log -Tail 20 -Wait
```

---

## ✅ Step 3: Verify Everything is Running

### Backend Health Check
```powershell
# In any terminal, run:
curl http://localhost:3000/health

# Expected:
# {"status":"ok","timestamp":"2026-07-04T10:30:00.000Z"}
```

### Frontend Check
```powershell
# Open browser and visit:
# http://localhost:5173

# Should see:
# - ERP Dashboard header
# - Navigation buttons (Bills, Products, Inventory, Customers, Orders)
# - Main content area
```

---

## 🧪 Step 4: Quick Manual Tests (5 minutes)

### Test 1: Load Bills Screen
```
1. Click "Bills" in navigation
2. Should see table with bills data
3. Search box should appear at top
4. Filter buttons should be visible
```

**✓ If working:** Bills load and display correctly  
**✗ If failing:** Check browser console for errors

---

### Test 2: Test Primary Search
```
1. In Bills screen, type "BILL" in search box
2. Click "Search" button
3. Results should filter to bills containing "BILL"
4. Should see results within 300ms
```

**✓ If working:** Search fuzzy matching works  
**✗ If failing:** Check that database has data

---

### Test 3: Test Column Filter
```
1. Click "Status" filter button
2. Select "APPROVED" checkbox
3. Click "Apply"
4. Results should show only APPROVED bills
5. See filter tag appear below search
```

**✓ If working:** Column filters work  
**✗ If failing:** Check backend logs

---

### Test 4: Test Pagination
```
1. Click "Next" button at bottom
2. Results should change to page 2
3. Item count should show correct pagination info
4. Click "Previous" to go back
```

**✓ If working:** Pagination works  
**✗ If failing:** Check response format

---

### Test 5: Load Another Screen
```
1. Click "Products" in navigation
2. Should see products table
3. Filters should be different (name, code, price)
4. Search should work for products
```

**✓ If working:** Multi-screen routing works  
**✗ If failing:** Check frontend routing

---

## 🔍 Debug Common Issues

### Backend won't start

**Error:** "Port 3000 already in use"
```powershell
# Find process using port 3000
Get-NetTCPConnection -LocalPort 3000

# Kill it
Stop-Process -Id PROCESS_ID -Force

# Restart backend
npm run start:dev
```

**Error:** "Cannot find module '@nestjs/common'"
```powershell
npm install
npm run build
npm run start:dev
```

**Error:** Database connection fails
```powershell
# Check .env has DATABASE_URL
type .env | findstr DATABASE_URL

# Verify PostgreSQL is running
psql -U postgres -d erp_database -c "SELECT 1"

# Restart PostgreSQL service
# Windows: Services app → PostgreSQL → Restart
```

---

### Frontend won't start

**Error:** "Cannot find module 'react'"
```powershell
cd frontend
npm install
npm run dev
```

**Error:** "Module not found"
```powershell
# Clear cache and reinstall
cd frontend
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

---

### No search results

**Check 1:** Database has data
```powershell
psql -U postgres -d erp_database -c "SELECT COUNT(*) FROM bills;"
# Should return > 0
```

**Check 2:** Organization ID is correct
```powershell
psql -U postgres -d erp_database -c "SELECT DISTINCT organization_id FROM bills LIMIT 1;"
# Note this ID and verify token contains it
```

**Check 3:** Check backend logs
```
Look at Terminal 1 (Backend)
Should see search queries being logged
```

---

### API call returns 401 Unauthorized

**Issue:** Missing or invalid JWT token

**Solution:** 
```
1. Check Authorization header in frontend API service
2. Verify JWT token from your auth system
3. Add token to request headers
```

---

## 📊 Testing Checklist (10 minutes)

### Backend Tests
- [ ] Terminal 1 shows "Nest application successfully started"
- [ ] http://localhost:3000/health returns {"status":"ok"}
- [ ] No red errors in Terminal 1

### Frontend Tests
- [ ] Terminal 2 shows "Local: http://localhost:5173/"
- [ ] Frontend loads at http://localhost:5173
- [ ] No errors in browser console (F12)

### Functionality Tests
- [ ] Bills screen loads with data
- [ ] Search box filters results
- [ ] Filter buttons open dialogs
- [ ] Pagination works (Next/Previous)
- [ ] Products screen loads
- [ ] Inventory screen loads
- [ ] Customers screen loads
- [ ] Purchase Orders screen loads

### Performance Tests
- [ ] Search completes within 500ms
- [ ] Page navigation is smooth
- [ ] Filters apply instantly
- [ ] No lag in UI interactions

---

## 🎯 Next: Manual Testing

Once servers are running, follow **TESTING_CHECKLIST.md** for detailed test cases:

```powershell
# Open the testing checklist
notepad TESTING_CHECKLIST.md

# Or in VS Code
code TESTING_CHECKLIST.md
```

**Test areas:**
1. API endpoints (curl commands provided)
2. Search operators (all 16 types)
3. Screen functionality
4. Performance metrics
5. Security validation
6. Error handling

---

## 💾 Saving State

### Keep Servers Running
- Leave terminals open while testing
- They will auto-reload on code changes
- Ctrl+C to stop, then restart

### Hot Module Reload
- Frontend: Changes auto-compile
- Backend: Changes auto-recompile
- Just refresh browser to see updates

---

## 📞 Need Help?

**Backend issues:**
- Check Terminal 1 logs
- Run: `npm run build` to check for errors
- Check .env file exists with DATABASE_URL

**Frontend issues:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

**Database issues:**
- Verify PostgreSQL is running
- Check connection string in .env
- Run: `psql -U postgres -d erp_database -c "SELECT 1"`

---

## 🚀 Deployment After Testing

Once all manual tests pass:

```bash
# Terminal 1: Stop backend
Ctrl+C

# Terminal 2: Stop frontend
Ctrl+C

# Then follow DEPLOYMENT_GUIDE.md
```

**Ready to deploy?**
1. ✅ All 112 unit tests passing
2. ✅ Development servers running successfully
3. ✅ Manual testing complete
4. ✅ No errors in logs

→ **Proceed to DEPLOYMENT_GUIDE.md**

---

**Version:** 1.0  
**Last Updated:** 2026-07-04  
**Status:** ✅ Ready to Start
