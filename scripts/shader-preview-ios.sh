#!/usr/bin/env bash
# After ShaderOrb.tsx changes: rebuild on iPhone 16 sim, capture Home orb, copy to Desktop.
# Requires: Xcode Simulator, Maestro (~/.maestro/bin), Metro reachable from sim.
# Shader: RuntimeEffect is created in-component — stale module-level Skia caches were fixed; use --clear if colors don’t move.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.maestro/bin:${PATH}"
unset CI

npx expo run:ios --device "iPhone 16"
maestro test maestro/tests/orb_home_preview.yaml
cp -f "${ROOT}/orb_preview.png" "${HOME}/Desktop/orb_preview.png"
xcrun simctl io booted screenshot "${HOME}/Desktop/orb_preview.png"
echo "Wrote ${HOME}/Desktop/orb_preview.png (Maestro orb flow + simctl full screen)"
