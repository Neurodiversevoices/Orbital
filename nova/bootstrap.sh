#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NOVA BOOTSTRAP — No git required. Downloads from GitHub + runs sprint.
#
# Paste this ONE command into Terminal on Mac Mini:
#   bash <(curl -sS https://raw.githubusercontent.com/Neurodiversevoices/Orbital/claude/consolidate-project-rules-yOc07/nova/bootstrap.sh)
#
# Or save and run:
#   curl -sO https://raw.githubusercontent.com/Neurodiversevoices/Orbital/claude/consolidate-project-rules-yOc07/nova/bootstrap.sh
#   bash nova/bootstrap.sh
# ═══════════════════════════════════════════════════════════════
set -e

BRANCH="claude/consolidate-project-rules-yOc07"
RAW="https://raw.githubusercontent.com/Neurodiversevoices/Orbital/${BRANCH}"
DEST="/Users/ericparrish/Library/Mobile Documents/com~apple~CloudDocs/Documents/Orbital"

echo "═══════════════════════════════════════"
echo "  NOVA BOOTSTRAP — No git needed"
echo "  Target: $DEST"
echo "═══════════════════════════════════════"

# Create directories
mkdir -p "$DEST/nova/divisions"
mkdir -p "$DEST/nova/memory"
mkdir -p "$DEST/nova/media/$(date +%Y-%m-%d)"

# ─── Download nova/ files from GitHub ───
echo ""
echo "[1/4] Downloading Nova Empire files..."

FILES=(
  "nova/EMPIRE.md"
  "nova/sprint.sh"
  "nova/divisions/README.md"
  "nova/divisions/creative-division.json"
  "nova/divisions/rd-division.json"
  "nova/divisions/ops-division.json"
  "nova/divisions/ceo-brief-division.json"
  "nova/memory/learnings.jsonl"
  "nova/memory/decisions.jsonl"
  "nova/memory/ceo_suggestions.jsonl"
  "nova/memory/outcomes.jsonl"
  "nova/memory/research.jsonl"
  "nova/memory/skills.jsonl"
  "nova/memory/errors.jsonl"
  "nova/memory/empire_state.json"
  "master_brief.md"
  "memory_bank/activeContext.md"
  "memory_bank/ceoRules.md"
  "memory_bank/techContext.md"
  "CLAUDE.md"
)

DOWNLOADED=0
FAILED=0
for FILE in "${FILES[@]}"; do
  DIR=$(dirname "$DEST/$FILE")
  mkdir -p "$DIR"
  if curl -sfS -o "$DEST/$FILE" "$RAW/$FILE" 2>/dev/null; then
    echo "  ✓ $FILE"
    DOWNLOADED=$((DOWNLOADED + 1))
  else
    echo "  ✗ $FILE (failed)"
    FAILED=$((FAILED + 1))
  fi
done

echo "  Downloaded: $DOWNLOADED  Failed: $FAILED"

# ─── Fix paths in workflow JSONs ───
echo ""
echo "[2/4] Fixing paths for this machine..."

# Replace sandbox path with actual Mac path in all workflow files
find "$DEST/nova/divisions" -name "*.json" -exec \
  sed -i '' "s|/home/user/Orbital|$DEST|g" {} \;

# Also fix sprint.sh
chmod +x "$DEST/nova/sprint.sh"
sed -i '' "s|/home/user/Orbital|$DEST|g" "$DEST/nova/sprint.sh" 2>/dev/null || true

echo "  Paths updated to: $DEST"

# ─── Run the sprint ───
echo ""
echo "[3/4] Running sprint..."
bash "$DEST/nova/sprint.sh"

# ─── Report ───
echo ""
echo "[4/4] BOOTSTRAP COMPLETE"
echo "═══════════════════════════════════════"
echo "  Files: $DOWNLOADED downloaded"
echo "  Location: $DEST/nova/"
echo "  Images: $DEST/nova/media/$(date +%Y-%m-%d)/"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:5678 (n8n)"
echo "  2. Import workflows from: $DEST/nova/divisions/*.json"
echo "  3. Activate all 4 workflows"
echo "═══════════════════════════════════════"
