#!/usr/bin/env bash
# validate-icon.sh — Pre-flight check for iOS App Store icon
# Usage: bash scripts/validate-icon.sh [path/to/icon.png]
set -euo pipefail

ICON="${1:-assets/icon.png}"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "Validating iOS icon: $ICON"
echo "────────────────────────────────"

# 1. File exists
if [ ! -f "$ICON" ]; then
  fail "File not found: $ICON"
  echo ""
  echo "RESULT: $FAIL check(s) failed. Fix before building."
  exit 1
fi
pass "File exists"

# 2. Is a PNG
FILE_TYPE=$(file -b "$ICON")
if echo "$FILE_TYPE" | grep -q "PNG image data"; then
  pass "Valid PNG format"
else
  fail "Not a PNG file: $FILE_TYPE"
fi

# 3. Dimensions (must be 1024x1024)
DIMENSIONS=$(echo "$FILE_TYPE" | grep -oE '[0-9]+ x [0-9]+' | head -1)
if [ "$DIMENSIONS" = "1024 x 1024" ]; then
  pass "Dimensions: 1024x1024"
else
  fail "Dimensions: $DIMENSIONS (must be 1024x1024)"
fi

# 4. Color type (must be RGB, not RGBA)
if echo "$FILE_TYPE" | grep -q "8-bit/color RGB"; then
  pass "Color mode: RGB (no alpha)"
elif echo "$FILE_TYPE" | grep -q "RGBA"; then
  fail "Color mode: RGBA — Apple rejects alpha channel on App Store icon"
else
  fail "Color mode: unexpected — $FILE_TYPE"
fi

# 5. sRGB or iCCP chunk (using Python to parse PNG chunks)
PROFILE_CHECK=$(python3 -c "
import struct
with open('$ICON', 'rb') as f:
    f.read(8)  # skip signature
    while True:
        h = f.read(8)
        if len(h) < 8: break
        length, ct = struct.unpack('>I4s', h)
        ct = ct.decode('ascii')
        if ct == 'sRGB': print('sRGB'); break
        if ct == 'iCCP': print('iCCP'); break
        f.read(length + 4)
    else:
        print('NONE')
" 2>/dev/null || echo "ERROR")

case "$PROFILE_CHECK" in
  sRGB) pass "Color profile: sRGB chunk embedded" ;;
  iCCP) pass "Color profile: iCCP chunk embedded" ;;
  NONE) fail "No sRGB or iCCP color profile — Apple may show blank icon" ;;
  *)    fail "Could not parse PNG chunks (python3 required)" ;;
esac

# 6. Verify app.json references
if [ -f "app.json" ]; then
  ROOT_ICON=$(python3 -c "import json; d=json.load(open('app.json')); print(d.get('expo',{}).get('icon',''))" 2>/dev/null)
  IOS_ICON=$(python3 -c "import json; d=json.load(open('app.json')); print(d.get('expo',{}).get('ios',{}).get('icon',''))" 2>/dev/null)

  if [ "$ROOT_ICON" = "./$ICON" ] || [ "$ROOT_ICON" = "$ICON" ]; then
    pass "app.json expo.icon → $ROOT_ICON"
  else
    fail "app.json expo.icon = '$ROOT_ICON' (expected './$ICON')"
  fi

  if [ "$IOS_ICON" = "./$ICON" ] || [ "$IOS_ICON" = "$ICON" ]; then
    pass "app.json expo.ios.icon → $IOS_ICON"
  else
    fail "app.json expo.ios.icon = '$IOS_ICON' (expected './$ICON')"
  fi
else
  fail "app.json not found in current directory"
fi

echo "────────────────────────────────"
echo "Passed: $PASS  Failed: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: FAIL — fix the above before building."
  exit 1
else
  echo "RESULT: ALL CHECKS PASSED — icon is ready for App Store."
  exit 0
fi
