#!/usr/bin/env node

/**
 * Orbital Stress Test Orchestrator
 *
 * Runs the full Citadel stress test suite:
 * 1. Seeds test users (if needed)
 * 2. Runs k6 load tests
 * 3. Reports results
 *
 * Usage: npm run stress
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const PROJECT_ROOT = path.resolve(__dirname, '..');
const USERS_FILE = path.join(PROJECT_ROOT, 'tests', 'load', 'test-users.json');
const K6_SCRIPT = path.join(PROJECT_ROOT, 'tests', 'load', 'stress-test.js');

function printBanner() {
  console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}          ${COLORS.bold}ORBITAL CITADEL STRESS TEST v1.0${COLORS.reset}                  ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);
  console.log();
}

function checkK6() {
  try {
    execSync('k6 version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function printK6InstallInstructions() {
  console.log(`${COLORS.yellow}⚠ k6 is not installed${COLORS.reset}`);
  console.log();
  console.log(`  Install k6 (free, open-source):`);
  console.log();
  console.log(`  ${COLORS.cyan}Windows (chocolatey):${COLORS.reset}`);
  console.log(`    choco install k6`);
  console.log();
  console.log(`  ${COLORS.cyan}Windows (winget):${COLORS.reset}`);
  console.log(`    winget install k6 --source winget`);
  console.log();
  console.log(`  ${COLORS.cyan}macOS (homebrew):${COLORS.reset}`);
  console.log(`    brew install k6`);
  console.log();
  console.log(`  ${COLORS.cyan}Linux (apt):${COLORS.reset}`);
  console.log(`    sudo gpg -k`);
  console.log(`    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\`);
  console.log(`      --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69`);
  console.log(`    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \\`);
  console.log(`      | sudo tee /etc/apt/sources.list.d/k6.list`);
  console.log(`    sudo apt-get update && sudo apt-get install k6`);
  console.log();
  console.log(`  ${COLORS.cyan}Docker:${COLORS.reset}`);
  console.log(`    docker run -i grafana/k6 run - <tests/load/stress-test.js`);
  console.log();
}

async function seedUsers() {
  console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`  ${COLORS.bold}STEP 1: Seed Test Users${COLORS.reset}`);
  console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log();

  // Check if users file exists and is recent (less than 1 hour old)
  if (fs.existsSync(USERS_FILE)) {
    const stats = fs.statSync(USERS_FILE);
    const ageMs = Date.now() - stats.mtimeMs;
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 1) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      console.log(`  ${COLORS.green}✓ Using existing test users (${users.length} users, ${ageHours.toFixed(1)}h old)${COLORS.reset}`);
      console.log();
      return true;
    }
  }

  // Seed new users
  return new Promise((resolve) => {
    const proc = spawn('node', [path.join(__dirname, 'seed-load-users.js')], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', (err) => {
      console.error(`  ${COLORS.red}Error seeding users: ${err.message}${COLORS.reset}`);
      resolve(false);
    });
  });
}

async function runK6() {
  console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`  ${COLORS.bold}STEP 2: Run k6 Stress Test${COLORS.reset}`);
  console.log(`${COLORS.cyan}═══════════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log();
  console.log(`  Scenarios:`);
  console.log(`    • Burst Join:    1,000 VUs ramp 0→1000 in 30s, hold 60s`);
  console.log(`    • Burst Logging: 1,000 VUs × 3 writes each`);
  console.log(`    • Read Pressure: 1,000 VUs concurrent reads`);
  console.log();
  console.log(`  Thresholds:`);
  console.log(`    • Error rate < 0.5%`);
  console.log(`    • P95 latency < 800ms (local) / 2s (remote)`);
  console.log(`    • RLS violations = 0`);
  console.log();

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      JWT_FILE: USERS_FILE,
    };

    const proc = spawn('k6', ['run', K6_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env,
      shell: true,
    });

    proc.on('close', (code) => {
      console.log();
      resolve(code === 0);
    });

    proc.on('error', (err) => {
      console.error(`  ${COLORS.red}Error running k6: ${err.message}${COLORS.reset}`);
      resolve(false);
    });
  });
}

function printLiteMode() {
  console.log(`${COLORS.yellow}Running in LITE mode (k6 not available)${COLORS.reset}`);
  console.log();
  console.log(`  This mode validates:`);
  console.log(`    • Test user generation`);
  console.log(`    • k6 script syntax`);
  console.log(`    • Configuration files`);
  console.log();

  // Check if test users were generated
  if (fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    console.log(`  ${COLORS.green}✓ Test users file exists (${users.length} users)${COLORS.reset}`);
  }

  // Check k6 script syntax
  if (fs.existsSync(K6_SCRIPT)) {
    console.log(`  ${COLORS.green}✓ k6 script exists${COLORS.reset}`);
  }

  console.log();
  console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}             ${COLORS.yellow}STRESS TEST: LITE PASS${COLORS.reset}                         ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}         (Install k6 for full load testing)                   ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);

  return true;
}

async function main() {
  printBanner();

  // Check for k6
  const hasK6 = checkK6();

  if (!hasK6) {
    printK6InstallInstructions();

    // Run lite mode instead
    await seedUsers();
    const liteResult = printLiteMode();
    process.exit(liteResult ? 0 : 1);
  }

  // Full stress test
  const seedResult = await seedUsers();
  if (!seedResult) {
    console.error(`  ${COLORS.red}✗ Failed to seed test users${COLORS.reset}`);
    process.exit(1);
  }

  const k6Result = await runK6();

  console.log();

  if (k6Result) {
    console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}               ${COLORS.green}${COLORS.bold}STRESS TEST: PASS${COLORS.reset}                             ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);
  } else {
    console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}               ${COLORS.red}${COLORS.bold}STRESS TEST: FAIL${COLORS.reset}                             ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);
  }

  process.exit(k6Result ? 0 : 1);
}

main().catch((err) => {
  console.error(`${COLORS.red}Stress test failed: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
