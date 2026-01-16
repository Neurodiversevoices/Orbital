/**
 * Chart Loading Skeleton
 *
 * DOCTRINE: State-First Rendering
 * Charts must display a loading state until data is fully resolved.
 * Rendering empty or default states before data loads is a bug.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { ChartDimensions, DEFAULT_CHART_DIMENSIONS } from './types';

interface ChartSkeletonProps {
  dimensions?: Partial<ChartDimensions>;
  variant?: 'line' | 'bar' | 'distribution';
  style?: ViewStyle;
}

/**
 * Animated skeleton placeholder for charts.
 * Shows pulsing placeholder lines/bars until real data loads.
 */
export function ChartSkeleton({
  dimensions: customDimensions,
  variant = 'line',
  style,
}: ChartSkeletonProps) {
  const dims: ChartDimensions = { ...DEFAULT_CHART_DIMENSIONS, ...customDimensions };
  const { width, height } = dims;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const renderLineSkeleton = () => (
    <View style={styles.lineContainer}>
      {/* Y-axis placeholder */}
      <View style={styles.yAxisPlaceholder}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Animated.View
            key={i}
            style={[styles.yLabel, { opacity: pulseAnim }]}
          />
        ))}
      </View>
      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.gridLine,
              { top: `${25 * i}%`, opacity: pulseAnim },
            ]}
          />
        ))}
        {/* Wave placeholder */}
        <Animated.View
          style={[styles.wavePlaceholder, { opacity: pulseAnim }]}
        />
      </View>
    </View>
  );

  const renderBarSkeleton = () => (
    <View style={styles.barContainer}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.barPlaceholder,
            { height: `${30 + Math.random() * 50}%`, opacity: pulseAnim },
          ]}
        />
      ))}
    </View>
  );

  const renderDistributionSkeleton = () => (
    <View style={styles.distributionContainer}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.distributionBar,
            { width: `${20 + i * 15}%`, opacity: pulseAnim },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Title placeholder */}
      <Animated.View style={[styles.titlePlaceholder, { opacity: pulseAnim }]} />

      {/* Chart content */}
      <View style={styles.chartContent}>
        {variant === 'line' && renderLineSkeleton()}
        {variant === 'bar' && renderBarSkeleton()}
        {variant === 'distribution' && renderDistributionSkeleton()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  titlePlaceholder: {
    height: 14,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 16,
  },
  chartContent: {
    flex: 1,
  },
  lineContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  yAxisPlaceholder: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yLabel: {
    height: 8,
    width: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    marginLeft: 8,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  wavePlaceholder: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,229,255,0.3)',
    borderRadius: 1,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 20,
  },
  barPlaceholder: {
    width: 24,
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderRadius: 4,
  },
  distributionContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  distributionBar: {
    height: 20,
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderRadius: 4,
  },
});

export default ChartSkeleton;
