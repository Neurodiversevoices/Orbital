#!/usr/bin/env node
// Injects Supabase credentials into dist/dashboard.html at build time.
// Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the
// environment (set in Vercel project settings) and writes them into the two
// <meta> tags that dashboard.html reads on load.
// Must run AFTER expo export so dist/dashboard.html already exists.

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const DASHBOARD = path.join(DIST, 'dashboard.html');
const RESET_PW = path.join(DIST, 'reset-password.html');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[inject-dashboard-config] WARNING: EXPO_PUBLIC_SUPABASE_URL or ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Static pages will show ' +
    '"Supabase not configured".'
  );
}

function injectSupabaseConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[inject-dashboard-config] SKIP: ${path.basename(filePath)} not found in dist/.`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(
    /<meta name="supabase-url" content="[^"]*">/,
    `<meta name="supabase-url" content="${supabaseUrl}">`
  );
  html = html.replace(
    /<meta name="supabase-anon-key" content="[^"]*">/,
    `<meta name="supabase-anon-key" content="${supabaseKey}">`
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[inject-dashboard-config] Supabase config injected into ${path.basename(filePath)}`);
}

if (!fs.existsSync(DASHBOARD)) {
  console.error('[inject-dashboard-config] ERROR: dist/dashboard.html not found. Run expo export first.');
  process.exit(1);
}

injectSupabaseConfig(DASHBOARD);
injectSupabaseConfig(RESET_PW);
