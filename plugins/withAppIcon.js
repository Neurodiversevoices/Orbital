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
  // Web / Vercel (expo export:web) has no ios/ tree; EAS sets EAS_BUILD when native builds need this check.
  if (config.platform !== 'ios' && !process.env.EAS_BUILD) return config;

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
    // During `expo prebuild --clean`, ios/ is cleared before native assets exist;
    // validation runs again on later builds once AppIcon.appiconset is generated.
    // eslint-disable-next-line no-console
    console.warn(
      `[withAppIcon] Skipping AppIcon validation (not generated yet): ${contentsPath}`,
    );
    return config;
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
