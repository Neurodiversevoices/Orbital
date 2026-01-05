const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Disables code signing for CocoaPods resource bundles.
 * Required for Xcode 14+ which signs resource bundles by default.
 *
 * Based on: https://github.com/expo/expo/pull/19095
 */
function withDisableResourceBundleSigning(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.log('[withDisableResourceBundleSigning] Podfile not found, skipping...');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if we already have the fix
      if (podfileContent.includes('resource_bundle_targets')) {
        console.log('[withDisableResourceBundleSigning] Podfile already patched, skipping...');
        return config;
      }

      console.log('[withDisableResourceBundleSigning] Patching Podfile...');

      // The correct fix from Expo's official PR
      const resourceBundleSigningFix = `
    # Disable code signing for resource bundles (Xcode 14+ fix)
    # See: https://github.com/expo/expo/pull/19095
    installer.target_installation_results.pod_target_installation_results
      .each do |pod_name, target_installation_result|
        target_installation_result.resource_bundle_targets.each do |resource_bundle_target|
          resource_bundle_target.build_configurations.each do |config|
            config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
          end
        end
      end`;

      // Look for existing post_install hook
      const postInstallRegex = /post_install\s+do\s+\|installer\|/;

      if (postInstallRegex.test(podfileContent)) {
        // Add our fix inside the existing post_install block, right after the opening
        podfileContent = podfileContent.replace(
          postInstallRegex,
          `post_install do |installer|${resourceBundleSigningFix}`
        );
        console.log('[withDisableResourceBundleSigning] Added fix to existing post_install block');
      } else {
        // Add a new post_install block at the end
        podfileContent += `\n\npost_install do |installer|${resourceBundleSigningFix}\nend\n`;
        console.log('[withDisableResourceBundleSigning] Added new post_install block');
      }

      fs.writeFileSync(podfilePath, podfileContent);
      console.log('[withDisableResourceBundleSigning] Podfile patched successfully!');

      return config;
    },
  ]);
}

module.exports = withDisableResourceBundleSigning;
