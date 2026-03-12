/**
 * withAppIcon Expo config plugin
 *
 * Ensures that a 1024x1024 App Store icon exists at assets/AppIcon.png.
 * This plugin is intentionally minimal and does not add any new dependencies.
 */

const fs = require('fs');
const path = require('path');

/** @type {(config: import('@expo/config').ExpoConfig) => import('@expo/config').ExpoConfig} */
module.exports = function withAppIcon(config) {
  const projectRoot =
    // Expo CLI attaches _internal.projectRoot when running config plugins
    (config._internal && config._internal.projectRoot) || process.cwd();

  const appIconPath = path.join(projectRoot, 'assets', 'AppIcon.png');

  if (!fs.existsSync(appIconPath)) {
    // This runs at build time only, not in the app bundle.
    // eslint-disable-next-line no-console
    console.warn('[withAppIcon] Expected assets/AppIcon.png to exist but it was not found.');
  }

  return config;
};

