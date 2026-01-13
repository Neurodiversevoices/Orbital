import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

/**
 * Orbital Preflight Summary Reporter
 *
 * Outputs a single PASS/FAIL summary with test details.
 */
class SummaryReporter implements Reporter {
  private passed: string[] = [];
  private failed: string[] = [];
  private skipped: string[] = [];
  private startTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ORBITAL PREFLIGHT TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const title = test.title;
    if (result.status === 'passed') {
      this.passed.push(title);
    } else if (result.status === 'failed') {
      this.failed.push(title);
    } else if (result.status === 'skipped') {
      this.skipped.push(title);
    }
  }

  onEnd(result: FullResult) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const total = this.passed.length + this.failed.length + this.skipped.length;

    console.log('\n');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  TEST RESULTS');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('');

    if (this.passed.length > 0) {
      console.log('  PASSED:');
      this.passed.forEach((t) => console.log(`    ✓ ${t}`));
      console.log('');
    }

    if (this.failed.length > 0) {
      console.log('  FAILED:');
      this.failed.forEach((t) => console.log(`    ✗ ${t}`));
      console.log('');
    }

    if (this.skipped.length > 0) {
      console.log('  SKIPPED:');
      this.skipped.forEach((t) => console.log(`    ○ ${t}`));
      console.log('');
    }

    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  Total: ${total} | Passed: ${this.passed.length} | Failed: ${this.failed.length} | Skipped: ${this.skipped.length}`);
    console.log(`  Duration: ${duration}s`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('');

    if (this.failed.length === 0 && this.passed.length > 0) {
      console.log('  ╔═══════════════════════════════════════════════════════════╗');
      console.log('  ║                                                           ║');
      console.log('  ║   PREFLIGHT STATUS: PASS                                  ║');
      console.log('  ║                                                           ║');
      console.log('  ╚═══════════════════════════════════════════════════════════╝');
    } else {
      console.log('  ╔═══════════════════════════════════════════════════════════╗');
      console.log('  ║                                                           ║');
      console.log('  ║   PREFLIGHT STATUS: FAIL                                  ║');
      console.log('  ║                                                           ║');
      console.log('  ╚═══════════════════════════════════════════════════════════╝');
    }
    console.log('');
  }
}

export default SummaryReporter;
