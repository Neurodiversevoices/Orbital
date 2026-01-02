import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Eye } from 'lucide-react-native';
import { colors, spacing } from '../../theme';

interface ReadOnlyBannerProps {
  message: string;
}

export function ReadOnlyBanner({ message }: ReadOnlyBannerProps) {
  return (
    <View style={styles.container}>
      <Eye size={14} color="rgba(255,255,255,0.5)" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  text: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
});
