#!/bin/bash
# ios-restore-appicon.sh
# Replaces expo prebuild's generated AppIcon.appiconset with the modern
# single-icon format (universal idiom, 1024x1024). Xcode 15+ derives all
# sizes automatically from a single 1024x1024 PNG.
#
# Run this AFTER any expo prebuild to ensure the icon survives:
#   bash scripts/ios-restore-appicon.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SRC_ICON="$ROOT_DIR/assets/icon.png"
DEST="$ROOT_DIR/ios/Orbital/Images.xcassets/AppIcon.appiconset"

if [ ! -f "$SRC_ICON" ]; then
  echo "ERROR: Source icon not found at $SRC_ICON"
  exit 1
fi

if [ ! -d "$DEST" ]; then
  echo "ERROR: Destination not found at $DEST — run expo prebuild first"
  exit 1
fi

# Wipe expo's generated icons and replace with single 1024x1024
rm -rf "$DEST"/*

cp "$SRC_ICON" "$DEST/AppIcon.png"

cat > "$DEST/Contents.json" <<'CONTENTS'
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
CONTENTS

# Verify AppIcon.png is non-zero
SIZE=$(stat -f%z "$DEST/AppIcon.png" 2>/dev/null || stat --printf="%s" "$DEST/AppIcon.png" 2>/dev/null)
if [ "$SIZE" -eq 0 ]; then
  echo "ERROR: Zero-byte AppIcon.png"
  exit 1
fi

# Verify valid JSON
node -e "JSON.parse(require('fs').readFileSync('$DEST/Contents.json','utf8'))" 2>/dev/null || {
  echo "ERROR: Contents.json is not valid JSON"
  exit 1
}

echo "AppIcon restored: single 1024x1024 universal icon (${SIZE} bytes)"
