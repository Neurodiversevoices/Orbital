#!/usr/bin/env node

/**
 * Orbital Terminology Audit Script
 *
 * DOCTRINE: Anti-Engagement & Capacity Taxonomy
 *
 * This script scans the codebase for prohibited terminology that violates
 * Orbital product doctrine. Run this as part of CI/CD or pre-commit hooks.
 *
 * Usage: node scripts/lint-terminology.js [--fix]
 *
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found
 *   2 - Error during execution
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// =============================================================================
// PROHIBITED TERMINOLOGY
// =============================================================================

const PROHIBITED_PATTERNS = [
  // Wellness terminology (use "capacity" instead)
  {
    pattern: /\bwellness\b/gi,
    message: "Use 'capacity' instead of 'wellness'",
    category: 'taxonomy',
    severity: 'error',
  },
  {
    pattern: /\bwell-?being\b/gi,
    message: "Use 'capacity' instead of 'wellbeing'",
    category: 'taxonomy',
    severity: 'error',
  },
  {
    pattern: /\bmental[\s-]?health\b/gi,
    message: "Use 'capacity' instead of 'mental health'",
    category: 'taxonomy',
    severity: 'error',
  },

  // Productivity terminology
  {
    pattern: /\bproductiv(e|ity)\b/gi,
    message: "Use 'functional bandwidth' instead of 'productivity'",
    category: 'taxonomy',
    severity: 'error',
  },

  // Performance terminology (in behavioral context)
  {
    pattern: /\bperformance\s+(score|rating|metric|indicator)\b/gi,
    message: "Use 'capacity state' instead of 'performance score'",
    category: 'taxonomy',
    severity: 'error',
  },

  // Gamification (FORBIDDEN - spec violation)
  {
    pattern: /\bstreak\b/gi,
    message: 'Gamification term FORBIDDEN - Orbital does not use streaks',
    category: 'gamification',
    severity: 'error',
    exclude: /streak.*test|test.*streak/i, // Allow in test file names
  },
  {
    pattern: /\bbadge\b/gi,
    message: 'Gamification term FORBIDDEN - Orbital does not use badges',
    category: 'gamification',
    severity: 'error',
  },
  {
    pattern: /\bachievement\b/gi,
    message: 'Gamification term FORBIDDEN - Orbital does not use achievements',
    category: 'gamification',
    severity: 'error',
    exclude: /milestone/i, // Milestones are OK (record depth)
  },
  {
    pattern: /\bleaderboard\b/gi,
    message: 'Gamification term FORBIDDEN - Orbital does not use leaderboards',
    category: 'gamification',
    severity: 'error',
  },

  // Re-engagement pressure (FORBIDDEN)
  {
    pattern: /\bwe\s+miss\s+you\b/gi,
    message: 'Re-engagement pressure FORBIDDEN',
    category: 'engagement',
    severity: 'error',
  },
  {
    pattern: /\bcome\s+back\b/gi,
    message: 'Re-engagement pressure FORBIDDEN',
    category: 'engagement',
    severity: 'warning',
  },
  {
    pattern: /\blog\s+(your\s+)?daily\b/gi,
    message: 'Logging pressure FORBIDDEN',
    category: 'engagement',
    severity: 'error',
  },
  {
    pattern: /\breminder\s+to\s+(log|check|record)\b/gi,
    message: 'Logging reminders FORBIDDEN',
    category: 'engagement',
    severity: 'error',
  },
  {
    pattern: /\bdon'?t\s+forget\s+to\b/gi,
    message: 'Engagement pressure FORBIDDEN',
    category: 'engagement',
    severity: 'error',
  },

  // Motivation terminology
  {
    pattern: /\bmotivat(e|ion|ing|ional)\b/gi,
    message: "Use 'signal' instead of 'motivation'",
    category: 'taxonomy',
    severity: 'warning',
  },

  // Habit terminology
  {
    pattern: /\bhabit[\s-]?(build|track|form|building|tracking|forming)\b/gi,
    message: 'Habit tracking language FORBIDDEN - Orbital tracks capacity, not habits',
    category: 'taxonomy',
    severity: 'error',
  },
];

// Files/patterns to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.expo/**',
  'dist/**',
  'android/**',
  'ios/**',
  'scripts/lint-terminology.js', // Don't lint ourselves
  'scripts/eslint-rules/**', // Don't lint the rule definitions
  '**/*.md', // Documentation can reference prohibited terms
  'governance/**', // Governance docs can reference prohibited terms
  'legal/**', // Legal docs can reference prohibited terms
  'docs/**', // Documentation can reference prohibited terms
];

// =============================================================================
// SCANNER
// =============================================================================

function scanFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Skip comments that explain doctrine
    if (line.includes('DOCTRINE:') || line.includes('FORBIDDEN')) {
      return;
    }

    PROHIBITED_PATTERNS.forEach(({ pattern, message, category, severity, exclude }) => {
      const matches = line.match(pattern);
      if (matches) {
        // Check exclusion pattern
        if (exclude && exclude.test(line)) {
          return;
        }

        matches.forEach((match) => {
          violations.push({
            file: filePath,
            line: lineIndex + 1,
            column: line.indexOf(match) + 1,
            match,
            message,
            category,
            severity,
          });
        });
      }
    });
  });

  return violations;
}

function formatViolation(v) {
  const severityIcon = v.severity === 'error' ? '❌' : '⚠️';
  const categoryBadge = `[${v.category.toUpperCase()}]`;
  return `${severityIcon} ${v.file}:${v.line}:${v.column} ${categoryBadge} "${v.match}" - ${v.message}`;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('🔍 Orbital Terminology Audit');
  console.log('============================\n');

  const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
    ignore: EXCLUDE_PATTERNS,
    cwd: process.cwd(),
  });

  console.log(`Scanning ${files.length} files...\n`);

  let allViolations = [];

  files.forEach((file) => {
    const violations = scanFile(file);
    allViolations = allViolations.concat(violations);
  });

  if (allViolations.length === 0) {
    console.log('✅ No terminology violations found!\n');
    console.log('All files comply with Orbital doctrine.');
    process.exit(0);
  }

  // Group by category
  const byCategory = {};
  allViolations.forEach((v) => {
    if (!byCategory[v.category]) {
      byCategory[v.category] = [];
    }
    byCategory[v.category].push(v);
  });

  // Report
  console.log(`Found ${allViolations.length} violation(s):\n`);

  Object.entries(byCategory).forEach(([category, violations]) => {
    console.log(`\n📋 ${category.toUpperCase()} (${violations.length})`);
    console.log('-'.repeat(40));
    violations.forEach((v) => {
      console.log(formatViolation(v));
    });
  });

  const errors = allViolations.filter((v) => v.severity === 'error');
  const warnings = allViolations.filter((v) => v.severity === 'warning');

  console.log('\n============================');
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0) {
    console.log('\n❌ DOCTRINE VIOLATION - Fix errors before committing.\n');
    process.exit(1);
  } else {
    console.log('\n⚠️ Warnings found - Review before deploying.\n');
    process.exit(0);
  }
}

main();
