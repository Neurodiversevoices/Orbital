/**
 * Institutional Dashboard
 *
 * Aggregate-only capacity monitoring for institutions.
 * NO individual surveillance. NO personally identifiable data.
 * Suitable for employers, schools, clinics, research institutions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { generateExecutiveReport, ExecutiveReportData } from '../lib/reports/executiveReportGenerator';
import { useLocale } from '../lib/hooks/useLocale';

type TimePeriod = '30d' | '90d' | '1y';

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [period, setPeriod] = useState<TimePeriod>('90d');
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setIsLoading(true);
    const reportPeriod = period === '30d' ? 'custom' : period === '90d' ? 'quarterly' : 'annual';
    const now = Date.now();
    const customStart = period === '30d' ? now - (30 * 24 * 60 * 60 * 1000) : undefined;

    const data = await generateExecutiveReport(
      reportPeriod,
      customStart,
      period === '30d' ? now : undefined
    );
    setReportData(data);
    setIsLoading(false);
  };

  const getTrendIcon = () => {
    if (!reportData) return Minus;
    switch (reportData.trajectory.trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = () => {
    if (!reportData) return 'rgba(255,255,255,0.5)';
    switch (reportData.trajectory.trend) {
      case 'improving': return '#4CAF50';
      case 'declining': return '#F44336';
      default: return '#E8A830';
    }
  };

  const TrendIcon = getTrendIcon();
  const trendColor = getTrendColor();

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Building2 color="#00E5FF" size={24} />
          <Text style={styles.headerTitle}>Institutional Dashboard</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      {/* Aggregate-Only Warning */}
      <View style={styles.warningBanner}>
        <AlertTriangle color="#E8A830" size={16} />
        <Text style={styles.warningText}>
          Aggregate data only. No individual identification.
        </Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['30d', '90d', '1y'] as TimePeriod[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
              {p === '30d' ? '30 Days' : p === '90d' ? 'Quarter' : 'Annual'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Aggregating data...</Text>
          </View>
        ) : reportData && reportData.summary.totalSignals > 0 ? (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <BarChart3 color="#00E5FF" size={18} />
                  <Text style={styles.metricLabel}>Avg Capacity</Text>
                </View>
                <Text style={styles.metricValue}>{reportData.summary.averageCapacity}%</Text>
                <Text style={styles.metricSubtext}>population baseline</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <TrendIcon color={trendColor} size={18} />
                  <Text style={styles.metricLabel}>Trend</Text>
                </View>
                <Text style={[styles.metricValue, { color: trendColor }]}>
                  {reportData.trajectory.trend.charAt(0).toUpperCase() + reportData.trajectory.trend.slice(1)}
                </Text>
                <Text style={styles.metricSubtext}>
                  {reportData.trajectory.changeFromStart > 0 ? '+' : ''}
                  {reportData.trajectory.changeFromStart}% change
                </Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Activity color="#9C27B0" size={18} />
                  <Text style={styles.metricLabel}>Signals</Text>
                </View>
                <Text style={styles.metricValue}>{reportData.summary.totalSignals}</Text>
                <Text style={styles.metricSubtext}>total recorded</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <AlertTriangle color="#F44336" size={18} />
                  <Text style={styles.metricLabel}>At Risk</Text>
                </View>
                <Text style={[styles.metricValue, { color: '#F44336' }]}>
                  {reportData.summary.depletedPercentage}%
                </Text>
                <Text style={styles.metricSubtext}>depleted signals</Text>
              </View>
            </View>

            {/* State Distribution */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <PieChart color="#00E5FF" size={18} />
                <Text style={styles.sectionTitle}>State Distribution</Text>
              </View>
              <View style={styles.distributionBar}>
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: reportData.summary.resourcedPercentage || 1,
                      backgroundColor: '#00E5FF',
                      borderTopLeftRadius: 6,
                      borderBottomLeftRadius: 6,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: reportData.summary.stretchedPercentage || 1,
                      backgroundColor: '#E8A830',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.distributionSegment,
                    {
                      flex: reportData.summary.depletedPercentage || 1,
                      backgroundColor: '#F44336',
                      borderTopRightRadius: 6,
                      borderBottomRightRadius: 6,
                    },
                  ]}
                />
              </View>
              <View style={styles.distributionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#00E5FF' }]} />
                  <Text style={styles.legendText}>High ({reportData.summary.resourcedPercentage}%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E8A830' }]} />
                  <Text style={styles.legendText}>Stable ({reportData.summary.stretchedPercentage}%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                  <Text style={styles.legendText}>Low ({reportData.summary.depletedPercentage}%)</Text>
                </View>
              </View>
            </View>

            {/* Driver Analysis */}
            {reportData.driverInsights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Users color="#00E5FF" size={18} />
                  <Text style={styles.sectionTitle}>Strain Drivers</Text>
                </View>
                {reportData.driverInsights.map((insight) => (
                  <View key={insight.category} style={styles.driverRow}>
                    <Text style={styles.driverName}>
                      {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                    </Text>
                    <View style={styles.driverBar}>
                      <View
                        style={[
                          styles.driverBarFill,
                          { width: `${insight.strainCorrelation * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.driverPercent}>
                      {Math.round(insight.strainCorrelation * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Notable Patterns */}
            {reportData.notablePatterns.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Activity color="#00E5FF" size={18} />
                  <Text style={styles.sectionTitle}>Notable Patterns</Text>
                </View>
                {reportData.notablePatterns.map((pattern, index) => (
                  <View key={index} style={styles.patternRow}>
                    <View style={styles.patternDot} />
                    <Text style={styles.patternText}>{pattern}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <AlertTriangle color="rgba(255,255,255,0.3)" size={20} />
              <Text style={styles.disclaimerText}>
                {reportData.watermark.disclaimer}
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{reportData.watermark.scope}</Text>
              <Text style={styles.footerText}>
                Generated: {new Date(reportData.generatedAt).toLocaleDateString()}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Building2 color="rgba(255,255,255,0.2)" size={48} />
            <Text style={styles.emptyTitle}>No Aggregate Data</Text>
            <Text style={styles.emptyText}>
              Capacity signals will appear here when available.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(232,168,48,0.15)',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  warningText: {
    fontSize: 12,
    color: '#E8A830',
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(0,229,255,0.2)',
  },
  periodButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#00E5FF',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  metricSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  distributionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  driverName: {
    width: 70,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  driverBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  driverBarFill: {
    height: '100%',
    backgroundColor: '#F44336',
    borderRadius: 4,
  },
  driverPercent: {
    width: 40,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
    marginTop: 6,
  },
  patternText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});
