/**
 * QSB Scope Selector Component
 *
 * Shared component for selecting data scope: Personal, Org, or Global.
 * Used across all QSB briefing screens.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User, Building2, Globe } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { QSBScope } from '../../lib/qsb/types';

interface ScopeSelectorProps {
  scope: QSBScope;
  onScopeChange: (scope: QSBScope) => void;
  disabled?: boolean;
}

interface ScopeOption {
  value: QSBScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  description: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: 'personal',
    label: 'Personal',
    icon: User,
    description: 'Your individual patterns',
  },
  {
    value: 'org',
    label: 'Organization',
    icon: Building2,
    description: 'Your team/department',
  },
  {
    value: 'global',
    label: 'Global',
    icon: Globe,
    description: 'All Orbital users',
  },
];

export function ScopeSelector({ scope, onScopeChange, disabled }: ScopeSelectorProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Text style={styles.label}>Data Scope</Text>
      <View style={styles.optionsRow}>
        {SCOPE_OPTIONS.map((option) => {
          const isSelected = scope === option.value;
          const Icon = option.icon;

          return (
            <Pressable
              key={option.value}
              onPress={() => !disabled && onScopeChange(option.value)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              disabled={disabled}
            >
              <Icon
                color={isSelected ? '#00D7FF' : 'rgba(255,255,255,0.5)'}
                size={18}
              />
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

// Compact version for inline use
export function ScopeSelectorCompact({ scope, onScopeChange, disabled }: ScopeSelectorProps) {
  return (
    <View style={styles.compactContainer}>
      {SCOPE_OPTIONS.map((option) => {
        const isSelected = scope === option.value;
        const Icon = option.icon;

        return (
          <Pressable
            key={option.value}
            onPress={() => !disabled && onScopeChange(option.value)}
            style={[
              styles.compactOption,
              isSelected && styles.compactOptionSelected,
            ]}
            disabled={disabled}
          >
            <Icon
              color={isSelected ? '#00D7FF' : 'rgba(255,255,255,0.4)'}
              size={14}
            />
            <Text
              style={[
                styles.compactLabel,
                isSelected && styles.compactLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionSelected: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderColor: 'rgba(0,215,255,0.3)',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  optionLabelSelected: {
    color: '#00D7FF',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  compactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm - 2,
  },
  compactOptionSelected: {
    backgroundColor: 'rgba(0,215,255,0.15)',
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  compactLabelSelected: {
    color: '#00D7FF',
  },
});

export default ScopeSelector;
