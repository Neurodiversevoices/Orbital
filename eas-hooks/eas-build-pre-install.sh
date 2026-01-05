#!/bin/bash
set -e

# Only run on iOS
if [ "$EAS_BUILD_PLATFORM" != "ios" ]; then
  exit 0
fi

echo "Patching Podfile to disable code signing for resource bundles..."

PODFILE="ios/Podfile"

if [ -f "$PODFILE" ]; then
  # Check if the fix is already applied
  if grep -q "CODE_SIGNING_ALLOWED" "$PODFILE"; then
    echo "Podfile already patched, skipping..."
    exit 0
  fi

  # Add the code signing fix before the final 'end'
  # This disables code signing for resource bundles (Xcode 14+ requirement)
  cat >> "$PODFILE" << 'PATCH'

# Disable code signing for resource bundles (Xcode 14+ fix)
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end
    end
  end
end
PATCH

  echo "Podfile patched successfully!"
  cat "$PODFILE"
else
  echo "Warning: Podfile not found at $PODFILE"
fi
