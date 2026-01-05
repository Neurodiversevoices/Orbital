const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Disables code signing for CocoaPods resource bundles.
 * Required for Xcode 14+ which signs resource bundles by default.
 */
function withDisableResourceBundleSigning(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if we already have the fix
      if (podfileContent.includes('CODE_SIGNING_ALLOWED')) {
        return config;
      }

      // Find the post_install hook and add our code signing fix
      const postInstallFix = `
    # Disable code signing for resource bundles (Xcode 14+ requirement)
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end`;

      // Look for existing post_install hook
      if (podfileContent.includes('post_install do |installer|')) {
        // Add our fix inside the existing post_install block
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${postInstallFix}`
        );
      } else {
        // Add a new post_install block at the end
        podfileContent += `\n\npost_install do |installer|${postInstallFix}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
}

module.exports = withDisableResourceBundleSigning;
