import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, useWindowDimensions, Text, Platform, Pressable, Modal } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Eye, ListTodo, Users, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Calendar, Clock, Lock, Bug, RefreshCw, Award, FileText, Database } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HistoryItem, EnergyGraph, TimeRangeTabs, TimeRange, getTimeRangeMs, MilestonesPanel, PatternLanguagePanel, OrgRoleBanner, WeeklyCapacityRecord, BlurredPatternTease } from '../../components';
import { QCRButton, QCRScreen, QCRPaywall } from '../../components/qcr';
import { colors, commonStyles, spacing } from '../../theme';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale, interpolate } from '../../lib/hooks/useLocale';
import { useDemoMode, FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { useAppMode } from '../../lib/hooks/useAppMode';
import { useAppTenure } from '../../lib/hooks/useAppTenure';
import { useSubscription } from '../../lib/subscription';
import { useQCR } from '../../lib/qcr';
import { STORAGE_KEYS } from '../../lib/storage';
import { CapacityLog, CapacityState, Category, getUnlockTier, getNextUnlockTier, BaselineStats, WeeklySummary } from '../../types';
import {
  calculateBaselineStats,
  findMostRecent7DayStreakWindow,
  calculateWeeklySummary,
  formatDateRange,
} from '../../lib/baselineUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const categoryIcons: Record<Category, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
};

const stateToPercent = (state: CapacityState): number => {
  switch (state) {
    case 'resourced': return 100;
    case 'stretched': return 50;
    case 'depleted': return 0;
  }
};

// Data Depth Badge Component
function DataDepthBadge({ stats }: { stats: BaselineStats }) {
  // Calm, non-clinical labels for data depth
  const tierLabel = stats.confidenceTier === 'high' ? 'Strong pattern data'
    : stats.confidenceTier === 'growing' ? 'Growing pattern data'
    : stats.confidenceTier === 'baseline' ? 'Building pattern data'
    : 'Starting out';
  const tierColor = stats.confidenceTier === 'high' ? '#00E5FF'
    : stats.confidenceTier === 'growing' ? '#4CAF50'
    : stats.confidenceTier === 'baseline' ? '#E8A830'
    : 'rgba(255,255,255,0.4)';

  return (
    <View style={confidenceStyles.badge}>
      <Database size={12} color={tierColor} />
      <Text style={[confidenceStyles.badgeText, { color: tierColor }]}>
        {tierLabel}
      </Text>
      {stats.hasHighConfidenceWeek && (
        <View style={confidenceStyles.weekBadge}>
          <Text style={confidenceStyles.weekBadgeText}>7-day view available</Text>
        </View>
      )}
    </View>
  );
}

// Weekly Summary Card Component
function WeeklySummaryCard({ summary }: { summary: WeeklySummary }) {
  const dateRange = formatDateRange(summary.startDate, summary.endDate);
  const { capacitySummary, topDrivers, notesCount, totalEntries } = summary;

  const avgColor = capacitySummary.averagePercent >= 70 ? '#00E5FF'
    : capacitySummary.averagePercent >= 40 ? '#E8A830'
    : '#F44336';

  return (
    <View style={summaryStyles.card}>
      <View style={summaryStyles.header}>
        <View style={summaryStyles.headerLeft}>
          <Database size={16} color="rgba(255,255,255,0.6)" />
          <Text style={summaryStyles.title}>This Week</Text>
        </View>
        <Text style={summaryStyles.dateRange}>{dateRange}</Text>
      </View>

      <View style={summaryStyles.statsRow}>
        <View style={summaryStyles.statItem}>
          <Text style={[summaryStyles.statValue, { color: avgColor }]}>
            {capacitySummary.averagePercent}%
          </Text>
          <Text style={summaryStyles.statLabel}>Avg Capacity</Text>
        </View>
        <View style={summaryStyles.statDivider} />
        <View style={summaryStyles.statItem}>
          <Text style={summaryStyles.statValue}>{totalEntries}</Text>
          <Text style={summaryStyles.statLabel}>Entries</Text>
        </View>
        <View style={summaryStyles.statDivider} />
        <View style={summaryStyles.statItem}>
          <View style={summaryStyles.notesRow}>
            <FileText size={14} color="rgba(255,255,255,0.6)" />
            <Text style={summaryStyles.statValue}>{notesCount}</Text>
          </View>
          <Text style={summaryStyles.statLabel}>With Notes</Text>
        </View>
      </View>

      {/* Capacity Distribution Bar */}
      <View style={summaryStyles.distributionContainer}>
        <Text style={summaryStyles.distributionLabel}>Capacity Distribution</Text>
        <View style={summaryStyles.distributionBar}>
          {capacitySummary.resourced > 0 && (
            <View
              style={[
                summaryStyles.distributionSegment,
                {
                  flex: capacitySummary.resourced,
                  backgroundColor: '#00E5FF',
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            />
          )}
          {capacitySummary.stretched > 0 && (
            <View
              style={[
                summaryStyles.distributionSegment,
                { flex: capacitySummary.stretched, backgroundColor: '#E8A830' },
              ]}
            />
          )}
          {capacitySummary.depleted > 0 && (
            <View
              style={[
                summaryStyles.distributionSegment,
                {
                  flex: capacitySummary.depleted,
                  backgroundColor: '#F44336',
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            />
          )}
        </View>
        <View style={summaryStyles.distributionLegend}>
          <Text style={[summaryStyles.legendItem, { color: '#00E5FF' }]}>
            {capacitySummary.resourced} resourced
          </Text>
          <Text style={[summaryStyles.legendItem, { color: '#E8A830' }]}>
            {capacitySummary.stretched} stretched
          </Text>
          <Text style={[summaryStyles.legendItem, { color: '#F44336' }]}>
            {capacitySummary.depleted} depleted
          </Text>
        </View>
      </View>

      {/* Top Drivers */}
      {topDrivers.length > 0 && (
        <View style={summaryStyles.driversContainer}>
          <Text style={summaryStyles.driversLabel}>Top Drivers</Text>
          <View style={summaryStyles.driversRow}>
            {topDrivers.map((driver, index) => {
              const Icon = categoryIcons[driver.tag as Category] || Circle;
              return (
                <View key={driver.tag} style={summaryStyles.driverChip}>
                  <Icon size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={summaryStyles.driverText}>
                    {driver.tag} ({driver.count})
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// Debug overlay component
function DebugOverlay({ logs, storageInfo, onReseed, onClose }: {
  logs: CapacityLog[];
  storageInfo: { key: string; rawLength: number; parseError: string | null };
  onReseed: () => void;
  onClose: () => void;
}) {
  const firstLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const lastLog = logs.length > 0 ? logs[0] : null;

  return (
    <View style={debugStyles.overlay}>
      <View style={debugStyles.header}>
        <Bug size={16} color="#FF0000" />
        <Text style={debugStyles.title}>Storage Debug</Text>
        <Pressable onPress={onClose} style={debugStyles.closeBtn}>
          <Text style={debugStyles.closeBtnText}>X</Text>
        </Pressable>
      </View>
      <View style={debugStyles.row}>
        <Text style={debugStyles.label}>Storage Key:</Text>
        <Text style={debugStyles.value}>{storageInfo.key}</Text>
      </View>
      <View style={debugStyles.row}>
        <Text style={debugStyles.label}>Signals Found:</Text>
        <Text style={debugStyles.value}>{logs.length}</Text>
      </View>
      <View style={debugStyles.row}>
        <Text style={debugStyles.label}>Raw JSON Length:</Text>
        <Text style={debugStyles.value}>{storageInfo.rawLength} chars</Text>
      </View>
      {firstLog && (
        <View style={debugStyles.row}>
          <Text style={debugStyles.label}>First Signal:</Text>
          <Text style={debugStyles.value}>{new Date(firstLog.timestamp).toLocaleDateString()}</Text>
        </View>
      )}
      {lastLog && (
        <View style={debugStyles.row}>
          <Text style={debugStyles.label}>Last Signal:</Text>
          <Text style={debugStyles.value}>{new Date(lastLog.timestamp).toLocaleDateString()}</Text>
        </View>
      )}
      {storageInfo.parseError && (
        <View style={debugStyles.row}>
          <Text style={[debugStyles.label, { color: '#FF0000' }]}>Parse Error:</Text>
          <Text style={[debugStyles.value, { color: '#FF0000' }]}>{storageInfo.parseError}</Text>
        </View>
      )}
      <View style={debugStyles.row}>
        <Text style={debugStyles.label}>Platform:</Text>
        <Text style={debugStyles.value}>{Platform.OS}</Text>
      </View>
      <Pressable onPress={onReseed} style={debugStyles.reseedBtn}>
        <RefreshCw size={14} color="#00E5FF" />
        <Text style={debugStyles.reseedText}>Reseed Demo Data (90 signals)</Text>
      </Pressable>
    </View>
  );
}

export default function PatternsScreen() {
  const params = useLocalSearchParams();
  // FOUNDER-ONLY: Debug and demo params only work when EXPO_PUBLIC_FOUNDER_DEMO=1
  const showDebug = FOUNDER_DEMO_ENABLED && params.debug === '1';
  const forceDemo = FOUNDER_DEMO_ENABLED && params.demo === '1';

  const { logs, isLoading, removeLog, refresh } = useEnergyLogs();
  const { width } = useWindowDimensions();
  const { t } = useLocale();
  const { isDemoMode, enableDemoMode, reseedDemoData } = useDemoMode();
  const { currentMode } = useAppMode();
  const { isPro } = useSubscription();
  const { hasUsedAppFor30Days } = useAppTenure();
  const router = useRouter();
  const graphWidth = width - spacing.md * 2;
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [debugVisible, setDebugVisible] = useState(showDebug);
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date | null>(null);
  const [calendarWeekEnd, setCalendarWeekEnd] = useState<Date | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ key: string; rawLength: number; parseError: string | null }>({
    key: STORAGE_KEYS.LOGS,
    rawLength: 0,
    parseError: null,
  });

  // QCR State
  const [showQCRScreen, setShowQCRScreen] = useState(false);
  const [showQCRPaywall, setShowQCRPaywall] = useState(false);
  const {
    hasQCRAccess,
    report: qcrReport,
    isGenerating: isQCRGenerating,
    error: qcrError,
    generateReport: generateQCR,
    purchaseQCR,
    restoreQCR,
    isDemoReport,
  } = useQCR({ logs });

  // Load storage debug info
  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOGS);
        setStorageInfo({
          key: STORAGE_KEYS.LOGS,
          rawLength: raw?.length || 0,
          parseError: null,
        });
      } catch (error: any) {
        setStorageInfo({
          key: STORAGE_KEYS.LOGS,
          rawLength: 0,
          parseError: error.message || 'Unknown error',
        });
      }
    };
    if (debugVisible) {
      loadStorageInfo();
    }
  }, [debugVisible, logs]);

  // Handle ?demo=1 param to force reseed demo data
  useEffect(() => {
    if (forceDemo) {
      const seedDemo = async () => {
        if (!isDemoMode) {
          await enableDemoMode('3y');
        } else {
          await reseedDemoData('3y');
        }
        await refresh();
      };
      seedDemo();
    }
  }, [forceDemo]);

  const handleReseed = useCallback(async () => {
    if (!isDemoMode) {
      await enableDemoMode('3y');
    } else {
      await reseedDemoData('3y');
    }
    await refresh();
  }, [isDemoMode, enableDemoMode, reseedDemoData, refresh]);

  // QCR button handler - show paywall if no access, otherwise generate and show report
  const handleQCRPress = useCallback(async () => {
    if (hasQCRAccess) {
      await generateQCR();
      setShowQCRScreen(true);
    } else {
      setShowQCRPaywall(true);
    }
  }, [hasQCRAccess, generateQCR]);

  const handleQCRPurchase = useCallback(async (productId: string) => {
    const success = await purchaseQCR(productId);
    if (success) {
      await generateQCR();
      setShowQCRScreen(true);
    }
    return success;
  }, [purchaseQCR, generateQCR]);

  const handleQCRRestore = useCallback(async () => {
    const success = await restoreQCR();
    if (success) {
      await generateQCR();
      setShowQCRScreen(true);
    }
    return success;
  }, [restoreQCR, generateQCR]);

  const logCount = logs.length;
  const currentTier = getUnlockTier(logCount);
  const nextTier = getNextUnlockTier(logCount);

  // Calculate baseline stats using unique local dates
  const baselineStats = useMemo(() => calculateBaselineStats(logs), [logs]);

  // Patterns are now gated by 7 unique dates, not log count
  const isLocked = !baselineStats.patternsUnlocked;

  // Weekly Summary for 7-day streak
  const weeklySummary = useMemo(() => {
    if (!baselineStats.hasHighConfidenceWeek) return null;
    const window = findMostRecent7DayStreakWindow(logs);
    if (!window) return null;
    return calculateWeeklySummary(logs, window);
  }, [logs, baselineStats.hasHighConfidenceWeek]);

  // Translated day names for insights
  const dayNames = [
    t.patterns.days.sunday,
    t.patterns.days.monday,
    t.patterns.days.tuesday,
    t.patterns.days.wednesday,
    t.patterns.days.thursday,
    t.patterns.days.friday,
    t.patterns.days.saturday,
  ];

  const stats = useMemo(() => {
    const now = Date.now();
    const rangeMs = getTimeRangeMs(timeRange);
    const startTime = now - rangeMs;
    const prevStartTime = startTime - rangeMs;

    // Current period logs
    const currentLogs = logs.filter((log) => log.timestamp >= startTime);
    // Previous period logs (for trend comparison)
    const prevLogs = logs.filter((log) => log.timestamp >= prevStartTime && log.timestamp < startTime);

    if (currentLogs.length === 0) {
      return { avg: null, trend: null, timeInDepleted: null };
    }

    // Average energy
    const percentages = currentLogs.map((log) => stateToPercent(log.state));
    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);

    // Trend (compare to previous period)
    let trend: number | null = null;
    if (prevLogs.length > 0) {
      const prevPercentages = prevLogs.map((log) => stateToPercent(log.state));
      const prevAvg = prevPercentages.reduce((a, b) => a + b, 0) / prevPercentages.length;
      trend = Math.round(avg - prevAvg);
    }

    // Time in Depleted (percentage of entries that were "depleted")
    const depletedCount = currentLogs.filter((log) => log.state === 'depleted').length;
    const timeInDepleted = Math.round((depletedCount / currentLogs.length) * 100);

    // Category breakdown - what % of each category results in depleted/stretched
    const categoryBreakdown: Record<Category, { count: number; strainRate: number }> = {
      sensory: { count: 0, strainRate: 0 },
      demand: { count: 0, strainRate: 0 },
      social: { count: 0, strainRate: 0 },
    };

    const categories: Category[] = ['sensory', 'demand', 'social'];
    categories.forEach((cat) => {
      const catLogs = currentLogs.filter((log) => log.tags.includes(cat));
      if (catLogs.length > 0) {
        const catStrainCount = catLogs.filter((log) => log.state === 'depleted' || log.state === 'stretched').length;
        categoryBreakdown[cat] = {
          count: catLogs.length,
          strainRate: Math.round((catStrainCount / catLogs.length) * 100),
        };
      }
    });

    return { avg, trend, timeInDepleted, categoryBreakdown };
  }, [logs, timeRange]);

  // Pattern observations - what patterns have emerged
  const insights = useMemo(() => {
    if (logs.length < 10) return null;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekLogs = logs.filter((log) => log.timestamp >= now - 7 * dayMs);
    const monthLogs = logs.filter((log) => log.timestamp >= now - 30 * dayMs);

    // Day of week patterns
    const dayPatterns: Record<number, { total: number; depleted: number }> = {};
    for (let i = 0; i < 7; i++) {
      dayPatterns[i] = { total: 0, depleted: 0 };
    }
    monthLogs.forEach((log) => {
      const day = new Date(log.timestamp).getDay();
      dayPatterns[day].total++;
      if (log.state === 'depleted' || log.state === 'stretched') {
        dayPatterns[day].depleted++;
      }
    });

    // Find most challenging day
    let worstDay = 0;
    let worstRate = 0;
    Object.entries(dayPatterns).forEach(([day, data]) => {
      if (data.total >= 3) {
        const rate = data.depleted / data.total;
        if (rate > worstRate) {
          worstRate = rate;
          worstDay = parseInt(day);
        }
      }
    });

    // Time of day patterns
    const hourPatterns: Record<string, { total: number; depleted: number }> = {
      morning: { total: 0, depleted: 0 },
      afternoon: { total: 0, depleted: 0 },
      evening: { total: 0, depleted: 0 },
    };
    monthLogs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      let period = 'morning';
      if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17) period = 'evening';
      hourPatterns[period].total++;
      if (log.state === 'depleted' || log.state === 'stretched') {
        hourPatterns[period].depleted++;
      }
    });

    // Find most challenging time
    let challengingTime = '';
    let timeRate = 0;
    Object.entries(hourPatterns).forEach(([period, data]) => {
      if (data.total >= 5) {
        const rate = data.depleted / data.total;
        if (rate > timeRate) {
          timeRate = rate;
          challengingTime = period;
        }
      }
    });

    // Recent trajectory (improving or declining)
    const recentAvg = weekLogs.length > 0
      ? weekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / weekLogs.length
      : null;
    const prevWeekLogs = logs.filter(
      (log) => log.timestamp >= now - 14 * dayMs && log.timestamp < now - 7 * dayMs
    );
    const prevAvg = prevWeekLogs.length > 0
      ? prevWeekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / prevWeekLogs.length
      : null;

    let trajectory: 'improving' | 'declining' | 'stable' | null = null;
    if (recentAvg !== null && prevAvg !== null) {
      const diff = recentAvg - prevAvg;
      if (diff > 10) trajectory = 'improving';
      else if (diff < -10) trajectory = 'declining';
      else trajectory = 'stable';
    }

    // Category with highest impact
    let highImpactCategory: Category | null = null;
    let highImpactRate = 0;
    (['sensory', 'demand', 'social'] as Category[]).forEach((cat) => {
      const catLogs = monthLogs.filter((log) => log.tags.includes(cat));
      if (catLogs.length >= 5) {
        const strainCount = catLogs.filter((log) => log.state === 'depleted').length;
        const rate = strainCount / catLogs.length;
        if (rate > highImpactRate) {
          highImpactRate = rate;
          highImpactCategory = cat;
        }
      }
    });

    return {
      worstDay: worstRate > 0.4 ? dayNames[worstDay] : null,
      worstDayRate: Math.round(worstRate * 100),
      challengingTime: timeRate > 0.4 ? challengingTime : null,
      challengingTimeRate: Math.round(timeRate * 100),
      trajectory,
      highImpactCategory,
      highImpactRate: Math.round(highImpactRate * 100),
    };
  }, [logs]);

  const handleDelete = useCallback(
    async (id: string) => {
      await removeLog(id);
    },
    [removeLog]
  );

  // Handle calendar week navigation - sync graph with calendar (7d view only)
  const handleWeekChange = useCallback((weekStart: Date, weekEnd: Date) => {
    setCalendarWeekStart(weekStart);
    setCalendarWeekEnd(weekEnd);
    setTimeRange('7d'); // Calendar sync always uses 7d view
  }, []);

  // Handle time range tab changes - clear calendar sync for non-7d views
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    if (range !== '7d') {
      // Clear calendar sync so graph shows full range from now
      setCalendarWeekStart(null);
      setCalendarWeekEnd(null);
    }
  }, []);

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Debug Overlay - FOUNDER-ONLY */}
      {FOUNDER_DEMO_ENABLED && debugVisible && (
        <DebugOverlay
          logs={logs}
          storageInfo={storageInfo}
          onReseed={handleReseed}
          onClose={() => setDebugVisible(false)}
        />
      )}
      <View style={styles.content}>
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'header'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLocked ? (
              <View style={styles.lockedContainer}>
                <View style={styles.lockedIconContainer}>
                  <Lock size={32} color="rgba(255,255,255,0.3)" />
                </View>
                <Text style={styles.lockedTitle}>Getting to Know Your Patterns</Text>
                <Text style={styles.lockedBody}>
                  Log on 7 different days to see your patterns. You can log multiple times per day.
                </Text>
                <View style={styles.lockedProgress}>
                  <View style={styles.lockedProgressBar}>
                    <View style={[styles.lockedProgressFill, { width: `${(baselineStats.baselineProgress / 7) * 100}%` }]} />
                  </View>
                  <Text style={styles.lockedProgressText}>
                    {baselineStats.baselineProgress} of 7 days logged
                  </Text>
                </View>
                {baselineStats.currentStreak > 1 && (
                  <View style={styles.streakIndicator}>
                    <Database size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.streakText}>
                      {baselineStats.currentStreak} consecutive days
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {/* Org Role Banner - shows participant status for org modes */}
                <OrgRoleBanner mode={currentMode} />

                {/* Page Header - Calm, Non-Diagnostic */}
                <View style={styles.pageHeader}>
                  <Text style={styles.pageTitle}>Your Capacity Patterns</Text>
                  <Text style={styles.pageSubtitle}>
                    How your capacity has changed over time. This is not a diagnosis.
                  </Text>
                </View>

                {/* GRAPH - TOP OF PAGE */}
                <TimeRangeTabs
                  selected={timeRange}
                  onSelect={handleTimeRangeChange}
                  logCount={logCount}
                  isPro={isPro}
                  hasUsedAppFor30Days={hasUsedAppFor30Days}
                  isDemoMode={isDemoMode}
                />

                {/* Show blur tease for 30d+ ranges for Free users after 30 days (skip in demo mode) */}
                {!isPro && !isDemoMode && hasUsedAppFor30Days && timeRange !== '7d' ? (
                  <BlurredPatternTease
                    visible={true}
                    onUpgradePress={() => router.push('/upgrade')}
                    timeRange={timeRange}
                  >
                    <EnergyGraph
                      logs={logs}
                      width={graphWidth}
                      timeRange={timeRange}
                      startDate={calendarWeekStart || undefined}
                      endDate={calendarWeekEnd || undefined}
                    />
                  </BlurredPatternTease>
                ) : (
                  <EnergyGraph
                    logs={logs}
                    width={graphWidth}
                    timeRange={timeRange}
                    startDate={calendarWeekStart || undefined}
                    endDate={calendarWeekEnd || undefined}
                  />
                )}

                {/* Stats below graph */}
                {stats.avg !== null && (
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{stats.avg}%</Text>
                      <Text style={styles.statLabel}>Baseline</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[
                        styles.statValue,
                        stats.trend !== null && {
                          color: stats.trend > 0 ? '#00E5FF' : stats.trend < 0 ? '#F44336' : 'rgba(255,255,255,0.9)'
                        }
                      ]}>
                        {stats.trend !== null
                          ? `${stats.trend > 0 ? '+' : ''}${stats.trend}%`
                          : '—'}
                      </Text>
                      <Text style={styles.statLabel}>Trend</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[
                        styles.statValue,
                        { color: stats.timeInDepleted > 30 ? '#F44336' : stats.timeInDepleted > 15 ? '#E8A830' : '#00E5FF' }
                      ]}>
                        {stats.timeInDepleted}%
                      </Text>
                      <Text style={styles.statLabel}>Depleted</Text>
                    </View>
                  </View>
                )}

                {/* Capacity Drivers */}
                {stats.avg !== null && (
                  <View style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>Capacity Drivers</Text>
                    <View style={styles.categoryRow}>
                      {(['sensory', 'demand', 'social'] as Category[]).map((cat) => {
                        const Icon = categoryIcons[cat];
                        const label = t.categories[cat];
                        const { count, strainRate } = stats.categoryBreakdown[cat];
                        const hasData = count > 0;
                        return (
                          <View key={cat} style={styles.categoryItem}>
                            <View style={styles.categoryIconRow}>
                              <Icon size={16} color={hasData ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'} />
                              <Text style={[styles.categoryLabel, !hasData && { opacity: 0.4 }]}>{label}</Text>
                            </View>
                            <Text style={[
                              styles.categoryRate,
                              hasData && { color: strainRate > 60 ? '#F44336' : strainRate > 40 ? '#E8A830' : '#00E5FF' }
                            ]}>
                              {hasData ? `${strainRate}%` : '—'}
                            </Text>
                            <Text style={styles.categorySubtext}>
                              {hasData ? 'correlation' : 'no data'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Longitudinal Milestones */}
                <MilestonesPanel logs={logs} />

                {/* Pattern Language - Stability, Volatility, Recovery Lag */}
                <PatternLanguagePanel logs={logs} />

                {/* QCR Entry Point */}
                <QCRButton
                  hasAccess={hasQCRAccess}
                  isDemoMode={isDemoMode}
                  onPress={handleQCRPress}
                  delay={200}
                />

                {/* Data Depth Badge */}
                <DataDepthBadge stats={baselineStats} />

                {/* Weekly Summary Card - shown when 7-day data available */}
                {weeklySummary && <WeeklySummaryCard summary={weeklySummary} />}

                {/* Weekly Capacity Record - Calendar View (synced with graph) */}
                <WeeklyCapacityRecord logs={logs} onDelete={handleDelete} onWeekChange={handleWeekChange} />

                {/* Footer */}
                <View style={styles.footerSection}>
                  {logs.length === 0 && (
                    <View style={styles.emptyInline}>
                      <Text style={styles.emptyInlineText}>No entries yet. Start logging on the home screen.</Text>
                    </View>
                  )}
                  <Text style={styles.longitudinalNote}>
                    {t.patterns.longitudinalNote}
                  </Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={null}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor="rgba(255,255,255,0.5)"
            />
          }
        />
      </View>

      {/* QCR Screen Modal */}
      <Modal
        visible={showQCRScreen && !!qcrReport}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQCRScreen(false)}
      >
        {qcrReport && (
          <QCRScreen
            report={qcrReport}
            onClose={() => setShowQCRScreen(false)}
          />
        )}
      </Modal>

      {/* QCR Paywall Modal */}
      <QCRPaywall
        visible={showQCRPaywall}
        onClose={() => setShowQCRPaywall(false)}
        onPurchase={handleQCRPurchase}
        onRestore={handleQCRRestore}
        error={qcrError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  pageHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  entriesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  footerContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  graphSectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  graphSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  emptyInline: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyInlineText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyOrb: {
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  emptyDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  categoryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryRate: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  categorySubtext: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  insightsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  insightSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  insightTip: {
    borderBottomWidth: 0,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tipText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.4)',
    flex: 1,
  },
  chartContext: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  longitudinalNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  lockedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lockedBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  lockedProgress: {
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
  },
  lockedProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  lockedProgressFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 2,
  },
  lockedProgressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

// Data Depth Badge Styles
const confidenceStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: 12,
  },
  weekBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FF9800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// Weekly Summary Card Styles
const summaryStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  dateRange: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributionContainer: {
    marginBottom: spacing.md,
  },
  distributionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  legendItem: {
    fontSize: 9,
    fontWeight: '500',
  },
  driversContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
  },
  driversLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  driversRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  driverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  driverText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
  },
});

// Debug overlay styles
const debugStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF0000',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  value: {
    fontSize: 11,
    color: '#00E5FF',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  reseedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  reseedText: {
    fontSize: 12,
    color: '#00E5FF',
    fontWeight: '500',
  },
});
