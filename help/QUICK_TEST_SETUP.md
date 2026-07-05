# Quick Test Setup Guide

Get the complete testing suite running in under 10 minutes.

---

## 1. Install Dependencies (2 min)

```bash
npm install
npx playwright install
```

---

## 2. Setup Test Database (3 min)

### Option A: Using Docker (Recommended)

```bash
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=erp_test \
  -p 5432:5432 \
  postgres:14
```

### Option B: Using Local PostgreSQL

```bash
createdb -U postgres erp_test
```

---

## 3. Create .env.test File (1 min)

```bash
cat > .env.test << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_test"
NODE_ENV=test
JWT_SECRET=test_secret_key_12345
JWT_EXPIRATION=24h
LOG_LEVEL=error
EOF
```

---

## 4. Run Migrations (2 min)

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
# Or for fresh database:
npx prisma migrate reset --skip-seed
```

---

## 5. Run Tests

### Run All Tests
```bash
npm run test:all
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test

# Integration tests
npm run test:integration

# Unit tests with coverage
npm run test:cov

# E2E tests
npx playwright test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Performance tests
npm start:dev &  # Start backend first
npm run perf:load
```

---

## 6. View Results

### Coverage Report
```bash
# After running tests:
npm run test:cov
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

### E2E Report
```bash
npx playwright show-report
```

---

## Test Files Location

```
src/
├── modules/
│   ├── bills/
│   │   └── services/
│   │       └── bills.service.spec.ts
│   ├── products/
│   │   └── services/
│   │       └── products.service.spec.ts
│   └── users/
│       └── services/
│           └── users.service.spec.ts
├── common/
│   ├── services/
│   │   └── filter.service.spec.ts
│   └── __tests__/
│       ├── test-utils.ts
│       └── integration/
│           └── bill-workflow.spec.ts

e2e/
├── auth.spec.ts
├── bills.spec.ts
└── fixtures/
    └── test-data.ts

performance/
└── load-tests.ts

security/
└── security-audit.spec.ts

.github/workflows/
└── test.yml
```

---

## Quick Commands Reference

```bash
# Development
npm run test:watch          # Re-run on file changes
npm run test:debug          # Debug mode

# Coverage
npm run test:cov            # Generate coverage report
npm run test:cov -- --all   # Full report

# E2E
npx playwright test --ui    # Interactive mode
npx playwright test --headed # See browser
npx playwright test --debug  # Debug mode

# Performance
npm run perf:load           # Load testing
npm run perf:profile:cpu    # CPU profiling
npm run perf:profile:mem    # Memory profiling

# CI/CD
npm run lint                # Check linting
npm run format              # Auto-format code
npm run security:check      # Security audit
npm audit                   # Dependency audit
```

---

## Common Issues & Solutions

### Issue: Database Connection Error

**Solution:**
```bash
# Check if PostgreSQL is running
psql -U postgres -d erp_test -c "SELECT 1"

# Verify DATABASE_URL in .env.test
echo $DATABASE_URL

# Reset database
npx prisma migrate reset --skip-seed
```

### Issue: Playwright Tests Not Finding Elements

**Solution:**
```bash
# Run with headed mode to see browser
npx playwright test --headed

# Increase timeout for debugging
npx playwright test --debug

# Check element selectors in DevTools
```

### Issue: Out of Memory in Tests

**Solution:**
```bash
# Increase Node.js memory
NODE_OPTIONS=--max_old_space_size=4096 npm run test
```

### Issue: Tests Timeout

**Solution:**
```bash
# Increase Jest timeout for integration tests
npm run test:integration -- --testTimeout=30000

# Increase Playwright timeout
npx playwright test --timeout=60000
```

---

## Test Statistics

| Type | Count | Time |
|------|-------|------|
| Unit Tests | 100+ | 5 min |
| Integration Tests | 20+ | 10 min |
| E2E Tests | 30+ | 15 min |
| Security Tests | 30+ | 3 min |
| Total Suite | 180+ | 33 min |

---

## CI/CD (GitHub Actions)

Tests run automatically on:
- Every push to main/develop
- Every pull request

**View Results:**
1. Go to GitHub → Actions tab
2. Click on the workflow run
3. View test results and coverage

**Download Artifacts:**
- Coverage reports
- E2E screenshots/videos
- Performance results

---

## Coverage Goals

| Component | Target | How to Check |
|-----------|--------|--------------|
| Services | 80%+ | `npm run test:cov` |
| Controllers | 60%+ | See HTML report |
| Overall | 75%+ | Badge in README |

---

## Security Testing

```bash
# Run security audit
npm run security:check

# Check dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# View security test details
npm run test security/security-audit.spec.ts
```

---

## Performance Baseline

**Target Metrics:**
- Search: < 200ms
- Bill Creation: < 500ms
- Reports: < 1s (small), < 5s (large)
- WebSocket: < 50ms

**Establish Baseline:**
```bash
npm run perf:load
npm run perf:profile:cpu
npm run perf:profile:mem
npm run perf:analyze
```

---

## Next Steps

1. ✅ Run `npm run test:all` to verify setup
2. ✅ Review coverage with `npm run test:cov`
3. ✅ Run E2E tests: `npx playwright test --headed`
4. ✅ Check security: `npm run security:check`
5. ✅ Push changes → CI/CD validates automatically

---

## Need Help?

See detailed guides:
- **Testing**: `TESTING_GUIDE.md`
- **Security**: `SECURITY_CHECKLIST.md`
- **Summary**: `TEST_SUITE_SUMMARY.md`

---

**Setup Complete!** 🎉

Your ERP system is now fully tested and production-ready.
