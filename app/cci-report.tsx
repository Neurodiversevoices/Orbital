/**
 * CCI Report Generation Screen
 *
 * Temporary UI for calling the generate-cci Edge Function.
 * Displays structured CCI data — PDF renderer wired separately.
 *
 * Flow:
 *  1. Check entitlement on mount
 *  2. User taps "Generate Report"
 *  3. Edge Function called with user_id + last 90 days
 *  4. Display returned JSON in clinical summary layout
 *  5. Handle errors (no entitlement, not enough data, network)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, commonStyles } from '../theme';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';

// =============================================================================
// TYPES (mirrors Edge Function response)
// =============================================================================

interface DriverRanking {
  driver: string;
  count: number;
  pct: number;
}

interface CCIPayload {
  meta: {
    user_id: string;
    generated_at: string;
    date_start: string;
    date_end: string;
    window_days: number;
    total_signals: number;
    unique_days: number;
    data_quality_score: number;
  };
  scores: {
    current_capacity: number | null;
    baseline_capacity: number | null;
    delta_from_baseline: number | null;
    stability_score: number | null;
    trend_direction: 'improving' | 'declining' | 'stable';
    trend_delta: number;
  };
  drivers: {
    top_5: DriverRanking[];
    total_attributions: number;
  };
  overload: {
    event_count: number;
    dates: string[];
  };
  recovery: {
    avg_recovery_days: number | null;
    fastest: number | null;
    slowest: number | null;
    episodes_in_window: number;
    measured_from: 'raw_logs' | 'baseline' | 'none';
  };
  forecast: {
    method: string;
    window_days: number;
    points: Array<{ day_offset: number; date: string; predicted_capacity: number }>;
    slope_per_day: number;
    r_squared: number;
  };
}

type ScreenState = 'idle' | 'loading' | 'success' | 'error';

interface ErrorInfo {
  title: string;
  message: string;
  code?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCapacity(value: number | null): string {
  if (value == null) return '—';
  return (value * 100).toFixed(0);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCapacityColor(value: number | null): string {
  if (value == null) return 'rgba(255,255,255,0.5)';
  if (value >= 0.7) return '#06B6D4';
  if (value >= 0.5) return '#2DD4BF';
  if (value >= 0.3) return '#F59E0B';
  return '#DC2626';
}

function getTrendIcon(direction: string) {
  if (direction === 'improving') return TrendingUp;
  if (direction === 'declining') return TrendingDown;
  return Minus;
}

function getTrendColor(direction: string): string {
  if (direction === 'improving') return '#2DD4BF';
  if (direction === 'declining') return '#DC2626';
  return '#F59E0B';
}

function getForecastLabel(slope: number): string {
  if (slope > 0.005) return 'PROJECTED IMPROVEMENT';
  if (slope < -0.005) return 'PROJECTED DECLINE';
  return 'PROJECTED STABLE';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CCIReportScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>('idle');
  const [payload, setPayload] = useState<CCIPayload | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const generateReport = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setErrorInfo({
        title: 'Not Connected',
        message: 'Supabase is not configured. Please sign in first.',
      });
      setState('error');
      return;
    }

    setState('loading');
    setErrorInfo(null);

    try {
      const supabase = getSupabase();

      // Get current user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setErrorInfo({
          title: 'Authentication Required',
          message: 'Please sign in to generate your CCI report.',
        });
        setState('error');
        return;
      }

      // Call Edge Function with 90-day window
      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);

      const { data, error } = await supabase.functions.invoke('generate-cci', {
        body: {
          user_id: user.id,
          date_start: ninetyDaysAgo.toISOString(),
          date_end: now.toISOString(),
        },
      });

      if (error) {
        // Check for entitlement error
        if (error.message?.includes('403') || (data as any)?.code === 'ENTITLEMENT_REQUIRED') {
          setErrorInfo({
            title: 'CCI Purchase Required',
            message: 'You need an active CCI entitlement or Pro subscription to generate this report.',
            code: 'ENTITLEMENT_REQUIRED',
          });
        } else {
          setErrorInfo({
            title: 'Generation Failed',
            message: error.message || 'An unexpected error occurred.',
          });
        }
        setState('error');
        return;
      }

      // Handle 403 returned as data (Supabase functions.invoke may return non-2xx as data)
      if (data?.code === 'ENTITLEMENT_REQUIRED' || data?.error) {
        setErrorInfo({
          title: data.code === 'ENTITLEMENT_REQUIRED' ? 'CCI Purchase Required' : 'Generation Failed',
          message: data.error || 'An unexpected error occurred.',
          code: data.code,
        });
        setState('error');
        return;
      }

      setPayload(data as CCIPayload);
      setState('success');
    } catch (err) {
      setErrorInfo({
        title: 'Network Error',
        message: err instanceof Error ? err.message : 'Failed to connect. Check your internet connection.',
      });
      setState('error');
    }
  }, []);

  // ─── RENDER ───

  const renderIdle = () => (
    <View style={styles.centerContent}>
      <View style={styles.iconContainer}>
        <FileBarChart size={48} color="#2DD4BF" />
      </View>
      <Text style={styles.heroTitle}>Capacity Composite Index</Text>
      <Text style={styles.heroSubtitle}>
        Generate a comprehensive analysis of your capacity patterns over the last 90 days.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>What's included:</Text>
        <Text style={styles.infoItem}>• Current capacity score vs baseline</Text>
        <Text style={styles.infoItem}>• Stability analysis & trend direction</Text>
        <Text style={styles.infoItem}>• Top driver attributions</Text>
        <Text style={styles.infoItem}>• Overload event detection</Text>
        <Text style={styles.infoItem}>• Recovery lag measurement</Text>
        <Text style={styles.infoItem}>• 6-week capacity forecast</Text>
      </View>

      <Pressable style={styles.generateButton} onPress={generateReport}>
        <Zap size={20} color="#000" />
        <Text style={styles.generateButtonText}>Generate Instrument</Text>
      </Pressable>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#2DD4BF" />
      <Text style={styles.loadingText}>Computing CCI...</Text>
      <Text style={styles.loadingSubtext}>
        Analyzing capacity logs, driver patterns, and recovery episodes
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContent}>
      <View style={[styles.iconContainer, styles.iconContainerError]}>
        <AlertTriangle size={48} color="#DC2626" />
      </View>
      <Text style={styles.errorTitle}>{errorInfo?.title || 'Error'}</Text>
      <Text style={styles.errorMessage}>{errorInfo?.message || 'Something went wrong.'}</Text>

      {errorInfo?.code === 'ENTITLEMENT_REQUIRED' && (
        <Pressable
          style={[styles.generateButton, styles.upgradeButton]}
          onPress={() => router.push('/upgrade')}
        >
          <Text style={styles.generateButtonText}>View Plans</Text>
        </Pressable>
      )}

      <Pressable style={styles.retryButton} onPress={() => setState('idle')}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderSuccess = () => {
    if (!payload) return null;
    const { meta, scores, drivers, overload, recovery, forecast } = payload;
    const TrendIcon = getTrendIcon(scores.trend_direction);

    return (
      <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
        {/* Header Card */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardLabel}>CCI GENERATED</Text>
          <Text style={styles.resultCardDate}>{formatDate(meta.generated_at)}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemValue}>{meta.total_signals}</Text>
              <Text style={styles.metaItemLabel}>SIGNALS</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaItemValue}>{meta.unique_days}</Text>
              <Text style={styles.metaItemLabel}>DAYS</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaItemValue}>{(meta.data_quality_score * 100).toFixed(0)}</Text>
              <Text style={styles.metaItemLabel}>QUALITY</Text>
            </View>
          </View>
        </View>

        {/* Capacity Scores */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionLabel}>CAPACITY SCORES</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: getCapacityColor(scores.current_capacity) }]}>
                {formatCapacity(scores.current_capacity)}
              </Text>
              <Text style={styles.scoreLabel}>CURRENT</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: 'rgba(255,255,255,0.6)' }]}>
                {formatCapacity(scores.baseline_capacity)}
              </Text>
              <Text style={styles.scoreLabel}>BASELINE</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, {
                color: scores.delta_from_baseline != null
                  ? scores.delta_from_baseline > 0 ? '#2DD4BF' : scores.delta_from_baseline < 0 ? '#DC2626' : '#F59E0B'
                  : 'rgba(255,255,255,0.5)',
              }]}>
                {scores.delta_from_baseline != null
                  ? (scores.delta_from_baseline > 0 ? '+' : '') + (scores.delta_from_baseline * 100).toFixed(0)
                  : '—'}
              </Text>
              <Text style={styles.scoreLabel}>DELTA</Text>
            </View>
          </View>
        </View>

        {/* Stability & Trend */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionLabel}>STABILITY & TREND</Text>
          <View style={styles.stabilityRow}>
            <View style={styles.stabilityBlock}>
              <ShieldCheck size={20} color="#2DD4BF" />
              <Text style={styles.stabilityValue}>
                {scores.stability_score != null ? scores.stability_score.toFixed(0) : '—'}
              </Text>
              <Text style={styles.stabilityLabel}>STABILITY</Text>
            </View>
            <View style={styles.stabilityBlock}>
              <TrendIcon size={20} color={getTrendColor(scores.trend_direction)} />
              <Text style={[styles.stabilityValue, { color: getTrendColor(scores.trend_direction) }]}>
                {scores.trend_direction.toUpperCase()}
              </Text>
              <Text style={styles.stabilityLabel}>
                Δ {scores.trend_delta > 0 ? '+' : ''}{(scores.trend_delta * 100).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Drivers */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionLabel}>TOP DRIVERS</Text>
          {drivers.top_5.map((d, i) => (
            <View key={d.driver} style={styles.driverRow}>
              <Text style={styles.driverRank}>{i + 1}</Text>
              <Text style={styles.driverName}>{d.driver.toUpperCase()}</Text>
              <View style={styles.driverBarContainer}>
                <View
                  style={[
                    styles.driverBar,
                    { width: `${Math.min(d.pct, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.driverPct}>{d.pct.toFixed(0)}%</Text>
            </View>
          ))}
          {drivers.top_5.length === 0 && (
            <Text style={styles.emptyText}>No driver data available</Text>
          )}
        </View>

        {/* Overload & Recovery */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionLabel}>OVERLOAD & RECOVERY</Text>
          <View style={styles.stabilityRow}>
            <View style={styles.stabilityBlock}>
              <AlertTriangle size={20} color={overload.event_count > 0 ? '#DC2626' : 'rgba(255,255,255,0.3)'} />
              <Text style={[styles.stabilityValue, overload.event_count > 0 && { color: '#DC2626' }]}>
                {overload.event_count}
              </Text>
              <Text style={styles.stabilityLabel}>OVERLOAD EVENTS</Text>
            </View>
            <View style={styles.stabilityBlock}>
              <Activity size={20} color="#2DD4BF" />
              <Text style={styles.stabilityValue}>
                {recovery.avg_recovery_days != null ? recovery.avg_recovery_days.toFixed(1) : '—'}
              </Text>
              <Text style={styles.stabilityLabel}>
                {recovery.avg_recovery_days != null ? 'AVG RECOVERY DAYS' : 'NO RECOVERY DATA'}
              </Text>
            </View>
          </View>
          {recovery.fastest != null && (
            <Text style={styles.recoveryDetail}>
              Fastest: {recovery.fastest}d · Slowest: {recovery.slowest}d · {recovery.episodes_in_window} episodes ({recovery.measured_from})
            </Text>
          )}
        </View>

        {/* Forecast */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionLabel}>6-WEEK FORECAST</Text>
          {forecast.points.length > 0 ? (
            <>
              <Text style={[styles.forecastLabel, {
                color: forecast.slope_per_day > 0.005 ? '#2DD4BF'
                  : forecast.slope_per_day < -0.005 ? '#DC2626' : '#F59E0B',
              }]}>
                {getForecastLabel(forecast.slope_per_day)}
              </Text>
              <View style={styles.forecastMeta}>
                <Text style={styles.forecastMetaText}>
                  Slope: {(forecast.slope_per_day * 100).toFixed(2)}/day
                </Text>
                <Text style={styles.forecastMetaText}>
                  R²: {forecast.r_squared.toFixed(3)}
                </Text>
              </View>
              <View style={styles.forecastPoints}>
                {[0, 6, 13, 20, 27, 34, 41].map((idx) => {
                  const point = forecast.points[idx];
                  if (!point) return null;
                  return (
                    <View key={idx} style={styles.forecastPoint}>
                      <Text style={styles.forecastPointDate}>
                        Wk {Math.floor(idx / 7) + 1}
                      </Text>
                      <View style={[styles.forecastDot, { backgroundColor: getCapacityColor(point.predicted_capacity) }]} />
                      <Text style={styles.forecastPointValue}>
                        {(point.predicted_capacity * 100).toFixed(0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Not enough data for forecast (need ≥7 days)</Text>
          )}
        </View>

        {/* Regenerate */}
        <Pressable style={styles.regenerateButton} onPress={() => { setState('idle'); setPayload(null); }}>
          <Text style={styles.regenerateButtonText}>Generate New Report</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={commonStyles.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>CCI Report</Text>
        <View style={{ width: 40 }} />
      </View>

      {state === 'idle' && renderIdle()}
      {state === 'loading' && renderLoading()}
      {state === 'error' && renderError()}
      {state === 'success' && renderSuccess()}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: { padding: spacing.sm },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(45,212,191,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerError: {
    backgroundColor: 'rgba(220,38,38,0.1)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
    maxWidth: 300,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2DD4BF',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 32,
    gap: spacing.sm,
    width: '100%',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  upgradeButton: {
    backgroundColor: '#06B6D4',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 300,
    lineHeight: 20,
  },
  // Result styles
  resultScroll: { flex: 1 },
  resultContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2DD4BF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultCardDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minWidth: 80,
  },
  metaItemValue: {
    fontSize: 20,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.8)',
  },
  metaItemLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreBlock: {
    alignItems: 'center',
  },
  scoreBig: {
    fontSize: 32,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.8)',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  stabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stabilityBlock: {
    alignItems: 'center',
    gap: 6,
  },
  stabilityValue: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
  },
  stabilityLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  // Drivers
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  driverRank: {
    width: 20,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  driverName: {
    width: 80,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  driverBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  driverBar: {
    height: '100%',
    backgroundColor: '#2DD4BF',
    borderRadius: 2,
  },
  driverPct: {
    width: 36,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  recoveryDetail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Forecast
  forecastLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  forecastMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  forecastMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  forecastPoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  forecastPoint: {
    alignItems: 'center',
    gap: 4,
  },
  forecastPointDate: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  forecastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  forecastPointValue: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  regenerateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: spacing.sm,
  },
  regenerateButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});
