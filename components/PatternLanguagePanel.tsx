/**
 * Pattern Language Panel Component
 *
 * Displays user-facing pattern concepts:
 * - Stability: How consistent capacity levels are
 * - Volatility: How much capacity fluctuates
 * - Recovery Lag: Time to bounce back from depletion
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { Anchor, Activity, Clock, Info, X } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { usePatternLanguage, PatternConcept, PatternStrength } from '../lib/hooks/usePatternLanguage';
import { CapacityLog } from '../types';

interface PatternLanguagePanelProps {
  logs: CapacityLog[];
}

const iconMap = {
  anchor: Anchor,
  activity: Activity,
  clock: Clock,
};

const strengthLabels: Record<PatternStrength, { label: string; opacity: number }> = {
  low: { label: 'Low', opacity: 0.4 },
  moderate: { label: 'Moderate', opacity: 0.7 },
  high: { label: 'High', opacity: 1 },
};

function PatternCard({
  pattern,
  delay,
  onPress,
}: {
  pattern: PatternConcept;
  delay: number;
  onPress: () => void;
}) {
  const Icon = iconMap[pattern.icon];
  const strengthConfig = strengthLabels[pattern.value];

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
      <Pressable style={styles.patternCard} onPress={onPress}>
        <View style={[styles.patternIconContainer, { backgroundColor: `${pattern.color}15` }]}>
          <Icon size={18} color={pattern.color} />
        </View>

        <View style={styles.patternContent}>
          <View style={styles.patternHeader}>
            <Text style={styles.patternLabel}>{pattern.label}</Text>
            <View style={styles.patternValueContainer}>
              <View
                style={[
                  styles.strengthIndicator,
                  {
                    backgroundColor: pattern.color,
                    opacity: strengthConfig.opacity,
                  },
                ]}
              />
              <Text style={[styles.patternValue, { color: pattern.color }]}>
                {strengthConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.patternDescription}>{pattern.description}</Text>
        </View>

        <Info size={14} color="rgba(255,255,255,0.2)" />
      </Pressable>
    </Animated.View>
  );
}

function PatternDetailModal({
  visible,
  pattern,
  onClose,
}: {
  visible: boolean;
  pattern: PatternConcept | null;
  onClose: () => void;
}) {
  if (!pattern) return null;

  const Icon = iconMap[pattern.icon];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: `${pattern.color}20` }]}>
              <Icon size={24} color={pattern.color} />
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <X color="rgba(255,255,255,0.5)" size={20} />
            </Pressable>
          </View>

          <Text style={[styles.modalTitle, { color: pattern.color }]}>{pattern.label}</Text>
          <Text style={styles.modalDescription}>{pattern.description}</Text>

          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>Current Level</Text>
            <View style={styles.scoreBarContainer}>
              <View style={styles.scoreBarTrack}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${pattern.score}%`,
                      backgroundColor: pattern.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.scoreValue}>{pattern.score}%</Text>
            </View>
          </View>

          <View style={styles.explanationSection}>
            <Text style={styles.explanationTitle}>What does this mean?</Text>
            <Text style={styles.explanationText}>{pattern.explanation}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export function PatternLanguagePanel({ logs }: PatternLanguagePanelProps) {
  const { patterns, hasEnoughData, dataMessage, dominantPattern } = usePatternLanguage(logs);
  const [selectedPattern, setSelectedPattern] = useState<PatternConcept | null>(null);

  if (!hasEnoughData) {
    return (
      <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Pattern Insights</Text>
        <Text style={styles.emptyMessage}>{dataMessage}</Text>
        <View style={styles.emptyProgress}>
          <View style={styles.emptyProgressTrack}>
            <View
              style={[
                styles.emptyProgressBar,
                { width: `${(logs.length / 7) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.emptyProgressText}>{logs.length} / 7 signals</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Patterns</Text>
        {dominantPattern && (
          <Text style={styles.headerSubtitle}>
            Strongest: {dominantPattern.label}
          </Text>
        )}
      </View>

      <View style={styles.patternsContainer}>
        {patterns.map((pattern, index) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            delay={index * 100}
            onPress={() => setSelectedPattern(pattern)}
          />
        ))}
      </View>

      <PatternDetailModal
        visible={selectedPattern !== null}
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  patternsContainer: {
    gap: spacing.sm,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
  },
  patternIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  patternContent: {
    flex: 1,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patternLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  patternValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strengthIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  patternValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  patternDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 15,
  },
  // Empty state
  emptyContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyProgress: {
    width: '100%',
    maxWidth: 200,
  },
  emptyProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  emptyProgressBar: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 2,
  },
  emptyProgressText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.lg,
  },
  scoreSection: {
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.sm,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    minWidth: 40,
  },
  explanationSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
});
