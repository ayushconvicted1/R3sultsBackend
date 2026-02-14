#!/bin/bash
# R3sults API — Comprehensive Endpoint Test
# Tests all modules against the live database

BASE="http://localhost:3000/api"
PASS=0
FAIL=0
ERRORS=""

test_endpoint() {
  local METHOD=$1
  local URL=$2
  local DATA=$3
  local LABEL=$4
  local EXPECTED_STATUS=${5:-200}
  local EXTRA_HEADERS=$6

  if [ "$METHOD" = "GET" ] || [ "$METHOD" = "DELETE" ]; then
    RESP=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$URL" \
      -H "Content-Type: application/json" \
      $EXTRA_HEADERS 2>&1)
  else
    RESP=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$URL" \
      -H "Content-Type: application/json" \
      $EXTRA_HEADERS \
      -d "$DATA" 2>&1)
  fi

  HTTP_CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  SUCCESS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
  MSG=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','')[:80])" 2>/dev/null)

  if [ "$HTTP_CODE" = "$EXPECTED_STATUS" ]; then
    echo "✅ [$METHOD] $LABEL — HTTP $HTTP_CODE — $MSG"
    PASS=$((PASS+1))
  else
    echo "❌ [$METHOD] $LABEL — HTTP $HTTP_CODE (expected $EXPECTED_STATUS) — $MSG"
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n  ❌ $LABEL: HTTP $HTTP_CODE"
  fi
}

echo "============================================"
echo " R3sults API — Endpoint Tests"
echo " $(date)"
echo "============================================"
echo ""

# ═══════════════════════════════════════════════
# 1. AUTH MODULE
# ═══════════════════════════════════════════════
echo "──── AUTH MODULE ────"

# Register (with unique data)
RAND=$((RANDOM % 900000 + 100000))
test_endpoint POST "$BASE/auth/register" \
  "{\"phoneNumber\":\"+91999$RAND\",\"password\":\"test123456\",\"fullName\":\"Test User $RAND\",\"email\":\"test${RAND}@r3sults.com\",\"username\":\"testuser$RAND\"}" \
  "Register" "201"

# Login
test_endpoint POST "$BASE/auth/login" \
  '{"phoneNumber":"+919876543210","password":"password123"}' \
  "Login (may fail if user doesn't exist)" "200"

# Let's try to login with a known user — first get one from admin
# For now, grab token via register flow
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"+91888$RAND\",\"password\":\"test123456\",\"fullName\":\"Token Test\",\"email\":\"token${RAND}@r3sults.com\",\"username\":\"tokenuser$RAND\"}" 2>&1)

# Try login with this user
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"+91888$RAND\",\"password\":\"test123456\"}" 2>&1)
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)
REFRESH=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('refreshToken',''))" 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('user',{}).get('id',''))" 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  echo "   🔑 Got access token for testing authenticated endpoints"
  AUTH="-H \"Authorization: Bearer $TOKEN\""
else
  echo "   ⚠️  No token — trying to find existing user in DB..."
  TOKEN=""
fi

# Send OTP
test_endpoint POST "$BASE/auth/phone/send-otp" \
  '{"phoneNumber":"+919876543210"}' \
  "Send OTP" "200"

# Verify OTP (will fail without real OTP, but should be 400 not 500)
test_endpoint POST "$BASE/auth/phone/verify-otp" \
  '{"phoneNumber":"+919876543210","otp":"000000"}' \
  "Verify OTP (invalid OTP)" "400"

# Forgot password
test_endpoint POST "$BASE/auth/forgot-password" \
  '{"phoneNumber":"+919876543210"}' \
  "Forgot Password" "200"

# Reset password (will fail without valid OTP)
test_endpoint POST "$BASE/auth/reset-password" \
  '{"phoneNumber":"+919876543210","otp":"000000","newPassword":"newpass123"}' \
  "Reset Password (invalid OTP)" "400"

# Refresh token
if [ -n "$REFRESH" ] && [ "$REFRESH" != "" ]; then
  test_endpoint POST "$BASE/auth/refresh-token" \
    "{\"refreshToken\":\"$REFRESH\"}" \
    "Refresh Token" "200"
fi

# Google Sign In (will fail with invalid token, should be auth error not 500)
test_endpoint POST "$BASE/auth/google" \
  '{"idToken":"fake_token"}' \
  "Google Sign In (invalid token)" "401"

# Apple Sign In (will fail with invalid token)
test_endpoint POST "$BASE/auth/apple" \
  '{"identityToken":"fake_token"}' \
  "Apple Sign In (invalid token)" "401"

# Auth: me
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  test_endpoint GET "$BASE/auth/me" "" "Get Current User" "200" "-H \"Authorization: Bearer $TOKEN\""
fi

# Update phone
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  test_endpoint POST "$BASE/auth/update-phone" \
    '{"phoneNumber":"+919999999999"}' \
    "Update Phone" "200" "-H \"Authorization: Bearer $TOKEN\""
fi

echo ""

# ═══════════════════════════════════════════════
# 2. USER MODULE
# ═══════════════════════════════════════════════
echo "──── USER MODULE ────"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  test_endpoint GET "$BASE/user/profile" "" "Get Profile" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/profile" \
    '{"fullName":"Updated Test User"}' \
    "Update Profile" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/address" \
    '{"address":"123 Test St","city":"Mumbai","state":"Maharashtra","country":"India","pincode":"400001"}' \
    "Update Address" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/emergency-contact" \
    '{"emergencyContactName":"Emergency Person","emergencyContactPhone":"+919876000000"}' \
    "Update Emergency Contact" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/medical-info" \
    '{"bloodGroup":"O+","medicalConditions":"None"}' \
    "Update Medical Info" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/change-password" \
    '{"currentPassword":"test123456","newPassword":"test123456"}' \
    "Change Password" "200" "-H \"Authorization: Bearer $TOKEN\""

  # Re-login after password change
  LOGIN_RESP2=$(curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"phoneNumber\":\"+91888$RAND\",\"password\":\"test123456\"}" 2>&1)
  TOKEN=$(echo "$LOGIN_RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

  test_endpoint PATCH "$BASE/user/email" \
    "{\"email\":\"updated${RAND}@r3sults.com\"}" \
    "Update Email" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint PATCH "$BASE/user/username" \
    "{\"username\":\"updateduser$RAND\"}" \
    "Update Username" "200" "-H \"Authorization: Bearer $TOKEN\""
else
  echo "   ⚠️  Skipping User module — no auth token"
fi

echo ""

# ═══════════════════════════════════════════════
# 3. GROUP/FAMILY MODULE
# ═══════════════════════════════════════════════
echo "──── GROUP/FAMILY MODULE ────"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  test_endpoint GET "$BASE/group/my-group" "" "Get My Group" "200" "-H \"Authorization: Bearer $TOKEN\""

  RAND2=$((RANDOM % 900000 + 100000))
  ADD_RESP=$(curl -s -X POST "$BASE/group/add-member" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"fullName\":\"Family Member $RAND2\",\"relation\":\"Brother\",\"phoneNumber\":\"+91777$RAND2\",\"email\":\"member${RAND2}@r3sults.com\"}" 2>&1)
  ADD_STATUS=$(echo "$ADD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
  MEMBER_ID=$(echo "$ADD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('member',{}).get('id',''))" 2>/dev/null)

  if [ "$ADD_STATUS" = "True" ]; then
    echo "✅ [POST] Add Member — success"
    PASS=$((PASS+1))
  else
    MSG=$(echo "$ADD_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','')[:80])" 2>/dev/null)
    echo "❌ [POST] Add Member — $MSG"
    FAIL=$((FAIL+1))
  fi

  test_endpoint GET "$BASE/group/members" "" "Get All Members" "200" "-H \"Authorization: Bearer $TOKEN\""

  if [ -n "$MEMBER_ID" ] && [ "$MEMBER_ID" != "" ]; then
    test_endpoint GET "$BASE/group/member/$MEMBER_ID" "" "Get Member Details" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint PATCH "$BASE/group/update-member/$MEMBER_ID" \
      '{"relation":"Cousin"}' \
      "Update Member Relation" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint PATCH "$BASE/group/member/$MEMBER_ID/profile" \
      '{"fullName":"Updated Family Member","bloodGroup":"A+"}' \
      "Update Member Profile" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint DELETE "$BASE/group/remove-member/$MEMBER_ID" "" \
      "Remove Member" "200" "-H \"Authorization: Bearer $TOKEN\""
  fi

  test_endpoint PATCH "$BASE/group/update-name" \
    '{"name":"Test Family Group"}' \
    "Update Group Name" "200" "-H \"Authorization: Bearer $TOKEN\""
else
  echo "   ⚠️  Skipping Group module — no auth token"
fi

echo ""

# ═══════════════════════════════════════════════
# 4. ADMIN MODULE
# ═══════════════════════════════════════════════
echo "──── ADMIN MODULE ────"

# Admin endpoints need ADMIN/SUPER_ADMIN role. Current user is MEMBER.
# Test that they properly reject with 403
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  test_endpoint GET "$BASE/admin/roles" "" \
    "Get All Roles (should 403 for MEMBER)" "403" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/admin/users" "" \
    "List Users (should 403 for MEMBER)" "403" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/admin/profile" "" \
    "Get Admin Profile (should 403 for MEMBER)" "403" "-H \"Authorization: Bearer $TOKEN\""

  # Test accessibility check (available to all authenticated users)
  test_endpoint POST "$BASE/admin/accessibility/check" \
    "{\"userId\":\"$USER_ID\",\"feature\":\"family_group\",\"action\":\"create\"}" \
    "Check Access (any auth user)" "200" "-H \"Authorization: Bearer $TOKEN\""
fi

echo ""

# ═══════════════════════════════════════════════
# 5. VOLUNTEER MODULE
# ═══════════════════════════════════════════════
echo "──── VOLUNTEER MODULE ────"

VRAND=$((RANDOM % 900000 + 100000))
test_endpoint POST "$BASE/volunteer/signup" \
  "{\"phoneNumber\":\"+91666$VRAND\",\"password\":\"vol123456\",\"fullName\":\"Test Volunteer $VRAND\",\"email\":\"vol${VRAND}@r3sults.com\",\"username\":\"vol$VRAND\",\"skills\":\"Teaching\",\"volunteerType\":\"Education\"}" \
  "Volunteer Signup" "201"

# Login will fail since volunteer is PENDING
test_endpoint POST "$BASE/volunteer/login" \
  "{\"phoneNumber\":\"+91666$VRAND\",\"password\":\"vol123456\"}" \
  "Volunteer Login (PENDING — should 403)" "403"

test_endpoint POST "$BASE/volunteer/send-otp" \
  "{\"phoneNumber\":\"+91666$VRAND\"}" \
  "Volunteer Send OTP" "200"

test_endpoint POST "$BASE/volunteer/forgot-password" \
  "{\"phoneNumber\":\"+91666$VRAND\"}" \
  "Volunteer Forgot Password" "200"

echo ""

# ═══════════════════════════════════════════════
# 6. VENDOR MODULE
# ═══════════════════════════════════════════════
echo "──── VENDOR MODULE ────"

VDRAND=$((RANDOM % 900000 + 100000))
test_endpoint POST "$BASE/vendor/signup" \
  "{\"email\":\"vendor${VDRAND}@r3sults.com\",\"password\":\"vendor123\",\"fullName\":\"Test Vendor $VDRAND\",\"businessName\":\"Test Biz\",\"phoneNumber\":\"+1202555$VDRAND\",\"businessType\":\"Retail\",\"businessCategory\":\"Electronics\",\"state\":\"California\",\"zipCode\":\"90210\"}" \
  "Vendor Signup" "201"

# Login will fail since vendor is PENDING
test_endpoint POST "$BASE/vendor/login" \
  "{\"email\":\"vendor${VDRAND}@r3sults.com\",\"password\":\"vendor123\"}" \
  "Vendor Login (PENDING — should 403)" "403"

test_endpoint POST "$BASE/vendor/send-otp" \
  "{\"email\":\"vendor${VDRAND}@r3sults.com\"}" \
  "Vendor Send OTP" "200"

test_endpoint POST "$BASE/vendor/forgot-password" \
  "{\"email\":\"vendor${VDRAND}@r3sults.com\"}" \
  "Vendor Forgot Password" "200"

echo ""

# ═══════════════════════════════════════════════
# 7. TRACKING MODULE
# ═══════════════════════════════════════════════
echo "──── TRACKING MODULE ────"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  # Enable tracking first
  test_endpoint PUT "$BASE/tracking/settings" \
    '{"locationTrackingEnabled":true,"locationSharingEnabled":true}' \
    "Update Tracking Settings" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint POST "$BASE/tracking/location" \
    '{"latitude":28.6139,"longitude":77.2090,"accuracy":10}' \
    "Update Location" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/tracking/location/current" "" \
    "Get Current Location" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/tracking/location/history" "" \
    "Get Location History" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/tracking/location/shared" "" \
    "Get Shared Users" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/tracking/location/visible" "" \
    "Get Visible Users" "200" "-H \"Authorization: Bearer $TOKEN\""

  test_endpoint GET "$BASE/tracking/location/nearby" "" \
    "Get Nearby Users" "200" "-H \"Authorization: Bearer $TOKEN\""
else
  echo "   ⚠️  Skipping Tracking module — no auth token"
fi

echo ""

# ═══════════════════════════════════════════════
# 8. GEOFENCE MODULE
# ═══════════════════════════════════════════════
echo "──── GEOFENCE MODULE ────"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  GF_RESP=$(curl -s -X POST "$BASE/geofence" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Test Geofence","centerLat":28.6139,"centerLng":77.2090,"radius":500}' 2>&1)
  GF_ID=$(echo "$GF_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('geofence',{}).get('id',''))" 2>/dev/null)
  GF_OK=$(echo "$GF_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)

  if [ "$GF_OK" = "True" ]; then
    echo "✅ [POST] Create Geofence — success"
    PASS=$((PASS+1))
  else
    MSG=$(echo "$GF_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','')[:80])" 2>/dev/null)
    echo "❌ [POST] Create Geofence — $MSG"
    FAIL=$((FAIL+1))
  fi

  test_endpoint GET "$BASE/geofence" "" "Get All Geofences" "200" "-H \"Authorization: Bearer $TOKEN\""

  if [ -n "$GF_ID" ] && [ "$GF_ID" != "" ]; then
    test_endpoint GET "$BASE/geofence/$GF_ID" "" "Get Geofence by ID" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint PUT "$BASE/geofence/$GF_ID" \
      '{"name":"Updated Geofence","radius":1000}' \
      "Update Geofence" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint GET "$BASE/geofence/$GF_ID/events" "" "Get Geofence Events" "200" "-H \"Authorization: Bearer $TOKEN\""

    test_endpoint DELETE "$BASE/geofence/$GF_ID" "" "Delete Geofence" "200" "-H \"Authorization: Bearer $TOKEN\""
  fi

  test_endpoint GET "$BASE/geofence/events" "" "Get All User Geofence Events" "200" "-H \"Authorization: Bearer $TOKEN\""
else
  echo "   ⚠️  Skipping Geofence module — no auth token"
fi

echo ""

# ═══════════════════════════════════════════════
# 9. MOBILE MODULE
# ═══════════════════════════════════════════════
echo "──── MOBILE MODULE ────"

test_endpoint GET "$BASE/mobile/alerts?lat=28.6139&lon=77.2090&limit=5" "" \
  "Get Alerts (public)" "200"

echo ""

# ═══════════════════════════════════════════════
# 10. 404 / EDGE CASES
# ═══════════════════════════════════════════════
echo "──── EDGE CASES ────"

test_endpoint GET "$BASE/nonexistent" "" "404 Route" "404"

test_endpoint GET "$BASE/auth/me" "" "Auth Me without token" "401"

echo ""

# ═══════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════
TOTAL=$((PASS+FAIL))
echo "============================================"
echo " TEST RESULTS: $PASS/$TOTAL passed, $FAIL failed"
echo "============================================"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failed tests:"
  echo -e "$ERRORS"
fi
echo ""

# Cleanup: deactivate test user
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  curl -s -X PATCH "$BASE/user/deactivate" \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  echo "🧹 Cleaned up: test user deactivated"
fi
