#!/bin/bash
# OCR assertion runner for v4.1 behavioral proof.
# Captures a screenshot from the booted simulator and runs macOS Vision OCR,
# then asserts that expected text patterns are present.
#
# Usage: bash scripts/ocr_assert.sh [screenshot-dir]
#
# Exit 0 = all assertions passed, 1 = one or more failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCREENSHOT_DIR="${1:-/tmp/orbital-v4-1-ocr}"
mkdir -p "$SCREENSHOT_DIR"

UDID=$(xcrun simctl list devices booted | grep -v "^--" | grep -o '[A-F0-9-]\{36\}' | head -1)
if [[ -z "$UDID" ]]; then
  echo "ERROR: No booted simulator found" >&2
  exit 1
fi

echo "Simulator UDID: $UDID"

# Capture current screen
SCREENSHOT="$SCREENSHOT_DIR/today_screen_ocr.png"
xcrun simctl io "$UDID" screenshot "$SCREENSHOT"
echo "Screenshot captured: $SCREENSHOT"

# Run OCR
OCR_OUT="$SCREENSHOT_DIR/ocr_text.txt"
swift "$SCRIPT_DIR/vision_ocr.swift" "$SCREENSHOT" > "$OCR_OUT" 2>/dev/null || true
echo "OCR output:"
cat "$OCR_OUT"
echo "---"

# Assertion helper
FAILED=0
assert_contains() {
  local pattern="$1"
  local label="$2"
  if grep -qiE "$pattern" "$OCR_OUT"; then
    echo "  PASS  $label"
  else
    echo "  FAIL  $label (pattern: $pattern)"
    FAILED=$((FAILED + 1))
  fi
}

assert_absent() {
  local pattern="$1"
  local label="$2"
  if grep -qiE "$pattern" "$OCR_OUT"; then
    echo "  FAIL  $label (should be absent, pattern: $pattern)"
    FAILED=$((FAILED + 1))
  else
    echo "  PASS  $label (absent as expected)"
  fi
}

echo ""
echo "=== v4.1 OCR Assertions ==="

# Pattern 1: Gauge — numeric score in 0-100 range
assert_contains "^[0-9]{1,3}$" "P1 gauge-value: numeric score renders"

# Pattern 1b: State label
assert_contains "RESOURCED|ELEVATED|DEPLETED" "P1 gauge-state: state label renders"

# Pattern 2: TypicalRangeChip
assert_contains "typical|baseline|building" "P2 typical-range-chip: range/baseline text renders"

# Pattern 3: MetricCard labels
assert_contains "SLEEP" "P3 metric-card-sleep: SLEEP label renders"
assert_contains "HRV" "P3 metric-card-hrv: HRV label renders"
assert_contains "RHR" "P3 metric-card-rhr: RHR label renders"

# Pattern 3b: Rule 2.11 — calibrating fallback (not em-dash, not empty)
assert_contains "calibrating" "P3 Rule2.11: calibrating text renders (not em-dash)"

# Pattern 4: SignalCard
assert_contains "One thing today" "P4 signal-card: insight title renders"

# Pattern 5: No orphan instruction
assert_absent "Adjust to reflect|Move the slider" "P5 no orphan instruction text"

# Pattern 6: No orb image artifact (orb-specific UI labels)
assert_absent "SOUL|THERM|shader" "P6 no orb-specific UI artifacts"

# Pattern 7: Date header
assert_contains "Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday" \
  "P7 date header: day name renders"

echo ""
if [[ $FAILED -eq 0 ]]; then
  echo "ALL ASSERTIONS PASSED (0 failures)"
  exit 0
else
  echo "$FAILED ASSERTION(S) FAILED"
  exit 1
fi
