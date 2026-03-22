#!/bin/bash
set -e

NOTES_FILE="./fastlane/metadata/en-US/release_notes.txt"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null \
  || echo "")

echo "Generating release notes..."

mkdir -p "$(dirname "$NOTES_FILE")"

if [ -z "$LAST_TAG" ]; then
  COMMITS=$(git log --pretty=format:"• %s" -10)
else
  COMMITS=$(git log \
    "$LAST_TAG"..HEAD \
    --pretty=format:"• %s" \
    --no-merges)
fi

if [ -z "$COMMITS" ]; then
  echo "Bug fixes and performance improvements" \
    > "$NOTES_FILE"
else
  echo "$COMMITS" > "$NOTES_FILE"
fi

# Trim to 4000 chars (App Store limit) — portable (macOS bash 3.2)
python3 -c "
p = open('$NOTES_FILE', 'r', encoding='utf-8').read()
open('$NOTES_FILE', 'w', encoding='utf-8').write(p[:4000])
"

echo "✅ Release notes generated:"
cat "$NOTES_FILE"
