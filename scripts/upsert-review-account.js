#!/usr/bin/env node
/**
 * Fix Apple Review demo account
 *
 * Uses Supabase service-role key to create or force-reset the reviewer
 * account. Verifies sign-in with ANON key (simulates app behavior).
 * No email flow — direct admin fix only.
 *
 * Usage:
 *   source .env.local  # or: node --env-file=.env.local scripts/upsert-review-account.js
 *   node scripts/upsert-review-account.js
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

const REVIEW_EMAIL = 'review@orbital.health';
const REVIEW_PASSWORD = 'Review2026!';

async function main() {
  let url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (url && !url.startsWith('http')) {
    url = url.startsWith('://') ? `https${url}` : `https://${url}`;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || url.includes('YOUR_PROJECT')) {
    console.error('ERROR: Set SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
    process.exit(1);
  }
  if (!serviceKey || serviceKey.includes('REPLACE')) {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const useAnonForVerify = anonKey && !anonKey.includes('YOUR_ANON');
  if (!useAnonForVerify) {
    console.log('Note: EXPO_PUBLIC_SUPABASE_ANON_KEY not set — will verify with service key.');
  }

  const adminHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Check auth.users for review@orbital.health
  console.log('1. Checking auth.users for', REVIEW_EMAIL, '...');
  let listRes = await fetch(
    `${url}/auth/v1/admin/users?page=1&per_page=1000`,
    { headers: adminHeaders },
  );
  if (!listRes.ok) {
    console.error('Failed to list users:', listRes.status, await listRes.text());
    process.exit(1);
  }
  let { users } = await listRes.json();
  let existing = users.find((u) => u.email === REVIEW_EMAIL);

  // Paginate if not found (admin API returns 50 per page by default, we requested 1000)
  if (!existing && users.length >= 50) {
    let page = 2;
    while (true) {
      listRes = await fetch(
        `${url}/auth/v1/admin/users?page=${page}&per_page=100`,
        { headers: adminHeaders },
      );
      if (!listRes.ok) break;
      const data = await listRes.json();
      users = data.users;
      existing = users.find((u) => u.email === REVIEW_EMAIL);
      if (existing || !users.length) break;
      page++;
    }
  }

  if (existing) {
    // 2a. Force-reset password + confirm email (direct admin update)
    console.log('2. User exists. Force-resetting password and confirming email...');
    const updateRes = await fetch(
      `${url}/auth/v1/admin/users/${existing.id}`,
      {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          password: REVIEW_PASSWORD,
          email_confirm: true,
        }),
      },
    );
    if (!updateRes.ok) {
      const body = await updateRes.text();
      console.error('Failed to update user:', updateRes.status, body);
      process.exit(1);
    }
    console.log('   Password reset. email_confirmed_at set.');
  } else {
    // 2b. Create user with email_confirmed_at
    console.log('2. User not found. Creating...');
    const createRes = await fetch(
      `${url}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: REVIEW_EMAIL,
          password: REVIEW_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: 'Apple Reviewer' },
        }),
      },
    );
    if (!createRes.ok) {
      const body = await createRes.text();
      console.error('Failed to create user:', createRes.status, body);
      process.exit(1);
    }
    const created = await createRes.json();
    existing = { id: created.id, email: REVIEW_EMAIL };
    console.log('   Created user', existing.id);
  }

  // 3. Verify sign-in (anon key = app simulation; else service key)
  const verifyKey = useAnonForVerify ? anonKey : serviceKey;
  console.log('3. Verifying sign-in', useAnonForVerify ? '(anon key, app simulation)' : '(service key)', '...');
  const signInRes = await fetch(
    `${url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: verifyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: REVIEW_EMAIL,
        password: REVIEW_PASSWORD,
      }),
    },
  );

  if (!signInRes.ok) {
    const body = await signInRes.text();
    console.error('Sign-in FAILED (anon key):', signInRes.status, body);
    process.exit(1);
  }

  const session = await signInRes.json();
  const accessToken = session.access_token;
  const userId = session.user.id;

  console.log('   Sign-in OK. User UUID:', userId);

  // 4. Verify RLS — query as authenticated user (anon key required; service key bypasses RLS)
  if (useAnonForVerify) {
    console.log('4. Verifying RLS (capacity_logs select)...');
    const rlsRes = await fetch(
      `${url}/rest/v1/capacity_logs?select=id&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!rlsRes.ok && rlsRes.status !== 406) {
      console.error('RLS check failed:', rlsRes.status, await rlsRes.text());
      process.exit(1);
    }
    console.log('   RLS OK (authenticated user can query own data).');
  } else {
    console.log('4. Skipping RLS check (anon key not set).');
  }

  // 5. Report
  console.log('');
  console.log('=== DEMO ACCOUNT READY FOR APP STORE REVIEW ===');
  console.log('Email:    ', REVIEW_EMAIL);
  console.log('Password: ', REVIEW_PASSWORD);
  console.log('User UUID:', userId);
  console.log('');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
