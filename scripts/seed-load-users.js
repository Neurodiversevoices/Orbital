#!/usr/bin/env node

/**
 * Orbital Load Test User Seeder
 *
 * Generates 1,000 test users for stress testing.
 * Uses local Supabase (docker) or admin API to bypass email confirmation.
 *
 * Usage:
 *   node scripts/seed-load-users.js
 *   node scripts/seed-load-users.js --count=500
 *   node scripts/seed-load-users.js --output=custom-users.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const USER_COUNT = parseInt(args.count) || 1000;
const OUTPUT_FILE = args.output || path.join(__dirname, '..', 'tests', 'load', 'test-users.json');

// Supabase config (defaults to local)
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

console.log(`${COLORS.cyan}╔═══════════════════════════════════════════════════════════════╗${COLORS.reset}`);
console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
console.log(`${COLORS.cyan}║${COLORS.reset}          ${COLORS.bold}ORBITAL LOAD TEST USER SEEDER${COLORS.reset}                      ${COLORS.cyan}║${COLORS.reset}`);
console.log(`${COLORS.cyan}║${COLORS.reset}                                                               ${COLORS.cyan}║${COLORS.reset}`);
console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════════╝${COLORS.reset}`);
console.log();

async function checkSupabaseConnection() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    return response.ok || response.status === 404; // 404 is OK, means Supabase is up
  } catch (e) {
    return false;
  }
}

async function createUserViaAdminAPI(email, password) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          is_load_test_user: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create user: ${error}`);
    }

    return await response.json();
  } catch (e) {
    throw e;
  }
}

async function generateJWT(userId, email) {
  // For local testing, we generate a simple mock JWT structure
  // In production tests with real Supabase, we'd use the actual auth flow

  const header = Buffer.from(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT'
  })).toString('base64url');

  const payload = Buffer.from(JSON.stringify({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    sub: userId,
    email: email,
    role: 'authenticated',
    iss: 'supabase-demo',
  })).toString('base64url');

  // Note: This is a mock signature. Real JWTs would be signed with the secret.
  const signature = crypto
    .createHmac('sha256', 'your-super-secret-jwt-token-with-at-least-32-characters-long')
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

async function generateMockUsers() {
  console.log(`${COLORS.yellow}⚠ Supabase not available - generating mock users${COLORS.reset}`);
  console.log(`  These users will work for k6 script structure testing.`);
  console.log(`  For full integration tests, start local Supabase first.`);
  console.log();

  const users = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const userId = crypto.randomUUID();
    const email = `loadtest${i}@orbital.local`;
    const jwt = await generateJWT(userId, email);

    users.push({
      id: userId,
      email,
      jwt,
      password: `LoadTest${i}!Secure`,
    });

    if ((i + 1) % 100 === 0 || i === USER_COUNT - 1) {
      process.stdout.write(`\r  Generated ${i + 1}/${USER_COUNT} mock users...`);
    }
  }

  console.log();
  return users;
}

async function generateRealUsers() {
  console.log(`${COLORS.green}✓ Connected to Supabase at ${SUPABASE_URL}${COLORS.reset}`);
  console.log(`  Creating ${USER_COUNT} real test users...`);
  console.log();

  const users = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < USER_COUNT; i++) {
    const email = `loadtest${i}@orbital.local`;
    const password = `LoadTest${i}!Secure`;

    try {
      const user = await createUserViaAdminAPI(email, password);

      // Get JWT by signing in
      const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      let jwt = SUPABASE_SERVICE_KEY; // Fallback
      if (signInRes.ok) {
        const signInData = await signInRes.json();
        jwt = signInData.access_token;
      }

      users.push({
        id: user.id,
        email,
        jwt,
        password,
      });

      created++;
    } catch (e) {
      // User might already exist
      skipped++;
    }

    if ((i + 1) % 50 === 0 || i === USER_COUNT - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${USER_COUNT} (created: ${created}, skipped: ${skipped})...`);
    }

    // Rate limit protection
    if (i > 0 && i % 100 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log();
  return users;
}

async function main() {
  console.log(`  Config:`);
  console.log(`    Supabase URL: ${SUPABASE_URL}`);
  console.log(`    User Count: ${USER_COUNT}`);
  console.log(`    Output File: ${OUTPUT_FILE}`);
  console.log();

  // Check Supabase connection
  const isConnected = await checkSupabaseConnection();

  let users;
  if (isConnected && !SUPABASE_URL.includes('localhost')) {
    // Real Supabase - create real users
    users = await generateRealUsers();
  } else if (isConnected) {
    // Local Supabase - try to create real users
    try {
      users = await generateRealUsers();
    } catch (e) {
      console.log(`${COLORS.yellow}  Could not create real users: ${e.message}${COLORS.reset}`);
      users = await generateMockUsers();
    }
  } else {
    // No Supabase - generate mock users
    users = await generateMockUsers();
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write users to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2));

  console.log();
  console.log(`${COLORS.green}✓ Generated ${users.length} test users${COLORS.reset}`);
  console.log(`${COLORS.green}✓ Saved to: ${OUTPUT_FILE}${COLORS.reset}`);
  console.log();
  console.log(`${COLORS.cyan}To run stress test:${COLORS.reset}`);
  console.log(`  k6 run tests/load/stress-test.js`);
  console.log();
}

main().catch((err) => {
  console.error(`${COLORS.red}Error: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
