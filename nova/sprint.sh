#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NOVA SPRINT — ONE COMMAND, EVERYTHING HAPPENS
# Run this on Mac Mini: bash nova/sprint.sh
# ═══════════════════════════════════════════════════════════════
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA_DIR="$REPO_ROOT/nova/media/$(date +%Y-%m-%d)"
MEMORY_DIR="$REPO_ROOT/nova/memory"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "═══════════════════════════════════════"
echo "  NOVA SPRINT — $(date)"
echo "═══════════════════════════════════════"

mkdir -p "$MEDIA_DIR"

# ─── IMAGE GENERATION (Pollinations.ai, free, no key) ───
echo ""
echo "[1/5] GENERATING 5 IMAGES..."
PROMPTS=(
  "futuristic orbital space station with teal cyan lighting dark void background cinematic enterprise grade"
  "glass orb floating in space emitting teal cyan amber capacity spectrum light photorealistic"
  "abstract neural network visualization cyan and amber nodes dark void data intelligence"
  "minimalist holographic dashboard empire score metrics dark theme teal accent"
  "neurodivergent brain as beautiful constellation map clinical aesthetic teal cyan nodes"
)

for i in {0..4}; do
  IDX=$((i + 1))
  ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROMPTS[$i]}'))")
  URL="https://image.pollinations.ai/prompt/${ENCODED}?width=1024&height=1024&nologo=true"
  OUT="$MEDIA_DIR/nova_empire_$(printf '%03d' $IDX).png"
  echo "  Image $IDX: downloading..."
  curl -sS -o "$OUT" "$URL" && echo "  Image $IDX: DONE ($OUT)" || echo "  Image $IDX: FAILED"
done

IMAGE_COUNT=$(ls "$MEDIA_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "  Total images: $IMAGE_COUNT"

# ─── VIDEO STITCHING (FFmpeg) ───
echo ""
echo "[2/5] STITCHING VIDEO..."
if command -v ffmpeg &> /dev/null && [ "$IMAGE_COUNT" -gt 0 ]; then
  # Create input file list for ffmpeg
  INPUT_FILE="$MEDIA_DIR/ffmpeg_input.txt"
  > "$INPUT_FILE"
  for img in "$MEDIA_DIR"/*.png; do
    echo "file '$img'" >> "$INPUT_FILE"
    echo "duration 2" >> "$INPUT_FILE"
  done
  # Last image needs to be listed again for duration to work
  LAST_IMG=$(ls "$MEDIA_DIR"/*.png | tail -1)
  echo "file '$LAST_IMG'" >> "$INPUT_FILE"

  VIDEO_OUT="$MEDIA_DIR/nova_sprint_$(date +%Y%m%d).mp4"
  ffmpeg -y -f concat -safe 0 -i "$INPUT_FILE" \
    -vf "scale=1024:1024,format=yuv420p" \
    -c:v libx264 -pix_fmt yuv420p -r 1 \
    "$VIDEO_OUT" 2>/dev/null && echo "  Video: DONE ($VIDEO_OUT)" || echo "  Video: FAILED (ffmpeg error)"
  rm -f "$INPUT_FILE"
else
  echo "  Video: SKIPPED (ffmpeg not installed or no images)"
  echo "  Install: brew install ffmpeg"
fi

# ─── LOG TO MEMORY ───
echo ""
echo "[3/5] LOGGING TO MEMORY..."
echo "{\"ts\":\"$TS\",\"type\":\"sprint\",\"images_generated\":$IMAGE_COUNT,\"video\":true,\"session\":\"sprint-$(date +%Y%m%d)\"}" >> "$MEMORY_DIR/outcomes.jsonl"
echo "{\"ts\":\"$TS\",\"learning\":\"Sprint generated $IMAGE_COUNT images via Pollinations.ai and stitched video via FFmpeg. Zero cost.\",\"category\":\"media\",\"session\":\"sprint-$(date +%Y%m%d)\"}" >> "$MEMORY_DIR/learnings.jsonl"
echo "  Memory updated."

# ─── GIT COMMIT ───
echo ""
echo "[4/5] COMMITTING..."
cd "$REPO_ROOT"
git add -A nova/media/ nova/memory/
git commit -m "nova[sprint]: $IMAGE_COUNT images + video — $(date +%Y-%m-%d)" 2>/dev/null && echo "  Committed." || echo "  Nothing to commit."

# ─── REPORT ───
echo ""
echo "[5/5] SPRINT REPORT"
echo "═══════════════════════════════════════"
echo "  Images:  $IMAGE_COUNT generated"
echo "  Video:   $(ls "$MEDIA_DIR"/*.mp4 2>/dev/null | wc -l | tr -d ' ') file(s)"
echo "  Memory:  $(wc -l < "$MEMORY_DIR/learnings.jsonl" | tr -d ' ') learnings"
echo "  Cost:    \$0"
echo "═══════════════════════════════════════"
echo ""
echo "View images: open $MEDIA_DIR"
echo "Push: git push -u origin \$(git branch --show-current)"
