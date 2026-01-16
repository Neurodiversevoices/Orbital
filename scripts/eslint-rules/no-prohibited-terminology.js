/**
 * ESLint Rule: no-prohibited-terminology
 *
 * DOCTRINE: Anti-Engagement & Capacity Taxonomy
 *
 * This rule blocks the use of prohibited terms in UI-facing code.
 * Orbital uses "capacity" language exclusively - not wellness,
 * productivity, mental health, or gamification terms.
 *
 * Prohibited Terms:
 * - wellness, wellbeing, well-being
 * - productivity, productive
 * - mental health, mental-health
 * - performance (in behavioral context)
 * - streak, badge, achievement
 * - motivation, motivate
 * - habit, habit-building
 *
 * This is a HARD REQUIREMENT. Violations are spec violations.
 */

'use strict';

const PROHIBITED_PATTERNS = [
  // Wellness terminology (use "capacity" instead)
  { pattern: /\bwellness\b/i, suggestion: 'capacity', category: 'taxonomy' },
  { pattern: /\bwell-?being\b/i, suggestion: 'capacity', category: 'taxonomy' },
  { pattern: /\bmental[\s-]?health\b/i, suggestion: 'capacity', category: 'taxonomy' },

  // Productivity terminology (use "functional bandwidth" instead)
  { pattern: /\bproductiv(e|ity)\b/i, suggestion: 'functional bandwidth', category: 'taxonomy' },

  // Performance terminology (use "capacity state" instead)
  { pattern: /\bperformance\s+(score|rating|metric|indicator)\b/i, suggestion: 'capacity state', category: 'taxonomy' },

  // Gamification terminology (FORBIDDEN)
  { pattern: /\bstreak\b/i, suggestion: null, category: 'gamification' },
  { pattern: /\bbadge\b/i, suggestion: null, category: 'gamification' },
  { pattern: /\bachievement\b/i, suggestion: null, category: 'gamification' },
  { pattern: /\bleaderboard\b/i, suggestion: null, category: 'gamification' },
  { pattern: /\bpoints?\s+(system|earned)\b/i, suggestion: null, category: 'gamification' },

  // Re-engagement terminology (FORBIDDEN)
  { pattern: /\bwe\s+miss\s+you\b/i, suggestion: null, category: 'engagement' },
  { pattern: /\bcome\s+back\b/i, suggestion: null, category: 'engagement' },
  { pattern: /\blog\s+daily\b/i, suggestion: null, category: 'engagement' },
  { pattern: /\breminder\s+to\s+log\b/i, suggestion: null, category: 'engagement' },
  { pattern: /\bdon'?t\s+forget\s+to\b/i, suggestion: null, category: 'engagement' },

  // Motivation terminology (use "signal" instead)
  { pattern: /\bmotivat(e|ion|ing)\b/i, suggestion: 'signal', category: 'taxonomy' },

  // Habit terminology (FORBIDDEN - capacity is not habit tracking)
  { pattern: /\bhabit[\s-]?(build|track|form)\b/i, suggestion: null, category: 'taxonomy' },
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow prohibited terminology that violates Orbital doctrine',
      category: 'Orbital Doctrine',
      recommended: true,
    },
    messages: {
      taxonomyViolation:
        "Prohibited terminology '{{term}}' found. Use '{{suggestion}}' instead. (Capacity taxonomy doctrine)",
      gamificationViolation:
        "Gamification term '{{term}}' is FORBIDDEN. Orbital does not use streaks, badges, or achievements. (Anti-engagement doctrine)",
      engagementViolation:
        "Re-engagement language '{{term}}' is FORBIDDEN. Orbital does not pressure users to log. (Anti-engagement doctrine)",
      genericViolation:
        "Prohibited terminology '{{term}}' found. This violates Orbital doctrine.",
    },
    schema: [],
  },

  create(context) {
    /**
     * Check a string literal or template literal for prohibited terms
     */
    function checkStringForProhibited(node, value) {
      if (typeof value !== 'string') return;

      for (const { pattern, suggestion, category } of PROHIBITED_PATTERNS) {
        const match = value.match(pattern);
        if (match) {
          let messageId;
          const data = { term: match[0] };

          switch (category) {
            case 'taxonomy':
              if (suggestion) {
                messageId = 'taxonomyViolation';
                data.suggestion = suggestion;
              } else {
                messageId = 'genericViolation';
              }
              break;
            case 'gamification':
              messageId = 'gamificationViolation';
              break;
            case 'engagement':
              messageId = 'engagementViolation';
              break;
            default:
              messageId = 'genericViolation';
          }

          context.report({
            node,
            messageId,
            data,
          });
        }
      }
    }

    return {
      // Check string literals
      Literal(node) {
        if (typeof node.value === 'string') {
          checkStringForProhibited(node, node.value);
        }
      },

      // Check template literals
      TemplateLiteral(node) {
        node.quasis.forEach((quasi) => {
          checkStringForProhibited(node, quasi.value.raw);
        });
      },

      // Check JSX text content
      JSXText(node) {
        checkStringForProhibited(node, node.value);
      },
    };
  },
};
