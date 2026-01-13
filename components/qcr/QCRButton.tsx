/**
 * QCR Entry Point Button
 *
 * Shows "Quarterly Report" button on Patterns page.
 * Locked state if no QCR entitlement.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FileText, Lock, ChevronRight } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';

interface QCRButtonProps {
  hasAccess: boolean;
  isDemoMode: boolean;
  onPress: () => void;
  delay?: number;
}

export function QCRButton({ hasAccess, isDemoMode, onPress, delay = 0 }: QCRButtonProps) {
  const showDemoBadge = FOUNDER_DEMO_ENABLED && isDemoMode;
  const isLocked = !hasAccess && !showDemoBadge;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)}>
      <Pressable
        style={[styles.container, isLocked && styles.containerLocked]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <FileText size={20} color={isLocked ? 'rgba(255,255,255,0.3)' : '#00E5FF'} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isLocked && styles.titleLocked]}>
              Quarterly Report
            </Text>
            {showDemoBadge && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}
            {isLocked && (
              <View style={styles.lockedBadge}>
                <Lock size={10} color="rgba(255,255,255,0.4)" />
                <Text style={styles.lockedText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, isLocked && styles.subtitleLocked]}>
            {isLocked
              ? 'Institutional reporting artifact — Quarterly access required'
              : 'Institutional reporting artifact'}
          </Text>
        </View>

        <ChevronRight
          size={18}
          color={isLocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)'}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  containerLocked: {
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  titleLocked: {
    color: 'rgba(255,255,255,0.5)',
  },
  demoBadge: {
    backgroundColor: '#00E5FF20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#00E5FF',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  subtitleLocked: {
    color: 'rgba(255,255,255,0.3)',
  },
});
