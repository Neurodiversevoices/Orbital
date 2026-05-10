/**
 * CCI Report Generation Screen
 *
 * Calls the generate-cci Edge Function and displays structured CCI data.
 *
 * Light-theme repaint (May 2026): white background, hairline cards, teal
 * primary action, DM Sans / Space Mono per project design system.
 *
 * Adds:
 *  - Window picker (30 / 60 / 90) drives the Edge Function date range.
 *  - Optional recipient field carried through to the regenerated artifact.
 *  - Prominent display of selected window, recipient, generated date.
 *  - "Print again" / "Share again" actions on the result panel.
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
  TextInput,
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
  Printer,
  Share2,
} from 'lucide-react-native';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';
import CCIWindowPicker from '../components/CCIWindowPicker';
import type { CCIWindowDays } from '../lib/cci';

// =============================================================================
// LIGHT-THEME TOKENS (per project design system, May 2026)
// =============================================================================

const LIGHT = {
  background: '#FFFFFF',
  textPrimary: '#0F1624',
  textSecondary: 'rgba(15, 22, 36, 0.62)',
  textTertiary: 'rgba(15, 22, 36, 0.38)',
  cardBorder: 'rgba(15, 22, 36, 0.10)',
  cardShadow: 'rgba(15, 22, 36, 0.06)',
  primary: '#2DD4BF',
  primaryText: '#FFFFFF',
  accentCyan: '#06B6D4',
  warningAmber: '#F59E0B',
  alertCrimson: '#DC2626',
} as const;

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
  if (value == null) return LIGHT.textTertiary;
  if (value >= 0.7) return LIGHT.accentCyan;
  if (value >= 0.5) return LIGHT.primary;
  if (value >= 0.3) return LIGHT.warningAmber;
  return LIGHT.alertCrimson;
}

function getTrendIcon(direction: string) {
  if (direction === 'improving') return TrendingUp;
  if (direction === 'declining') return TrendingDown;
  return Minus;
}

function getTrendColor(direction: string): string {
  if (direction === 'improving') return LIGHT.primary;
  if (direction === 'declining') return LIGHT.alertCrimson;
  return LIGHT.warningAmber;
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
  const [windowDays, setWindowDays] = useState<CCIWindowDays>(90);
  const [recipientName, setRecipientName] = useState<string>('');

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

      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setErrorInfo({
          title: 'Authentication Required',
          message: 'Please sign in to generate your CCI report.',
        });
        setState('error');
        return;
      }

      // Use the selected windowDays for the Edge Function call
      const now = new Date();
      const windowAgo = new Date();
      windowAgo.setDate(now.getDate() - windowDays);

      const { data, error } = await supabase.functions.invoke('generate-cci', {
        body: {
          user_id: user.id,
          date_start: windowAgo.toISOString(),
          date_end: now.toISOString(),
          window_days: windowDays,
          recipient_name: recipientName.trim() || undefined,
        },
      });

      if (error) {
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
  }, [windowDays, recipientName]);

  // Print again (web) — kicks the print dialog with the current window/recipient.
  const handlePrintAgain = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  // Share again — re-routes through generation (state already loaded).
  const handleShareAgain = useCallback(() => {
    // Lightweight: re-run generation so the artifact carries fresh signature/hash.
    generateReport();
  }, [generateReport]);

  // ─── RENDER ───

  const renderIdle = () => (
    <ScrollView contentContainerStyle={styles.idleScroll}>
      <View style={styles.heroCard}>
        <View style={styles.iconContainer}>
          <FileBarChart size={42} color={LIGHT.primary} />
        </View>
        <Text style={styles.heroTitle}>Capacity Composite Index</Text>
        <Text style={styles.heroSubtitle}>
          Generate a comprehensive analysis of your capacity patterns over the last {windowDays} days.
        </Text>
      </View>

      <View style={styles.optionsCard}>
        <CCIWindowPicker value={windowDays} onChange={setWindowDays} />

        <View style={styles.recipientWrapper}>
          <Text style={styles.eyebrow}>FOR (OPTIONAL)</Text>
          <TextInput
            style={styles.recipientInput}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Therapist or clinician name"
            placeholderTextColor={LIGHT.textTertiary}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={120}
            accessibilityLabel="Recipient name (optional)"
            testID="cci-report-recipient-input"
          />
          <Text style={styles.recipientHint}>
            Renders as "Prepared for: …" on the PDF header.
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.eyebrow}>INCLUDED IN REPORT</Text>
        <Text style={styles.infoItem}>• Current capacity score vs baseline</Text>
        <Text style={styles.infoItem}>• Stability analysis &amp; trend direction</Text>
        <Text style={styles.infoItem}>• Top driver attributions</Text>
        <Text style={styles.infoItem}>• Overload event detection</Text>
        <Text style={styles.infoItem}>• Recovery lag measurement</Text>
        <Text style={styles.infoItem}>• 6-week capacity forecast</Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={generateReport}
        accessibilityRole="button"
        accessibilityLabel="Generate instrument"
      >
        <Zap size={18} color={LIGHT.primaryText} />
        <Text style={styles.primaryButtonText}>Generate Instrument</Text>
      </Pressable>
    </ScrollView>
  );

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={LIGHT.primary} />
      <Text style={styles.loadingText}>Computing CCI…</Text>
      <Text style={styles.loadingSubtext}>
        Analyzing capacity logs, driver patterns, and recovery episodes
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContent}>
      <View style={[styles.iconContainer, styles.iconContainerError]}>
        <AlertTriangle size={42} color={LIGHT.alertCrimson} />
      </View>
      <Text style={styles.errorTitle}>{errorInfo?.title || 'Error'}</Text>
      <Text style={styles.errorMessage}>{errorInfo?.message || 'Something went wrong.'}</Text>

      {errorInfo?.code === 'ENTITLEMENT_REQUIRED' && (
        <Pressable
          style={[styles.primaryButton, styles.upgradeButton]}
          onPress={() => router.push('/upgrade')}
          accessibilityRole="button"
          accessibilityLabel="View plans"
        >
          <Text style={styles.primaryButtonText}>View Plans</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.secondaryButton}
        onPress={() => setState('idle')}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.secondaryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderSuccess = () => {
    if (!payload) return null;
    const { meta, scores, drivers, overload, recovery, forecast } = payload;
    const TrendIcon = getTrendIcon(scores.trend_direction);

    return (
      <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
        {/* Prominent generation banner: window / recipient / date */}
        <View style={styles.bannerCard}>
          <Text style={styles.eyebrow}>CCI GENERATED</Text>
          <Text style={styles.bannerDate}>{formatDate(meta.generated_at)}</Text>
          <View style={styles.bannerMeta}>
            <View style={styles.bannerMetaCell}>
              <Text style={styles.bannerMetaLabel}>WINDOW</Text>
              <Text style={styles.bannerMetaValue}>{meta.window_days || windowDays} days</Text>
            </View>
            {recipientName.trim().length > 0 && (
              <View style={styles.bannerMetaCell}>
                <Text style={styles.bannerMetaLabel}>PREPARED FOR</Text>
                <Text style={styles.bannerMetaValue}>{recipientName.trim()}</Text>
              </View>
            )}
            <View style={styles.bannerMetaCell}>
              <Text style={styles.bannerMetaLabel}>SIGNALS</Text>
              <Text style={styles.bannerMetaValue}>{meta.total_signals}</Text>
            </View>
            <View style={styles.bannerMetaCell}>
              <Text style={styles.bannerMetaLabel}>QUALITY</Text>
              <Text style={styles.bannerMetaValue}>
                {(meta.data_quality_score * 100).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Capacity Scores */}
        <View style={styles.resultCard}>
          <Text style={styles.eyebrow}>CAPACITY SCORES</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: getCapacityColor(scores.current_capacity) }]}>
                {formatCapacity(scores.current_capacity)}
              </Text>
              <Text style={styles.scoreLabel}>CURRENT</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, { color: LIGHT.textSecondary }]}>
                {formatCapacity(scores.baseline_capacity)}
              </Text>
              <Text style={styles.scoreLabel}>BASELINE</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreBig, {
                color: scores.delta_from_baseline != null
                  ? scores.delta_from_baseline > 0 ? LIGHT.primary : scores.delta_from_baseline < 0 ? LIGHT.alertCrimson : LIGHT.warningAmber
                  : LIGHT.textTertiary,
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
          <Text style={styles.eyebrow}>STABILITY &amp; TREND</Text>
          <View style={styles.stabilityRow}>
            <View style={styles.stabilityBlock}>
              <ShieldCheck size={20} color={LIGHT.primary} />
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
          <Text style={styles.eyebrow}>TOP DRIVERS</Text>
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
          <Text style={styles.eyebrow}>OVERLOAD &amp; RECOVERY</Text>
          <View style={styles.stabilityRow}>
            <View style={styles.stabilityBlock}>
              <AlertTriangle size={20} color={overload.event_count > 0 ? LIGHT.alertCrimson : LIGHT.textTertiary} />
              <Text style={[styles.stabilityValue, overload.event_count > 0 && { color: LIGHT.alertCrimson }]}>
                {overload.event_count}
              </Text>
              <Text style={styles.stabilityLabel}>OVERLOAD EVENTS</Text>
            </View>
            <View style={styles.stabilityBlock}>
              <Activity size={20} color={LIGHT.primary} />
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
          <Text style={styles.eyebrow}>6-WEEK FORECAST</Text>
          {forecast.points.length > 0 ? (
            <>
              <Text style={[styles.forecastLabel, {
                color: forecast.slope_per_day > 0.005 ? LIGHT.primary
                  : forecast.slope_per_day < -0.005 ? LIGHT.alertCrimson : LIGHT.warningAmber,
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

        {/* Print again / Share again — preserved actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={handlePrintAgain}
            accessibilityRole="button"
            accessibilityLabel="Print again"
          >
            <Printer size={18} color={LIGHT.primary} />
            <Text style={styles.actionButtonText}>Print again</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handleShareAgain}
            accessibilityRole="button"
            accessibilityLabel="Share again"
          >
            <Share2 size={18} color={LIGHT.primary} />
            <Text style={styles.actionButtonText}>Share again</Text>
          </Pressable>
        </View>

        {/* Regenerate */}
        <Pressable
          style={styles.secondaryButton}
          onPress={() => { setState('idle'); setPayload(null); }}
          accessibilityRole="button"
          accessibilityLabel="Generate new report"
        >
          <Text style={styles.secondaryButtonText}>Generate New Report</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={LIGHT.textPrimary} />
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
// STYLES — light theme
// =============================================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT.cardBorder,
  },
  headerBack: { padding: 8 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT.textPrimary,
  },
  // Eyebrow
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: LIGHT.textSecondary,
    letterSpacing: 1.6,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  // Idle layout
  idleScroll: {
    padding: 32,
    gap: 16,
    paddingBottom: 64,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 24,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 212, 191, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerError: {
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: LIGHT.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  optionsCard: {
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 20,
    gap: 16,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recipientWrapper: { width: '100%' },
  recipientInput: {
    height: 48,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: LIGHT.textPrimary,
    backgroundColor: LIGHT.background,
  },
  recipientHint: {
    marginTop: 6,
    fontSize: 11,
    color: LIGHT.textTertiary,
  },
  infoCard: {
    backgroundColor: LIGHT.background,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    padding: 20,
  },
  infoItem: {
    fontSize: 13,
    color: LIGHT.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT.primary,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: LIGHT.primaryText,
    letterSpacing: 0.3,
  },
  upgradeButton: {
    backgroundColor: LIGHT.accentCyan,
    marginBottom: 12,
    width: '100%',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 54,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    backgroundColor: LIGHT.background,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: LIGHT.textPrimary,
    fontWeight: '600',
  },
  // Loading + error
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: LIGHT.textPrimary,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 13,
    color: LIGHT.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: LIGHT.alertCrimson,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: LIGHT.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 320,
    lineHeight: 20,
  },
  // Result panel
  resultScroll: { flex: 1 },
  resultContent: {
    padding: 32,
    paddingBottom: 64,
    gap: 12,
  },
  bannerCard: {
    backgroundColor: LIGHT.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    padding: 20,
    shadowColor: LIGHT.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bannerDate: {
    fontSize: 18,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    marginBottom: 12,
  },
  bannerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bannerMetaCell: {
    minWidth: 90,
  },
  bannerMetaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: LIGHT.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 2,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  bannerMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: LIGHT.textPrimary,
  },
  resultCard: {
    backgroundColor: LIGHT.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    padding: 20,
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
    fontWeight: '300',
    color: LIGHT.textPrimary,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: LIGHT.textTertiary,
    letterSpacing: 0.6,
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
    fontWeight: '500',
    color: LIGHT.textPrimary,
  },
  stabilityLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: LIGHT.textTertiary,
    letterSpacing: 0.6,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverRank: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: LIGHT.textTertiary,
  },
  driverName: {
    width: 80,
    fontSize: 11,
    fontWeight: '700',
    color: LIGHT.textPrimary,
    letterSpacing: 0.5,
  },
  driverBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(15, 22, 36, 0.06)',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  driverBar: {
    height: '100%',
    backgroundColor: LIGHT.primary,
    borderRadius: 2,
  },
  driverPct: {
    width: 36,
    fontSize: 11,
    fontWeight: '600',
    color: LIGHT.textSecondary,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: LIGHT.textTertiary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  recoveryDetail: {
    fontSize: 11,
    color: LIGHT.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  forecastLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  forecastMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  forecastMetaText: {
    fontSize: 11,
    color: LIGHT.textSecondary,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  forecastPoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  forecastPoint: {
    alignItems: 'center',
    gap: 4,
  },
  forecastPointDate: {
    fontSize: 9,
    color: LIGHT.textTertiary,
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
    color: LIGHT.textPrimary,
  },
  // Action row (Print again / Share again)
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    borderRadius: 14,
    backgroundColor: LIGHT.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: LIGHT.textPrimary,
  },
});
