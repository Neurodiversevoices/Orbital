/**
 * Device Preview - iPhone mockup for screenshots and demos
 *
 * Routes:
 *   /device-preview - Responsive mode (fits any device)
 *   /device-preview?mode=screenshot - Fixed-size screenshot mode
 *   /device-preview?mode=embed - Transparent background embed
 *   /device-preview?width=350 - Custom width (screenshot/embed only)
 *   /device-preview?debug=1 - Show debug overlay with viewport/safe-area info
 *
 * Screenshot capture:
 *   1. Navigate to /device-preview?mode=screenshot
 *   2. Use browser screenshot tool (cmd+shift+4 on macOS)
 *   3. Capture the iPhone frame with dark background
 *
 * Mobile viewing:
 *   1. Open /device-preview on iPhone Safari
 *   2. Device frame scales to fit viewport perfectly
 *   3. Add to home screen for app-like experience
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { TrendingUp, Minus } from 'lucide-react-native';
import { IPhoneFrame } from '../components/device';
import { GlassOrb } from '../components';
import { colors, spacing } from '../theme';
import { useEnergyLogs } from '../lib/hooks/useEnergyLogs';
import { useLocale } from '../lib/hooks/useLocale';
import { CapacityState } from '../types';

function formatDate(locale: 'en' | 'es'): string {
  const localeCode = locale === 'es' ? 'es-MX' : 'en-US';
  return new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function HomePreview() {
  const { logs } = useEnergyLogs();
  const { t, locale } = useLocale();

  const signalData = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const prevWeekStart = weekAgo - 7 * 24 * 60 * 60 * 1000;

    const todayLogs = logs.filter((log) => log.timestamp >= todayStart);
    const weekLogs = logs.filter((log) => log.timestamp >= weekAgo);
    const prevWeekLogs = logs.filter((log) => log.timestamp >= prevWeekStart && log.timestamp < weekAgo);

    const stateToPercent = (state: CapacityState) => {
      if (state === 'resourced') return 100;
      if (state === 'stretched') return 50;
      return 0;
    };

    const todayAvg = todayLogs.length > 0
      ? Math.round(todayLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / todayLogs.length)
      : 78;

    const weekAvg = weekLogs.length > 0
      ? weekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / weekLogs.length
      : null;
    const prevWeekAvg = prevWeekLogs.length > 0
      ? prevWeekLogs.reduce((sum, log) => sum + stateToPercent(log.state), 0) / prevWeekLogs.length
      : null;

    let trend: 'up' | 'down' | 'stable' | null = null;
    if (logs.length >= 14 && weekAvg !== null && prevWeekAvg !== null) {
      const diff = weekAvg - prevWeekAvg;
      if (diff > 8) trend = 'up';
      else if (diff < -8) trend = 'down';
      else trend = 'stable';
    } else if (logs.length >= 7) {
      trend = 'up';
    }

    const totalSignals = logs.length || 47;

    return { todayAvg, trend, totalSignals };
  }, [logs]);

  return (
    <View style={previewStyles.container}>
      {/* Header */}
      <View style={previewStyles.header}>
        <Text style={previewStyles.title}>Orbital</Text>
      </View>

      {/* Content */}
      <View style={previewStyles.content}>
        {/* Welcome & Date */}
        <View style={previewStyles.welcomeSection}>
          <Text style={previewStyles.welcomeText}>{t.home.title}</Text>
          <Text style={previewStyles.dateText}>{formatDate(locale)}</Text>
        </View>

        {/* Signal Summary Bar */}
        <View style={previewStyles.signalBar}>
          <View style={previewStyles.signalItem}>
            <Text style={previewStyles.signalLabel}>{t.core.today.toUpperCase()}</Text>
            <Text style={[previewStyles.signalValue, { color: '#00E5FF' }]}>
              {signalData.todayAvg}%
            </Text>
          </View>

          <View style={previewStyles.signalDivider} />

          <View style={previewStyles.signalItem}>
            <Text style={previewStyles.signalLabel}>{t.core.trend.toUpperCase()}</Text>
            <View style={previewStyles.signalIconRow}>
              {signalData.trend === 'up' && <TrendingUp size={16} color="#00E5FF" />}
              {signalData.trend === 'stable' && <Minus size={16} color="#E8A830" />}
              {signalData.trend === null && <Minus size={16} color="rgba(255,255,255,0.3)" />}
            </View>
          </View>

          <View style={previewStyles.signalDivider} />

          <View style={previewStyles.signalItem}>
            <Text style={previewStyles.signalLabel}>{t.core.signals.toUpperCase()}</Text>
            <Text style={[previewStyles.signalValue, { color: 'rgba(255,255,255,0.85)' }]}>
              {signalData.totalSignals}
            </Text>
          </View>
        </View>

        {/* Instruction */}
        <Text style={previewStyles.instruction}>{t.home.adjustPrompt}</Text>

        {/* Orb */}
        <View style={previewStyles.orbContainer}>
          <GlassOrb state={null} onStateChange={() => {}} onSave={() => {}} />
          {/* Capacity Spectrum */}
          <View style={previewStyles.spectrumContainer}>
            <View style={previewStyles.spectrumTrack}>
              <View style={[previewStyles.spectrumEndcap, previewStyles.spectrumEndcapLeft]} />
              <View style={previewStyles.spectrumBar}>
                <View style={[previewStyles.spectrumSegment, { backgroundColor: '#00E5FF' }]} />
                <View style={[previewStyles.spectrumSegment, { backgroundColor: '#E8A830' }]} />
                <View style={[previewStyles.spectrumSegment, { backgroundColor: '#F44336' }]} />
              </View>
              <View style={[previewStyles.spectrumEndcap, previewStyles.spectrumEndcapRight]} />
            </View>
            <View style={previewStyles.spectrumLabels}>
              <Text style={previewStyles.spectrumLabel}>{t.home.spectrum.high}</Text>
              <Text style={previewStyles.spectrumLabel}>{t.home.spectrum.low}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Debug overlay component
function DebugOverlay() {
  const { width, height } = useWindowDimensions();
  const [safeAreas, setSafeAreas] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Read CSS env() values via computed style
      const computeSafeAreas = () => {
        const div = document.createElement('div');
        div.style.cssText = `
          position: fixed;
          top: env(safe-area-inset-top);
          right: env(safe-area-inset-right);
          bottom: env(safe-area-inset-bottom);
          left: env(safe-area-inset-left);
          pointer-events: none;
          visibility: hidden;
        `;
        document.body.appendChild(div);

        const style = getComputedStyle(div);
        setSafeAreas({
          top: parseFloat(style.top) || 0,
          right: parseFloat(style.right) || 0,
          bottom: parseFloat(style.bottom) || 0,
          left: parseFloat(style.left) || 0,
        });

        document.body.removeChild(div);
      };

      computeSafeAreas();
      window.addEventListener('resize', computeSafeAreas);
      return () => window.removeEventListener('resize', computeSafeAreas);
    }
  }, []);

  return (
    <View style={debugStyles.overlay}>
      {/* Top safe area indicator */}
      <View style={[debugStyles.safeAreaIndicator, debugStyles.safeAreaTop, { height: safeAreas.top || 20 }]}>
        <Text style={debugStyles.debugText}>top: {safeAreas.top}px</Text>
      </View>

      {/* Bottom safe area indicator */}
      <View style={[debugStyles.safeAreaIndicator, debugStyles.safeAreaBottom, { height: safeAreas.bottom || 20 }]}>
        <Text style={debugStyles.debugText}>bottom: {safeAreas.bottom}px</Text>
      </View>

      {/* Left safe area indicator */}
      {safeAreas.left > 0 && (
        <View style={[debugStyles.safeAreaIndicator, debugStyles.safeAreaLeft, { width: safeAreas.left }]}>
          <Text style={[debugStyles.debugText, { transform: [{ rotate: '-90deg' }] }]}>{safeAreas.left}px</Text>
        </View>
      )}

      {/* Right safe area indicator */}
      {safeAreas.right > 0 && (
        <View style={[debugStyles.safeAreaIndicator, debugStyles.safeAreaRight, { width: safeAreas.right }]}>
          <Text style={[debugStyles.debugText, { transform: [{ rotate: '90deg' }] }]}>{safeAreas.right}px</Text>
        </View>
      )}

      {/* Viewport info */}
      <View style={debugStyles.viewportInfo}>
        <Text style={debugStyles.debugText}>
          Viewport: {width}x{height}
        </Text>
        <Text style={debugStyles.debugText}>
          Safe: T{safeAreas.top} R{safeAreas.right} B{safeAreas.bottom} L{safeAreas.left}
        </Text>
        <Text style={debugStyles.debugText}>
          DPR: {Platform.OS === 'web' ? (window.devicePixelRatio || 1).toFixed(1) : 'N/A'}
        </Text>
      </View>
    </View>
  );
}

export default function DevicePreviewScreen() {
  const params = useLocalSearchParams();
  const mode = (params.mode as string) || 'responsive';
  const width = params.width ? parseInt(params.width as string, 10) : 390;
  const showDebug = params.debug === '1';

  // Map URL mode to IPhoneFrame mode
  const frameMode = mode === 'screenshot' ? 'screenshot' : mode === 'embed' ? 'embed' : 'responsive';
  const isEmbed = mode === 'embed';
  const isResponsive = mode === 'responsive';

  return (
    <View style={[
      styles.container,
      isEmbed && styles.embedContainer,
      isResponsive && styles.responsiveContainer,
    ]}>
      <IPhoneFrame
        width={isResponsive ? undefined : width}
        mode={frameMode}
        time="9:41"
        batteryLevel={100}
      >
        <HomePreview />
      </IPhoneFrame>

      {/* Instructions for non-responsive modes */}
      {mode === 'screenshot' && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Screenshot mode: Use browser tools to capture this frame
          </Text>
          <Text style={styles.instructionSubtext}>
            ?mode=responsive for mobile | ?mode=embed for landing pages
          </Text>
        </View>
      )}

      {/* Debug overlay */}
      {showDebug && <DebugOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  responsiveContainer: {
    // Use dvh for proper mobile viewport handling
    ...(Platform.OS === 'web' ? {
      minHeight: '100dvh' as any,
      maxHeight: '100dvh' as any,
      overflow: 'hidden',
    } : {}),
  },
  embedContainer: {
    backgroundColor: 'transparent',
    minHeight: undefined,
  },
  instructions: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  instructionSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
  },
});

const previewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '200',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 6,
    textTransform: 'uppercase',
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
    paddingHorizontal: spacing.sm,
    minWidth: 50,
  },
  signalLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  signalValue: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.5)',
  },
  signalIconRow: {
    height: 18,
    justifyContent: 'center',
  },
  signalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  instruction: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 140,
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
  spectrumLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 160,
  },
  spectrumLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});

const debugStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as any,
  },
  safeAreaIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeAreaTop: {
    top: 0,
    left: 0,
    right: 0,
  },
  safeAreaBottom: {
    bottom: 0,
    left: 0,
    right: 0,
  },
  safeAreaLeft: {
    top: 0,
    left: 0,
    bottom: 0,
  },
  safeAreaRight: {
    top: 0,
    right: 0,
    bottom: 0,
  },
  viewportInfo: {
    position: 'absolute',
    top: 60,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.5)',
  },
  debugText: {
    fontSize: 10,
    color: '#FF0000',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});
