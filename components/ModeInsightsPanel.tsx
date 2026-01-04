/**
 * Mode-Specific Insights Panel
 *
 * Displays different insight panels based on the current app mode:
 * - Personal: Personal patterns & trends
 * - Family: Household load distribution
 * - Team: Team/ERG capacity pulse
 * - Staff: Staff load trend
 * - Student: Student load trend
 * - Workforce: Healthcare workforce load
 * - Demo: Demo showcase of all features
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Activity,
  BarChart3,
  AlertTriangle,
  Heart,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppMode, APP_MODE_CONFIGS, InsightsPanelType, CapacityLog } from '../types';
import { useAppMode } from '../lib/hooks/useAppMode';

interface ModeInsightsPanelProps {
  logs: CapacityLog[];
}

export function ModeInsightsPanel({ logs }: ModeInsightsPanelProps) {
  const { currentMode, modeConfig, orgName, orgCode } = useAppMode();

  const panelType = modeConfig.insightsPanelType;
  const accentColor = modeConfig.accentColor;

  // Calculate insights based on logs
  const insights = useMemo(() => {
    if (logs.length === 0) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const weekLogs = logs.filter(l => l.timestamp >= weekAgo);
    const prevWeekLogs = logs.filter(l => l.timestamp >= twoWeeksAgo && l.timestamp < weekAgo);

    const stateToValue = (state: string) => {
      if (state === 'resourced') return 100;
      if (state === 'stretched') return 50;
      return 0;
    };

    const weekAvg = weekLogs.length > 0
      ? weekLogs.reduce((sum, l) => sum + stateToValue(l.state), 0) / weekLogs.length
      : null;

    const prevWeekAvg = prevWeekLogs.length > 0
      ? prevWeekLogs.reduce((sum, l) => sum + stateToValue(l.state), 0) / prevWeekLogs.length
      : null;

    let trend: 'up' | 'down' | 'stable' | null = null;
    if (weekAvg !== null && prevWeekAvg !== null) {
      const diff = weekAvg - prevWeekAvg;
      if (diff > 8) trend = 'up';
      else if (diff < -8) trend = 'down';
      else trend = 'stable';
    }

    // Count by category
    const categoryCount = {
      sensory: weekLogs.filter(l => l.category === 'sensory').length,
      demand: weekLogs.filter(l => l.category === 'demand').length,
      social: weekLogs.filter(l => l.category === 'social').length,
    };

    const topDriver = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .filter(([,count]) => count > 0)[0]?.[0] || null;

    const depletedCount = weekLogs.filter(l => l.state === 'depleted').length;
    const alertLevel = depletedCount >= 3 ? 'high' : depletedCount >= 1 ? 'moderate' : 'low';

    return {
      weekAvg: weekAvg ? Math.round(weekAvg) : null,
      trend,
      topDriver,
      signalCount: weekLogs.length,
      alertLevel,
      depletedCount,
    };
  }, [logs]);

  // Generate mock aggregate data for institutional modes
  const aggregateData = useMemo(() => {
    // This would normally come from a backend
    // For demo purposes, we generate plausible mock data
    const seed = currentMode.length + (orgCode?.length || 0);
    const participation = 45 + (seed % 30);
    const avgCapacity = 52 + (seed % 25);

    return {
      participantCount: participation,
      avgCapacity,
      trend: seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'down' : 'stable',
      topDriver: seed % 2 === 0 ? 'demand' : 'sensory',
      alertLevel: avgCapacity < 40 ? 'high' : avgCapacity < 55 ? 'moderate' : 'low',
    };
  }, [currentMode, orgCode]);

  const renderPersonalInsights = () => (
    <View style={styles.insightsRow}>
      <InsightCard
        label="7-Day Avg"
        value={insights?.weekAvg ? `${insights.weekAvg}%` : '—'}
        accentColor={accentColor}
        icon={<Activity size={16} color={accentColor} />}
      />
      <InsightCard
        label="Trend"
        value={
          insights?.trend === 'up' ? <TrendingUp size={20} color="#00E5FF" /> :
          insights?.trend === 'down' ? <TrendingDown size={20} color="#F44336" /> :
          <Minus size={20} color="#E8A830" />
        }
        accentColor={accentColor}
        icon={<BarChart3 size={16} color={accentColor} />}
      />
      <InsightCard
        label="Signals"
        value={insights?.signalCount?.toString() || '0'}
        accentColor={accentColor}
        icon={<Heart size={16} color={accentColor} />}
      />
    </View>
  );

  const renderFamilyInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Users size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>Household Load</Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Family Avg"
          value={insights?.weekAvg ? `${insights.weekAvg}%` : '—'}
          accentColor={accentColor}
        />
        <InsightCard
          label="Shared Check-ins"
          value={insights?.signalCount?.toString() || '0'}
          accentColor={accentColor}
        />
      </View>
      {insights?.alertLevel === 'high' && (
        <View style={[styles.alertBanner, { backgroundColor: '#F4433620' }]}>
          <AlertTriangle size={16} color="#F44336" />
          <Text style={styles.alertText}>Multiple depleted signals this week</Text>
        </View>
      )}
    </View>
  );

  const renderTeamInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Users size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>
          Team Capacity Pulse {orgName && `• ${orgName}`}
        </Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Participants"
          value={aggregateData.participantCount.toString()}
          accentColor={accentColor}
        />
        <InsightCard
          label="Team Avg"
          value={`${aggregateData.avgCapacity}%`}
          accentColor={accentColor}
        />
        <InsightCard
          label="Trend"
          value={
            aggregateData.trend === 'up' ? <TrendingUp size={20} color="#00E5FF" /> :
            aggregateData.trend === 'down' ? <TrendingDown size={20} color="#F44336" /> :
            <Minus size={20} color="#E8A830" />
          }
          accentColor={accentColor}
        />
      </View>
      <Text style={styles.privacyNote}>
        Aggregated data only • Individual signals never visible
      </Text>
    </View>
  );

  const renderStaffInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Users size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>
          Staff Load Trend {orgCode && `• ${orgCode}`}
        </Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Staff Reporting"
          value={aggregateData.participantCount.toString()}
          accentColor={accentColor}
        />
        <InsightCard
          label="District Avg"
          value={`${aggregateData.avgCapacity}%`}
          accentColor={accentColor}
        />
        <InsightCard
          label="Top Driver"
          value={aggregateData.topDriver === 'demand' ? 'Demand' : 'Sensory'}
          accentColor={accentColor}
        />
      </View>
      {aggregateData.alertLevel === 'high' && (
        <View style={[styles.alertBanner, { backgroundColor: '#F4433620' }]}>
          <AlertTriangle size={16} color="#F44336" />
          <Text style={styles.alertText}>Staff capacity trending low this week</Text>
        </View>
      )}
    </View>
  );

  const renderStudentInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Users size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>
          Student Load Trend {orgCode && `• ${orgCode}`}
        </Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Students"
          value={aggregateData.participantCount.toString()}
          accentColor={accentColor}
        />
        <InsightCard
          label="Campus Avg"
          value={`${aggregateData.avgCapacity}%`}
          accentColor={accentColor}
        />
        <InsightCard
          label="Weekly Trend"
          value={
            aggregateData.trend === 'up' ? <TrendingUp size={20} color="#00E5FF" /> :
            aggregateData.trend === 'down' ? <TrendingDown size={20} color="#F44336" /> :
            <Minus size={20} color="#E8A830" />
          }
          accentColor={accentColor}
        />
      </View>
    </View>
  );

  const renderWorkforceInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Heart size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>
          Workforce Capacity {orgName && `• ${orgName}`}
        </Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Staff Reporting"
          value={aggregateData.participantCount.toString()}
          accentColor={accentColor}
        />
        <InsightCard
          label="Shift Avg"
          value={`${aggregateData.avgCapacity}%`}
          accentColor={accentColor}
        />
        <InsightCard
          label="Top Driver"
          value={aggregateData.topDriver === 'demand' ? 'Demand' : 'Sensory'}
          accentColor={accentColor}
        />
      </View>
      {aggregateData.alertLevel !== 'low' && (
        <View style={[styles.alertBanner, { backgroundColor: `${accentColor}20` }]}>
          <AlertTriangle size={16} color={accentColor} />
          <Text style={styles.alertText}>
            Consider reviewing shift scheduling this week
          </Text>
        </View>
      )}
    </View>
  );

  const renderDemoInsights = () => (
    <View style={styles.container}>
      <View style={styles.insightHeader}>
        <Activity size={18} color={accentColor} />
        <Text style={[styles.insightTitle, { color: accentColor }]}>Demo Showcase</Text>
      </View>
      <View style={styles.insightsRow}>
        <InsightCard
          label="Sample Signals"
          value="90"
          accentColor={accentColor}
        />
        <InsightCard
          label="Demo Avg"
          value="62%"
          accentColor={accentColor}
        />
        <InsightCard
          label="Trend"
          value={<TrendingUp size={20} color="#00E5FF" />}
          accentColor={accentColor}
        />
      </View>
      <Text style={styles.demoNote}>
        Explore all modes with realistic sample data
      </Text>
    </View>
  );

  // Select panel based on type
  const renderPanel = () => {
    switch (panelType) {
      case 'personal':
        return renderPersonalInsights();
      case 'family':
        return renderFamilyInsights();
      case 'team':
        return renderTeamInsights();
      case 'staff':
        return renderStaffInsights();
      case 'student':
        return renderStudentInsights();
      case 'workforce':
        return renderWorkforceInsights();
      case 'demo':
        return renderDemoInsights();
      default:
        return renderPersonalInsights();
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrapper}>
      {renderPanel()}
    </Animated.View>
  );
}

interface InsightCardProps {
  label: string;
  value: string | React.ReactNode;
  accentColor: string;
  icon?: React.ReactNode;
}

function InsightCard({ label, value, accentColor, icon }: InsightCardProps) {
  return (
    <View style={styles.card}>
      {icon && <View style={styles.cardIcon}>{icon}</View>}
      <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.cardValue, { color: accentColor }]}>{value}</Text>
      ) : (
        <View style={styles.cardValueContainer}>{value}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  insightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
  },
  cardIcon: {
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '300',
  },
  cardValueContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  alertText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  privacyNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  demoNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
