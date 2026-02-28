#!/usr/bin/env npx tsx
/**
 * CCI Edge Function Test Script
 *
 * Tests the generate-cci Edge Function end-to-end:
 *   1. Unauthorized user → 403 ENTITLEMENT_REQUIRED
 *   2. Seed test data (30 days of capacity_logs + entitlement)
 *   3. Authorized user → 200 with structured CCI JSON
 *   4. Validate response shape
 *   5. Clean up test data
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/test-cci-edge-function.ts
 *
 * Or with .env:
 *   npx tsx --env-file=.env scripts/test-cci-edge-function.ts
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIG
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL
  || process.env.EXPO_PUBLIC_SUPABASE_URL
  || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Set them as env vars or use --env-file=.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Test user ID — a UUID that won't collide with real users
const TEST_USER_ID = '00000000-0000-0000-0000-000000cccccc';

const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/generate-cci`;

// =============================================================================
// HELPERS
// =============================================================================

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const DRIVERS = ['sensory', 'sleep', 'stress', 'social', 'cognitive', 'physical', 'emotional', 'nutrition'];

function randomDriverData(): Record<string, number> {
  const data: Record<string, number> = {};
  for (const d of DRIVERS) {
    data[d] = Math.random() > 0.5 ? 1 : 0;
  }
  return data;
}

const STATES = ['green', 'yellow', 'red', 'black'] as const;
function capacityToState(cv: number): string {
  if (cv >= 0.7) return 'green';
  if (cv >= 0.4) return 'yellow';
  if (cv >= 0.2) return 'red';
  return 'black';
}

// =============================================================================
// SEED
// =============================================================================

async function seedTestData(): Promise<void> {
  console.log('📦 Seeding 30 days of test capacity_logs...');

  const now = new Date();
  const logs: any[] = [];

  for (let dayOffset = -30; dayOffset <= 0; dayOffset++) {
    const date = addDays(now, dayOffset);
    // 1-3 logs per day
    const logsPerDay = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < logsPerDay; j++) {
      const cv = randomFloat(0.15, 0.95);
      logs.push({
        user_id: TEST_USER_ID,
        occurred_at: date.toISOString(),
        state: capacityToState(cv),
        capacity_value: Math.round(cv * 1000) / 1000,
        driver_data: randomDriverData(),
        confidence_flags: {
          consistent_pattern: Math.random() > 0.3,
          outlier: Math.random() > 0.8,
          regular_logger: Math.random() > 0.2,
          time_consistent: Math.random() > 0.1,
        },
        is_demo: false,
        tags: [],
      });
    }
  }

  const { error: logErr } = await supabase.from('capacity_logs').insert(logs);
  if (logErr) {
    console.error('❌ Failed to seed logs:', logErr.message);
    throw logErr;
  }
  console.log(`   ✅ Inserted ${logs.length} capacity_logs`);

  // Seed a baseline
  console.log('📦 Seeding capacity_baseline...');
  const { error: baseErr } = await supabase.from('capacity_baselines').insert({
    user_id: TEST_USER_ID,
    data_window_start: addDays(now, -60).toISOString(),
    data_window_end: now.toISOString(),
    log_count: logs.length,
    baseline_capacity: 0.62,
    variability_index: 0.18,
    sensory_tolerance: 0.45,
    cognitive_resilience: 3.2,
    recovery_pattern: { avg_recovery_days: 3.2, fastest: 1, slowest: 7 },
    dominant_drivers: { sensory: 28, sleep: 22, stress: 18 },
    confidence_score: 0.5,
    version: '2.0',
  });
  if (baseErr) {
    console.error('❌ Failed to seed baseline:', baseErr.message);
    throw baseErr;
  }
  console.log('   ✅ Inserted capacity_baseline');
}

async function grantEntitlement(): Promise<void> {
  console.log('🔐 Granting cci_purchased entitlement...');
  const { error } = await supabase.from('user_entitlements').upsert({
    user_id: TEST_USER_ID,
    entitlement_id: 'cci_purchased',
    source: 'test_script',
  }, { onConflict: 'user_id,entitlement_id' });

  if (error) {
    console.error('❌ Failed to grant entitlement:', error.message);
    throw error;
  }
  console.log('   ✅ Entitlement granted');
}

async function revokeEntitlement(): Promise<void> {
  await supabase
    .from('user_entitlements')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('entitlement_id', 'cci_purchased');
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanup(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  const [r1, r2, r3, r4] = await Promise.all([
    supabase.from('capacity_logs').delete().eq('user_id', TEST_USER_ID),
    supabase.from('capacity_baselines').delete().eq('user_id', TEST_USER_ID),
    supabase.from('user_entitlements').delete().eq('user_id', TEST_USER_ID),
    supabase.from('audit_events').delete().eq('user_id', TEST_USER_ID),
  ]);

  const errors = [r1, r2, r3, r4].filter(r => r.error);
  if (errors.length) {
    console.warn('   ⚠️ Some cleanup errors (non-fatal):', errors.map(e => e.error?.message));
  } else {
    console.log('   ✅ All test data removed');
  }
}

// =============================================================================
// CALL EDGE FUNCTION
// =============================================================================

async function callCCI(userId: string): Promise<{ status: number; body: any }> {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      user_id: userId,
      date_start: addDays(new Date(), -90).toISOString(),
      date_end: new Date().toISOString(),
    }),
  });

  const body = await res.json();
  return { status: res.status, body };
}

// =============================================================================
// TESTS
// =============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.error(`   ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

async function testUnauthorized(): Promise<void> {
  console.log('\n🔒 TEST 1: Unauthorized user (no entitlement) → 403');

  // Ensure no entitlement for test user
  await revokeEntitlement();

  const { status, body } = await callCCI(TEST_USER_ID);

  assert(status === 403, 'Status is 403', `Got ${status}`);
  assert(body.code === 'ENTITLEMENT_REQUIRED', 'Error code is ENTITLEMENT_REQUIRED', body.code);
  assert(Array.isArray(body.valid_entitlements), 'Lists valid entitlements');
}

async function testAuthorized(): Promise<void> {
  console.log('\n✅ TEST 2: Authorized user → 200 with CCI payload');

  await grantEntitlement();

  const { status, body } = await callCCI(TEST_USER_ID);

  assert(status === 200, 'Status is 200', `Got ${status}`);

  if (status !== 200) {
    console.error('   Response body:', JSON.stringify(body, null, 2));
    return;
  }

  // Validate payload shape
  assert(body.meta != null, 'Has meta object');
  assert(body.meta?.user_id === TEST_USER_ID, 'meta.user_id matches');
  assert(typeof body.meta?.total_signals === 'number', 'meta.total_signals is number');
  assert(typeof body.meta?.unique_days === 'number', 'meta.unique_days is number');
  assert(typeof body.meta?.data_quality_score === 'number', 'meta.data_quality_score is number');

  assert(body.scores != null, 'Has scores object');
  assert(typeof body.scores?.current_capacity === 'number' || body.scores?.current_capacity === null, 'scores.current_capacity is number or null');
  assert(typeof body.scores?.baseline_capacity === 'number', 'scores.baseline_capacity is number');
  assert(['improving', 'declining', 'stable'].includes(body.scores?.trend_direction), 'scores.trend_direction is valid');
  assert(typeof body.scores?.stability_score === 'number', 'scores.stability_score is number');

  assert(body.drivers != null, 'Has drivers object');
  assert(Array.isArray(body.drivers?.top_5), 'drivers.top_5 is array');
  assert(body.drivers.top_5.length <= 5, 'drivers.top_5 has ≤5 items');
  if (body.drivers.top_5.length > 0) {
    const first = body.drivers.top_5[0];
    assert(typeof first.driver === 'string', 'First driver has name');
    assert(typeof first.count === 'number', 'First driver has count');
    assert(typeof first.pct === 'number', 'First driver has pct');
  }

  assert(body.overload != null, 'Has overload object');
  assert(typeof body.overload?.event_count === 'number', 'overload.event_count is number');
  assert(Array.isArray(body.overload?.dates), 'overload.dates is array');

  assert(body.recovery != null, 'Has recovery object');
  assert(['raw_logs', 'baseline', 'none'].includes(body.recovery?.measured_from), 'recovery.measured_from is valid');

  assert(body.forecast != null, 'Has forecast object');
  assert(body.forecast?.method === 'weighted_linear_regression', 'forecast.method is weighted_linear_regression');
  assert(Array.isArray(body.forecast?.points), 'forecast.points is array');
  assert(typeof body.forecast?.slope_per_day === 'number', 'forecast.slope_per_day is number');
  assert(typeof body.forecast?.r_squared === 'number', 'forecast.r_squared is number');

  if (body.forecast.points.length > 0) {
    const lastPoint = body.forecast.points[body.forecast.points.length - 1];
    assert(lastPoint.predicted_capacity >= 0 && lastPoint.predicted_capacity <= 1, 'Forecast clamped 0-1');
    assert(body.forecast.points.length === 42, 'Forecast has 42 points (6 weeks)');
  }

  // Print summary
  console.log('\n📊 CCI Summary:');
  console.log(`   Current capacity: ${body.scores.current_capacity}`);
  console.log(`   Baseline: ${body.scores.baseline_capacity}`);
  console.log(`   Delta: ${body.scores.delta_from_baseline}`);
  console.log(`   Stability: ${body.scores.stability_score}/100`);
  console.log(`   Trend: ${body.scores.trend_direction} (Δ${body.scores.trend_delta})`);
  console.log(`   Top driver: ${body.drivers.top_5[0]?.driver} (${body.drivers.top_5[0]?.pct}%)`);
  console.log(`   Overload events: ${body.overload.event_count}`);
  console.log(`   Recovery: ${body.recovery.avg_recovery_days ?? 'N/A'} days (${body.recovery.measured_from})`);
  console.log(`   Forecast slope: ${body.forecast.slope_per_day}/day (R²=${body.forecast.r_squared})`);
}

async function testAuditTrail(): Promise<void> {
  console.log('\n📝 TEST 3: Audit trail written');

  const { data, error } = await supabase
    .from('audit_events')
    .select('action, details')
    .eq('user_id', TEST_USER_ID)
    .in('action', ['cci_generation_success', 'cci_generation_denied'])
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('   ❌ Failed to query audit_events:', error.message);
    failed++;
    return;
  }

  assert(data && data.length >= 2, `Found ≥2 audit events`, `Found ${data?.length}`);

  const actions = data?.map(e => e.action) || [];
  assert(actions.includes('cci_generation_denied'), 'Has denied event');
  assert(actions.includes('cci_generation_success'), 'Has success event');
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🧪 CCI Edge Function Test Suite');
  console.log(`   URL: ${EDGE_FN_URL}`);
  console.log(`   Test user: ${TEST_USER_ID}`);

  try {
    // Seed data
    await cleanup(); // Start clean
    await seedTestData();

    // Run tests
    await testUnauthorized();
    await testAuthorized();
    await testAuditTrail();

  } finally {
    // Always clean up
    await cleanup();
  }

  // Results
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
