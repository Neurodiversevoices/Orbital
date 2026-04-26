#!/usr/bin/env node
// EAS build post-install vault check.
// Verifies required secrets are present (non-fatal if absent — CI continues).
const required = ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EXPO_PUBLIC_SUPABASE_URL'];
let ok = true;
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[vault-check] WARNING: ${key} not set`);
  } else {
    const val = process.env[key];
    if (val.startsWith('sk_')) {
      console.error(`[vault-check] FATAL: ${key} contains a secret key (sk_). Use public key only.`);
      process.exit(1);
    }
    console.log(`[vault-check] OK: ${key} set (${val.slice(0, 8)}...)`);
  }
}
console.log('[vault-check] done');
process.exit(0);
