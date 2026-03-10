#!/usr/bin/env node
/**
 * Upsert Apple Review demo account
 *
 * Uses the Supabase service-role key to create or reset the reviewer
 * account with a confirmed email so Apple's review team can sign in
 * with email + password.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/upsert-review-account.js
 */

const REVIEW_EMAIL = 'review@orbital.health';
const REVIEW_PASSWORD = 'Review2026!';

async function main() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('YOUR_PROJECT')) {
    console.error('ERROR: Set SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
    process.exit(1);
  }
  if (!serviceKey || serviceKey.includes('REPLACE')) {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Check if user already exists
  const listRes = await fetch(
    `${url}/auth/v1/admin/users?page=1&per_page=50`,
    { headers },
  );
  if (!listRes.ok) {
    console.error('Failed to list users:', listRes.status, await listRes.text());
    process.exit(1);
  }
  const { users } = await listRes.json();
  const existing = users.find((u) => u.email === REVIEW_EMAIL);

  if (existing) {
    // 2a. Update existing user — reset password + confirm
    console.log(`User ${REVIEW_EMAIL} exists (${existing.id}). Resetting password...`);
    const updateRes = await fetch(
      `${url}/auth/v1/admin/users/${existing.id}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          password: REVIEW_PASSWORD,
          email_confirm: true,
        }),
      },
    );
    if (!updateRes.ok) {
      console.error('Failed to update user:', updateRes.status, await updateRes.text());
      process.exit(1);
    }
    console.log('Password reset and email confirmed.');
  } else {
    // 2b. Create new user
    console.log(`Creating ${REVIEW_EMAIL}...`);
    const createRes = await fetch(
      `${url}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: REVIEW_EMAIL,
          password: REVIEW_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: 'Apple Reviewer' },
        }),
      },
    );
    if (!createRes.ok) {
      console.error('Failed to create user:', createRes.status, await createRes.text());
      process.exit(1);
    }
    const created = await createRes.json();
    console.log(`Created user ${created.id}`);
  }

  // 3. Verify sign-in works
  console.log('Verifying sign-in...');
  const signInRes = await fetch(
    `${url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
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
    console.error(`Sign-in verification FAILED (${signInRes.status}):`, body);
    process.exit(1);
  }

  const session = await signInRes.json();
  console.log(`Sign-in verified. User ID: ${session.user.id}`);
  console.log('Demo account ready for Apple Review.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
