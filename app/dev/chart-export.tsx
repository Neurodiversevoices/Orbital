/**
 * Dev Chart Export Page
 *
 * FOUNDER-ONLY: Hidden route for exporting Pattern chart as SVG.
 * Matches EnergyGraph component styling exactly.
 *
 * Access: /dev/chart-export (only visible when EXPO_PUBLIC_FOUNDER_DEMO=1)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Download, Check } from 'lucide-react-native';
import { colors, spacing, commonStyles } from '../../theme';
import { useEnergyLogs } from '../../lib/hooks/useEnergyLogs';
import { FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';
import { generateQCRChartSVG, generateAppStyleChartSVG, CHART_COLORS } from '../../lib/qcr';
import { TimeRange, getTimeRangeMs } from '../../components/TimeRangeTabs';
import { EnergyGraph } from '../../components';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number }[] = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days (QCR)', days: 90 },
  { value: '6m', label: '6 Months', days: 183 },
  { value: '1y', label: '1 Year', days: 365 },
  { value: '10y', label: '10 Years', days: 3650 },
];

export default function DevChartExportPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { logs, isLoading } = useEnergyLogs();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('90d');
  const [copied, setCopied] = useState(false);
  const [exportMode, setExportMode] = useState<'qcr' | 'app'>('qcr');

  // Gate: Only render for founder demo mode
  if (!FOUNDER_DEMO_ENABLED) {
    return null;
  }

  // Get days for selected range
  const selectedDays = TIME_RANGE_OPTIONS.find((r) => r.value === selectedRange)?.days || 90;

  // Generate SVG
  const svgContent = useMemo(() => {
    if (logs.length === 0) return '';

    if (exportMode === 'qcr') {
      return generateQCRChartSVG(logs, {
        width: 400,
        height: 180,
        timeRangeDays: selectedDays,
      });
    } else {
      return generateAppStyleChartSVG(logs, selectedDays);
    }
  }, [logs, selectedDays, exportMode]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(svgContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Download SVG file
  const handleDownload = () => {
    if (Platform.OS === 'web') {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbital_chart_${selectedRange}_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Chart Export</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEV</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Color Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Reference</Text>
          <View style={styles.colorRow}>
            <View style={styles.colorChip}>
              <View style={[styles.colorDot, { backgroundColor: CHART_COLORS.resourced }]} />
              <Text style={styles.colorLabel}>Resourced: {CHART_COLORS.resourced}</Text>
            </View>
            <View style={styles.colorChip}>
              <View style={[styles.colorDot, { backgroundColor: CHART_COLORS.stretched }]} />
              <Text style={styles.colorLabel}>Stretched: {CHART_COLORS.stretched}</Text>
            </View>
            <View style={styles.colorChip}>
              <View style={[styles.colorDot, { backgroundColor: CHART_COLORS.depleted }]} />
              <Text style={styles.colorLabel}>Depleted: {CHART_COLORS.depleted}</Text>
            </View>
          </View>
        </View>

        {/* Export Mode Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Mode</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, exportMode === 'qcr' && styles.toggleButtonActive]}
              onPress={() => setExportMode('qcr')}
            >
              <Text style={[styles.toggleText, exportMode === 'qcr' && styles.toggleTextActive]}>
                QCR (PDF)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, exportMode === 'app' && styles.toggleButtonActive]}
              onPress={() => setExportMode('app')}
            >
              <Text style={[styles.toggleText, exportMode === 'app' && styles.toggleTextActive]}>
                App Style
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.rangeRow}>
              {TIME_RANGE_OPTIONS.map((range) => (
                <Pressable
                  key={range.value}
                  style={[
                    styles.rangeButton,
                    selectedRange === range.value && styles.rangeButtonActive,
                  ]}
                  onPress={() => setSelectedRange(range.value)}
                >
                  <Text
                    style={[
                      styles.rangeText,
                      selectedRange === range.value && styles.rangeTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Live Preview: App Component */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Preview (App Component)</Text>
          <View style={styles.previewContainer}>
            <EnergyGraph logs={logs} width={width - spacing.md * 4} timeRange={selectedRange} />
          </View>
        </View>

        {/* Generated SVG Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generated SVG ({exportMode === 'qcr' ? '400x180' : '380x200'})</Text>
          <View style={[styles.svgPreview, exportMode === 'app' && styles.svgPreviewDark]}>
            {Platform.OS === 'web' && svgContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              />
            ) : (
              <Text style={styles.previewPlaceholder}>
                {isLoading ? 'Loading...' : logs.length === 0 ? 'No data' : 'Web only'}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Actions</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={handleCopy}>
              {copied ? (
                <Check size={18} color={CHART_COLORS.resourced} />
              ) : (
                <Copy size={18} color={colors.textSecondary} />
              )}
              <Text style={[styles.actionText, copied && { color: CHART_COLORS.resourced }]}>
                {copied ? 'Copied!' : 'Copy SVG'}
              </Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleDownload}>
              <Download size={18} color={colors.textSecondary} />
              <Text style={styles.actionText}>Download SVG</Text>
            </Pressable>
          </View>
        </View>

        {/* SVG Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SVG Code ({svgContent.length} chars)</Text>
          <ScrollView style={styles.codeContainer} horizontal>
            <Text style={styles.codeText} selectable>
              {svgContent || '// No SVG generated'}
            </Text>
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{logs.length}</Text>
              <Text style={styles.statLabel}>Total Logs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedDays}</Text>
              <Text style={styles.statLabel}>Days in Range</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {logs.filter((l) => l.timestamp >= Date.now() - selectedDays * 86400000).length}
              </Text>
              <Text style={styles.statLabel}>In Period</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF0000',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  colorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: CHART_COLORS.resourced,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: CHART_COLORS.resourced,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rangeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rangeButtonActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: CHART_COLORS.resourced,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  rangeTextActive: {
    color: CHART_COLORS.resourced,
  },
  previewContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  svgPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  svgPreviewDark: {
    backgroundColor: '#0A0B10',
  },
  previewPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  codeContainer: {
    backgroundColor: '#0D0E12',
    borderRadius: 8,
    padding: spacing.sm,
    maxHeight: 200,
  },
  codeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '300',
    color: CHART_COLORS.resourced,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
