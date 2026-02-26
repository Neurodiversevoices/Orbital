/**
 * inject-dashboard-config.js
 *
 * Bakes Supabase credentials into dist/dashboard.html at build time.
 *
 * Vercel exposes EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * during the build (same vars used by the native app). This script reads those
 * values and writes them into the two empty meta tags the dashboard JS reads:
 *
 *   <meta name="supabase-url" content="">
 *   <meta name="supabase-anon-key" content="">
 *
 * The dashboard's JS checks window.ORBITAL_DASHBOARD_CONFIG first, so local
 * overrides via that global still take precedence over the baked-in values.
 *
 * Safe to run when env vars are absent (warns but doesn't crash) so local
 * dev builds don't break for engineers who haven't set those vars.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn(
    '[inject-dashboard-config] WARNING: EXPO_PUBLIC_SUPABASE_URL and/or ' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. dashboard.html will be ' +
    'deployed with empty credentials and will show the config error screen.'
  );
}

const file = path.join(__dirname, '..', 'dist', 'dashboard.html');

if (!fs.existsSync(file)) {
  console.error('[inject-dashboard-config] ERROR: dist/dashboard.html not found. ' +
    'Make sure the cp step ran before this script.');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');

html = html.replace(
  '<meta name="supabase-url" content="">',
  `<meta name="supabase-url" content="${url}">`
);
html = html.replace(
  '<meta name="supabase-anon-key" content="">',
  `<meta name="supabase-anon-key" content="${key}">`
);

fs.writeFileSync(file, html, 'utf8');
console.log('[inject-dashboard-config] Injected Supabase credentials into dist/dashboard.html');
