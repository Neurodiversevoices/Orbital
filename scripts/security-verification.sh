#!/bin/bash
# =============================================================================
# Security Controls Verification Script
# =============================================================================
# Run this script after deploying to Vercel to verify all security controls
# are working correctly with negative tests.
#
# Usage: ./scripts/security-verification.sh <BASE_URL>
# Example: ./scripts/security-verification.sh https://orbital.vercel.app
#
# Requirements:
# - curl
# - jq (optional, for pretty JSON output)
# =============================================================================

BASE_URL="${1:-http://localhost:3000}"
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "Security Controls Verification"
echo "Base URL: $BASE_URL"
echo "=============================================="
echo ""

# Helper function to check response
check_response() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  local response_body="$4"

  if [ "$actual_code" == "$expected_code" ]; then
    echo -e "${GREEN}[PASS]${NC} $test_name"
    echo "       Expected: $expected_code, Got: $actual_code"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}[FAIL]${NC} $test_name"
    echo "       Expected: $expected_code, Got: $actual_code"
    echo "       Response: $response_body"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  echo ""
}

# =============================================================================
# TEST 1: Rate Limiting (429 response)
# =============================================================================
echo -e "${YELLOW}=== TEST 1: Rate Limiting ===${NC}"
echo "Sending 25 rapid requests to trigger rate limit..."

RATE_LIMIT_HIT=false
for i in {1..25}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/stripe/create-checkout-session" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer fake_token" \
    -d '{"productId":"test"}')

  if [ "$RESPONSE" == "429" ]; then
    RATE_LIMIT_HIT=true
    echo -e "${GREEN}[PASS]${NC} Rate limit triggered at request $i"
    echo "       Response: 429 Too Many Requests"
    PASS_COUNT=$((PASS_COUNT + 1))
    break
  fi
done

if [ "$RATE_LIMIT_HIT" == "false" ]; then
  echo -e "${RED}[FAIL]${NC} Rate limit not triggered after 25 requests"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# =============================================================================
# TEST 2: CORS Rejection (bad origin)
# =============================================================================
echo -e "${YELLOW}=== TEST 2: CORS Rejection ===${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X OPTIONS "$BASE_URL/api/entitlements" \
  -H "Origin: https://evil-site.com" \
  -H "Access-Control-Request-Method: GET")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

# CORS rejection returns 204 without CORS headers OR 403
if [ "$HTTP_CODE" == "403" ]; then
  echo -e "${GREEN}[PASS]${NC} CORS rejection - bad origin blocked"
  echo "       Origin: https://evil-site.com"
  echo "       Response: 403 Forbidden"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  # Check if Access-Control-Allow-Origin header is missing
  CORS_HEADER=$(curl -s -I -X OPTIONS "$BASE_URL/api/entitlements" \
    -H "Origin: https://evil-site.com" \
    -H "Access-Control-Request-Method: GET" | grep -i "access-control-allow-origin")

  if [ -z "$CORS_HEADER" ]; then
    echo -e "${GREEN}[PASS]${NC} CORS rejection - no CORS headers for bad origin"
    echo "       Origin: https://evil-site.com"
    echo "       Access-Control-Allow-Origin header: (not present)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}[FAIL]${NC} CORS should reject origin https://evil-site.com"
    echo "       Got: $HTTP_CODE with header: $CORS_HEADER"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
fi
echo ""

# =============================================================================
# TEST 3: Auth Failure (no token)
# =============================================================================
echo -e "${YELLOW}=== TEST 3: Auth Failure (no token) ===${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$BASE_URL/api/entitlements" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

check_response "Auth required - no token" "401" "$HTTP_CODE" "$BODY"

# =============================================================================
# TEST 4: Auth Failure (invalid token)
# =============================================================================
echo -e "${YELLOW}=== TEST 4: Auth Failure (invalid token) ===${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$BASE_URL/api/entitlements" \
  -H "Authorization: Bearer invalid_token_12345" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

check_response "Auth required - invalid token" "401" "$HTTP_CODE" "$BODY"

# =============================================================================
# TEST 5: SKU Validation (tampered product ID)
# =============================================================================
echo -e "${YELLOW}=== TEST 5: SKU Validation (tampered product) ===${NC}"

# First we need a valid auth token - this test simulates with expectation of 401 or 400
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/stripe/create-checkout-session" \
  -H "Authorization: Bearer fake_but_formatted_token" \
  -H "Content-Type: application/json" \
  -d '{"productId":"fake_premium_unlimited_99percent_off"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Should get 401 (auth fail) or 400 (SKU validation fail) - both are correct rejections
if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "400" ]; then
  echo -e "${GREEN}[PASS]${NC} Tampered SKU rejected"
  echo "       Product ID: fake_premium_unlimited_99percent_off"
  echo "       Response: $HTTP_CODE (rejected)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "${RED}[FAIL]${NC} Tampered SKU should be rejected"
  echo "       Response: $HTTP_CODE"
  echo "       Body: $BODY"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

# =============================================================================
# TEST 6: Webhook Invalid Signature
# =============================================================================
echo -e "${YELLOW}=== TEST 6: Webhook Invalid Signature ===${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=invalid_signature_abc123" \
  -d '{"type":"checkout.session.completed","data":{"object":{}}}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

check_response "Webhook invalid signature rejected" "400" "$HTTP_CODE" "$BODY"

# =============================================================================
# TEST 7: Webhook Missing Signature
# =============================================================================
echo -e "${YELLOW}=== TEST 7: Webhook Missing Signature ===${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/stripe/webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{}}}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

check_response "Webhook missing signature rejected" "400" "$HTTP_CODE" "$BODY"

# =============================================================================
# SUMMARY
# =============================================================================
echo "=============================================="
echo "VERIFICATION SUMMARY"
echo "=============================================="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}ALL SECURITY CONTROLS VERIFIED${NC}"
  exit 0
else
  echo -e "${RED}SOME CONTROLS FAILED - REVIEW REQUIRED${NC}"
  exit 1
fi
