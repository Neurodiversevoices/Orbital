// SkeletonRow — list-row variant for Patterns/history loading state.
// Composes <Skeleton> primitives; respects 10px card radius from CLAUDE.md.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';

export const SkeletonRow: React.FC = () => (
  <View style={styles.row}>
    <Skeleton width="60%" height={16} radius={6} />
    <Skeleton width="90%" height={12} radius={6} />
    <Skeleton width="40%" height={12} radius={6} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    padding: 16,
    gap: 8,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
