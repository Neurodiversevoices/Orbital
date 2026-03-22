#!/bin/bash
set -e

echo ""
echo "🚀 ORBITAL HEALTH iOS RELEASE"
echo "=============================="
echo "Started: $(date)"
echo ""

bundle exec fastlane release_ios

echo ""
echo "=============================="
echo "✅ RELEASE COMPLETE"
echo "Finished: $(date)"
echo ""
echo "Next steps:"
echo "1. Check App Store Connect"
echo "2. Monitor review status"
echo "3. Approve release when ready"
