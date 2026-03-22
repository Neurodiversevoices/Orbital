/**
 * withAppIcon Expo config plugin
 *
 * Ensures that a 1024x1024 App Store icon exists at assets/AppIcon.png.
 * Validates ios/<AppName>/Images.xcassets/AppIcon.appiconset/Contents.json
 * uses a single universal iOS icon (not legacy multi-size catalogs).
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

  const appName = (config.name || 'Orbital').replace(/[/\\]/g, '');
  const contentsPath = path.join(
    projectRoot,
    'ios',
    appName,
    'Images.xcassets',
    'AppIcon.appiconset',
    'Contents.json',
  );

  if (!fs.existsSync(contentsPath)) {
    throw new Error(
      `[withAppIcon] Missing AppIcon Contents.json at ${contentsPath}. ` +
        'Run npx expo prebuild (or ensure ios/ is generated) before building.',
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
  } catch (e) {
    throw new Error(
      `[withAppIcon] Invalid JSON in ${contentsPath}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const images = Array.isArray(parsed.images) ? parsed.images : [];
  const universalIos = images.filter(
    (img) =>
      img &&
      img.idiom === 'universal' &&
      Object.prototype.hasOwnProperty.call(img, 'platform') &&
      img.platform === 'ios',
  );

  if (universalIos.length !== 1) {
    throw new Error(
      `[withAppIcon] ${contentsPath} must contain exactly one image entry with ` +
        `"idiom": "universal" and "platform": "ios" (found ${universalIos.length}). ` +
        'Use a single universal 1024×1024 App Icon set for iOS.',
    );
  }

  const universalWithoutPlatform = images.filter(
    (img) => img && img.idiom === 'universal' && !Object.prototype.hasOwnProperty.call(img, 'platform'),
  );
  if (universalWithoutPlatform.length > 0) {
    throw new Error(
      `[withAppIcon] ${contentsPath}: universal icon entries must include "platform": "ios".`,
    );
  }

  return config;
};
