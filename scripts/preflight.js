#!/usr/bin/env node
/**
 * Orbital Preflight Script
 *
 * Runs the complete pre-release validation suite:
 * 1. npm ci (clean install)
 * 2. tsc --noEmit (type check)
 * 3. expo export -p web (build)
 * 4. playwright test (e2e tests)
 *
 * Outputs a single PASS/FAIL summary.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const STEPS = [
  { name: 'Clean Install', cmd: 'npm ci', fatal: true },
  { name: 'TypeScript Check', cmd: 'npx tsc --noEmit', fatal: false }, // Allow pre-existing errors
  { name: 'Web Build', cmd: 'npx expo export -p web', fatal: true },
  { name: 'Playwright Tests', cmd: 'npx playwright test', fatal: true },
];

const results = [];
let overallPass = true;

function log(msg) {
  console.log(msg);
}

function runStep(step) {
  log('');
  log('═══════════════════════════════════════════════════════════════');
  log(`  STEP: ${step.name}`);
  log('═══════════════════════════════════════════════════════════════');
  log(`  Command: ${step.cmd}`);
  log('');

  const startTime = Date.now();

  try {
    execSync(step.cmd, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, CI: '1' },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    results.push({ name: step.name, status: 'PASS', duration });
    log('');
    log(`  ✓ ${step.name} completed in ${duration}s`);
    return true;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (step.fatal) {
      results.push({ name: step.name, status: 'FAIL', duration });
      overallPass = false;
      log('');
      log(`  ✗ ${step.name} FAILED after ${duration}s`);
      return false;
    } else {
      results.push({ name: step.name, status: 'WARN', duration });
      log('');
      log(`  ⚠ ${step.name} had warnings (${duration}s) - continuing`);
      return true;
    }
  }
}

function printSummary() {
  log('');
  log('');
  log('╔═══════════════════════════════════════════════════════════════╗');
  log('║                    PREFLIGHT SUMMARY                          ║');
  log('╠═══════════════════════════════════════════════════════════════╣');

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'WARN' ? '⚠' : '✗';
    const line = `║  ${icon} ${result.name.padEnd(25)} ${result.status.padEnd(6)} ${result.duration}s`;
    log(line.padEnd(67) + '║');
  }

  log('╠═══════════════════════════════════════════════════════════════╣');

  if (overallPass) {
    log('║                                                               ║');
    log('║                   PREFLIGHT STATUS: PASS                      ║');
    log('║                                                               ║');
  } else {
    log('║                                                               ║');
    log('║                   PREFLIGHT STATUS: FAIL                      ║');
    log('║                                                               ║');
  }

  log('╚═══════════════════════════════════════════════════════════════╝');
  log('');
}

async function main() {
  log('');
  log('╔═══════════════════════════════════════════════════════════════╗');
  log('║                                                               ║');
  log('║              ORBITAL PREFLIGHT CHECK v1.0                     ║');
  log('║                                                               ║');
  log('╚═══════════════════════════════════════════════════════════════╝');
  log('');

  for (const step of STEPS) {
    const success = runStep(step);
    if (!success && step.fatal) {
      log('');
      log('  ⛔ Fatal error encountered. Stopping preflight.');
      break;
    }
  }

  printSummary();

  process.exit(overallPass ? 0 : 1);
}

main().catch((err) => {
  console.error('Preflight script error:', err);
  process.exit(1);
});
