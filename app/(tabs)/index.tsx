import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, Keyboard } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Settings, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassOrb, SavePulse, CategorySelector } from '../../components';
import { colors, commonStyles, spacing } from '../../theme';
import { CapacityState, Category } from '../../types';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { useLocale } from '../../lib/hooks/useLocale';
import { useDemoMode } from '../../lib/hooks/useDemoMode';

function formatDate(locale: 'en' | 'es'): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const forceDemo = params.demo === '1';

  const { logs, saveEntry, refresh } = useEnergyLogs();
  const { t, locale } = useLocale();
  const { isDemoMode, enableDemoMode, reseedDemoData } = useDemoMode();
  const [currentState, setCurrentState] = useState<CapacityState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Handle ?demo=1 param to force seed demo data
  useEffect(() => {
    if (forceDemo) {
      const seedDemo = async () => {
        if (!isDemoMode) {
          await enableDemoMode('90d');
        } else {
          await reseedDemoData('90d');
        }
        await refresh();
      };
      seedDemo();
    }
  }, [forceDemo]);

  // Spectrum tick position (0 = left/resourced, 1 = right/depleted)
  const SPECTRUM_WIDTH = 160;
  const tickPosition = useSharedValue(0.5);

  useEffect(() => {
    if (currentState === 'resourced') {
      tickPosition.value = withSpring(0, { damping: 20, stiffness: 120 });
    } else if (currentState === 'stretched') {
      tickPosition.value = withSpring(0.5, { damping: 20, stiffness: 120 });
    } else if (currentState === 'depleted') {
      tickPosition.value = withSpring(1, { damping: 20, stiffness: 120 });
    }
  }, [currentState]);

  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tickPosition.value * SPECTRUM_WIDTH - SPECTRUM_WIDTH / 2 }],
    opacity: tickPosition.value >= 0 ? 1 : 0,
  }));

  // Calculate signal summary data
  const signalData = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const prevWeekStart = weekAgo - 7 * 24 * 60 * 60 * 1000;

    const todayLogs = logs.filter((log) => log.timestamp >= todayStart);
    const weekLogs = logs.filter((log) => log.timestamp >= weekAgo);
    const prevWeekLogs = logs.filter((log) => log.timestamp >= prevWeekStart && log.timestamp < weekAgo);

    // Calculate average capacity (0-100)
    const stateToPercent = (state: CapacityState) => {
      if (state === 'resourced') return 100;
      if (state === 'stretched') return 50;
      return 0;
    };

    // Today's average
    const todayAvg = todayLogs.length > 0
      ? Math.round(todayLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / todayLogs.length)
      : null;

    // Week trend - only show if we have at least 7 signals total (phase 1+)
    const weekAvg = weekLogs.length > 0
      ? weekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / weekLogs.length
      : null;
    const prevWeekAvg = prevWeekLogs.length > 0
      ? prevWeekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / prevWeekLogs.length
      : null;

    // TREND requires sufficient longitudinal data (at least 14 signals for week-over-week)
    let trend: 'up' | 'down' | 'stable' | null = null;
    if (logs.length >= 14 && weekAvg !== null && prevWeekAvg !== null) {
      const diff = weekAvg - prevWeekAvg;
      if (diff > 8) trend = 'up';
      else if (diff < -8) trend = 'down';
      else trend = 'stable';
    }

    // Check for alerts (high strain today - only if multiple depleted signals)
    const todayDepletedCount = todayLogs.filter((log) => log.state === 'depleted').length;
    const hasAlert = todayDepletedCount >= 2;

    // Total signal count (the longitudinal record)
    const totalSignals = logs.length;

    return {
      todayAvg,
      trend,
      hasAlert,
      totalSignals,
    };
  }, [logs]);

  const handleStateChange = useCallback((state: CapacityState) => {
    setCurrentState(state);
  }, []);

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const canSave = currentState !== null;
  const accentColor = currentState ? stateColors[currentState] : colors.good;

  const handleSave = useCallback(async () => {
    if (currentState && !isSaving) {
      Keyboard.dismiss();
      setIsSaving(true);
      setSaveTrigger((prev) => prev + 1);

      try {
        const tags = selectedCategory ? [selectedCategory] : [];
        await saveEntry(currentState, tags, note.trim() || undefined);
        // Reset state after successful save
        setTimeout(() => {
          setCurrentState(null);
          setSelectedCategory(null);
          setNote('');
          setIsSaving(false);
        }, 600);
      } catch (error) {
        console.error('Failed to save:', error);
        setIsSaving(false);
      }
    }
  }, [currentState, selectedCategory, note, isSaving, saveEntry]);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Orbital</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
        >
          <Settings color={colors.textSecondary} size={24} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Welcome & Date */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>{t.home.title}</Text>
          <Text style={styles.dateText}>{formatDate(locale)}</Text>
        </View>

        {/* Signal Summary Bar */}
        <View style={styles.signalBar}>
          {/* Today's Capacity */}
          <View style={styles.signalItem}>
            <Text style={styles.signalLabel}>{t.core.today.toUpperCase()}</Text>
            <Text style={[
              styles.signalValue,
              signalData.todayAvg !== null && {
                color: signalData.todayAvg >= 70 ? '#00E5FF' : signalData.todayAvg >= 40 ? '#E8A830' : '#F44336'
              }
            ]}>
              {signalData.todayAvg !== null ? `${signalData.todayAvg}%` : '—'}
            </Text>
          </View>

          <View style={styles.signalDivider} />

          {/* Trend */}
          <View style={styles.signalItem}>
            <Text style={styles.signalLabel}>{t.core.trend.toUpperCase()}</Text>
            <View style={styles.signalIconRow}>
              {signalData.trend === 'up' && <TrendingUp size={16} color="#00E5FF" />}
              {signalData.trend === 'down' && <TrendingDown size={16} color="#F44336" />}
              {signalData.trend === 'stable' && <Minus size={16} color="#E8A830" />}
              {signalData.trend === null && <Minus size={16} color="rgba(255,255,255,0.3)" />}
            </View>
          </View>

          <View style={styles.signalDivider} />

          {/* Total Signals - The longitudinal record */}
          <View style={styles.signalItem}>
            <Text style={styles.signalLabel}>{t.core.signals.toUpperCase()}</Text>
            <Text style={[
              styles.signalValue,
              signalData.totalSignals > 0 && { color: 'rgba(255,255,255,0.85)' }
            ]}>
              {signalData.totalSignals}
            </Text>
          </View>
        </View>

        {/* Instruction */}
        <Animated.Text
          entering={FadeIn.delay(200).duration(400)}
          style={styles.instruction}
        >
          {!currentState
            ? t.home.adjustPrompt
            : t.home.driversLabel}
        </Animated.Text>

        {/* Orb */}
        <View style={styles.orbContainer}>
          {currentState && (
            <SavePulse trigger={saveTrigger} state={currentState} />
          )}
          <GlassOrb
            state={currentState}
            onStateChange={handleStateChange}
            onSave={handleSave}
          />
          {/* Capacity Spectrum - Calibration Cue */}
          <View style={styles.spectrumContainer}>
            <View style={styles.spectrumTrack}>
              {/* Sharp endpoint caps */}
              <View style={[styles.spectrumEndcap, styles.spectrumEndcapLeft]} />
              <View style={styles.spectrumBar}>
                <View style={[styles.spectrumSegment, { backgroundColor: '#00E5FF' }]} />
                <View style={[styles.spectrumSegment, { backgroundColor: '#E8A830' }]} />
                <View style={[styles.spectrumSegment, { backgroundColor: '#F44336' }]} />
              </View>
              <View style={[styles.spectrumEndcap, styles.spectrumEndcapRight]} />
              {/* Tick marker at current position */}
              {currentState && (
                <Animated.View style={[styles.spectrumTick, tickStyle]} />
              )}
            </View>
            <View style={styles.spectrumLabels}>
              <Text style={styles.spectrumLabel}>{t.home.spectrum.high}</Text>
              <Text style={styles.spectrumLabel}>{t.home.spectrum.low}</Text>
            </View>
          </View>
        </View>

        {/* Category Selection */}
        {currentState && (
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={FadeOut.duration(200)}
            style={styles.categoryContainer}
          >
            <CategorySelector
              selected={selectedCategory}
              onSelect={handleCategorySelect}
              accentColor={accentColor}
            />
          </Animated.View>
        )}

        {/* Note Input & Save */}
        {currentState && (
          <Animated.View
            entering={SlideInDown.delay(100).duration(300).springify()}
            exiting={FadeOut.duration(200)}
            style={styles.bottomSection}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.noteInput, { borderColor: `${accentColor}30` }]}
                value={note}
                onChangeText={setNote}
                placeholder={t.home.addDetails}
                placeholderTextColor="rgba(255,255,255,0.25)"
                maxLength={200}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Pressable
                onPress={handleSave}
                disabled={!canSave || isSaving}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: canSave ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
                    borderColor: canSave ? accentColor : 'rgba(255,255,255,0.1)',
                    opacity: isSaving ? 0.5 : 1,
                  },
                ]}
              >
                <Check
                  size={24}
                  color={canSave ? accentColor : 'rgba(255,255,255,0.3)'}
                  strokeWidth={2.5}
                />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
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
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '200',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 229, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  signalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  signalItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minWidth: 70,
  },
  signalLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  signalValue: {
    fontSize: 16,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
  },
  signalDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  instruction: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  spectrumContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  spectrumTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  spectrumBar: {
    flexDirection: 'row',
    width: 160,
    height: 1.5,
    overflow: 'hidden',
  },
  spectrumSegment: {
    flex: 1,
    height: '100%',
  },
  spectrumEndcap: {
    width: 1.5,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  spectrumEndcapLeft: {
    marginRight: -1,
  },
  spectrumEndcapRight: {
    marginLeft: -1,
  },
  spectrumTick: {
    position: 'absolute',
    width: 1.5,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 0.5,
    top: -3,
    left: '50%',
    marginLeft: -0.75,
  },
  spectrumLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 180,
  },
  spectrumLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
  categoryContainer: {
    marginTop: spacing.md,
    zIndex: 10,
  },
  bottomSection: {
    marginTop: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    height: 48,
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
