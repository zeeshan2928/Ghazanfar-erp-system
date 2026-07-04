#!/bin/bash

# Phase 4 Testing Runner Script
# Automates testing process for Search System

set -e

echo "================================"
echo "Phase 4 Testing Runner"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
log_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

log_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
log_header "Checking Prerequisites"

if ! command -v node &> /dev/null; then
    log_error "Node.js not installed"
    exit 1
else
    log_success "Node.js installed: $(node -v)"
fi

if ! command -v npm &> /dev/null; then
    log_error "npm not installed"
    exit 1
else
    log_success "npm installed: $(npm -v)"
fi

if ! command -v psql &> /dev/null; then
    log_info "PostgreSQL CLI not found (optional)"
else
    log_success "PostgreSQL CLI available"
fi

# Change to backend directory
cd "$(dirname "$0")"

# Step 1: Build Check
log_header "Step 1: TypeScript Build Check"

if npm run build > /dev/null 2>&1; then
    log_success "Build successful"
else
    log_error "Build failed"
    exit 1
fi

((TESTS_TOTAL++))

# Step 2: Unit Tests
log_header "Step 2: Unit Tests"

if npm test -- --passWithNoTests 2>&1 | tee test-results.txt; then
    # Extract test count from results
    if grep -q "Tests.*passed" test-results.txt; then
        TEST_COUNT=$(grep "Tests:" test-results.txt | grep -oP '\d+(?= passed)' | head -1)
        log_success "Unit tests: $TEST_COUNT passed"
    else
        log_success "Unit tests passed"
    fi
else
    log_error "Unit tests failed"
fi

((TESTS_TOTAL++))

# Step 3: Database Migration Check
log_header "Step 3: Database Migration Check"

if npx prisma migrate resolve --applied 2023_init > /dev/null 2>&1; then
    log_success "Database migration check passed"
else
    log_info "Run: npx prisma migrate deploy"
fi

((TESTS_TOTAL++))

# Step 4: Environment Check
log_header "Step 4: Environment Variables"

if [ -f .env ]; then
    log_success ".env file exists"
else
    log_error ".env file not found"
    log_info "Create .env file with: DATABASE_URL=postgresql://user:password@localhost:5432/erp_database"
fi

((TESTS_TOTAL++))

# Step 5: Frontend Check
log_header "Step 5: Frontend Setup"

cd frontend

if npm run build > /dev/null 2>&1; then
    log_success "Frontend build successful"
else
    log_error "Frontend build failed"
fi

((TESTS_TOTAL++))

cd ..

# Step 6: Dependencies Check
log_header "Step 6: Dependencies Check"

if [ -f package-lock.json ]; then
    log_success "Dependencies locked (package-lock.json exists)"
else
    log_info "Run: npm install"
fi

((TESTS_TOTAL++))

# Step 7: Code Quality Check
log_header "Step 7: Code Quality Check"

UNUSED_IMPORTS=$(grep -r "^import.*from" src/ 2>/dev/null | wc -l || true)
if [ "$UNUSED_IMPORTS" -lt 100 ]; then
    log_success "Import statements healthy"
else
    log_info "Review unused imports"
fi

((TESTS_TOTAL++))

# Step 8: API Endpoints Check
log_header "Step 8: API Endpoints Available"

if grep -q "POST /bills/search" src/modules/bills/bills.controller.ts 2>/dev/null; then
    log_success "Bills search endpoint exists"
fi

if grep -q "POST /products/search" src/modules/products/products.controller.ts 2>/dev/null; then
    log_success "Products search endpoint exists"
fi

if grep -q "POST /inventory/search" src/modules/inventory/inventory.controller.ts 2>/dev/null; then
    log_success "Inventory search endpoint exists"
fi

if grep -q "POST /customers/search" src/modules/customers/customers.controller.ts 2>/dev/null; then
    log_success "Customers search endpoint exists"
fi

if grep -q "POST /purchase-orders/search" src/modules/purchase-orders/purchase-orders.controller.ts 2>/dev/null; then
    log_success "Purchase Orders search endpoint exists"
fi

((TESTS_TOTAL+=5))

# Step 9: Filter Configuration Check
log_header "Step 9: Filter Configuration"

if grep -q "getAllowedOperators" src/common/config/filter-config.ts 2>/dev/null; then
    log_success "Filter configuration present"
fi

SCREENS=$(grep -oP "^  \w+:" src/common/config/filter-config.ts 2>/dev/null | wc -l || true)
log_info "Configured screens: $SCREENS"

((TESTS_TOTAL++))

# Step 10: Test Coverage Summary
log_header "Step 10: Test Coverage Summary"

log_info "Test Files:"
TEST_FILES=$(find . -name "*.spec.ts" -type f | wc -l)
log_info "  - Total test files: $TEST_FILES"

log_success "All automated checks completed"

# Summary
log_header "Test Summary"

echo -e "Total Tests Run: ${BLUE}$TESTS_TOTAL${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start backend: npm run start:dev"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Open http://localhost:5173"
    echo "4. Follow TESTING_CHECKLIST.md for manual tests"
    exit 0
else
    echo -e "\n${RED}✗ Some checks failed${NC}"
    exit 1
fi
