/**
 * Orbital ESLint Plugin
 *
 * Custom ESLint rules for enforcing Orbital product doctrine.
 *
 * Rules:
 * - no-prohibited-terminology: Block wellness/productivity/gamification terms
 */

'use strict';

module.exports = {
  rules: {
    'no-prohibited-terminology': require('./no-prohibited-terminology'),
  },
  configs: {
    recommended: {
      plugins: ['orbital'],
      rules: {
        'orbital/no-prohibited-terminology': 'error',
      },
    },
  },
};
