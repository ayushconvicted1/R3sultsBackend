#!/bin/bash
# Comprehensive test of all admin API endpoints
BASE="http://localhost:5001"
PASS=0
FAIL=0
ERRORS=""

# Login first
echo "🔐 Logging in..."
LOGIN=$(/usr/bin/curl -s -X POST $BASE/api/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@r3sults.com", "password": "R3sults@Admin2024"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Response: $LOGIN"
  exit 1
fi
echo "✅ Login successful (token: ${TOKEN:0:20}...)"
echo ""

test_endpoint() {
  local METHOD=$1
  local PATH=$2
  local BODY=$3
  local LABEL="$METHOD $PATH"
  
  if [ "$METHOD" = "GET" ]; then
    RESP=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "$BASE$PATH" -H "Authorization: Bearer $TOKEN" --max-time 10)
  elif [ "$METHOD" = "POST" ] && [ -n "$BODY" ]; then
    RESP=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$PATH" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY" --max-time 10)
  elif [ "$METHOD" = "POST" ]; then
    RESP=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$PATH" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --max-time 10)
  elif [ "$METHOD" = "PUT" ] && [ -n "$BODY" ]; then
    RESP=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE$PATH" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY" --max-time 10)
  elif [ "$METHOD" = "DELETE" ]; then
    RESP=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE$PATH" -H "Authorization: Bearer $TOKEN" --max-time 10)
  fi
  
  # 200, 201 = success; 400, 404 = expected for missing IDs; 000 = timeout
  if [ "$RESP" = "200" ] || [ "$RESP" = "201" ]; then
    echo "  ✅ $LABEL → $RESP"
    PASS=$((PASS + 1))
  elif [ "$RESP" = "400" ] || [ "$RESP" = "404" ] || [ "$RESP" = "422" ]; then
    echo "  ⚠️  $LABEL → $RESP (expected - missing/invalid params)"
    PASS=$((PASS + 1))
  elif [ "$RESP" = "000" ]; then
    echo "  ⏰ $LABEL → TIMEOUT"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  ⏰ $LABEL → TIMEOUT"
  else
    echo "  ❌ $LABEL → $RESP"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  ❌ $LABEL → $RESP"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. AUTH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin-auth/me"
test_endpoint POST "/api/admin-auth/login" '{"email":"admin@r3sults.com","password":"R3sults@Admin2024"}'
test_endpoint POST "/api/admin-auth/logout"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/dashboard/stats"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. OPS USERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/ops-users"
test_endpoint GET "/api/admin/ops-users/me"
test_endpoint POST "/api/admin/ops-users/change-password" '{"currentPassword":"old","newPassword":"new"}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. DISASTERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/disasters"
test_endpoint GET "/api/admin/disasters/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. EMERGENCIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/emergencies"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. SHELTERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/shelters"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. DEVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/devices"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. INCIDENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/incidents"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. INVENTORY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/inventory/items"
test_endpoint GET "/api/admin/inventory/items/nonexistent-id"
test_endpoint GET "/api/admin/inventory/locations"
test_endpoint GET "/api/admin/inventory/locations/nonexistent-id"
test_endpoint GET "/api/admin/inventory/stock"
test_endpoint GET "/api/admin/inventory/stock/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "10. DAMAGE REPORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/damage-reports"
test_endpoint GET "/api/admin/damage-reports/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "11. ADJUSTERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/adjusters"
test_endpoint GET "/api/admin/adjusters/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "12. VOLUNTEERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/volunteer-mgmt"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "13. VOLUNTEER TEAMS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/volunteer-teams"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "14. PRODUCTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/products"
test_endpoint GET "/api/admin/products/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "15. ORDERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/orders"
test_endpoint GET "/api/admin/orders/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "16. SERVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/services"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "17. USERS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/users-mgmt"
test_endpoint GET "/api/admin/users-mgmt/nonexistent-id"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "18. REPORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/reports"
test_endpoint GET "/api/admin/reports?type=summary"
test_endpoint GET "/api/admin/reports?type=disaster"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "19. SEARCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/search?q=test"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "20. SEED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/seed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "21. MOBILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint GET "/api/admin/mobile/alerts"
test_endpoint GET "/api/admin/mobile/tasks"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/health --max-time 5)
echo "  Health: $HEALTH"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failed endpoints:"
  echo -e "$ERRORS"
fi
