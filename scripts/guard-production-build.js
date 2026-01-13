#!/usr/bin/env node
/**
 * Production Build Guard Script
 *
 * CRITICAL: Ensures EXPO_PUBLIC_FOUNDER_DEMO is NOT set during production builds.
 * Demo mode must NEVER ship in store builds.
 *
 * Usage:
 *   - Run before eas build --profile production
 *   - Add to CI/CD pipeline as pre-build check
 *
 * Exit codes:
 *   0 = Safe to build production
 *   1 = BLOCKED: Demo mode would be enabled in production
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n========================================');
console.log('  ORBITAL PRODUCTION BUILD GUARD');
console.log('========================================\n');

let errors = [];
let warnings = [];

// =============================================================================
// CHECK 1: Environment variable not set in shell
// =============================================================================
if (process.env.EXPO_PUBLIC_FOUNDER_DEMO === '1') {
  errors.push('EXPO_PUBLIC_FOUNDER_DEMO=1 is set in current environment');
}

// =============================================================================
// CHECK 2: eas.json production profile doesn't have the flag
// =============================================================================
const easJsonPath = path.join(__dirname, '..', 'eas.json');
if (fs.existsSync(easJsonPath)) {
  try {
    const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    const productionEnv = easConfig?.build?.production?.env || {};

    if (productionEnv.EXPO_PUBLIC_FOUNDER_DEMO === '1') {
      errors.push('eas.json production profile has EXPO_PUBLIC_FOUNDER_DEMO=1');
    }

    // Verify founder-demo profile exists and is separate
    const founderDemoEnv = easConfig?.build?.['founder-demo']?.env || {};
    if (founderDemoEnv.EXPO_PUBLIC_FOUNDER_DEMO === '1') {
      console.log(`${GREEN}✓${RESET} founder-demo profile correctly has EXPO_PUBLIC_FOUNDER_DEMO=1`);
    } else {
      warnings.push('founder-demo profile missing EXPO_PUBLIC_FOUNDER_DEMO=1');
    }

    // Verify founder-demo is NOT distribution: store
    const founderDemoDist = easConfig?.build?.['founder-demo']?.distribution;
    if (founderDemoDist === 'store') {
      errors.push('founder-demo profile has distribution: store (MUST be internal)');
    } else {
      console.log(`${GREEN}✓${RESET} founder-demo profile is distribution: ${founderDemoDist || 'internal'}`);
    }
  } catch (e) {
    warnings.push(`Failed to parse eas.json: ${e.message}`);
  }
} else {
  warnings.push('eas.json not found');
}

// =============================================================================
// CHECK 3: .env file doesn't have the flag
// =============================================================================
const envFiles = ['.env', '.env.production', '.env.local'];
for (const envFile of envFiles) {
  const envPath = path.join(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('EXPO_PUBLIC_FOUNDER_DEMO=1')) {
      errors.push(`${envFile} contains EXPO_PUBLIC_FOUNDER_DEMO=1`);
    }
  }
}

// =============================================================================
// REPORT
// =============================================================================
console.log('');

if (warnings.length > 0) {
  console.log(`${YELLOW}WARNINGS:${RESET}`);
  warnings.forEach(w => console.log(`  ${YELLOW}⚠${RESET} ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log(`${RED}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${RED}  PRODUCTION BUILD BLOCKED${RESET}`);
  console.log(`${RED}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log('');
  console.log(`${RED}CRITICAL ERRORS:${RESET}`);
  errors.forEach(e => console.log(`  ${RED}✗${RESET} ${e}`));
  console.log('');
  console.log('Demo mode must NEVER ship in production builds.');
  console.log('Remove EXPO_PUBLIC_FOUNDER_DEMO from production environment.');
  console.log('');
  console.log(`For founder demos, use: ${YELLOW}eas build --profile founder-demo${RESET}`);
  console.log('');
  process.exit(1);
}

console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${GREEN}  PRODUCTION BUILD SAFE${RESET}`);
console.log(`${GREEN}═══════════════════════════════════════════════════════════════${RESET}`);
console.log('');
console.log(`${GREEN}✓${RESET} No demo mode flags detected in production configuration`);
console.log(`${GREEN}✓${RESET} Safe to run: eas build --profile production`);
console.log('');
process.exit(0);
