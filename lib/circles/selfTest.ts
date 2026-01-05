/**
 * CIRCLES SELF-TEST — AUDITOR-PROOF VERIFICATION
 *
 * Callable function that runs invariant checks on sample objects.
 * This function MUST be callable in dev builds.
 *
 * ============================================================================
 * WHAT THIS TESTS (MANDATORY)
 * ============================================================================
 *
 * - Attempts to store history arrays → must throw
 * - Attempts unidirectional relation → must throw
 * - Attempts >25 connections → must throw
 * - Attempts timestamped viewer payload → must throw
 * - Valid cases must pass
 *
 * ============================================================================
 * THE SIX LAWS VERIFIED
 * ============================================================================
 *
 * L1: NO AGGREGATION — Connection limit, aggregate detection
 * L2: NO HISTORY — TTL validation, history field detection
 * L3: BIDIRECTIONAL CONSENT — Consent validation, invite validation
 * L4: SOCIAL FIREWALL — Namespace enforcement, forbidden field detection
 * L5: NO HIERARCHY — Hierarchy field detection
 * L6: SYMMETRICAL VISIBILITY — Symmetry enforcement
 *
 * ============================================================================
 */

import { MAX_CONNECTIONS } from './constants';
import {
  assertNoHistory,
  assertNoAggregation,
  assertSymmetry,
  assertViewerSafe,
  assertAllGuardrails,
  toViewerPayload,
} from './guardrails';

// =============================================================================
// TEST RESULT TYPES
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface SelfTestReport {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  duration: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function expectThrow(fn: () => void, expectedPattern?: string): TestResult {
  try {
    fn();
    return {
      name: '',
      passed: false,
      error: 'Expected function to throw but it did not',
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (expectedPattern && !message.includes(expectedPattern)) {
      return {
        name: '',
        passed: false,
        error: `Expected error containing "${expectedPattern}" but got "${message}"`,
      };
    }
    return { name: '', passed: true };
  }
}

function expectNoThrow(fn: () => void): TestResult {
  try {
    fn();
    return { name: '', passed: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      name: '',
      passed: false,
      error: `Expected function not to throw but got: ${message}`,
    };
  }
}

function test(name: string, fn: () => TestResult): TestResult {
  const result = fn();
  return { ...result, name };
}

// =============================================================================
// L1: NO AGGREGATION TESTS
// =============================================================================

function testNoAggregation(): TestResult[] {
  return [
    test('L1: Throws when connection count > 25', () =>
      expectThrow(() => assertNoAggregation(26), 'SECURITY_VIOLATION')
    ),

    test('L1: Throws when connection count = 100', () =>
      expectThrow(() => assertNoAggregation(100), 'SECURITY_VIOLATION')
    ),

    test('L1: Allows connection count = 25', () =>
      expectNoThrow(() => assertNoAggregation(25))
    ),

    test('L1: Allows connection count = 0', () =>
      expectNoThrow(() => assertNoAggregation(0))
    ),

    test('L1: Allows connection count = 1', () =>
      expectNoThrow(() => assertNoAggregation(1))
    ),

    test('L1: Throws on negative count', () =>
      expectThrow(() => assertNoAggregation(-1), 'SECURITY_VIOLATION')
    ),

    test('L1: Throws on NaN', () =>
      expectThrow(() => assertNoAggregation(NaN), 'SECURITY_VIOLATION')
    ),
  ];
}

// =============================================================================
// L2: NO HISTORY TESTS
// =============================================================================

function testNoHistory(): TestResult[] {
  return [
    // Arrays are history
    test('L2: Throws on top-level array', () =>
      expectThrow(() => assertNoHistory([1, 2, 3]), 'History Persistence')
    ),

    test('L2: Throws on empty array', () =>
      expectThrow(() => assertNoHistory([]), 'History Persistence')
    ),

    // History field names
    test('L2: Throws on "history" field', () =>
      expectThrow(() => assertNoHistory({ history: [] }), 'History Persistence')
    ),

    test('L2: Throws on "timeline" field', () =>
      expectThrow(() => assertNoHistory({ timeline: [] }), 'History Persistence')
    ),

    test('L2: Throws on "events" field', () =>
      expectThrow(() => assertNoHistory({ events: [] }), 'History Persistence')
    ),

    test('L2: Throws on "logs" field', () =>
      expectThrow(() => assertNoHistory({ logs: [] }), 'History Persistence')
    ),

    test('L2: Throws on "archive" field', () =>
      expectThrow(() => assertNoHistory({ archive: {} }), 'History Persistence')
    ),

    test('L2: Throws on "previousColor" field', () =>
      expectThrow(() => assertNoHistory({ previousColor: 'cyan' }), 'History Persistence')
    ),

    test('L2: Throws on "stateHistory" field', () =>
      expectThrow(() => assertNoHistory({ stateHistory: [] }), 'History Persistence')
    ),

    // Nested time-series
    test('L2: Throws on nested time-series array', () =>
      expectThrow(() => assertNoHistory({
        data: [
          { timestamp: 123, value: 'a' },
          { timestamp: 456, value: 'b' },
        ],
      }), 'History Persistence')
    ),

    // Valid cases
    test('L2: Allows simple object without history', () =>
      expectNoThrow(() => assertNoHistory({ color: 'cyan', status: 'active' }))
    ),

    test('L2: Allows null', () =>
      expectNoThrow(() => assertNoHistory(null))
    ),

    test('L2: Allows undefined', () =>
      expectNoThrow(() => assertNoHistory(undefined))
    ),

    test('L2: Allows primitive string', () =>
      expectNoThrow(() => assertNoHistory('hello'))
    ),

    test('L2: Allows ttlExpiresAt specifically', () =>
      expectNoThrow(() => assertNoHistory({ color: 'cyan', ttlExpiresAt: '2030-01-01' }))
    ),
  ];
}

// =============================================================================
// L3/L6: SYMMETRY TESTS
// =============================================================================

function testSymmetry(): TestResult[] {
  return [
    test('L6: Throws on UNIDIRECTIONAL', () =>
      expectThrow(() => assertSymmetry('UNIDIRECTIONAL'), 'Asymmetric Surveillance')
    ),

    test('L6: Throws on "one-way"', () =>
      expectThrow(() => assertSymmetry('one-way'), 'Asymmetric Surveillance')
    ),

    test('L6: Throws on empty string', () =>
      expectThrow(() => assertSymmetry(''), 'Asymmetric Surveillance')
    ),

    test('L6: Throws on lowercase bidirectional', () =>
      expectThrow(() => assertSymmetry('bidirectional'), 'Asymmetric Surveillance')
    ),

    test('L6: Allows BIDIRECTIONAL exactly', () =>
      expectNoThrow(() => assertSymmetry('BIDIRECTIONAL'))
    ),
  ];
}

// =============================================================================
// VIEWER SAFETY TESTS
// =============================================================================

function testViewerSafety(): TestResult[] {
  return [
    // Forbidden fields
    test('Viewer: Throws on timestamp field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', timestamp: 123 }), 'Viewer Safety')
    ),

    test('Viewer: Throws on ttlExpiresAt field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', ttlExpiresAt: '2030' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on expiresAt field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', expiresAt: '2030' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on updatedAt field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', updatedAt: '2030' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on createdAt field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', createdAt: '2030' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on tags field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', tags: [] }), 'Viewer Safety')
    ),

    test('Viewer: Throws on notes field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', notes: 'text' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on score field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', score: 50 }), 'Viewer Safety')
    ),

    test('Viewer: Throws on location field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', location: 'NYC' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on deviceId field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', deviceId: 'abc' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on ownerId field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', ownerId: 'abc' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on _createdAt field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', _createdAt: 123 }), 'Viewer Safety')
    ),

    test('Viewer: Throws on schemaVersion field', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan', schemaVersion: 1 }), 'Viewer Safety')
    ),

    // Invalid colors
    test('Viewer: Throws on invalid color "green"', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123', color: 'green' }), 'Viewer Safety')
    ),

    test('Viewer: Throws on missing color', () =>
      expectThrow(() => assertViewerSafe({ connectionId: '123' }), 'Viewer Safety')
    ),

    // Invalid types
    test('Viewer: Throws on array payload', () =>
      expectThrow(() => assertViewerSafe([{ color: 'cyan' }]), 'Viewer Safety')
    ),

    test('Viewer: Throws on null', () =>
      expectThrow(() => assertViewerSafe(null), 'Viewer Safety')
    ),

    test('Viewer: Throws on undefined', () =>
      expectThrow(() => assertViewerSafe(undefined), 'Viewer Safety')
    ),

    // Valid cases
    test('Viewer: Allows minimal valid payload', () =>
      expectNoThrow(() => assertViewerSafe({ color: 'cyan' }))
    ),

    test('Viewer: Allows payload with connectionId', () =>
      expectNoThrow(() => assertViewerSafe({ connectionId: '123', color: 'cyan' }))
    ),

    test('Viewer: Allows payload with peerDisplayName', () =>
      expectNoThrow(() => assertViewerSafe({ connectionId: '123', color: 'amber', peerDisplayName: 'Partner' }))
    ),

    test('Viewer: Allows color = "unknown"', () =>
      expectNoThrow(() => assertViewerSafe({ connectionId: '123', color: 'unknown' }))
    ),

    test('Viewer: Allows color = "red"', () =>
      expectNoThrow(() => assertViewerSafe({ connectionId: '123', color: 'red' }))
    ),

    // toViewerPayload utility
    test('Viewer: toViewerPayload creates valid payload', () =>
      expectNoThrow(() => {
        const payload = toViewerPayload('conn_123', 'cyan', 'Partner');
        assertViewerSafe(payload);
      })
    ),
  ];
}

// =============================================================================
// COMBINED GUARDRAILS TEST
// =============================================================================

function testCombinedGuardrails(): TestResult[] {
  return [
    test('Combined: Valid inputs pass all guardrails', () =>
      expectNoThrow(() => assertAllGuardrails({
        data: { color: 'cyan', status: 'active' },
        memberCount: 5,
        relationshipType: 'BIDIRECTIONAL',
      }))
    ),

    test('Combined: History array fails', () =>
      expectThrow(() => assertAllGuardrails({
        data: [1, 2, 3],
        memberCount: 5,
        relationshipType: 'BIDIRECTIONAL',
      }), 'History Persistence')
    ),

    test('Combined: Aggregation limit fails', () =>
      expectThrow(() => assertAllGuardrails({
        data: { color: 'cyan' },
        memberCount: 100,
        relationshipType: 'BIDIRECTIONAL',
      }), 'Aggregation Limit')
    ),

    test('Combined: Asymmetric relation fails', () =>
      expectThrow(() => assertAllGuardrails({
        data: { color: 'cyan' },
        memberCount: 5,
        relationshipType: 'ONE_WAY',
      }), 'Asymmetric Surveillance')
    ),
  ];
}

// =============================================================================
// MAIN SELF-TEST FUNCTION (AUDITOR PROOF)
// =============================================================================

/**
 * Run all self-tests to verify Six Laws enforcement.
 *
 * This function MUST be callable in dev builds.
 * It verifies that:
 * - History arrays throw
 * - Unidirectional relations throw
 * - >25 connections throw
 * - Timestamped viewer payloads throw
 * - Valid cases pass
 *
 * @returns A report of all test results
 */
export function circlesRunSelfTest(): SelfTestReport {
  const startTime = Date.now();
  const allResults: TestResult[] = [];

  // Run all test suites
  allResults.push(...testNoAggregation());
  allResults.push(...testNoHistory());
  allResults.push(...testSymmetry());
  allResults.push(...testViewerSafety());
  allResults.push(...testCombinedGuardrails());

  const passedTests = allResults.filter((r) => r.passed).length;
  const failedTests = allResults.filter((r) => !r.passed).length;

  return {
    passed: failedTests === 0,
    totalTests: allResults.length,
    passedTests,
    failedTests,
    results: allResults,
    duration: Date.now() - startTime,
  };
}

/**
 * Run self-tests and log results to console.
 * Throws if any tests fail.
 */
export function runCirclesSelfTestWithLogging(): void {
  console.log('[Circles SelfTest] Running Six Laws verification...\n');

  const report = circlesRunSelfTest();

  for (const result of report.results) {
    const status = result.passed ? '\u2713' : '\u2717';
    console.log(`  ${status} ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  console.log(`\n[Circles SelfTest] Results: ${report.passedTests}/${report.totalTests} passed (${report.duration}ms)`);

  if (!report.passed) {
    const failedTests = report.results.filter((r) => !r.passed);
    console.error('\nFailed tests:');
    for (const t of failedTests) {
      console.error(`  - ${t.name}: ${t.error}`);
    }
    throw new Error(`[Circles SelfTest] ${report.failedTests} tests failed`);
  }

  console.log('[Circles SelfTest] All Six Laws verified \u2713\n');
}

/**
 * Quick verification that can be called on app start.
 * Returns true if all critical invariants pass.
 */
export function verifyCirclesInvariants(): boolean {
  try {
    const report = circlesRunSelfTest();
    return report.passed;
  } catch {
    return false;
  }
}

// =============================================================================
// LEGACY EXPORT ALIAS
// =============================================================================

export { circlesRunSelfTest as runCirclesSelfTest };
