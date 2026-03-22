#!/usr/bin/env bash
# Capture real in-app screenshots into fastlane/screenshots/en-US/ for deliver/upload_to_app_store.
# Uses Maestro smoke flow + --test-output-dir (UI tests not required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="$ROOT/fastlane/screenshots/en-US"
mkdir -p "$OUT"
# Clean previous PNGs and Maestro run folders (keep non-PNG metadata if any)
find "$OUT" -maxdepth 1 -name '*.png' -delete 2>/dev/null || true
rm -rf "$OUT/screenshots" "$OUT"/20* 2>/dev/null || true

: "${REVIEW_EMAIL:=review@orbital.health}"
: "${REVIEW_PASSWORD:=Review2026!}"

export REVIEW_EMAIL REVIEW_PASSWORD

MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"
if [[ ! -x "$MAESTRO" ]]; then
  echo "Maestro not found at $MAESTRO" >&2
  exit 1
fi

"$MAESTRO" test "$ROOT/maestro/tests/smoke_test.yaml" \
  --test-output-dir "$OUT"

# Maestro nests screenshots under en-US/screenshots/*.png — flatten to en-US/
if [[ -d "$OUT/screenshots" ]]; then
  shopt -s nullglob
  for f in "$OUT/screenshots"/*.png; do
    base="$(basename "$f")"
    mv -f "$f" "$OUT/$base"
  done
  rmdir "$OUT/screenshots" 2>/dev/null || true
  shopt -u nullglob
fi

# Remove Maestro debug timestamp folders inside en-US
find "$OUT" -mindepth 1 -maxdepth 1 -type d -name '20*' -exec rm -rf {} + 2>/dev/null || true

count="$(find "$OUT" -maxdepth 1 -name '*.png' | wc -l | tr -d ' ')"
if [[ "$count" -lt 1 ]]; then
  echo "No PNG screenshots found under $OUT" >&2
  exit 1
fi

echo "OK: $count screenshot(s) in $OUT"
ls -la "$OUT"/*.png
