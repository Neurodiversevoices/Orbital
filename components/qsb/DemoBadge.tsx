/**
 * Demo Data Badge Component
 *
 * Clearly indicates when data is demo/sample data.
 * Required for all QSB screens showing non-real data.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TestTube2 } from 'lucide-react-native';
import { spacing, borderRadius } from '../../theme';

interface DemoBadgeProps {
  variant?: 'inline' | 'banner';
}

export function DemoBadge({ variant = 'inline' }: DemoBadgeProps) {
  if (variant === 'banner') {
    return (
      <View style={styles.banner}>
        <TestTube2 color="#F5B700" size={14} />
        <Text style={styles.bannerText}>
          Demo Data — Real data will appear as you log capacity signals
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <TestTube2 color="#F5B700" size={10} />
      <Text style={styles.inlineText}>Demo</Text>
    </View>
  );
}

// Cohort threshold warning
export function CohortThresholdWarning({ required, actual }: { required: number; actual: number }) {
  return (
    <View style={styles.warningContainer}>
      <View style={styles.warningIcon}>
        <Text style={styles.warningIconText}>!</Text>
      </View>
      <View style={styles.warningContent}>
        <Text style={styles.warningTitle}>Not Enough Participants</Text>
        <Text style={styles.warningDescription}>
          Aggregate data requires at least {required} participants to protect privacy.
          Current cohort: {actual}.
        </Text>
      </View>
    </View>
  );
}

// Insufficient signals warning
export function InsufficientSignalsWarning({ required, actual }: { required: number; actual: number }) {
  return (
    <View style={styles.warningContainer}>
      <View style={styles.warningContent}>
        <Text style={styles.warningTitle}>More Signals Needed</Text>
        <Text style={styles.warningDescription}>
          Log at least {required} capacity signals to see this data.
          You have {actual} so far.
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (actual / required) * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{actual} / {required} signals</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,183,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  inlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F5B700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245,183,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,183,0,0.2)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: '#F5B700',
    lineHeight: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  warningIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245,183,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  warningIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5B700',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D7FF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
});

export default DemoBadge;
