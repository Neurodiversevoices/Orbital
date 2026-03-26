#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * Marketing Agent
 *
 * Orchestrates creative content generation for Orbital using the
 * creativity-unlocking system in agents/creative-director.js.
 *
 * Usage:
 *   node scripts/marketing-agent.js campaign "brief here"
 *   node scripts/marketing-agent.js copy tagline "brief here"
 *   node scripts/marketing-agent.js copy push "brief here"
 *   node scripts/marketing-agent.js copy onboarding "brief here"
 *   node scripts/marketing-agent.js copy social "brief here"
 */

const { campaign, copy, CREATIVITY_UNLOCK } = require('../agents/creative-director');

const __DEV__ = process.env.NODE_ENV !== 'production';

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    console.error('Usage: marketing-agent.js <campaign|copy> [type] "brief"');
    process.exit(1);
  }

  if (__DEV__) {
    console.log('[marketing-agent] temperature:', CREATIVITY_UNLOCK.temperature);
    console.log('[marketing-agent] mode: unrestricted');
  }

  if (command === 'campaign') {
    const brief = rest.join(' ');
    if (!brief) { console.error('Provide a brief.'); process.exit(1); }

    console.log('\n⚡ Generating campaign…\n');
    const result = await campaign(brief);
    console.log(result.content);
    if (result.weirdnessScore !== null) {
      console.log(`\nWeirdness score: ${result.weirdnessScore}/10`);
    }
    return;
  }

  if (command === 'copy') {
    const [type, ...briefParts] = rest;
    const brief = briefParts.join(' ');
    const validTypes = ['tagline', 'push', 'onboarding', 'social'];

    if (!validTypes.includes(type)) {
      console.error(`Type must be one of: ${validTypes.join(', ')}`);
      process.exit(1);
    }
    if (!brief) { console.error('Provide a brief.'); process.exit(1); }

    console.log(`\n⚡ Generating ${type} copy…\n`);
    const result = await copy(brief, /** @type {any} */ (type));
    console.log(result.content);
    if (result.weirdnessScore !== null) {
      console.log(`\nWeirdness score: ${result.weirdnessScore}/10`);
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[marketing-agent] Fatal:', err.message ?? err);
  process.exit(1);
});
