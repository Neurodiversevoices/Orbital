/**
 * QCR Screen Component
 *
 * Displays the Quarterly Capacity Report with clinical-grade visualizations.
 * Institutional styling — no wellness language.
 *
 * REQUIRED SECTIONS:
 * 1. Observation Period (dates)
 * 2. Record Depth
 * 3. Graphs Section (Daily Capacity, Weekly Mean, Driver Frequency, State Distribution)
 * 4. Written Clinical Summary
 * 5. Context / Notes
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  FileText,
  X,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { QuarterlyCapacityReport, getQuarterLabel, DAY_NAMES } from '../../lib/qcr/types';
import { exportQCRToPdf } from '../../lib/qcr';
import { FOUNDER_DEMO_ENABLED } from '../../lib/hooks/useDemoMode';

// Methodology statement (institutional compliance)
const METHODOLOGY_STATEMENT =
  'Capacity Index derived from structured self-reported state observations using a three-level ecological momentary assessment model.';
import {
  DailyCapacityChart,
  WeeklyMeanChart,
  DriverFrequencyChart,
  StateDistributionChart,
} from './charts';

export interface QCRScreenProps {
  report: QuarterlyCapacityReport;
  onClose: () => void;
  onExport?: () => void;
}

export function QCRScreen({ report, onClose, onExport }: QCRScreenProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2 - 2; // Account for padding and border
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    graphs: true,
    summary: true,
    context: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (onExport) {
      onExport();
      return;
    }

    // Export as PDF
    setIsExporting(true);
    try {
      await exportQCRToPdf(report);
    } catch (e) {
      // Export failed - silent fail
    }
    setIsExporting(false);
  }, [report, onExport]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FileText size={20} color="#7A9AAA" />
          <Text style={styles.headerTitle}>Quarterly Capacity Report</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleExport}
            style={[styles.headerButton, styles.exportButton]}
            disabled={isExporting}
          >
            <Download size={16} color={isExporting ? 'rgba(255,255,255,0.3)' : '#7A9AAA'} />
            <Text style={[styles.exportLabel, isExporting && styles.exportLabelDisabled]}>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo Badge */}
        {FOUNDER_DEMO_ENABLED && report.isDemoReport && (
          <Animated.View entering={FadeInDown.delay(0)} style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMONSTRATION DATA</Text>
          </Animated.View>
        )}

        {/* Document Title */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.titleBlock}>
          <Text style={styles.documentTitle}>
            {getQuarterLabel(report.period.quarterId)}
          </Text>
          <Text style={styles.documentSubtitle}>
            Capacity Record Summary
          </Text>
        </Animated.View>

        {/* SECTION 1: Observation Period */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionLabel}>OBSERVATION PERIOD</Text>
          <Text style={styles.periodDates}>{report.period.dateRangeLabel}</Text>
        </Animated.View>

        {/* SECTION 2: Record Depth */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionLabel}>RECORD DEPTH</Text>
          <View style={styles.recordDepthGrid}>
            <View style={styles.recordDepthItem}>
              <Text style={styles.recordDepthValue}>
                {report.recordDepth.totalObservations}
              </Text>
              <Text style={styles.recordDepthLabel}>Observations</Text>
            </View>
            <View style={styles.recordDepthDivider} />
            <View style={styles.recordDepthItem}>
              <Text style={styles.recordDepthValue}>
                {report.recordDepth.uniqueDays}
              </Text>
              <Text style={styles.recordDepthLabel}>Days Recorded</Text>
            </View>
            <View style={styles.recordDepthDivider} />
            <View style={styles.recordDepthItem}>
              <Text style={styles.recordDepthValue}>
                {report.recordDepth.coveragePercent}%
              </Text>
              <Text style={styles.recordDepthLabel}>Coverage</Text>
            </View>
          </View>
          <Text style={styles.coverageNote}>
            Record coverage: {report.recordDepth.coverageLevel}
          </Text>

          {/* Longitudinal context */}
          {report.longitudinalContext.totalRecordDays > report.recordDepth.uniqueDays && (
            <View style={styles.longitudinalNote}>
              <Text style={styles.longitudinalText}>
                Total record on file: {report.longitudinalContext.totalRecordDays.toLocaleString()} days
              </Text>
            </View>
          )}
        </Animated.View>

        {/* SECTION 3: Graphs */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('graphs')}
          >
            <Text style={styles.sectionLabel}>CAPACITY TRENDS</Text>
            {expandedSections.graphs ? (
              <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
            ) : (
              <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
            )}
          </Pressable>

          {expandedSections.graphs && (
            <View style={styles.chartsContainer}>
              {/* Daily Capacity Index */}
              <View style={styles.chartWrapper}>
                <DailyCapacityChart
                  data={report.chartData.dailyCapacity}
                  dimensions={{ width: chartWidth, height: 200 }}
                  title="DAILY CAPACITY INDEX"
                  showTrendLine={true}
                />
              </View>

              {/* Weekly Mean Capacity */}
              <View style={styles.chartWrapper}>
                <WeeklyMeanChart
                  data={report.chartData.weeklyMeans}
                  dimensions={{ width: chartWidth, height: 180 }}
                  title="WEEKLY MEAN CAPACITY"
                  showVarianceBand={true}
                />
              </View>

              {/* State Distribution */}
              <View style={styles.chartWrapper}>
                <StateDistributionChart
                  data={report.chartData.stateDistribution}
                  dimensions={{ width: chartWidth, height: 140 }}
                  title="STATE DISTRIBUTION"
                  totalObservations={report.recordDepth.totalObservations}
                />
              </View>

              {/* Driver Frequency */}
              <View style={styles.chartWrapper}>
                <DriverFrequencyChart
                  data={report.chartData.driverFrequency}
                  dimensions={{ width: chartWidth, height: 180 }}
                  title="DRIVER FREQUENCY"
                  showStrainRate={true}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* SECTION 4: Written Clinical Summary */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('summary')}
          >
            <Text style={styles.sectionLabel}>PERIOD SUMMARY</Text>
            {expandedSections.summary ? (
              <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
            ) : (
              <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
            )}
          </Pressable>

          {expandedSections.summary && (
            <View style={styles.summaryContainer}>
              {/* Pattern Metrics */}
              <View style={styles.metricsGrid}>
                {report.patternMetrics.map((metric) => (
                  <View key={metric.id} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={[
                      styles.metricScore,
                      metric.level === 'high' && styles.metricScoreHigh,
                      metric.level === 'moderate' && styles.metricScoreMod,
                    ]}>
                      {metric.score}
                    </Text>
                    <Text style={styles.metricLevel}>{metric.level}</Text>
                    <Text style={styles.metricDesc}>{metric.description}</Text>
                  </View>
                ))}
              </View>

              {/* Week Structure */}
              <View style={styles.weekStructure}>
                <Text style={styles.subsectionTitle}>Week Structure</Text>
                <Text style={styles.structureText}>
                  Observations indicate {report.weekStructure.hardestDay.dayName} shows
                  elevated depletion frequency ({report.weekStructure.hardestDay.depletionRate}%
                  of observations).
                </Text>
                {report.weekStructure.vulnerableTimeSlot && (
                  <Text style={styles.structureText}>
                    {capitalizeFirst(report.weekStructure.vulnerableTimeSlot)} periods demonstrate
                    lower average capacity ({report.weekStructure.timeOfDay[report.weekStructure.vulnerableTimeSlot].avgCapacity}%).
                  </Text>
                )}
              </View>

              {/* Previous Quarter Comparison */}
              {report.longitudinalContext.previousQuarterComparison && (
                <View style={styles.comparison}>
                  <Text style={styles.subsectionTitle}>Period Comparison</Text>
                  <Text style={styles.comparisonText}>
                    Capacity trend: {report.longitudinalContext.previousQuarterComparison.capacityTrend}
                    {report.longitudinalContext.previousQuarterComparison.depletionChange !== 0 && (
                      ` (depletion ${report.longitudinalContext.previousQuarterComparison.depletionChange > 0 ? '+' : ''}${report.longitudinalContext.previousQuarterComparison.depletionChange}% vs prior period)`
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* SECTION 5: Context / Notes */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('context')}
          >
            <Text style={styles.sectionLabel}>OBSERVATIONS & CONSIDERATIONS</Text>
            {expandedSections.context ? (
              <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
            ) : (
              <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
            )}
          </Pressable>

          {expandedSections.context && (
            <View style={styles.notesContainer}>
              {report.clinicalNotes.length > 0 ? (
                report.clinicalNotes.map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <Text style={styles.noteCategory}>
                      {formatNoteCategory(note.category)}
                    </Text>
                    <Text style={styles.noteText}>{note.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noNotes}>
                  No additional observations for this period.
                </Text>
              )}

              {/* Notable Episodes */}
              {report.notableEpisodes.length > 0 && (
                <View style={styles.episodes}>
                  <Text style={styles.subsectionTitle}>Notable Episodes</Text>
                  {report.notableEpisodes.map((episode) => (
                    <View key={episode.id} style={styles.episodeItem}>
                      <Text style={styles.episodeDate}>
                        {formatEpisodeDates(episode.startDate, episode.endDate)}
                      </Text>
                      <Text style={styles.episodeDesc}>{episode.description}</Text>
                      {episode.associatedDrivers.length > 0 && (
                        <Text style={styles.episodeDrivers}>
                          Associated: {episode.associatedDrivers.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.footer}>
          <Text style={styles.methodology}>{METHODOLOGY_STATEMENT}</Text>
          <Text style={styles.footerText}>
            Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.footerDisclaimer}>
            This report is for informational purposes only and does not constitute
            medical diagnosis or treatment recommendation.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNoteCategory(category: string): string {
  switch (category) {
    case 'observation': return 'Observation';
    case 'consideration': return 'Consideration';
    case 'pattern_note': return 'Pattern Note';
    default: return 'Note';
  }
}

function formatEpisodeDates(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  }
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  demoBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(122, 154, 170, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A9AAA',
    letterSpacing: 1,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  documentTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  documentSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  periodDates: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  recordDepthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  recordDepthItem: {
    alignItems: 'center',
    flex: 1,
  },
  recordDepthValue: {
    fontSize: 24,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  recordDepthLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recordDepthDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
  },
  coverageNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  longitudinalNote: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  longitudinalText: {
    fontSize: 12,
    color: '#7A9AAA',
    letterSpacing: 0.3,
  },
  chartsContainer: {
    marginTop: spacing.md,
  },
  chartWrapper: {
    marginBottom: spacing.lg,
  },
  summaryContainer: {
    marginTop: spacing.md,
  },
  metricsGrid: {
    marginBottom: spacing.lg,
  },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  metricScore: {
    fontSize: 32,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.7)',
  },
  metricScoreHigh: {
    color: '#7A9AAA',
  },
  metricScoreMod: {
    color: '#8A8A6A',
  },
  metricLevel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  metricDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  weekStructure: {
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  structureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  comparison: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  comparisonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  notesContainer: {
    marginTop: spacing.md,
  },
  noteItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  noteCategory: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  noteText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
  noNotes: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
  },
  episodes: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  episodeItem: {
    marginBottom: spacing.md,
  },
  episodeDate: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  episodeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  episodeDrivers: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: spacing.sm,
  },
  footerDisclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 300,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(122,154,170,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  exportLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7A9AAA',
    letterSpacing: 0.3,
  },
  exportLabelDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  methodology: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    maxWidth: 320,
  },
});
