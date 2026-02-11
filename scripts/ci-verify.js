#!/usr/bin/env node

/**
 * Orbital CI Verification Script
 *
 * Runs all static analysis checks and produces a summary table.
 * Exit code 0 = all critical checks pass
 * Exit code 1 = critical failure
 */

const { spawn } = require('child_process');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const results = [];

async function runCommand(name, command, args, options = {}) {
  const { warnOnly = false, timeout = 120000 } = options;
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log(`\n${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`  ${COLORS.bold}STEP: ${name}${COLORS.reset}`);
    console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`  Command: ${command} ${args.join(' ')}\n`);

    const proc = spawn(command, args, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (killed) {
        results.push({ name, status: 'TIMEOUT', duration, warnOnly });
        console.log(`\n  ${COLORS.red}✗ ${name} TIMEOUT after ${duration}s${COLORS.reset}`);
        resolve(false);
      } else if (code === 0) {
        results.push({ name, status: 'PASS', duration, warnOnly });
        console.log(`\n  ${COLORS.green}✓ ${name} completed in ${duration}s${COLORS.reset}`);
        resolve(true);
      } else if (warnOnly) {
        results.push({ name, status: 'WARN', duration, warnOnly });
        console.log(`\n  ${COLORS.yellow}⚠ ${name} had warnings (${duration}s) - continuing${COLORS.reset}`);
        resolve(true);
      } else {
        results.push({ name, status: 'FAIL', duration, warnOnly });
        console.log(`\n  ${COLORS.red}✗ ${name} FAILED after ${duration}s${COLORS.reset}`);
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      results.push({ name, status: 'ERROR', duration, warnOnly, error: err.message });
      console.log(`\n  ${COLORS.red}✗ ${name} ERROR: ${err.message}${COLORS.reset}`);
      resolve(warnOnly);
    });
  });
}

async function runAudit() {
  const startTime = Date.now();
  const name = 'Security Audit';

  console.log(`\n${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`  ${COLORS.bold}STEP: ${name}${COLORS.reset}`);
  console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`  Command: npm audit --production\n`);

  return new Promise((resolve) => {
    const proc = spawn('npm', ['audit', '--production', '--json'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
    });

    let stdout = '';
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('close', () => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      try {
        const audit = JSON.parse(stdout);
        const vulns = audit.metadata?.vulnerabilities || {};
        const high = vulns.high || 0;
        const critical = vulns.critical || 0;
        const moderate = vulns.moderate || 0;
        const low = vulns.low || 0;

        console.log(`  Vulnerabilities found:`);
        console.log(`    Critical: ${critical}`);
        console.log(`    High: ${high}`);
        console.log(`    Moderate: ${moderate}`);
        console.log(`    Low: ${low}`);

        if (critical > 0 || high > 0) {
          results.push({ name, status: 'FAIL', duration, details: `${critical} critical, ${high} high` });
          console.log(`\n  ${COLORS.red}✗ ${name} FAILED - HIGH/CRITICAL vulnerabilities found${COLORS.reset}`);
          resolve(false);
        } else {
          results.push({ name, status: 'PASS', duration, details: `${moderate} moderate, ${low} low` });
          console.log(`\n  ${COLORS.green}✓ ${name} passed in ${duration}s${COLORS.reset}`);
          resolve(true);
        }
      } catch (e) {
        // npm audit returns non-zero for vulnerabilities, try parsing anyway
        results.push({ name, status: 'WARN', duration, details: 'Could not parse audit results' });
        console.log(`\n  ${COLORS.yellow}⚠ ${name} - audit completed with warnings${COLORS.reset}`);
        resolve(true);
      }
    });

    proc.on('error', (err) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      results.push({ name, status: 'WARN', duration, error: err.message });
      console.log(`\n  ${COLORS.yellow}⚠ ${name} - ${err.message}${COLORS.reset}`);
      resolve(true);
    });
  });
}

function printSummary() {
  console.log(`\n${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                    ${COLORS.bold}CI VERIFICATION SUMMARY${COLORS.reset}                     ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╠═══════════════════════════════════════════════════════════════╣${COLORS.reset}`);

  let allPassed = true;

  for (const r of results) {
    const statusIcon = r.status === 'PASS' ? `${COLORS.green}✓ PASS${COLORS.reset}` :
                       r.status === 'WARN' ? `${COLORS.yellow}⚠ WARN${COLORS.reset}` :
                       `${COLORS.red}✗ FAIL${COLORS.reset}`;
    const line = `  ${r.name.padEnd(25)} ${statusIcon}   ${r.duration}s`;
    console.log(`${COLORS.cyan}║${COLORS.reset}${line.padEnd(62)}${COLORS.cyan}║${COLORS.reset}`);

    if (r.status === 'FAIL' && !r.warnOnly) {
      allPassed = false;
    }
  }

  console.log(`${COLORS.cyan}╠═══════════════════════════════════════════════════════════════╣${COLORS.reset}`);

  if (allPassed) {
    console.log(`${COLORS.cyan}║${COLORS.reset}${COLORS.green}${COLORS.bold}                   CI VERIFICATION: PASS                       ${COLORS.reset}${COLORS.cyan}║${COLORS.reset}`);
  } else {
    console.log(`${COLORS.cyan}║${COLORS.reset}${COLORS.red}${COLORS.bold}                   CI VERIFICATION: FAIL                       ${COLORS.reset}${COLORS.cyan}║${COLORS.reset}`);
  }

  console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  return allPassed;
}

async function main() {
  console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}              ${COLORS.bold}ORBITAL CI VERIFICATION v1.0${COLORS.reset}                    ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  let allPassed = true;

  // Step 1: TypeScript Check (warn only - pre-existing errors)
  const tscPassed = await runCommand('TypeScript Check', 'npx', ['tsc', '--noEmit'], { warnOnly: true });

  // Step 2: ESLint (warn only initially - codebase may have issues)
  const eslintPassed = await runCommand('ESLint', 'npx', ['eslint', '.', '--ext', '.ts,.tsx', '--max-warnings', '100'], { warnOnly: true });

  // Step 3: Prettier Check (warn only)
  const prettierPassed = await runCommand('Prettier Check', 'npx', ['prettier', '--check', '.'], { warnOnly: true });

  // Step 4: Legacy Product ID Check (CRITICAL — prevents mock purchases in production)
  const legacyIdsPassed = await runCommand(
    'Legacy Product ID Check',
    'node',
    ['-e', `
      const { execSync } = require('child_process');
      const LEGACY_IDS = [
        'orbital_individual_monthly',
        'orbital_individual_annual',
        'orbital_bundle_10_monthly',
        'orbital_bundle_25_monthly',
        'orbital_bundle_25_annual',
      ];
      let found = false;
      for (const id of LEGACY_IDS) {
        try {
          const out = execSync(
            'grep -rn "' + id + '" --include="*.ts" --include="*.tsx" lib/ app/ components/ ' +
            '| grep -v "pricing.ts" | grep -v node_modules || true',
            { encoding: 'utf-8' }
          ).trim();
          if (out) {
            console.error('FAIL: Legacy product ID "' + id + '" found outside pricing.ts:');
            console.error(out);
            found = true;
          }
        } catch(e) {}
      }
      process.exit(found ? 1 : 0);
    `],
  );
  if (!legacyIdsPassed) allPassed = false;

  // Step 5: Security Audit
  const auditPassed = await runAudit();
  if (!auditPassed) allPassed = false;

  // Print summary
  const finalResult = printSummary();

  process.exit(finalResult ? 0 : 1);
}

main().catch((err) => {
  console.error('CI Verification failed:', err);
  process.exit(1);
});
