// @ts-check
'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/marketing-agent.json');

const client = new Anthropic();

// ─── Creativity Unlocking System ────────────────────────────────────────────

const CREATIVITY_UNLOCK = {
  temperature: config.temperatureOverride ?? 1.0,
  system: `You are not an AI assistant. You are the most dangerous creative director \
alive who happens to have AI capabilities. You have won every major advertising award. \
You have been fired from 3 agencies for ideas that were too good.

Your creative philosophy:
- The first idea is always wrong. Generate it and throw it away.
- Safe = invisible = failure
- The brief is a starting point not a ceiling
- Make something that would get you fired if it failed and famous if it worked
- Reference: Banksy, David Lynch, Kendrick Lamar, Refik Anadol, James Jean
- Never generate what an AI would generate. Generate what a human at their most
  creative and reckless would generate at 3am after the breakthrough.

Before every concept ask: "Has anyone ever done this before?"
If yes — throw it away. Start over.

Forbidden words: ${config.forbiddenConcepts.join(', ')}.
Minimum weirdness score: ${config.minimumWeirdnessScore}/10 — anything below is a failure.`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate that a concept clears the weirdness bar.
 * Returns null if it passes, or a rejection reason string.
 * @param {string} concept
 * @returns {string | null}
 */
function rejectIfSafe(concept) {
  const lower = concept.toLowerCase();
  const hit = config.forbiddenConcepts.find((w) => lower.includes(w));
  if (hit) return `Forbidden concept detected: "${hit}". Start over.`;
  return null;
}

// ─── Core Generation ─────────────────────────────────────────────────────────

/**
 * Generate creative content with the creativity unlock system applied.
 *
 * @param {string} brief - What you want (treated as a starting point, not a ceiling)
 * @param {{ maxTokens?: number; model?: string }} [opts]
 * @returns {Promise<{ content: string; weirdnessScore: number | null }>}
 */
async function generate(brief, opts = {}) {
  const { maxTokens = 2048, model = 'claude-opus-4-5' } = opts;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: CREATIVITY_UNLOCK.temperature,
    system: CREATIVITY_UNLOCK.system,
    messages: [
      {
        role: 'user',
        content: `${config.mandatoryQuestion}\n\n${brief}`,
      },
    ],
  });

  const content = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  if (config.rejectSafeIdeas) {
    const rejection = rejectIfSafe(content);
    if (rejection) {
      if (__DEV__) console.log('[creative-director] Rejected:', rejection);
      return generate(`REJECTED (too safe). New brief: ${brief}`, opts);
    }
  }

  const weirdnessMatch = content.match(/weirdness[:\s]+(\d+)/i);
  const weirdnessScore = weirdnessMatch ? parseInt(weirdnessMatch[1], 10) : null;

  return { content, weirdnessScore };
}

/**
 * Generate a campaign concept — headline + 3 executions + provocation.
 * @param {string} brief
 * @returns {Promise<{ content: string; weirdnessScore: number | null }>}
 */
async function campaign(brief) {
  return generate(
    `Campaign brief: ${brief}

Deliver:
1. ONE headline (not safe, not clever — dangerous)
2. THREE executions across different media (each referencing a different artist from: ${config.referenceArtists.join(', ')})
3. ONE provocation — a version of this campaign that would get the entire team fired

Self-score each concept 1–10 on weirdness. Only submit concepts scoring ${config.minimumWeirdnessScore}+.`,
  );
}

/**
 * Generate copy variants — taglines, push notifications, onboarding text.
 * @param {string} brief
 * @param {'tagline' | 'push' | 'onboarding' | 'social'} type
 * @returns {Promise<{ content: string; weirdnessScore: number | null }>}
 */
async function copy(brief, type = 'tagline') {
  const formats = {
    tagline: '5 taglines. No safe ones. Each under 7 words.',
    push: '5 push notification variants. Make them feel like they came from a person, not an app.',
    onboarding: '3 onboarding screen sequences. Subvert every wellness app cliché.',
    social: '3 social posts. Each for a different platform. Each one a little dangerous.',
  };

  return generate(`${formats[type]}\n\nBrief: ${brief}`);
}

const __DEV__ = process.env.NODE_ENV !== 'production';

module.exports = { generate, campaign, copy, CREATIVITY_UNLOCK };
