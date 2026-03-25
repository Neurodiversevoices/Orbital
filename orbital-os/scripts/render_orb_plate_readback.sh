#!/usr/bin/env bash
# Always overwrites orbital-os/orb_plate_readback.png (same path every time).
# Use after shader/plate changes; Desktop orb_viewer.html auto-refreshes from disk.
set -euo pipefail
OB="$(cd "$(dirname "$0")/.." && pwd)"
PY="${OB}/scripts/.venv/bin/python"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="${ORB_VIEWER_PORT:-8970}"
OUT="${OB}/orb_plate_readback.png"

"$PY" "${OB}/scripts/generate_orb_preview.py"
"$PY" -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
sleep 0.5
"$CHROME" --headless=new --window-size=800,800 --virtual-time-budget=12000 \
  --screenshot="$OUT" "http://127.0.0.1:${PORT}/orb_preview.html"
kill "$SRV"
echo "Wrote ${OUT} (viewer polling same file; no Preview)"
