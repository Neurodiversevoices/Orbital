/**
 * EmptyState Component
 *
 * Consistent empty state display across all screens.
 * Following Orbital design language: subtle, non-intrusive, medical-grade.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../theme';

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Primary title text */
  title: string;
  /** Secondary description text */
  description?: string;
  /** Action hint (e.g., "Tap the orb to log your first signal") */
  actionHint?: string;
  /** Size variant */
  size?: 'compact' | 'standard' | 'large';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHint,
  size = 'standard',
}: EmptyStateProps) {
  const sizeConfig = {
    compact: { iconSize: 32, padding: 16 },
    standard: { iconSize: 48, padding: 32 },
    large: { iconSize: 64, padding: 48 },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, { paddingVertical: config.padding }]} testID="empty-state" data-testid="empty-state">
      <View style={styles.iconContainer}>
        <Icon
          color={colors.textTertiary}
          size={config.iconSize}
          strokeWidth={1.5}
        />
      </View>

      <Text
        style={[styles.title, size === 'compact' && styles.titleCompact]}
        maxFontSizeMultiplier={1.5}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={[styles.description, size === 'compact' && styles.descriptionCompact]}
          maxFontSizeMultiplier={1.5}
        >
          {description}
        </Text>
      )}

      {actionHint && (
        <View style={styles.actionHintContainer}>
          <Text style={styles.actionHint} maxFontSizeMultiplier={1.5}>{actionHint}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 15,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  descriptionCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionHintContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.10)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
  },
  actionHint: {
    fontSize: 13,
    color: '#0E8C7B',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default EmptyState;
