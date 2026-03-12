#!/bin/bash
# ios-restore-appicon.sh
# Restores the full AppIcon.appiconset from the git-tracked assets/ios/ directory
# into the ios/ native build directory (which is gitignored).
#
# Run this AFTER any expo prebuild to ensure the icon survives:
#   bash scripts/ios-restore-appicon.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SRC="$ROOT_DIR/assets/ios/AppIcon.appiconset"
DEST="$ROOT_DIR/ios/Orbital/Images.xcassets/AppIcon.appiconset"

if [ ! -d "$SRC" ]; then
  echo "ERROR: Source icon set not found at $SRC"
  exit 1
fi

if [ ! -d "$DEST" ]; then
  echo "ERROR: Destination not found at $DEST — run expo prebuild first"
  exit 1
fi

# Wipe expo's generated icon and replace with our full set
rm -rf "$DEST"/*
cp "$SRC"/* "$DEST"/

# Verify
EXPECTED=16  # 15 PNGs + 1 Contents.json
ACTUAL=$(ls "$DEST" | wc -l | tr -d ' ')

if [ "$ACTUAL" -ne "$EXPECTED" ]; then
  echo "WARNING: Expected $EXPECTED files, found $ACTUAL"
  ls -la "$DEST"
  exit 1
fi

# Check no zero-byte PNGs
for png in "$DEST"/*.png; do
  SIZE=$(stat -f%z "$png" 2>/dev/null || stat --printf="%s" "$png" 2>/dev/null)
  if [ "$SIZE" -eq 0 ]; then
    echo "ERROR: Zero-byte icon: $png"
    exit 1
  fi
done

echo "✓ AppIcon restored: $ACTUAL files, all non-zero"
