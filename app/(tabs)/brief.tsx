/**
 * Briefings Tab — 3 Scope Modes
 *
 * 1. Personal     → CCI Demo Brief (links to /cci)
 * 2. Organization → Sentinel Demo Mode Selector:
 *                   - K–12 Education Sentinel Demo (PNG golden master)
 *                   - University Sentinel Demo (derived from K-12)
 * 3. Global       → Sentinel Demo (PNG golden master, different copy)
 *
 * CANONICAL:
 * - K–12 Education Sentinel Demo v1
 * - University Sentinel Demo v1 (derived)
 *
 * GOVERNANCE:
 * - All views are DEMO-ONLY
 * - No export, no tuning, no activation, no pricing
 * - Organization/Global CTAs route to contact flow
 * - University cohorts derived from Year of Birth (not manual selection)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  User,
  Building2,
  Globe,
  FileText,
  ExternalLink,
  Mail,
  ChevronRight,
  ChevronDown,
  Users,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import {
  SENTINEL_CONTACT_URL,
  SENTINEL_DEMO_LABELS,
  // K-12 Education Sentinel
  SCHOOL_AGE_COHORTS,
  SCHOOL_AGE_COHORT_LABELS,
  getSchoolDistrictSentinelData,
  getSchoolCohortSampleSize,
  SCHOOL_DISTRICT_SENTINEL,
  SchoolAgeCohort,
  // University Sentinel
  UNIVERSITY_AGE_COHORTS,
  UNIVERSITY_AGE_COHORT_LABELS,
  getUniversitySentinelData,
  getUniversityCohortSampleSize,
  UNIVERSITY_SENTINEL,
  UniversityAgeCohort,
  // Truthful Demo Engine (generated charts)
  buildSentinelDemoData,
  AGE_COHORT_BANDS,
  AGE_COHORT_LABELS,
  AgeCohortBand,
  getCohortsForVertical,
  getCohortSampleSize,
} from '../../lib/sentinel';
import { SentinelChart } from '../../components/SentinelChart';

// =============================================================================
// TYPES
// =============================================================================

type BriefScope = 'personal' | 'organization' | 'global';
type SentinelDemoMode = 'k12' | 'university';

interface ScopeTab {
  id: BriefScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}

interface DemoModeTab {
  id: SentinelDemoMode;
  label: string;
}

const SCOPE_TABS: ScopeTab[] = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'global', label: 'Global', icon: Globe },
];

const DEMO_MODE_TABS: DemoModeTab[] = [
  { id: 'k12', label: 'K–12 Education' },
  { id: 'university', label: 'University' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BriefingsScreen() {
  const [scope, setScope] = useState<BriefScope>('personal');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Briefings</Text>
        <Text style={styles.headerSubtitle}>
          Capacity intelligence across scopes
        </Text>
      </Animated.View>

      {/* Scope Tabs */}
      <View style={styles.tabContainer}>
        {SCOPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = scope === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setScope(tab.id)}
            >
              <Icon
                color={isActive ? '#00D7FF' : 'rgba(255,255,255,0.5)'}
                size={18}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content based on scope */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {scope === 'personal' && <PersonalBrief />}
        {scope === 'organization' && <OrganizationBrief />}
        {scope === 'global' && <GlobalBrief />}
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// PERSONAL TAB — CCI Demo Brief
// =============================================================================

function PersonalBrief() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE</Text>
      </View>

      {/* CCI Card */}
      <Pressable
        style={styles.cciCard}
        onPress={() => router.push('/cci')}
      >
        <View style={styles.cciHeader}>
          <View style={styles.cciIconContainer}>
            <FileText color="#00D7FF" size={28} />
          </View>
          <ChevronRight color="rgba(255,255,255,0.3)" size={24} />
        </View>

        <Text style={styles.cciTitle}>Clinical Capacity Instrument</Text>
        <Text style={styles.cciSubtitle}>CCI-Q4</Text>

        <Text style={styles.cciDescription}>
          Your personal capacity signal rendered as a clinical-grade instrument.
          Demo data shown — real issuance reflects your actual capacity patterns.
        </Text>

        <View style={styles.cciCta}>
          <Text style={styles.cciCtaText}>View CCI-Q4</Text>
          <ChevronRight color="#00D7FF" size={18} />
        </View>
      </Pressable>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Text style={styles.infoNoteText}>
          The CCI-Q4 artifact is generated from your capacity signals.
          {'\n'}More signals = more accurate instrument.
        </Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// ORGANIZATION TAB — Sentinel Demo Mode Selector (K-12 / University)
// =============================================================================

function OrganizationBrief() {
  const [demoMode, setDemoMode] = useState<SentinelDemoMode>('k12');

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Mode Selector */}
      <View style={styles.demoModeSelector}>
        <Text style={styles.demoModeSelectorLabel}>Select Demo:</Text>
        <View style={styles.demoModeButtons}>
          {DEMO_MODE_TABS.map((tab) => {
            const isActive = demoMode === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.demoModeButton, isActive && styles.demoModeButtonActive]}
                onPress={() => setDemoMode(tab.id)}
              >
                <Text style={[styles.demoModeButtonText, isActive && styles.demoModeButtonTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Render selected demo */}
      {demoMode === 'k12' ? <K12SentinelBrief /> : <UniversitySentinelBrief />}
    </Animated.View>
  );
}

// =============================================================================
// K-12 EDUCATION SENTINEL BRIEF (Truthful Demo Engine)
// =============================================================================

// K-12 cohorts: starting at age 5 per governance constraints
const K12_COHORTS: AgeCohortBand[] = ['5-10', '11-13', '14-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

function K12SentinelBrief() {
  const [selectedCohort, setSelectedCohort] = useState<AgeCohortBand>('5-10');
  const [showCohortPicker, setShowCohortPicker] = useState(false);

  const handleContact = () => {
    Linking.openURL(SENTINEL_CONTACT_URL);
  };

  // Generate demo data using truthful engine
  const sentinelData = useMemo(() => {
    return buildSentinelDemoData('k12', selectedCohort);
  }, [selectedCohort]);

  const cohortSampleSize = getCohortSampleSize('k12', selectedCohort);

  return (
    <>
      {/* Demo Banner — Full Width */}
      <View style={styles.demoBannerFull}>
        <Text style={styles.demoBannerFullText}>
          {SCHOOL_DISTRICT_SENTINEL.demoBanner}
        </Text>
      </View>

      {/* Sentinel Header */}
      <View style={styles.sentinelHeader}>
        <Text style={styles.sentinelTitle}>{SCHOOL_DISTRICT_SENTINEL.title}</Text>
        <Text style={styles.sentinelSubtitle}>{SCHOOL_DISTRICT_SENTINEL.subtitle}</Text>
      </View>

      {/* District Label */}
      <View style={styles.districtRow}>
        <Building2 color="#00D7FF" size={14} />
        <Text style={styles.districtText}>
          {SCHOOL_DISTRICT_SENTINEL.vertical} · {SCHOOL_DISTRICT_SENTINEL.districtLabel}
        </Text>
      </View>

      {/* Age Cohort Selector */}
      <Pressable
        style={styles.cohortSelector}
        onPress={() => setShowCohortPicker(!showCohortPicker)}
      >
        <View style={styles.cohortSelectorLeft}>
          <Users color="#00D7FF" size={16} />
          <Text style={styles.cohortSelectorLabel}>Age Cohort:</Text>
          <Text style={styles.cohortSelectorValue}>
            {AGE_COHORT_LABELS[selectedCohort]} (DEMO)
          </Text>
        </View>
        <ChevronDown
          color="rgba(255,255,255,0.5)"
          size={18}
          style={{ transform: [{ rotate: showCohortPicker ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Cohort Picker Dropdown */}
      {showCohortPicker && (
        <View style={styles.cohortPickerDropdown}>
          {K12_COHORTS.map((cohort) => {
            const isSelected = cohort === selectedCohort;
            const sampleSize = getCohortSampleSize('k12', cohort);
            return (
              <Pressable
                key={cohort}
                style={[styles.cohortOption, isSelected && styles.cohortOptionSelected]}
                onPress={() => {
                  setSelectedCohort(cohort);
                  setShowCohortPicker(false);
                }}
              >
                <Text style={[styles.cohortOptionText, isSelected && styles.cohortOptionTextSelected]}>
                  {AGE_COHORT_LABELS[cohort]}
                </Text>
                <Text style={styles.cohortOptionCount}>n={sampleSize}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Sample Size Badge */}
      <View style={styles.sampleInfoRow}>
        <Text style={styles.sampleInfoText}>
          Based on {SCHOOL_DISTRICT_SENTINEL.totalSampleSize.toLocaleString()} synthetic inputs
          {cohortSampleSize > 0 && ` · Cohort n=${cohortSampleSize}`}
        </Text>
      </View>

      {/* Sentinel Chart — Truthful Demo Engine */}
      <View style={styles.sentinelContainer}>
        <SentinelChart
          points={sentinelData.volatilityTrend}
          baseline={sentinelData.baselineValue}
          upperBand={70}
          systemState={sentinelData.systemState}
          consecutiveDays={sentinelData.consecutiveDaysAboveBaseline}
          title={sentinelData.cohortLabel}
          height={220}
          accentColor="#00D7FF"
        />
      </View>

      {/* Cohort-specific status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>SYSTEM STATE</Text>
        <Text style={styles.statusValue}>
          {sentinelData.systemState === 'sustained_volatility'
            ? 'Sentinel Triggered'
            : sentinelData.systemState === 'critical'
            ? 'Critical Volatility'
            : sentinelData.systemState === 'elevated'
            ? 'Elevated volatility'
            : 'Within baseline'}
        </Text>
        <Text style={styles.statusDetail}>
          {sentinelData.consecutiveDaysAboveBaseline} consecutive days above baseline
        </Text>
      </View>

      {/* Governance Notice */}
      <View style={styles.governanceNotice}>
        <Text style={styles.governanceTitle}>Institutional Access Only</Text>
        <Text style={styles.governanceText}>
          Live Sentinel dashboards are available through direct engagement with
          Orbital. No self-serve activation. No pricing in-app.
        </Text>
      </View>

      {/* Contact CTA */}
      <Pressable style={styles.contactButton} onPress={handleContact}>
        <Mail color="#000" size={18} />
        <Text style={styles.contactButtonText}>Contact Orbital</Text>
        <ExternalLink color="#000" size={14} />
      </Pressable>

      {/* Footer — K-12 Education Baseline */}
      <View style={styles.footer}>
        <Text style={styles.footerBadge}>DEMO · K–12 EDUCATION BASELINE</Text>
        <Text style={styles.footerText}>
          Simulated aggregate data for demonstration only.
          {'\n'}No personal data is tracked or collected.
        </Text>
      </View>
    </>
  );
}

// =============================================================================
// UNIVERSITY SENTINEL BRIEF (Truthful Demo Engine)
// =============================================================================

// University cohorts: 18+ only (no children)
const UNIVERSITY_COHORTS: AgeCohortBand[] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

function UniversitySentinelBrief() {
  const [selectedCohort, setSelectedCohort] = useState<AgeCohortBand>('18-24');
  const [showCohortPicker, setShowCohortPicker] = useState(false);

  const handleContact = () => {
    Linking.openURL(SENTINEL_CONTACT_URL);
  };

  const handleRequestAccess = () => {
    Linking.openURL('mailto:contact@orbital.health?subject=Orbital%20University%20Sentinel%20%E2%80%94%20Request%20Institutional%20Access');
  };

  // Generate demo data using truthful engine
  const sentinelData = useMemo(() => {
    return buildSentinelDemoData('university', selectedCohort);
  }, [selectedCohort]);

  const cohortSampleSize = getCohortSampleSize('university', selectedCohort);

  return (
    <>
      {/* Demo Banner — Full Width */}
      <View style={[styles.demoBannerFull, { backgroundColor: '#6B5B95' }]}>
        <Text style={[styles.demoBannerFullText, { color: '#fff' }]}>
          {UNIVERSITY_SENTINEL.demoBanner}
        </Text>
      </View>

      {/* Sentinel Header */}
      <View style={styles.sentinelHeader}>
        <Text style={[styles.sentinelTitle, { color: '#6B5B95' }]}>
          {UNIVERSITY_SENTINEL.title}
        </Text>
        <Text style={styles.sentinelSubtitle}>{UNIVERSITY_SENTINEL.subtitle}</Text>
      </View>

      {/* Institution Label */}
      <View style={styles.districtRow}>
        <Building2 color="#6B5B95" size={14} />
        <Text style={[styles.districtText, { color: '#6B5B95' }]}>
          {UNIVERSITY_SENTINEL.vertical} · {UNIVERSITY_SENTINEL.institutionLabel}
        </Text>
      </View>

      {/* Age Cohort Display (NOT manual selection — derived from Year of Birth) */}
      <Pressable
        style={[styles.cohortSelector, { borderColor: 'rgba(107,91,149,0.3)', backgroundColor: 'rgba(107,91,149,0.08)' }]}
        onPress={() => setShowCohortPicker(!showCohortPicker)}
      >
        <View style={styles.cohortSelectorLeft}>
          <Users color="#6B5B95" size={16} />
          <Text style={styles.cohortSelectorLabel}>Age Cohort:</Text>
          <Text style={[styles.cohortSelectorValue, { color: '#6B5B95' }]}>
            {AGE_COHORT_LABELS[selectedCohort]} (DEMO)
          </Text>
        </View>
        <ChevronDown
          color="rgba(255,255,255,0.5)"
          size={18}
          style={{ transform: [{ rotate: showCohortPicker ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Cohort Picker Dropdown */}
      {showCohortPicker && (
        <View style={styles.cohortPickerDropdown}>
          {UNIVERSITY_COHORTS.map((cohort) => {
            const isSelected = cohort === selectedCohort;
            const sampleSize = getCohortSampleSize('university', cohort);
            return (
              <Pressable
                key={cohort}
                style={[styles.cohortOption, isSelected && styles.cohortOptionSelectedUniversity]}
                onPress={() => {
                  setSelectedCohort(cohort);
                  setShowCohortPicker(false);
                }}
              >
                <Text style={[styles.cohortOptionText, isSelected && styles.cohortOptionTextSelectedUniversity]}>
                  {AGE_COHORT_LABELS[cohort]}
                </Text>
                <Text style={styles.cohortOptionCount}>n={sampleSize}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Sample Size Badge */}
      <View style={styles.sampleInfoRow}>
        <Text style={styles.sampleInfoText}>
          Based on {UNIVERSITY_SENTINEL.totalSampleSize.toLocaleString()} synthetic inputs
          {cohortSampleSize > 0 && ` · Cohort n=${cohortSampleSize}`}
        </Text>
      </View>

      {/* Sentinel Chart — Truthful Demo Engine */}
      <View style={styles.sentinelContainer}>
        <SentinelChart
          points={sentinelData.volatilityTrend}
          baseline={sentinelData.baselineValue}
          upperBand={70}
          systemState={sentinelData.systemState}
          consecutiveDays={sentinelData.consecutiveDaysAboveBaseline}
          title={sentinelData.cohortLabel}
          height={220}
          accentColor="#6B5B95"
        />
      </View>

      {/* Cohort-specific status — Academic framing */}
      <View style={[styles.statusCard, { backgroundColor: 'rgba(107,91,149,0.1)', borderColor: 'rgba(107,91,149,0.3)' }]}>
        <Text style={styles.statusLabel}>SYSTEM STATE</Text>
        <Text style={[styles.statusValue, { color: '#6B5B95' }]}>
          {sentinelData.systemState === 'sustained_volatility'
            ? 'Sentinel Triggered'
            : sentinelData.systemState === 'critical'
            ? 'Critical Volatility'
            : sentinelData.systemState === 'elevated'
            ? 'Elevated disruption risk'
            : 'Within baseline'}
        </Text>
        <Text style={styles.statusDetail}>
          {sentinelData.consecutiveDaysAboveBaseline} consecutive days above baseline
        </Text>
      </View>

      {/* Governance Notice — University framing */}
      <View style={styles.governanceNotice}>
        <Text style={styles.governanceTitle}>Institutional Access Only</Text>
        <Text style={styles.governanceText}>
          University Sentinel dashboards are available through direct engagement
          with Orbital. Academic continuity and disruption risk signals for
          institutional planning. No self-serve activation. No pricing in-app.
        </Text>
      </View>

      {/* CTAs — Contact Orbital / Request Institutional Access */}
      <View style={styles.ctaRow}>
        <Pressable style={[styles.contactButton, { flex: 1, backgroundColor: '#6B5B95' }]} onPress={handleContact}>
          <Mail color="#fff" size={16} />
          <Text style={[styles.contactButtonText, { color: '#fff' }]}>Contact Orbital</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryCta} onPress={handleRequestAccess}>
        <Text style={styles.secondaryCtaText}>Request Institutional Access</Text>
        <ExternalLink color="rgba(255,255,255,0.5)" size={14} />
      </Pressable>

      {/* Footer — University Sentinel */}
      <View style={styles.footer}>
        <Text style={[styles.footerBadge, { color: '#6B5B95' }]}>DEMO · UNIVERSITY SENTINEL</Text>
        <Text style={styles.footerText}>
          {UNIVERSITY_SENTINEL.footerText}
        </Text>
      </View>
    </>
  );
}

// =============================================================================
// GLOBAL TAB — Sentinel Demo (Truthful Demo Engine)
// =============================================================================

// Global cohorts: 18+ adult population
const GLOBAL_COHORTS: AgeCohortBand[] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

function GlobalBrief() {
  const [selectedCohort, setSelectedCohort] = useState<AgeCohortBand>('25-34');
  const [showCohortPicker, setShowCohortPicker] = useState(false);

  const handleContact = () => {
    Linking.openURL(SENTINEL_CONTACT_URL);
  };

  // Generate demo data using truthful engine
  const sentinelData = useMemo(() => {
    return buildSentinelDemoData('global', selectedCohort);
  }, [selectedCohort]);

  const cohortSampleSize = getCohortSampleSize('global', selectedCohort);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>
          {SENTINEL_DEMO_LABELS.global.banner}
        </Text>
      </View>

      {/* Cohort Label */}
      <View style={styles.cohortBadge}>
        <Globe color="#9C27B0" size={14} />
        <Text style={[styles.cohortText, { color: '#9C27B0' }]}>
          Global Population · {AGE_COHORT_LABELS[selectedCohort]}
        </Text>
      </View>

      {/* Age Cohort Selector */}
      <Pressable
        style={[styles.cohortSelector, { borderColor: 'rgba(156,39,176,0.3)', backgroundColor: 'rgba(156,39,176,0.08)' }]}
        onPress={() => setShowCohortPicker(!showCohortPicker)}
      >
        <View style={styles.cohortSelectorLeft}>
          <Users color="#9C27B0" size={16} />
          <Text style={styles.cohortSelectorLabel}>Age Cohort:</Text>
          <Text style={[styles.cohortSelectorValue, { color: '#9C27B0' }]}>
            {AGE_COHORT_LABELS[selectedCohort]} (DEMO)
          </Text>
        </View>
        <ChevronDown
          color="rgba(255,255,255,0.5)"
          size={18}
          style={{ transform: [{ rotate: showCohortPicker ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Cohort Picker Dropdown */}
      {showCohortPicker && (
        <View style={styles.cohortPickerDropdown}>
          {GLOBAL_COHORTS.map((cohort) => {
            const isSelected = cohort === selectedCohort;
            const sampleSize = getCohortSampleSize('global', cohort);
            return (
              <Pressable
                key={cohort}
                style={[styles.cohortOption, isSelected && styles.cohortOptionSelectedGlobal]}
                onPress={() => {
                  setSelectedCohort(cohort);
                  setShowCohortPicker(false);
                }}
              >
                <Text style={[styles.cohortOptionText, isSelected && styles.cohortOptionTextSelectedGlobal]}>
                  {AGE_COHORT_LABELS[cohort]}
                </Text>
                <Text style={styles.cohortOptionCount}>n={sampleSize}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Sample Size Badge */}
      <View style={styles.sampleInfoRow}>
        <Text style={styles.sampleInfoText}>
          Based on 3,000 synthetic inputs{cohortSampleSize > 0 && ` · Cohort n=${cohortSampleSize}`}
        </Text>
      </View>

      {/* Sentinel Chart — Truthful Demo Engine */}
      <View style={styles.sentinelContainer}>
        <SentinelChart
          points={sentinelData.volatilityTrend}
          baseline={sentinelData.baselineValue}
          upperBand={70}
          systemState={sentinelData.systemState}
          consecutiveDays={sentinelData.consecutiveDaysAboveBaseline}
          title={sentinelData.cohortLabel}
          height={220}
          accentColor="#9C27B0"
        />
      </View>

      {/* Governance Notice */}
      <View style={styles.governanceNotice}>
        <Text style={styles.governanceTitle}>Synthetic Data Only</Text>
        <Text style={styles.governanceText}>
          Global benchmarks use synthetic cohort modeling. Real institutional
          data requires direct engagement with Orbital.
        </Text>
      </View>

      {/* Contact CTA */}
      <Pressable
        style={[styles.contactButton, { backgroundColor: '#9C27B0' }]}
        onPress={handleContact}
      >
        <Mail color="#fff" size={18} />
        <Text style={[styles.contactButtonText, { color: '#fff' }]}>
          Contact Orbital
        </Text>
        <ExternalLink color="#fff" size={14} />
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Illustrative aggregate-level capacity intelligence view.
          {'\n'}No personal data is tracked or collected.
        </Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderColor: 'rgba(0,215,255,0.3)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  tabLabelActive: {
    color: '#00D7FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  demoBanner: {
    backgroundColor: '#7A9AAA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  demoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },

  // Personal Tab - CCI Card
  cciCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cciHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cciIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,215,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cciTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cciSubtitle: {
    fontSize: 13,
    color: '#00D7FF',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  cciDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  cciCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cciCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  infoNote: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  infoNoteText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Sentinel Tabs - Cohort Badge
  cohortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,215,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  cohortText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D7FF',
  },
  sampleSizeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(156,39,176,0.1)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  sampleSizeText: {
    fontSize: 11,
    color: '#9C27B0',
    fontWeight: '500',
  },
  ageCohortBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  ageCohortText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  // Sentinel PNG Container
  sentinelContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sentinelImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1200 / 600, // Approximate aspect ratio of PNG
  },

  // Governance Notice
  governanceNotice: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  governanceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  governanceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },

  // Contact Button
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00D7FF',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E8A830',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },

  // School District Sentinel - Enhanced Styles
  demoBannerFull: {
    backgroundColor: '#E8A830',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  demoBannerFullText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sentinelHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sentinelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 1,
  },
  sentinelSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  districtText: {
    fontSize: 12,
    color: '#00D7FF',
    fontWeight: '500',
  },
  cohortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,215,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  cohortSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cohortSelectorLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  cohortSelectorValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D7FF',
  },
  cohortPickerDropdown: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cohortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cohortOptionSelected: {
    backgroundColor: 'rgba(0,215,255,0.1)',
  },
  cohortOptionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  cohortOptionTextSelected: {
    color: '#00D7FF',
    fontWeight: '600',
  },
  cohortOptionCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  sampleInfoRow: {
    marginBottom: spacing.md,
  },
  sampleInfoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'rgba(232,168,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,168,48,0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8A830',
    marginBottom: 2,
  },
  statusDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  // Demo Mode Selector
  demoModeSelector: {
    marginBottom: spacing.md,
  },
  demoModeSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  demoModeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoModeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  demoModeButtonActive: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderColor: 'rgba(0,215,255,0.3)',
  },
  demoModeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  demoModeButtonTextActive: {
    color: '#00D7FF',
    fontWeight: '600',
  },

  // University-specific styles
  cohortOptionSelectedUniversity: {
    backgroundColor: 'rgba(107,91,149,0.1)',
  },
  cohortOptionTextSelectedUniversity: {
    color: '#6B5B95',
    fontWeight: '600',
  },
  // Global-specific styles
  cohortOptionSelectedGlobal: {
    backgroundColor: 'rgba(156,39,176,0.1)',
  },
  cohortOptionTextSelectedGlobal: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryCtaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
});
