/**
 * CCIWindowPicker
 *
 * Segmented control for selecting the CCI observation window.
 * 30 / 60 / 90 days. Default 90.
 *
 * Light-theme tokens, fully a11y-wrapped (each segment has accessibilityRole
 * and accessibilityState.selected). Used by app/cci.tsx to drive
 * generateCCIPdf({ windowDays }).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { CCIWindowDays } from '../lib/cci';

const OPTIONS: CCIWindowDays[] = [30, 60, 90];

// Light-theme tokens (kept inline so this component does not depend on a
// specific exported "light" theme namespace — colors/colors.ts still exports
// the legacy dark palette in this worktree).
const TOKENS = {
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  cardBorder: 'rgba(15, 22, 36, 0.10)',
  surface: '#FFFFFF',
  primary: '#2DD4BF',
  primaryText: '#FFFFFF',
} as const;

export interface CCIWindowPickerProps {
  value: CCIWindowDays;
  onChange: (next: CCIWindowDays) => void;
  disabled?: boolean;
  /** Optional eyebrow label, defaults to "OBSERVATION WINDOW". */
  label?: string;
}

export const CCIWindowPicker: React.FC<CCIWindowPickerProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'OBSERVATION WINDOW',
}) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>{label}</Text>
      <View style={styles.segmented} accessibilityRole="tablist">
        {OPTIONS.map((opt, idx) => {
          const selected = opt === value;
          const isFirst = idx === 0;
          const isLast = idx === OPTIONS.length - 1;
          return (
            <Pressable
              key={opt}
              onPress={() => !disabled && onChange(opt)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${opt} day window`}
              testID={`cci-window-${opt}`}
              style={({ pressed }) => [
                styles.segment,
                isFirst && styles.segmentFirst,
                isLast && styles.segmentLast,
                selected && styles.segmentSelected,
                pressed && !disabled && styles.segmentPressed,
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  selected && styles.segmentLabelSelected,
                ]}
              >
                {opt}d
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.textSecondary,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: TOKENS.surface,
    borderWidth: 1,
    borderColor: TOKENS.cardBorder,
    borderRadius: 14,
    overflow: 'hidden',
    height: 44,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentFirst: {},
  segmentLast: {},
  segmentSelected: {
    backgroundColor: TOKENS.primary,
  },
  segmentPressed: {
    opacity: 0.85,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.textPrimary,
    letterSpacing: 0.4,
  },
  segmentLabelSelected: {
    color: TOKENS.primaryText,
  },
});

export default CCIWindowPicker;
