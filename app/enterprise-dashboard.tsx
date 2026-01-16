/**
 * Institutional Dashboard - Triage Command Center — DEMO ONLY
 *
 * GOVERNANCE: This is a DEMONSTRATION surface only.
 * - Shows sample/simulated data
 * - Non-configurable, non-exportable, non-activatable
 * - For real institutional access, contact Orbital sales
 *
 * CRITICAL: This dashboard displays ONLY aggregated, anonymized data.
 * Individual identities are NEVER visible.
 *
 * Visual Structure:
 * - Rows: Organizational Units
 * - Columns: Load (%), Risk (%), Velocity (trend), Freshness (recency)
 *
 * Data Constraints:
 * - Aggregated only
 * - No names
 * - No avatars
 * - No individual timelines
 * - No notes fields tied to individuals
 * - K-anonymity (Rule of 5) enforced
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  AggregatedUnitMetrics,
  RawUnitSignals,
  calculateAggregatedMetrics,
  applySignalDelay,
  getDelayWindowMessage,
  getSuppressedDisplayText,
  getSuppressedExplanation,
  getLoadColor,
  getRiskColor,
  getVelocityArrow,
  getFreshnessIndicator,
  shouldRenderWithColor,
  validateFilteredView,
} from '../lib/enterprise/kAnonymity';
import { INSTITUTIONAL_DASHBOARD_HEADER } from '../lib/enterprise/termsEnforcement';
import { K_ANONYMITY_THRESHOLD } from '../lib/enterprise/types';

// =============================================================================
// MOCK DATA (Replace with Supabase query in production)
// =============================================================================

function getMockUnitSignals(): RawUnitSignals[] {
  // This would be replaced with actual Supabase query
  // filtered by organization and applying K-anonymity at DB level
  return [
    {
      unitId: 'engineering',
      unitName: 'Engineering',
      signals: generateMockSignals(42),
    },
    {
      unitId: 'product',
      unitName: 'Product',
      signals: generateMockSignals(18),
    },
    {
      unitId: 'design',
      unitName: 'Design',
      signals: generateMockSignals(8),
    },
    {
      unitId: 'marketing',
      unitName: 'Marketing',
      signals: generateMockSignals(3), // Below K-anonymity threshold
    },
    {
      unitId: 'sales',
      unitName: 'Sales',
      signals: generateMockSignals(25),
    },
  ];
}

function generateMockSignals(count: number): RawUnitSignals['signals'] {
  const states: ('resourced' | 'stretched' | 'depleted')[] = [
    'resourced',
    'stretched',
    'depleted',
  ];
  const signals: RawUnitSignals['signals'] = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const state = states[Math.floor(Math.random() * 3)];
    signals.push({ state, timestamp });
  }

  return signals;
}

// =============================================================================
// DASHBOARD COMPONENT
// =============================================================================

export default function EnterpriseDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AggregatedUnitMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Get raw signals (would come from Supabase)
      const rawUnits = getMockUnitSignals();

      // Apply signal delay to break temporal inference
      const delayedUnits = rawUnits.map(unit => ({
        ...unit,
        signals: applySignalDelay(unit.signals),
      }));

      // Calculate aggregated metrics with K-anonymity enforcement
      const aggregated = delayedUnits.map(calculateAggregatedMetrics);

      setMetrics(aggregated);
      setLastUpdated(new Date());
    } catch (error) {
      if (__DEV__) console.error('[EnterpriseDashboard] Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00FFFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* DEMO MODE BANNER — GOVERNANCE REQUIRED */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE DATA</Text>
        <Text style={styles.demoBannerSubtext}>
          For institutional access, contact Orbital sales
        </Text>
      </View>

      {/* REQUIRED: Non-dismissible privacy header */}
      <View style={styles.privacyHeader}>
        <Text style={styles.privacyHeaderText}>
          {INSTITUTIONAL_DASHBOARD_HEADER.text}
        </Text>
      </View>

      {/* Delay notice */}
      <View style={styles.delayNotice}>
        <Text style={styles.delayNoticeText}>{getDelayWindowMessage()}</Text>
      </View>

      {/* Main dashboard */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Column headers */}
        <View style={styles.headerRow}>
          <View style={styles.unitColumn}>
            <Text style={styles.headerText}>Unit</Text>
          </View>
          <View style={styles.metricColumn}>
            <Text style={styles.headerText}>Load</Text>
          </View>
          <View style={styles.metricColumn}>
            <Text style={styles.headerText}>Risk</Text>
          </View>
          <View style={styles.metricColumn}>
            <Text style={styles.headerText}>Trend</Text>
          </View>
          <View style={styles.metricColumn}>
            <Text style={styles.headerText}>Fresh</Text>
          </View>
        </View>

        {/* Unit rows */}
        {metrics.map(unit => (
          <UnitRow key={unit.unitId} unit={unit} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            K-anonymity threshold: {K_ANONYMITY_THRESHOLD} signals minimum
          </Text>
          {lastUpdated && (
            <Text style={styles.footerText}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// UNIT ROW COMPONENT
// =============================================================================

interface UnitRowProps {
  unit: AggregatedUnitMetrics;
}

function UnitRow({ unit }: UnitRowProps) {
  const isSuppressed = unit.isSuppressed;

  return (
    <View style={[styles.unitRow, isSuppressed && styles.suppressedRow]}>
      {/* Unit name */}
      <View style={styles.unitColumn}>
        <Text style={styles.unitName}>{unit.unitName}</Text>
        <Text style={styles.signalCount}>
          {unit.signalCount} signal{unit.signalCount !== 1 ? 's' : ''}
        </Text>
        {/* K-ANONYMITY: Clear suppressed state indicator */}
        {isSuppressed && (
          <Text style={styles.suppressedBadge}>
            🔒 {getSuppressedExplanation()}
          </Text>
        )}
      </View>

      {/* Load */}
      <View style={styles.metricColumn}>
        {shouldRenderWithColor(unit.load) ? (
          <Text style={[styles.metricValue, { color: getLoadColor(unit.load) }]}>
            {unit.load.value}%
          </Text>
        ) : (
          <Text style={styles.suppressedValue}>{getSuppressedDisplayText()}</Text>
        )}
      </View>

      {/* Risk */}
      <View style={styles.metricColumn}>
        {shouldRenderWithColor(unit.risk) ? (
          <Text style={[styles.metricValue, { color: getRiskColor(unit.risk) }]}>
            {unit.risk.value}%
          </Text>
        ) : (
          <Text style={styles.suppressedValue}>{getSuppressedDisplayText()}</Text>
        )}
      </View>

      {/* Velocity (Trend) */}
      <View style={styles.metricColumn}>
        <Text
          style={[
            styles.metricValue,
            unit.velocity === 'suppressed' && styles.suppressedValue,
            unit.velocity === 'improving' && styles.improvingTrend,
            unit.velocity === 'declining' && styles.decliningTrend,
          ]}
        >
          {getVelocityArrow(unit.velocity)}
        </Text>
      </View>

      {/* Freshness */}
      <View style={styles.metricColumn}>
        <Text
          style={[
            styles.metricValue,
            unit.freshness === 'suppressed' && styles.suppressedValue,
            unit.freshness === 'fresh' && styles.freshIndicator,
            unit.freshness === 'stale' && styles.staleIndicator,
            unit.freshness === 'dormant' && styles.dormantIndicator,
          ]}
        >
          {getFreshnessIndicator(unit.freshness)}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  demoBanner: {
    backgroundColor: '#7A9AAA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  demoBannerSubtext: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  privacyHeader: {
    backgroundColor: '#1E40AF', // Blue
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A8A',
  },
  privacyHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  delayNotice: {
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  delayNoticeText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  unitColumn: {
    flex: 2,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  unitRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    alignItems: 'center',
  },
  suppressedRow: {
    backgroundColor: '#1F293740',
  },
  unitName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  signalCount: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  suppressedBadge: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  suppressedValue: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
  },
  improvingTrend: {
    color: '#22C55E',
  },
  decliningTrend: {
    color: '#EF4444',
  },
  freshIndicator: {
    color: '#22C55E',
  },
  staleIndicator: {
    color: '#EAB308',
  },
  dormantIndicator: {
    color: '#6B7280',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
});
