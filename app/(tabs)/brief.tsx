/**
 * Briefings Tab — B2C Only
 *
 * 1. Personal → Individual CCI Demo Brief (links to /cci)
 * 2. Circles  → Circle CCI Demo
 *
 * GOVERNANCE:
 * - All views are DEMO-ONLY (visible to all users)
 * - No Organization/Global tabs (those are B2B/enterprise)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  User,
  Users,
  FileText,
  ChevronRight,
  CheckCircle,
  LayoutGrid,
  Link2,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useAccess } from '../../lib/access';
import { CCIChart } from '../../components/CCIChart';

// =============================================================================
// TYPES
// =============================================================================

type BriefScope = 'personal' | 'circles';

interface ScopeTab {
  id: BriefScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}

const SCOPE_TABS: ScopeTab[] = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'circles', label: 'Circles', icon: Users },
];

// =============================================================================
// DEMO DATA FOR CIRCLES
// =============================================================================

interface CircleMember {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  capacityState: 'resourced' | 'stretched' | 'depleted';
  trend: 'improving' | 'declining' | 'flat';
  participation: string;
  notes?: string;
  capacityHistory: number[]; // 90 days of capacity data (1=depleted, 2=stretched, 3=resourced)
}

// =============================================================================
// CAPACITY COLOR SYSTEM — Matches Individual CCI
// =============================================================================

// Get color based on capacity value (cyan=high, yellow=middle, red=low)
function getCapacityColor(value: number): string {
  if (value >= 2.5) return '#00D7FF'; // Cyan - Resourced
  if (value >= 2.0) return '#10B981'; // Green - Good
  if (value >= 1.5) return '#E8A830'; // Yellow - Stretched
  return '#F44336'; // Red - Depleted
}

// =============================================================================
// FABRICATED DEMO DATA — Simulating years of real user tracking
// =============================================================================

// Fabricate realistic 90-day capacity pattern for demo
// These patterns simulate what real users would see after months/years of tracking
const FABRICATED_HISTORIES: Record<string, number[]> = {
  // Mia: Stable in stretched range with some good days
  mia: [
    2.1, 2.0, 1.9, 2.0, 2.2, 2.3, 2.1, 2.0, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8,
    1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 2.0, 1.9, 2.0, 2.1,
    2.0, 1.9, 1.8, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9,
    2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9,
    2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0, 1.9,
    1.8, 1.9, 2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.2, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.0, 1.9, 1.8, 1.9, 2.0, 2.1,
    2.0, 1.9, 2.0, 2.1, 2.2, 2.1, 2.0, 1.9, 2.0, 2.0,
  ],
  // Zach: Clear declining pattern - started resourced, now in sentinel range
  zach: [
    2.8, 2.7, 2.8, 2.6, 2.7, 2.5, 2.6, 2.4, 2.5, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.1, 2.2, 2.0, 2.1, 2.0, 1.9,
    2.0, 1.9, 1.8, 1.9, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.4, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.4, 1.3,
    1.2, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.1, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.3, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1,
    1.2, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1,
  ],
  // Lily: Improving pattern - started low, now resourced
  lily: [
    1.4, 1.5, 1.4, 1.5, 1.6, 1.5, 1.6, 1.7, 1.6, 1.7,
    1.8, 1.7, 1.8, 1.9, 1.8, 1.9, 2.0, 1.9, 2.0, 2.1,
    2.0, 2.1, 2.2, 2.1, 2.2, 2.3, 2.2, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.4, 2.5, 2.4, 2.5, 2.4, 2.5, 2.6, 2.5,
    2.6, 2.5, 2.6, 2.5, 2.6, 2.7, 2.6, 2.7, 2.6, 2.7,
    2.6, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.7, 2.8, 2.9,
    2.8, 2.7, 2.8, 2.9, 2.8, 2.7, 2.8, 2.9, 2.8, 2.9,
    2.8, 2.9, 2.8, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9,
    3.0, 2.9, 2.8, 2.9, 3.0, 2.9, 2.8, 2.9, 3.0, 2.9,
  ],
  // Tyler: Volatile pattern - unpredictable swings
  tyler: [
    2.2, 1.8, 2.4, 1.6, 2.6, 1.9, 2.1, 1.4, 2.5, 1.7,
    2.3, 1.5, 2.7, 1.8, 2.0, 1.3, 2.4, 1.6, 2.2, 1.9,
    2.5, 1.4, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4,
    2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5,
    2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3,
    2.1, 1.7, 2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6,
    2.2, 1.9, 2.5, 1.3, 2.1, 1.7, 2.6, 1.5, 2.3, 1.8,
    2.0, 1.4, 2.4, 1.6, 2.2, 1.9, 2.5, 1.3, 2.1, 1.7,
    2.6, 1.5, 2.3, 1.8, 2.0, 1.4, 2.4, 1.6, 2.2, 1.8,
  ],
  // Emma: Gradual decline with recent dip
  emma: [
    2.6, 2.5, 2.6, 2.5, 2.4, 2.5, 2.4, 2.3, 2.4, 2.3,
    2.4, 2.3, 2.2, 2.3, 2.2, 2.3, 2.2, 2.1, 2.2, 2.1,
    2.2, 2.1, 2.0, 2.1, 2.0, 2.1, 2.0, 1.9, 2.0, 1.9,
    2.0, 1.9, 2.0, 1.9, 1.8, 1.9, 1.8, 1.9, 1.8, 1.7,
    1.8, 1.7, 1.8, 1.7, 1.8, 1.7, 1.6, 1.7, 1.6, 1.7,
    1.6, 1.7, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5, 1.6, 1.5,
    1.4, 1.5, 1.4, 1.5, 1.4, 1.5, 1.4, 1.3, 1.4, 1.3,
    1.4, 1.3, 1.4, 1.3, 1.2, 1.3, 1.2, 1.3, 1.2, 1.3,
    1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.1, 1.2, 1.2,
  ],
};

const DEMO_CIRCLE_MEMBERS: CircleMember[] = [
  { id: '1', name: 'Mia', username: 'Mia Anderson', avatar: 'https://i.pravatar.cc/100?u=mia', capacityState: 'stretched', trend: 'flat', participation: '6 / 7', notes: 'Sensory sensitivity noted', capacityHistory: FABRICATED_HISTORIES.mia },
  { id: '2', name: 'Zach', username: 'Zach Teguns', avatar: 'https://i.pravatar.cc/100?u=zach', capacityState: 'depleted', trend: 'declining', participation: '7 / 7', notes: 'Sleep disruption', capacityHistory: FABRICATED_HISTORIES.zach },
  { id: '3', name: 'Lily', username: 'Lily Teguns', avatar: 'https://i.pravatar.cc/100?u=lily', capacityState: 'resourced', trend: 'improving', participation: '5 / 5', notes: 'Steady progress', capacityHistory: FABRICATED_HISTORIES.lily },
  { id: '4', name: 'Tyler', username: 'Tyler Ramirez', avatar: 'https://i.pravatar.cc/100?u=tyler', capacityState: 'stretched', trend: 'flat', participation: '5 / 5', notes: 'Transition support', capacityHistory: FABRICATED_HISTORIES.tyler },
  { id: '5', name: 'Emma', username: 'Emily Zhang', avatar: 'https://i.pravatar.cc/100?u=emma', capacityState: 'depleted', trend: 'declining', participation: '5 / 5', notes: 'Schedule changes', capacityHistory: FABRICATED_HISTORIES.emma },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BriefingsScreen() {
  const [scope, setScope] = useState<BriefScope>('personal');
  const { freeUserViewActive, freeUserViewBanner } = useAccess();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* FREE USER VIEW Banner */}
      {freeUserViewActive && (
        <View style={styles.freeUserViewBanner}>
          <Text style={styles.freeUserViewBannerText}>{freeUserViewBanner}</Text>
        </View>
      )}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Briefings</Text>
        <Text style={styles.headerSubtitle}>
          {freeUserViewActive
            ? 'Personal capacity intelligence'
            : 'Capacity intelligence across scopes'}
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
        {scope === 'circles' && <CirclesCCIBrief />}
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
// CIRCLES TAB — Circle CCI Demo (Pro Only)
// =============================================================================

function CirclesCCIBrief() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE</Text>
      </View>

      {/* Admin Breadcrumb */}
      <View style={styles.breadcrumb}>
        <LayoutGrid color="rgba(255,255,255,0.5)" size={14} />
        <Text style={styles.breadcrumbText}>Admin</Text>
        <Text style={styles.breadcrumbSeparator}>/</Text>
        <Text style={styles.breadcrumbActive}>Sensory Support Group</Text>
      </View>

      {/* Circle Header */}
      <View style={styles.circleHeader}>
        <View style={styles.circleHeaderLeft}>
          <Text style={styles.circleTitle}>SENSORY SUPPORT GROUP</Text>
          <Text style={styles.circleSubtitle}>Circle Coordinator: Emily Zhang</Text>
        </View>
        <View style={styles.circleHeaderRight}>
          <View style={styles.circleMemberBadge}>
            <Text style={styles.circleMemberBadgeText}>5 / 5 Members</Text>
          </View>
          <Pressable style={styles.lingsButton} onPress={() => router.push('/cci?type=circle')}>
            <Link2 color="#00D7FF" size={14} />
            <Text style={styles.lingsButtonText}>LINGS</Text>
          </Pressable>
        </View>
      </View>

      {/* CCI Description Row - Side by side on wide screens */}
      <View style={[styles.cciDescriptionRow, isWideScreen && styles.cciDescriptionRowWide]}>
        {/* Left: CCI Description */}
        <View style={[styles.circleCCICard, isWideScreen && { flex: 1, marginRight: spacing.md }]}>
          <Text style={styles.circleCCITitle}>CIRCLE CAPACITY INDICATOR (CCI)</Text>
          <Text style={styles.circleCCIDescription}>
            A non-diagnostic, aggregate snapshot of a group's{' '}
            <Text style={styles.circleCCIHighlight}>functional regulation bandwidth</Text>
            {' '}over time — reflecting how much emotional, cognitive, sensory, and social load the group can tolerate before regulation begins to degrade.
          </Text>
          <Text style={styles.circleCCINote}>
            This report summarizes patterns, not individuals. No diagnoses. No symptom scoring
          </Text>
        </View>

        {/* Right: Data Confidence */}
        <View style={[styles.dataConfidenceCard, isWideScreen && { flex: 0.4 }]}>
          <View style={styles.dataConfidenceHeader}>
            <CheckCircle color="#10B981" size={20} />
            <Text style={styles.dataConfidenceTitle}>Data Confidence:</Text>
            <Text style={styles.dataConfidenceValue}>High</Text>
          </View>
          <Text style={styles.dataConfidenceText}>
            Based on consistent participation and stable reporting patterns across members.
          </Text>
        </View>
      </View>

      {/* Integrated Member Cards - Info + Chart together */}
      <View style={styles.memberCardsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MEMBER CAPACITY — 90 DAYS</Text>
          <Text style={styles.sectionSubtitle}>Non-diagnostic. Per-member view.</Text>
        </View>

        {DEMO_CIRCLE_MEMBERS.map((member) => (
          <View key={member.id} style={[styles.integratedCard, isWideScreen && styles.integratedCardWide]}>
            {/* Left: Member Info */}
            <View style={[styles.memberInfoSection, isWideScreen && styles.memberInfoSectionWide]}>
              <View style={styles.memberHeader}>
                {member.avatar ? (
                  <Image source={{ uri: member.avatar }} style={styles.cardAvatar} />
                ) : (
                  <View style={styles.cardAvatarPlaceholder}>
                    <Text style={styles.cardAvatarText}>{member.name[0]}</Text>
                  </View>
                )}
                <View style={styles.memberNameContainer}>
                  <Text style={styles.cardMemberName}>{member.name}</Text>
                  <Text style={styles.cardMemberUsername}>{member.username}</Text>
                </View>
              </View>

              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.capacityBadge,
                    member.capacityState === 'resourced' && styles.capacityBadgeResourced,
                    member.capacityState === 'stretched' && styles.capacityBadgeStretched,
                    member.capacityState === 'depleted' && styles.capacityBadgeDepleted,
                  ]}>
                    <Text style={styles.capacityBadgeText}>
                      {member.capacityState.charAt(0).toUpperCase() + member.capacityState.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Participation</Text>
                  <Text style={styles.detailValue}>{member.participation}</Text>
                </View>

                {member.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{member.notes}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right: Chart */}
            <View style={[styles.memberChartSection, isWideScreen && styles.memberChartSectionWide]}>
              <CCIChart
                data={member.capacityHistory}
                timeRange="90d"
                showLegend={false}
                showDisclaimer={false}
                width={isWideScreen ? width - 280 : width - 48}
                heightRatio={0.14}
              />
            </View>
          </View>
        ))}

        {/* Disclaimer */}
        <Text style={styles.gridDisclaimer}>
          Not a diagnostic tool. Not a symptom severity scale.
        </Text>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Pressable style={styles.ctaPrimary} onPress={() => router.push('/cci?type=circle')}>
          <Text style={styles.ctaPrimaryText}>Generate Circle Capacity Summary (CCI)</Text>
          <Text style={styles.ctaPriceText}>$399</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={() => router.push('/cci')}>
          <Text style={styles.ctaSecondaryText}>Generate Individual Capacity Summaries</Text>
          <Text style={styles.ctaSecondaryPrice}>$149 each</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Orbital – Assembled in the USA</Text>
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
  freeUserViewBanner: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    alignItems: 'center',
  },
  freeUserViewBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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

  // Circles Tab
  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  breadcrumbText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#00D7FF',
    fontWeight: '500',
  },

  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  circleHeaderLeft: {
    flex: 1,
  },
  circleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.5,
  },
  circleSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  circleMemberBadge: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  circleMemberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D7FF',
  },
  lingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,215,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  lingsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 0.5,
  },

  // Two Column Layout
  cciDescriptionRow: {
    marginBottom: spacing.md,
  },
  cciDescriptionRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  twoColumnContainer: {
    marginBottom: spacing.md,
  },
  twoColumnContainerWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },

  // Chart Container
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 0.5,
  },
  chartSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  // Member Chart Grid (Circles)
  memberChartGrid: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  memberChartGridNarrow: {
    flexDirection: 'column',
  },
  memberChartCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  memberChartCardNarrow: {
    width: '100%',
  },
  memberChartName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
  },
  gridDisclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  timeRangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeRangeButtonActive: {
    backgroundColor: 'rgba(0,215,255,0.15)',
    borderColor: 'rgba(0,215,255,0.4)',
  },
  timeRangeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  timeRangeButtonTextActive: {
    color: '#00D7FF',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
  chartBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartBandLine: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  chartBandLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 100,
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  chartXLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },

  // Circle CCI Card
  circleCCICard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  circleCCITitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  circleCCIDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  circleCCIHighlight: {
    color: '#00D7FF',
    fontWeight: '600',
  },
  circleCCINote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  dataConfidenceCard: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  dataConfidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  dataConfidenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dataConfidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  dataConfidenceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },

  // Circle Status Table
  circleStatusSection: {
    marginBottom: spacing.md,
  },
  circleStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,215,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  memberUsername: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  capacityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  capacityBadgeResourced: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  capacityBadgeStretched: {
    backgroundColor: 'rgba(232,168,48,0.2)',
    borderWidth: 1,
    borderColor: '#E8A830',
  },
  capacityBadgeDepleted: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  capacityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  participationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  notesText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  paginationHint: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paginationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Aggregate Section
  aggregateSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  aggregateSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.md,
  },
  aggregateBullets: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aggregateBullet: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  aggregateDisclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },

  // CTA Section
  ctaSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaPrimary: {
    backgroundColor: 'rgba(0,215,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,215,255,0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  ctaPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D7FF',
  },
  ctaSecondary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  ctaSecondaryPrice: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },

  // Integrated Member Cards
  memberCardsSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D7FF',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  integratedCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.xs,
    marginBottom: 6,
  },
  integratedCardWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfoSection: {
    marginBottom: spacing.sm,
  },
  memberInfoSectionWide: {
    width: 200,
    marginBottom: 0,
    marginRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    paddingRight: spacing.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,215,255,0.3)',
  },
  cardAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,215,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D7FF',
  },
  memberNameContainer: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  cardMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cardMemberUsername: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  memberDetails: {
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  memberChartSection: {
    minHeight: 60,
  },
  memberChartSectionWide: {
    flex: 1,
  },
});
