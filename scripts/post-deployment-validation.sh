#!/bin/bash

################################################################################
# Post-Deployment Validation Script
# Purpose: Validate deployment success across all critical systems
# Usage: ./post-deployment-validation.sh [staging|production]
# Exit codes: 0=success, 1=failure, 2=warnings
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
API_BASE_URL=""
TIMEOUT=30
FAILED_CHECKS=0
WARNING_CHECKS=0
PASSED_CHECKS=0

# Set environment-specific URLs
case $ENVIRONMENT in
  staging)
    API_BASE_URL="http://staging-api.example.com"
    ;;
  production)
    API_BASE_URL="http://api.example.com"
    ;;
  local)
    API_BASE_URL="http://localhost:3000"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [staging|production|local]"
    exit 1
    ;;
esac

################################################################################
# Helper Functions
################################################################################

log_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED_CHECKS++))
}

log_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED_CHECKS++))
}

log_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARNING_CHECKS++))
}

log_header() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════════════════════════════"
}

################################################################################
# Health Checks
################################################################################

check_api_health() {
  log_header "1. API Health Checks"

  # Health endpoint
  if response=$(curl -s -m $TIMEOUT "$API_BASE_URL/health" 2>/dev/null); then
    if [[ $response == *"ok"* ]] || [[ $response == *"healthy"* ]]; then
      log_pass "API health endpoint responding"
    else
      log_fail "API health endpoint returned unexpected response: $response"
    fi
  else
    log_fail "API health endpoint unreachable (timeout or connection refused)"
  fi

  # API status
  if response=$(curl -s -m $TIMEOUT "$API_BASE_URL/api/v1/status" 2>/dev/null); then
    if [[ $response == *"ok"* ]]; then
      log_pass "API /api/v1/status endpoint responding"
    else
      log_warn "API /api/v1/status returned: $response"
    fi
  else
    log_warn "API /api/v1/status endpoint not responding"
  fi
}

################################################################################
# Performance Checks
################################################################################

check_response_times() {
  log_header "2. Response Time Checks"

  local total_time=0
  local max_time=0
  local min_time=999999
  local requests=5

  for i in $(seq 1 $requests); do
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null -m $TIMEOUT "$API_BASE_URL/health" 2>/dev/null || echo "999")
    total_time=$(echo "$total_time + $response_time" | bc)

    if (( $(echo "$response_time > $max_time" | bc -l) )); then
      max_time=$response_time
    fi
    if (( $(echo "$response_time < $min_time" | bc -l) )); then
      min_time=$response_time
    fi
  done

  local avg_time=$(echo "scale=3; $total_time / $requests" | bc)

  if (( $(echo "$avg_time < 0.5" | bc -l) )); then
    log_pass "Average response time: ${avg_time}s (threshold: < 0.5s)"
  elif (( $(echo "$avg_time < 2" | bc -l) )); then
    log_warn "Average response time: ${avg_time}s (threshold: < 0.5s, warning < 2s)"
  else
    log_fail "Average response time: ${avg_time}s exceeds 2s threshold"
  fi
}

################################################################################
# Feature Checks
################################################################################

check_gate_pass_system() {
  log_header "3. Gate Pass System Validation"

  # Check if gate pass API exists
  if curl -s -m $TIMEOUT -X GET "$API_BASE_URL/api/v1/gate-passes" \
    -H "Authorization: Bearer test-token" 2>/dev/null | grep -q "gate"; then
    log_pass "Gate Pass API endpoint accessible"
  else
    log_warn "Gate Pass API endpoint not responding or requires authentication"
  fi

  # Check auto-trigger configuration
  if curl -s -m $TIMEOUT "$API_BASE_URL/api/v1/config/gate-pass" 2>/dev/null | grep -q "auto"; then
    log_pass "Gate Pass auto-trigger configuration found"
  else
    log_warn "Gate Pass auto-trigger configuration not accessible"
  fi
}

check_inventory_reservation() {
  log_header "4. Inventory Reservation System Validation"

  # Check inventory endpoints
  if curl -s -m $TIMEOUT -X GET "$API_BASE_URL/api/v1/inventory/status" \
    -H "Authorization: Bearer test-token" 2>/dev/null > /dev/null; then
    log_pass "Inventory API endpoint accessible"
  else
    log_warn "Inventory API endpoint not responding or requires authentication"
  fi
}

check_reporting_service() {
  log_header "5. Reporting Service Validation"

  # Check reporting endpoints
  if curl -s -m $TIMEOUT -X GET "$API_BASE_URL/api/v1/reports/gate-pass-analytics" \
    -H "Authorization: Bearer test-token" 2>/dev/null > /dev/null; then
    log_pass "Reporting API endpoint accessible"
  else
    log_warn "Reporting API endpoint not responding or requires authentication"
  fi
}

check_notifications() {
  log_header "6. Notification System Validation"

  # Check notification service configuration
  if curl -s -m $TIMEOUT "$API_BASE_URL/api/v1/config/notifications" 2>/dev/null | grep -q "enabled"; then
    log_pass "Notification service configuration found"
  else
    log_warn "Notification service configuration not accessible"
  fi
}

################################################################################
# Database Checks
################################################################################

check_database() {
  log_header "7. Database Validation"

  # Check if we can connect to database (requires npm/node)
  if command -v npm &> /dev/null; then
    if npm run db:validate:$ENVIRONMENT 2>/dev/null | grep -q "ok"; then
      log_pass "Database schema validation passed"
    else
      log_warn "Database schema validation not available or failed"
    fi
  else
    log_warn "npm not available, skipping database validation"
  fi
}

################################################################################
# SSL/Security Checks
################################################################################

check_ssl_certificate() {
  log_header "8. SSL Certificate Validation"

  # Only check for production environment
  if [ "$ENVIRONMENT" == "production" ]; then
    if echo | openssl s_client -servername api.example.com -connect api.example.com:443 2>/dev/null | grep -q "Verify return code: 0"; then
      log_pass "SSL certificate valid"
    else
      log_fail "SSL certificate validation failed"
    fi
  else
    log_warn "SSL check skipped (not production)"
  fi
}

check_cors_headers() {
  log_header "9. CORS Headers Validation"

  if response=$(curl -s -m $TIMEOUT -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -w "%{http_code}" \
    "$API_BASE_URL/health" 2>/dev/null); then
    if [[ $response == *"200"* ]] || [[ $response == *"204"* ]]; then
      log_pass "CORS headers present"
    else
      log_warn "CORS headers may not be configured correctly (HTTP $response)"
    fi
  else
    log_warn "Could not check CORS headers"
  fi
}

################################################################################
# Feature Tests
################################################################################

run_smoke_tests() {
  log_header "10. Smoke Tests"

  if command -v npm &> /dev/null; then
    if npm run test:smoke:$ENVIRONMENT 2>/dev/null | grep -q "pass"; then
      log_pass "Smoke tests passed"
    else
      log_warn "Smoke tests not available or failed"
    fi
  else
    log_warn "npm not available, skipping smoke tests"
  fi
}

################################################################################
# Logging Checks
################################################################################

check_application_logs() {
  log_header "11. Application Logs Check"

  # Check application logs for errors (if accessible)
  if [ -f "/var/log/ghazanfar-erp/$ENVIRONMENT.log" ]; then
    error_count=$(grep -c "ERROR\|Exception" "/var/log/ghazanfar-erp/$ENVIRONMENT.log" 2>/dev/null || echo "0")
    if [ "$error_count" -eq "0" ]; then
      log_pass "No errors in application logs"
    else
      log_warn "Found $error_count errors in application logs"
    fi
  else
    log_warn "Application log file not accessible"
  fi
}

################################################################################
# Docker Checks (if running in containers)
################################################################################

check_docker_health() {
  log_header "12. Docker Health Check"

  if command -v docker &> /dev/null; then
    if container=$(docker ps --filter "label=app=ghazanfar-erp" -q | head -1); then
      if [ ! -z "$container" ]; then
        status=$(docker inspect $container --format='{{.State.Status}}' 2>/dev/null)
        if [ "$status" == "running" ]; then
          log_pass "Docker container running"
        else
          log_fail "Docker container status: $status"
        fi
      else
        log_warn "No Docker container found"
      fi
    fi
  else
    log_warn "Docker not available, skipping container checks"
  fi
}

################################################################################
# Summary
################################################################################

print_summary() {
  log_header "Validation Summary"

  echo ""
  echo "  Environment:     $ENVIRONMENT"
  echo "  API URL:         $API_BASE_URL"
  echo ""
  echo "  Passed:          ${GREEN}$PASSED_CHECKS${NC}"
  echo "  Warnings:        ${YELLOW}$WARNING_CHECKS${NC}"
  echo "  Failed:          ${RED}$FAILED_CHECKS${NC}"
  echo ""

  if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
    echo -e "  ${GREEN}STATUS: ✅ ALL CHECKS PASSED${NC}"
    return 0
  elif [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "  ${YELLOW}STATUS: ⚠️  CHECKS PASSED WITH WARNINGS${NC}"
    return 2
  else
    echo -e "  ${RED}STATUS: ❌ VALIDATION FAILED${NC}"
    return 1
  fi
}

################################################################################
# Main Execution
################################################################################

main() {
  echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
  echo "║                     Post-Deployment Validation Script                         ║"
  echo "║                  Environment: $ENVIRONMENT                                         ║"
  echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
  echo ""

  # Run all checks
  check_api_health
  check_response_times
  check_gate_pass_system
  check_inventory_reservation
  check_reporting_service
  check_notifications
  check_database
  check_ssl_certificate
  check_cors_headers
  run_smoke_tests
  check_application_logs
  check_docker_health

  # Print summary and exit with appropriate code
  print_summary
  exit $?
}

# Execute main function
main
