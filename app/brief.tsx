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
  Package,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useAccess } from '../../lib/access';
import { CCISummaryChart } from '../../components/CCISummaryChart';
import { BundleCCIPreview } from '../../components/BundleCCIPreview';
import { FABRICATED_HISTORIES, getCapacityState } from '../../lib/cci/demoData';

// =============================================================================
// TYPES
// =============================================================================

type BriefScope = 'personal' | 'circles' | 'bundles';

interface ScopeTab {
  id: BriefScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}

const SCOPE_TABS: ScopeTab[] = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'circles', label: 'Circles', icon: Users },
  { id: 'bundles', label: 'Bundles', icon: Package },
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
  capacityHistory: number[]; // 90 days of capacity data (0-100 scale: 0-33=depleted, 33-66=stretched, 66-100=resourced)
}

// =============================================================================
// DEMO DATA — Imported from lib/cci/demoData.ts
// Chart colors from lib/charts (unified chart system)
// =============================================================================

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
          <Text style={styles.freeUserViewBannerText} maxFontSizeMultiplier={1.5}>{freeUserViewBanner}</Text>
        </View>
      )}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.5}>Briefings</Text>
        <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.5}>
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
                color={isActive ? '#0E8C7B' : colors.textSecondary}
                size={18}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} maxFontSizeMultiplier={1.5}>
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
        {scope === 'bundles' && <BundlesCCIBrief />}
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
        <Text style={styles.demoBannerText} maxFontSizeMultiplier={1.5}>DEMO / SAMPLE</Text>
      </View>

      {/* CCI Card */}
      <Pressable
        style={styles.cciCard}
        onPress={() => router.push('/cci')}
      >
        <View style={styles.cciHeader}>
          <View style={styles.cciIconContainer}>
            <FileText color="#0E8C7B" size={28} />
          </View>
          <ChevronRight color={colors.textTertiary} size={24} />
        </View>

        <Text style={styles.cciTitle} maxFontSizeMultiplier={1.5}>Clinical Capacity Instrument</Text>
        <Text style={styles.cciSubtitle} maxFontSizeMultiplier={1.5}>CCI-Q4</Text>

        <Text style={styles.cciDescription} maxFontSizeMultiplier={1.5}>
          Your personal capacity signal rendered as a clinical-grade instrument.
          Demo data shown — real issuance reflects your actual capacity patterns.
        </Text>

        <View style={styles.cciCta}>
          <Text style={styles.cciCtaText} maxFontSizeMultiplier={1.5}>View CCI-Q4</Text>
          <ChevronRight color="#0E8C7B" size={18} />
        </View>
      </Pressable>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Text style={styles.infoNoteText} maxFontSizeMultiplier={1.5}>
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
        <Text style={styles.demoBannerText} maxFontSizeMultiplier={1.5}>DEMO / SAMPLE</Text>
      </View>

      {/* Admin Breadcrumb */}
      <View style={styles.breadcrumb}>
        <LayoutGrid color={colors.textSecondary} size={14} />
        <Text style={styles.breadcrumbText} maxFontSizeMultiplier={1.5}>Admin</Text>
        <Text style={styles.breadcrumbSeparator} maxFontSizeMultiplier={1.5}>/</Text>
        <Text style={styles.breadcrumbActive} maxFontSizeMultiplier={1.5}>Sensory Support Group</Text>
      </View>

      {/* Circle Header */}
      <View style={styles.circleHeader}>
        <View style={styles.circleHeaderLeft}>
          <Text style={styles.circleTitle} maxFontSizeMultiplier={1.5}>SENSORY SUPPORT GROUP</Text>
          <Text style={styles.circleSubtitle} maxFontSizeMultiplier={1.5}>Circle Coordinator: Emily Zhang</Text>
        </View>
        <View style={styles.circleHeaderRight}>
          <View style={styles.circleMemberBadge}>
            <Text style={styles.circleMemberBadgeText} maxFontSizeMultiplier={1.5}>5 / 5 Members</Text>
          </View>
          <Pressable style={styles.lingsButton} onPress={() => router.push('/cci?type=circle')}>
            <Link2 color="#0E8C7B" size={14} />
            <Text style={styles.lingsButtonText} maxFontSizeMultiplier={1.5}>LINGS</Text>
          </Pressable>
        </View>
      </View>

      {/* CCI Description Row - Side by side on wide screens */}
      <View style={[styles.cciDescriptionRow, isWideScreen && styles.cciDescriptionRowWide]}>
        {/* Left: CCI Description */}
        <View style={[styles.circleCCICard, isWideScreen && { flex: 1, marginRight: spacing.md }]}>
          <Text style={styles.circleCCITitle} maxFontSizeMultiplier={1.5}>CIRCLE CAPACITY INDICATOR (CCI)</Text>
          <Text style={styles.circleCCIDescription} maxFontSizeMultiplier={1.5}>
            A non-diagnostic, aggregate snapshot of a group's{' '}
            <Text style={styles.circleCCIHighlight}>functional regulation bandwidth</Text>
            {' '}over time — reflecting how much emotional, cognitive, sensory, and social load the group can tolerate before regulation begins to degrade.
          </Text>
          <Text style={styles.circleCCINote} maxFontSizeMultiplier={1.5}>
            This report summarizes patterns, not individuals. Non-diagnostic. No severity scoring
          </Text>
        </View>

        {/* Right: Data Confidence */}
        <View style={[styles.dataConfidenceCard, isWideScreen && { flex: 0.4 }]}>
          <View style={styles.dataConfidenceHeader}>
            <CheckCircle color="#0E8C7B" size={20} />
            <Text style={styles.dataConfidenceTitle} maxFontSizeMultiplier={1.5}>Data Confidence:</Text>
            <Text style={styles.dataConfidenceValue} maxFontSizeMultiplier={1.5}>High</Text>
          </View>
          <Text style={styles.dataConfidenceText} maxFontSizeMultiplier={1.5}>
            Based on consistent participation and stable reporting patterns across members.
          </Text>
        </View>
      </View>

      {/* Integrated Member Cards - Info + Chart together */}
      <View style={styles.memberCardsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>MEMBER CAPACITY — 90 DAYS</Text>
          <Text style={styles.sectionSubtitle} maxFontSizeMultiplier={1.5}>Non-diagnostic. Per-member view.</Text>
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
                    <Text style={styles.cardAvatarText} maxFontSizeMultiplier={1.5}>{member.name[0]}</Text>
                  </View>
                )}
                <View style={styles.memberNameContainer}>
                  <Text style={styles.cardMemberName} maxFontSizeMultiplier={1.5}>{member.name}</Text>
                  <Text style={styles.cardMemberUsername} maxFontSizeMultiplier={1.5}>{member.username}</Text>
                </View>
              </View>

              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel} maxFontSizeMultiplier={1.5}>Status</Text>
                  <View style={[
                    styles.capacityBadge,
                    member.capacityState === 'resourced' && styles.capacityBadgeResourced,
                    member.capacityState === 'stretched' && styles.capacityBadgeStretched,
                    member.capacityState === 'depleted' && styles.capacityBadgeDepleted,
                  ]}>
                    <Text style={styles.capacityBadgeText} maxFontSizeMultiplier={1.5}>
                      {member.capacityState.charAt(0).toUpperCase() + member.capacityState.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel} maxFontSizeMultiplier={1.5}>Participation</Text>
                  <Text style={styles.detailValue} maxFontSizeMultiplier={1.5}>{member.participation}</Text>
                </View>

                {member.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel} maxFontSizeMultiplier={1.5}>Notes</Text>
                    <Text style={styles.detailValue} maxFontSizeMultiplier={1.5}>{member.notes}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right: Chart - Uses CCISummaryChart for Individual CCI visual style */}
            <View style={[styles.memberChartSection, isWideScreen && styles.memberChartSectionWide]}>
              <CCISummaryChart
                values={member.capacityHistory}
                width={isWideScreen ? width - 280 : width - 48}
                chartId={member.id}
              />
            </View>
          </View>
        ))}

        {/* Disclaimer */}
        <Text style={styles.gridDisclaimer} maxFontSizeMultiplier={1.5}>
          Not a diagnostic tool. Not a severity scale.
        </Text>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Pressable style={styles.ctaPrimary} onPress={() => router.push('/cci?type=circle')}>
          <Text style={styles.ctaPrimaryText} maxFontSizeMultiplier={1.5}>Generate Circle Capacity Summary (CCI)</Text>
          <Text style={styles.ctaPriceText} maxFontSizeMultiplier={1.5}>$399</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={() => router.push('/cci')}>
          <Text style={styles.ctaSecondaryText} maxFontSizeMultiplier={1.5}>Generate Individual Capacity Summaries</Text>
          <Text style={styles.ctaSecondaryPrice} maxFontSizeMultiplier={1.5}>$149 each</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText} maxFontSizeMultiplier={1.5}>Orbital – Assembled in the USA</Text>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// BUNDLES TAB — Bundle CCI Demo
// =============================================================================

function BundlesCCIBrief() {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<10 | 15 | 20>(10);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText} maxFontSizeMultiplier={1.5}>DEMO / SAMPLE</Text>
      </View>

      {/* Bundle Header */}
      <View style={styles.bundleHeader}>
        <View style={styles.bundleHeaderLeft}>
          <Text style={styles.bundleTitle} maxFontSizeMultiplier={1.5}>BUNDLE CAPACITY</Text>
          <Text style={styles.bundleSubtitle} maxFontSizeMultiplier={1.5}>Anonymous seat-level capacity view</Text>
        </View>
        <View style={styles.bundleBadge}>
          <Text style={styles.bundleBadgeText} maxFontSizeMultiplier={1.5}>{selectedSize} SEATS</Text>
        </View>
      </View>

      {/* Bundle Description */}
      <View style={styles.bundleCCICard}>
        <Text style={styles.bundleCCITitle} maxFontSizeMultiplier={1.5}>BUNDLE CAPACITY INDICATOR (CCI)</Text>
        <Text style={styles.bundleCCIDescription} maxFontSizeMultiplier={1.5}>
          A non-diagnostic, aggregate snapshot of a bundle's{' '}
          <Text style={styles.bundleCCIHighlight}>functional regulation bandwidth</Text>
          {' '}over time. Individual seats are represented by avatars only — no names or identifying information.
        </Text>
        <Text style={styles.bundleCCINote} maxFontSizeMultiplier={1.5}>
          Privacy first: avatars only, no individual attribution
        </Text>
      </View>

      {/* Size Selector */}
      <View style={styles.bundleSizeSelector}>
        <Text style={styles.bundleSizeSelectorLabel} maxFontSizeMultiplier={1.5}>Select Bundle Size:</Text>
        <View style={styles.bundleSizeButtons}>
          {([10, 15, 20] as const).map((size) => (
            <Pressable
              key={size}
              style={[
                styles.bundleSizeButton,
                selectedSize === size && styles.bundleSizeButtonActive,
              ]}
              onPress={() => setSelectedSize(size)}
            >
              <Text
                style={[
                  styles.bundleSizeButtonText,
                  selectedSize === size && styles.bundleSizeButtonTextActive,
                ]}
                maxFontSizeMultiplier={1.5}
              >
                {size} seats
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bundle CCI Preview */}
      <BundleCCIPreview seatCount={selectedSize} />

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Pressable style={styles.ctaBundlePrimary} onPress={() => router.push('/upgrade')}>
          <Text style={styles.ctaBundlePrimaryText} maxFontSizeMultiplier={1.5}>Purchase Bundle</Text>
          <Text style={styles.ctaBundlePriceText} maxFontSizeMultiplier={1.5}>From $2,700/yr</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={() => {
          router.push(`/cci?type=bundle&seats=${selectedSize}`);
        }}>
          <Text style={styles.ctaSecondaryText} maxFontSizeMultiplier={1.5}>Generate Bundle Capacity Summary (CCI)</Text>
          <Text style={styles.ctaSecondaryPrice} maxFontSizeMultiplier={1.5}>$999</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText} maxFontSizeMultiplier={1.5}>Orbital – Assembled in the USA</Text>
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
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    alignItems: 'center',
  },
  freeUserViewBannerText: {
    color: '#FFFFFF',
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
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabActive: {
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderColor: 'rgba(45,212,191,0.30)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: '#0E8C7B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  demoBanner: {
    backgroundColor: colors.backgroundSubtle,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  demoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },

  // Personal Tab - CCI Card
  cciCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
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
    backgroundColor: 'rgba(45,212,191,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cciTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cciSubtitle: {
    fontSize: 13,
    color: '#0E8C7B',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  cciDescription: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: '#0E8C7B',
  },
  infoNote: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  infoNoteText: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#0E8C7B',
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
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  circleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  circleMemberBadge: {
    backgroundColor: 'rgba(45,212,191,0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
  },
  circleMemberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  lingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(45,212,191,0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
  },
  lingsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E8C7B',
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: '#0E8C7B',
    letterSpacing: 0.5,
  },
  chartSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  memberChartCardNarrow: {
    width: '100%',
  },
  memberChartName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  gridDisclaimer: {
    fontSize: 10,
    color: colors.textTertiary,
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
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeRangeButtonActive: {
    backgroundColor: 'rgba(45,212,191,0.16)',
    borderColor: 'rgba(45,212,191,0.40)',
  },
  timeRangeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeRangeButtonTextActive: {
    color: '#0E8C7B',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
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
    color: colors.textSecondary,
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
    borderTopColor: colors.hairline,
  },
  chartXLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },

  // Circle CCI Card
  circleCCICard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  circleCCITitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E8C7B',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  circleCCIDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  circleCCIHighlight: {
    color: '#0E8C7B',
    fontWeight: '600',
  },
  circleCCINote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  dataConfidenceCard: {
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
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
    color: colors.textPrimary,
  },
  dataConfidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E8C7B',
  },
  dataConfidenceText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Circle Status Table
  circleStatusSection: {
    marginBottom: spacing.md,
  },
  circleStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    alignItems: 'center',
  },
  tableCell: {
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(45,212,191,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(45,212,191,0.30)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberUsername: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  capacityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  capacityBadgeResourced: {
    backgroundColor: 'rgba(45,212,191,0.16)',
    borderWidth: 1,
    borderColor: '#2DD4BF',
  },
  capacityBadgeStretched: {
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  capacityBadgeDepleted: {
    backgroundColor: 'rgba(220,38,38,0.16)',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  capacityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  participationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  paginationHint: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paginationText: {
    fontSize: 11,
    color: colors.textTertiary,
  },

  // Aggregate Section
  aggregateSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  aggregateSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  aggregateBullets: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aggregateBullet: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aggregateDisclaimer: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // CTA Section
  ctaSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ctaPrimary: {
    backgroundColor: 'rgba(45,212,191,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.30)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  ctaPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E8C7B',
  },
  ctaSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ctaSecondaryPrice: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: colors.textTertiary,
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
    color: '#0E8C7B',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  integratedCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    borderRightColor: colors.hairline,
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
    borderColor: 'rgba(45,212,191,0.30)',
  },
  cardAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(45,212,191,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
  },
  memberNameContainer: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  cardMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardMemberUsername: {
    fontSize: 10,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 10,
    color: colors.textPrimary,
  },
  memberChartSection: {
    minHeight: 60,
  },
  memberChartSectionWide: {
    flex: 1,
  },

  // Bundles Tab Styles
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bundleHeaderLeft: {
    flex: 1,
  },
  bundleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  bundleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bundleBadge: {
    backgroundColor: 'rgba(156,39,176,0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.30)',
  },
  bundleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C27B0',
  },
  bundleCCICard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.30)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bundleCCITitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9C27B0',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bundleCCIDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bundleCCIHighlight: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  bundleCCINote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  bundleSizeSelector: {
    marginBottom: spacing.md,
  },
  bundleSizeSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bundleSizeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bundleSizeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  bundleSizeButtonActive: {
    backgroundColor: 'rgba(156,39,176,0.10)',
    borderColor: '#9C27B0',
  },
  bundleSizeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bundleSizeButtonTextActive: {
    color: '#9C27B0',
  },
  ctaBundlePrimary: {
    backgroundColor: 'rgba(156,39,176,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(156,39,176,0.30)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaBundlePrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  ctaBundlePriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9C27B0',
  },
});
