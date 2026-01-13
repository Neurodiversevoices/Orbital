/**
 * Orbital Citadel Stress Test
 *
 * Simulates 1,000 users joining at once with:
 * - Burst Join: 1,000 VUs join over 30s, hold 60s
 * - Burst Logging: 1,000 VUs each write 3 capacity logs
 * - Read Pressure: 1,000 VUs read patterns/dashboard data
 *
 * Run with: k6 run tests/load/stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { config, thresholds, endpoints, getHeaders } from './config.js';

// Custom metrics
const rlsViolations = new Counter('rls_violations');
const authFailures = new Rate('auth_failures');
const joinLatency = new Trend('join_latency', true);
const logLatency = new Trend('log_latency', true);
const readLatency = new Trend('read_latency', true);

// Load pre-generated test users (JWTs)
// If file doesn't exist, we'll generate mock tokens
let testUsers;
try {
  testUsers = new SharedArray('users', function () {
    // In k6, we'd load from file. For now, generate mock users.
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        id: `test-user-${i}`,
        email: `loadtest${i}@orbital.local`,
        // Mock JWT - in real test, this would be a real Supabase JWT
        jwt: config.supabaseAnonKey,
      });
    }
    return users;
  });
} catch (e) {
  // Fallback for when SharedArray fails
  testUsers = [];
  for (let i = 0; i < 1000; i++) {
    testUsers.push({
      id: `test-user-${i}`,
      email: `loadtest${i}@orbital.local`,
      jwt: config.supabaseAnonKey,
    });
  }
}

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Burst Join
    burst_join: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 }, // Ramp to 1000 over 30s
        { duration: '60s', target: 1000 }, // Hold at 1000 for 60s
        { duration: '10s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '10s',
      exec: 'burstJoin',
    },

    // Scenario 2: Burst Logging (starts after join)
    burst_logging: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '100s', // Start after burst_join completes
      stages: [
        { duration: '20s', target: 1000 },
        { duration: '40s', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
      exec: 'burstLogging',
    },

    // Scenario 3: Read Pressure (starts after logging)
    read_pressure: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '170s', // Start after burst_logging
      stages: [
        { duration: '20s', target: 1000 },
        { duration: '30s', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
      exec: 'readPressure',
    },
  },

  thresholds: {
    ...thresholds,
    'join_latency': ['p(95)<1000'],
    'log_latency': ['p(95)<500'],
    'read_latency': ['p(95)<300'],
  },
};

// Get user for this VU
function getUser() {
  const vuId = __VU % testUsers.length;
  return testUsers[vuId];
}

// Scenario 1: Burst Join
export function burstJoin() {
  const user = getUser();
  const headers = getHeaders(user.jwt);

  group('Burst Join', () => {
    // Simulate join flow - check if user can access their profile
    const profileRes = http.get(
      `${config.supabaseUrl}${endpoints.userProfiles}?id=eq.${user.id}`,
      { headers, tags: { name: 'get_profile' } }
    );

    const startTime = Date.now();

    // Check response
    const success = check(profileRes, {
      'join: status is 200': (r) => r.status === 200,
      'join: no auth error': (r) => r.status !== 401 && r.status !== 403,
      'join: response has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return true; // Empty response is OK for new user
        }
      },
    });

    joinLatency.add(Date.now() - startTime);

    if (profileRes.status === 401 || profileRes.status === 403) {
      authFailures.add(1);
    }

    // Check for RLS violations (seeing other users' data)
    if (profileRes.status === 200) {
      try {
        const body = JSON.parse(profileRes.body);
        if (Array.isArray(body) && body.length > 0) {
          const hasViolation = body.some(row => row.id !== user.id);
          if (hasViolation) {
            rlsViolations.add(1);
          }
        }
      } catch {
        // Parse error is not an RLS violation
      }
    }
  });

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

// Scenario 2: Burst Logging
export function burstLogging() {
  const user = getUser();
  const headers = getHeaders(user.jwt);

  group('Burst Logging', () => {
    // Each user logs 3 capacity entries
    for (let i = 0; i < 3; i++) {
      const logData = {
        user_id: user.id,
        capacity_state: ['resourced', 'stretched', 'depleted'][Math.floor(Math.random() * 3)],
        logged_at: new Date().toISOString(),
        notes: `Load test entry ${i + 1}`,
      };

      const startTime = Date.now();

      const logRes = http.post(
        `${config.supabaseUrl}${endpoints.capacityLogs}`,
        JSON.stringify(logData),
        { headers, tags: { name: 'log_capacity' } }
      );

      logLatency.add(Date.now() - startTime);

      const success = check(logRes, {
        'log: status is 201': (r) => r.status === 201,
        'log: no 429 rate limit': (r) => r.status !== 429,
        'log: no auth error': (r) => r.status !== 401 && r.status !== 403,
      });

      if (logRes.status === 401 || logRes.status === 403) {
        authFailures.add(1);
      }

      // Short delay between logs
      sleep(0.1 + Math.random() * 0.2);
    }
  });

  sleep(Math.random() * 1 + 0.5);
}

// Scenario 3: Read Pressure
export function readPressure() {
  const user = getUser();
  const headers = getHeaders(user.jwt);

  group('Read Pressure', () => {
    // Read patterns/history
    const startTime = Date.now();

    const patternsRes = http.get(
      `${config.supabaseUrl}${endpoints.capacityLogs}?user_id=eq.${user.id}&order=logged_at.desc&limit=50`,
      { headers, tags: { name: 'read_patterns' } }
    );

    readLatency.add(Date.now() - startTime);

    const success = check(patternsRes, {
      'read: status is 200': (r) => r.status === 200,
      'read: response is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
      'read: no RLS leak': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (!Array.isArray(body)) return true;
          // All rows should belong to this user
          return body.every(row => row.user_id === user.id);
        } catch {
          return true;
        }
      },
    });

    // Check for RLS violations
    if (patternsRes.status === 200) {
      try {
        const body = JSON.parse(patternsRes.body);
        if (Array.isArray(body)) {
          const hasViolation = body.some(row => row.user_id !== user.id);
          if (hasViolation) {
            rlsViolations.add(1);
          }
        }
      } catch {
        // Parse error
      }
    }
  });

  sleep(Math.random() * 0.5 + 0.2);
}

// Summary handler
export function handleSummary(data) {
  const passed = data.metrics.http_req_failed?.values?.rate < 0.005 &&
                 (data.metrics.rls_violations?.values?.count || 0) === 0;

  const summary = {
    '╔═══════════════════════════════════════════════════════════════╗': 1,
    '║           ORBITAL CITADEL STRESS TEST RESULTS                ║': 1,
    '╠═══════════════════════════════════════════════════════════════╣': 1,
    '║  Scenarios Executed:                                         ║': 1,
    '║    - Burst Join: 1,000 VUs                                   ║': 1,
    '║    - Burst Logging: 1,000 VUs × 3 writes each                ║': 1,
    '║    - Read Pressure: 1,000 VUs                                ║': 1,
    '╠═══════════════════════════════════════════════════════════════╣': 1,
    '║  Key Metrics:                                                ║': 1,
  };

  // Add metrics
  const reqFailed = data.metrics.http_req_failed?.values?.rate || 0;
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 0;
  const rlsCount = data.metrics.rls_violations?.values?.count || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           ORBITAL CITADEL STRESS TEST RESULTS                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Scenarios Executed:                                         ║');
  console.log('║    • Burst Join: 1,000 VUs                                   ║');
  console.log('║    • Burst Logging: 1,000 VUs × 3 writes each                ║');
  console.log('║    • Read Pressure: 1,000 VUs                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  Key Metrics:                                                ║');
  console.log(`║    Total Requests:    ${String(totalReqs).padEnd(39)}║`);
  console.log(`║    Error Rate:        ${(reqFailed * 100).toFixed(3)}%${' '.repeat(34)}║`);
  console.log(`║    P95 Latency:       ${p95.toFixed(0)}ms${' '.repeat(35)}║`);
  console.log(`║    P99 Latency:       ${p99.toFixed(0)}ms${' '.repeat(35)}║`);
  console.log(`║    RLS Violations:    ${rlsCount}${' '.repeat(39)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');

  if (passed) {
    console.log('║                                                               ║');
    console.log('║               ✓ STRESS TEST: PASS                             ║');
    console.log('║                                                               ║');
  } else {
    console.log('║                                                               ║');
    console.log('║               ✗ STRESS TEST: FAIL                             ║');
    console.log('║                                                               ║');
  }

  console.log('╚═══════════════════════════════════════════════════════════════╝');

  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
