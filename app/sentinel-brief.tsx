/**
 * Sentinel Brief — DEMO PREVIEW
 *
 * GOVERNANCE: This is a DEMO-ONLY preview of the Sentinel Brief.
 * - Synthetic data only
 * - Non-operational
 * - Non-exportable
 * - Routes to contact flows only
 *
 * Uses the Vega-Lite spec for clean, calm, defensible visualization.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, commonStyles } from '../theme';
import { VegaSentinelChart } from '../components/VegaSentinelChart';
import {
  getUniversitySentinelData,
  getUniversityCohortSampleSize,
  UNIVERSITY_SENTINEL,
  UNIVERSITY_AGE_COHORTS,
  UNIVERSITY_AGE_COHORT_LABELS,
  UniversityAgeCohort,
} from '../lib/sentinel/demoData';

// =============================================================================
// CONTACT URL
// =============================================================================

const CONTACT_URL = 'mailto:contact@orbital.health?subject=Sentinel%20Brief%20Inquiry';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SentinelBriefScreen() {
  const router = useRouter();
  const [selectedCohort, setSelectedCohort] = useState<UniversityAgeCohort>('18-22');

  // Get demo data for selected cohort
  const sentinelData = getUniversitySentinelData(selectedCohort);
  const sampleSize = getUniversityCohortSampleSize(selectedCohort);

  const handleContact = () => {
    Linking.openURL(CONTACT_URL);
  };

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* DEMO Banner — Required */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>{UNIVERSITY_SENTINEL.demoBanner}</Text>
        <Text style={styles.demoBannerSubtext}>
          Synthetic data · Non-operational · Contact Orbital for access
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sentinel Brief</Text>
          <Text style={styles.headerSubtitle}>{UNIVERSITY_SENTINEL.vertical}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Governance Notice */}
      <View style={styles.governanceNotice}>
        <AlertTriangle size={16} color="#E8A830" />
        <Text style={styles.governanceText}>
          This is a demo-only preview. Real institutional access requires direct
          engagement with Orbital.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cohort Selector */}
        <View style={styles.cohortSelector}>
          <Text style={styles.cohortSelectorLabel}>SELECT COHORT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cohortPills}>
            {UNIVERSITY_AGE_COHORTS.map((cohort) => (
              <Pressable
                key={cohort}
                style={[
                  styles.cohortPill,
                  selectedCohort === cohort && styles.cohortPillSelected,
                ]}
                onPress={() => setSelectedCohort(cohort)}
              >
                <Text
                  style={[
                    styles.cohortPillText,
                    selectedCohort === cohort && styles.cohortPillTextSelected,
                  ]}
                >
                  {UNIVERSITY_AGE_COHORT_LABELS[cohort]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Vega-Lite Sentinel Chart */}
        <View style={styles.chartSection}>
          <VegaSentinelChart
            points={sentinelData.volatilityTrend}
            baseline={sentinelData.baselineValue}
            systemState={sentinelData.systemState}
            consecutiveDays={sentinelData.consecutiveDaysAboveBaseline}
            cohortLabel={sentinelData.cohortLabel}
            sampleSize={sampleSize}
          />
        </View>

        {/* Assessments */}
        <View style={styles.assessmentsSection}>
          <Text style={styles.assessmentsTitle}>ASSESSMENT</Text>
          {sentinelData.assessments.map((assessment, index) => (
            <View key={index} style={styles.assessmentItem}>
              <View
                style={[
                  styles.assessmentDot,
                  assessment.severity === 'warning' && styles.assessmentDotWarning,
                ]}
              />
              <Text style={styles.assessmentText}>{assessment.text}</Text>
            </View>
          ))}
        </View>

        {/* Demo Notice */}
        <View style={styles.demoNoticeSection}>
          <Text style={styles.demoNoticeTitle}>DEMO CONSTRAINTS</Text>
          <Text style={styles.demoNoticeText}>
            • Synthetic, aggregate data only{'\n'}
            • No individual tracking or identification{'\n'}
            • Non-operational — monitoring demo only{'\n'}
            • No export, tuning, or activation{'\n'}
            • Based on {UNIVERSITY_SENTINEL.totalSampleSize.toLocaleString()} synthetic records
          </Text>
        </View>

        {/* CTA Button */}
        <Pressable style={styles.ctaButton} onPress={handleContact}>
          <Text style={styles.ctaButtonText}>Contact Orbital for Institutional Access</Text>
          <ExternalLink size={14} color="#000" />
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{UNIVERSITY_SENTINEL.footerText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  demoBanner: {
    backgroundColor: '#7A9AAA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  demoBannerSubtext: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: {
    padding: spacing.sm,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  governanceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(232,168,48,0.1)',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(232,168,48,0.3)',
  },
  governanceText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(232,168,48,0.9)',
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  cohortSelector: {
    marginBottom: spacing.md,
  },
  cohortSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  cohortPills: {
    flexDirection: 'row',
  },
  cohortPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cohortPillSelected: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderColor: 'rgba(0,229,255,0.4)',
  },
  cohortPillText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  cohortPillTextSelected: {
    color: '#00E5FF',
    fontWeight: '600',
  },
  chartSection: {
    marginBottom: spacing.lg,
  },
  assessmentsSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  assessmentsTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  assessmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,229,255,0.6)',
    marginTop: 5,
    marginRight: spacing.sm,
  },
  assessmentDotWarning: {
    backgroundColor: '#E8A830',
  },
  assessmentText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  demoNoticeSection: {
    backgroundColor: 'rgba(122,154,170,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(122,154,170,0.3)',
  },
  demoNoticeTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A9AAA',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  demoNoticeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
