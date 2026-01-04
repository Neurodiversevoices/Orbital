#!/usr/bin/env node
/**
 * Orbital Doctor - Self-Healing Diagnostic Pipeline
 *
 * Runs end-to-end with ZERO prompts.
 * Auto-fixes issues or fails with clear errors.
 *
 * Usage: npm run doctor
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const LAYOUT_TSX = path.join(ROOT, 'app', '_layout.tsx');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const EAS_JSON = path.join(ROOT, 'eas.json');
const HEALTH_REPORT = path.join(ROOT, 'health-report.md');
const CONFIG_SNAPSHOT = path.join(ROOT, 'config-snapshot.json');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let errors = [];
let warnings = [];
let fixes = [];
let checks = [];

function log(color, prefix, msg) {
  console.log(`${color}${prefix}${RESET} ${msg}`);
}

function error(msg) {
  errors.push(msg);
  log(RED, '[ERROR]', msg);
}

function warn(msg) {
  warnings.push(msg);
  log(YELLOW, '[WARN]', msg);
}

function fix(msg) {
  fixes.push(msg);
  log(BLUE, '[FIX]', msg);
}

function ok(msg) {
  checks.push({ status: 'ok', msg });
  log(GREEN, '[OK]', msg);
}

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    error(`Failed to read ${path.basename(filepath)}: ${e.message}`);
    return null;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
}

function readFile(filepath) {
  try {
    return fs.readFileSync(filepath, 'utf8');
  } catch (e) {
    error(`Failed to read ${path.basename(filepath)}: ${e.message}`);
    return null;
  }
}

function writeFile(filepath, content) {
  fs.writeFileSync(filepath, content);
}

// ============================================================================
// VALIDATORS
// ============================================================================

function validateAppJson() {
  console.log('\n--- Validating app.json ---');

  const config = readJSON(APP_JSON);
  if (!config) return;

  const expo = config.expo;
  let modified = false;

  // 1. Bundle ID must be locked
  const EXPECTED_BUNDLE_ID = 'com.erparris.orbital';
  if (expo.ios?.bundleIdentifier !== EXPECTED_BUNDLE_ID) {
    error(`iOS bundleIdentifier must be ${EXPECTED_BUNDLE_ID}`);
  } else {
    ok(`iOS bundleIdentifier locked: ${EXPECTED_BUNDLE_ID}`);
  }

  if (expo.android?.package !== EXPECTED_BUNDLE_ID) {
    error(`Android package must be ${EXPECTED_BUNDLE_ID}`);
  } else {
    ok(`Android package locked: ${EXPECTED_BUNDLE_ID}`);
  }

  // 2. newArchEnabled must be true (required by reanimated 4.x)
  if (expo.newArchEnabled !== true) {
    fix('Setting newArchEnabled: true (required by react-native-reanimated 4.x)');
    expo.newArchEnabled = true;
    modified = true;
  } else {
    ok('newArchEnabled: true');
  }

  // 3. Build number must be a positive integer
  const buildNum = parseInt(expo.ios?.buildNumber, 10);
  if (isNaN(buildNum) || buildNum < 1) {
    fix('Setting iOS buildNumber to "1"');
    expo.ios = expo.ios || {};
    expo.ios.buildNumber = '1';
    modified = true;
  } else {
    ok(`iOS buildNumber: ${buildNum}`);
  }

  // 4. Scheme must be set
  if (!expo.scheme) {
    fix('Setting scheme: "orbital"');
    expo.scheme = 'orbital';
    modified = true;
  } else {
    ok(`Scheme: ${expo.scheme}`);
  }

  // 5. Validate plugins array
  if (!Array.isArray(expo.plugins)) {
    fix('Initializing plugins array');
    expo.plugins = [];
    modified = true;
  }

  // 6. Ensure expo-router is first plugin
  const routerIndex = expo.plugins.findIndex(p =>
    p === 'expo-router' || (Array.isArray(p) && p[0] === 'expo-router')
  );
  if (routerIndex === -1) {
    fix('Adding expo-router plugin');
    expo.plugins.unshift('expo-router');
    modified = true;
  } else if (routerIndex !== 0) {
    fix('Moving expo-router to first plugin position');
    const router = expo.plugins.splice(routerIndex, 1)[0];
    expo.plugins.unshift(router);
    modified = true;
  } else {
    ok('expo-router is first plugin');
  }

  // 7. Validate Sentry plugin config
  const sentryIndex = expo.plugins.findIndex(p =>
    Array.isArray(p) && p[0] === '@sentry/react-native/expo'
  );
  if (sentryIndex !== -1) {
    ok('Sentry plugin configured');
  } else {
    warn('Sentry plugin not found in app.json');
  }

  if (modified) {
    writeJSON(APP_JSON, config);
    ok('app.json updated');
  }
}

function validateLayoutTsx() {
  console.log('\n--- Validating app/_layout.tsx ---');

  let content = readFile(LAYOUT_TSX);
  if (!content) return;

  let modified = false;

  // 1. gesture-handler must be first import
  const lines = content.split('\n');
  const firstImportIndex = lines.findIndex(l => l.trim().startsWith('import'));

  if (firstImportIndex !== -1) {
    const firstImport = lines[firstImportIndex];
    if (!firstImport.includes('react-native-gesture-handler')) {
      error('react-native-gesture-handler must be the FIRST import in _layout.tsx');
    } else {
      ok('gesture-handler is first import');
    }
  }

  // 2. Sentry must have enabled: !__DEV__
  if (content.includes('Sentry.init(') && !content.includes('enabled:')) {
    error('Sentry.init must include enabled: !__DEV__');
  } else if (content.includes('enabled: !__DEV__') || content.includes('enabled: false')) {
    ok('Sentry has dev-mode guard');
  }

  // 3. Check for dangerous Sentry integrations
  const dangerousIntegrations = [
    'mobileReplayIntegration',
    'feedbackIntegration',
  ];

  for (const integration of dangerousIntegrations) {
    if (content.includes(integration)) {
      // Auto-fix: remove the dangerous integration
      const regex = new RegExp(`Sentry\\.${integration}\\(\\),?\\s*`, 'g');
      content = content.replace(regex, '');
      fix(`Removed unstable ${integration}`);
      modified = true;
    }
  }

  // 4. Check for enableLogs (invalid option)
  if (content.includes('enableLogs:')) {
    content = content.replace(/enableLogs:\s*(true|false),?\s*\n?/g, '');
    fix('Removed invalid enableLogs option from Sentry');
    modified = true;
  }

  // 5. Check for replay sample rates without replay integration
  if (!content.includes('mobileReplayIntegration') &&
      (content.includes('replaysSessionSampleRate') || content.includes('replaysOnErrorSampleRate'))) {
    content = content.replace(/replaysSessionSampleRate:\s*[\d.]+,?\s*\n?/g, '');
    content = content.replace(/replaysOnErrorSampleRate:\s*[\d.]+,?\s*\n?/g, '');
    fix('Removed orphaned replay sample rates');
    modified = true;
  }

  if (modified) {
    writeFile(LAYOUT_TSX, content);
    ok('_layout.tsx updated');
  }
}

function validateEasJson() {
  console.log('\n--- Validating eas.json ---');

  const config = readJSON(EAS_JSON);
  if (!config) return;

  let modified = false;

  // 1. Production build must have SENTRY_ALLOW_FAILURE
  if (!config.build?.production?.env?.SENTRY_ALLOW_FAILURE) {
    config.build = config.build || {};
    config.build.production = config.build.production || {};
    config.build.production.env = config.build.production.env || {};
    config.build.production.env.SENTRY_ALLOW_FAILURE = 'true';
    fix('Added SENTRY_ALLOW_FAILURE=true to production build');
    modified = true;
  } else {
    ok('SENTRY_ALLOW_FAILURE configured');
  }

  // 2. Production build should have NODE_ENV
  if (!config.build?.production?.env?.NODE_ENV) {
    config.build.production.env.NODE_ENV = 'production';
    fix('Added NODE_ENV=production to production build');
    modified = true;
  } else {
    ok('NODE_ENV configured');
  }

  // 3. iOS should have autoIncrement
  if (!config.build?.production?.ios?.autoIncrement) {
    config.build.production.ios = config.build.production.ios || {};
    config.build.production.ios.autoIncrement = 'buildNumber';
    fix('Added autoIncrement: buildNumber to iOS production');
    modified = true;
  } else {
    ok('iOS autoIncrement configured');
  }

  if (modified) {
    writeJSON(EAS_JSON, config);
    ok('eas.json updated');
  }
}

function validatePackageJson() {
  console.log('\n--- Validating package.json ---');

  const config = readJSON(PACKAGE_JSON);
  if (!config) return;

  // Check for known problematic version combinations
  const deps = { ...config.dependencies, ...config.devDependencies };

  // reanimated 4.x requires new arch
  if (deps['react-native-reanimated']) {
    const version = deps['react-native-reanimated'];
    if (version.includes('4.') || version.includes('^4') || version.includes('~4')) {
      ok('react-native-reanimated 4.x detected (requires newArch: true)');
    }
  }

  // Check for Sentry
  if (deps['@sentry/react-native']) {
    ok(`@sentry/react-native: ${deps['@sentry/react-native']}`);
  }

  // Check main entry point
  if (config.main !== 'expo-router/entry') {
    error('package.json main must be "expo-router/entry"');
  } else {
    ok('Main entry: expo-router/entry');
  }
}

function detectCrashVectors() {
  console.log('\n--- Detecting TestFlight Crash Vectors ---');

  const layoutContent = readFile(LAYOUT_TSX);
  if (!layoutContent) return;

  // 1. Synchronous heavy operations at module scope
  const moduleScope = layoutContent.split('export default')[0];
  if (moduleScope.includes('AsyncStorage.getItem') ||
      moduleScope.includes('await ') ||
      moduleScope.includes('.then(')) {
    warn('Async operations at module scope may delay startup');
  } else {
    ok('No async operations at module scope');
  }

  // 2. Check for proper error boundaries
  if (layoutContent.includes('ErrorBoundary')) {
    ok('ErrorBoundary present');
  } else {
    warn('No ErrorBoundary detected - crashes will be unhandled');
  }

  // 3. Check for GestureHandlerRootView
  if (layoutContent.includes('GestureHandlerRootView')) {
    ok('GestureHandlerRootView present');
  } else {
    error('GestureHandlerRootView missing - gestures will crash');
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReports() {
  console.log('\n--- Generating Reports ---');

  const timestamp = new Date().toISOString();
  const appConfig = readJSON(APP_JSON);
  const pkgConfig = readJSON(PACKAGE_JSON);
  const easConfig = readJSON(EAS_JSON);

  // Config snapshot
  const snapshot = {
    timestamp,
    expo: {
      version: appConfig?.expo?.version,
      sdkVersion: pkgConfig?.dependencies?.expo,
      newArchEnabled: appConfig?.expo?.newArchEnabled,
      bundleIdentifier: appConfig?.expo?.ios?.bundleIdentifier,
      buildNumber: appConfig?.expo?.ios?.buildNumber,
    },
    dependencies: {
      react: pkgConfig?.dependencies?.react,
      reactNative: pkgConfig?.dependencies?.['react-native'],
      reanimated: pkgConfig?.dependencies?.['react-native-reanimated'],
      sentry: pkgConfig?.dependencies?.['@sentry/react-native'],
      expoRouter: pkgConfig?.dependencies?.['expo-router'],
    },
    doctor: {
      errors: errors.length,
      warnings: warnings.length,
      fixes: fixes.length,
      passed: errors.length === 0,
    }
  };

  writeJSON(CONFIG_SNAPSHOT, snapshot);
  ok(`Generated ${path.basename(CONFIG_SNAPSHOT)}`);

  // Health report
  const report = `# Orbital Health Report

Generated: ${timestamp}

## Summary

| Metric | Count |
|--------|-------|
| Errors | ${errors.length} |
| Warnings | ${warnings.length} |
| Auto-fixes | ${fixes.length} |
| Status | ${errors.length === 0 ? 'PASSED' : 'FAILED'} |

## Configuration

| Setting | Value |
|---------|-------|
| Expo SDK | ${pkgConfig?.dependencies?.expo || 'unknown'} |
| React Native | ${pkgConfig?.dependencies?.['react-native'] || 'unknown'} |
| New Architecture | ${appConfig?.expo?.newArchEnabled ? 'Enabled' : 'Disabled'} |
| Build Number | ${appConfig?.expo?.ios?.buildNumber || 'unknown'} |
| Bundle ID | ${appConfig?.expo?.ios?.bundleIdentifier || 'unknown'} |

## Errors

${errors.length === 0 ? '_None_' : errors.map(e => `- ${e}`).join('\n')}

## Warnings

${warnings.length === 0 ? '_None_' : warnings.map(w => `- ${w}`).join('\n')}

## Auto-fixes Applied

${fixes.length === 0 ? '_None_' : fixes.map(f => `- ${f}`).join('\n')}

## Checks Passed

${checks.filter(c => c.status === 'ok').map(c => `- ${c.msg}`).join('\n')}
`;

  writeFile(HEALTH_REPORT, report);
  ok(`Generated ${path.basename(HEALTH_REPORT)}`);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('========================================');
  console.log('  ORBITAL DOCTOR - Diagnostic Pipeline');
  console.log('========================================');

  validateAppJson();
  validateLayoutTsx();
  validateEasJson();
  validatePackageJson();
  detectCrashVectors();
  generateReports();

  console.log('\n========================================');

  if (errors.length > 0) {
    console.log(`${RED}FAILED${RESET}: ${errors.length} error(s) found`);
    console.log('Fix these issues before building.');
    process.exit(1);
  } else {
    console.log(`${GREEN}PASSED${RESET}: All checks passed`);
    if (fixes.length > 0) {
      console.log(`${BLUE}AUTO-FIXED${RESET}: ${fixes.length} issue(s) corrected`);
    }
    if (warnings.length > 0) {
      console.log(`${YELLOW}WARNINGS${RESET}: ${warnings.length} non-blocking issue(s)`);
    }
    process.exit(0);
  }
}

main();
