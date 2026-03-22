#!/bin/bash
set -e

echo "⚡ Performance Check"
echo "===================="

# Launch time check via Maestro (elapsed wall time for full flow)
START_MS=$(python3 -c "import time; print(int(time.time() * 1000))")
set +e
maestro test ./maestro/tests/smoke_test.yaml \
  --format junit > /dev/null 2>&1
MAESTRO_EXIT=$?
set -e
END_MS=$(python3 -c "import time; print(int(time.time() * 1000))")

ELAPSED=$((END_MS - START_MS))
echo "App flow time: ${ELAPSED}ms (maestro exit: ${MAESTRO_EXIT})"

MAX_TIME=30000
if [ "$ELAPSED" -gt "$MAX_TIME" ]; then
  echo "❌ FAIL: Flow took ${ELAPSED}ms (max ${MAX_TIME}ms)"
  exit 1
fi

echo "✅ Performance check passed"
