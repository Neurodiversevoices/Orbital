/**
 * Briefings Tab — B2C Only
 *
 * 1. Personal → Individual CCI Demo Brief (links to /cci)
 * 2. Circles  → Circle CCI Demo (Pro only)
 *
 * GOVERNANCE:
 * - All views are DEMO-ONLY
 * - No Organization/Global tabs (those are B2B/enterprise)
 * - Circles tab requires Pro subscription
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
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
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useAccess } from '../../lib/access';

// =============================================================================
// TYPES
// =============================================================================

type BriefScope = 'personal' | 'circles';

interface ScopeTab {
  id: BriefScope;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  proOnly?: boolean;
}

const SCOPE_TABS: ScopeTab[] = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'circles', label: 'Circles', icon: Users, proOnly: true },
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
}

const DEMO_CIRCLE_MEMBERS: CircleMember[] = [
  { id: '1', name: 'Mia', username: 'Mia Anderson', capacityState: 'stretched', trend: 'flat', participation: '6 / 7' },
  { id: '2', name: 'Zach', username: 'That teguns', capacityState: 'stretched', trend: 'declining', participation: '7 / 7' },
  { id: '3', name: 'Lily', username: 'Traa teguns', capacityState: 'resourced', trend: 'improving', participation: '5 / 5' },
  { id: '4', name: 'Tyler', username: 'Tyia Ramirez', capacityState: 'stretched', trend: 'flat', participation: '5 / 5' },
  { id: '5', name: 'Emma', username: 'Emily Zhang', capacityState: 'stretched', trend: 'declining', participation: '5 / 5' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BriefingsScreen() {
  const [scope, setScope] = useState<BriefScope>('personal');
  const { hasTier, freeUserViewActive, freeUserViewBanner } = useAccess();

  // B2C: Circles tab requires Pro tier
  const canAccessCircles = hasTier('individual_pro');

  // Filter tabs based on access level
  const visibleTabs = useMemo(() => {
    if (!canAccessCircles) {
      // Free/Individual users: only show Personal tab
      return SCOPE_TABS.filter((tab) => !tab.proOnly);
    }
    return SCOPE_TABS;
  }, [canAccessCircles]);

  // If current scope is not visible, reset to personal
  React.useEffect(() => {
    if (!canAccessCircles && scope === 'circles') {
      setScope('personal');
    }
  }, [canAccessCircles, scope]);

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
        {visibleTabs.map((tab) => {
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
        {scope === 'circles' && canAccessCircles && <CirclesCCIBrief />}
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
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Demo Banner */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE</Text>
      </View>

      {/* Circle Header */}
      <View style={styles.circleHeader}>
        <View style={styles.circleHeaderLeft}>
          <Text style={styles.circleTitle}>SENSORY SUPPORT GROUP</Text>
          <Text style={styles.circleSubtitle}>Lead Parent: Emily Zhang</Text>
        </View>
        <View style={styles.circleMemberBadge}>
          <Text style={styles.circleMemberBadgeText}>5 / 5 Members</Text>
        </View>
      </View>

      {/* Circle Capacity Index Card */}
      <View style={styles.circleCCICard}>
        <Text style={styles.circleCCITitle}>CIRCLE CAPACITY INDEX (CCI)</Text>
        <Text style={styles.circleCCIDescription}>
          A non-diagnostic, aggregate snapshot of a group's{' '}
          <Text style={styles.circleCCIHighlight}>functional regulation bandwidth</Text>
          {' '}over time — reflecting how much emotional, cognitive, sensory, and social load the group can tolerate before regulation begins to degrade.
        </Text>
        <Text style={styles.circleCCINote}>
          This report summarizes patterns, not individuals. No diagnoses. No symptom scoring
        </Text>

        {/* Data Confidence Badge */}
        <View style={styles.dataConfidenceCard}>
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

      {/* Circle Status Table */}
      <View style={styles.circleStatusSection}>
        <Text style={styles.circleStatusTitle}>Circle Status</Text>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>MEMBER</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>CAPACITY STATE</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>7 DAY TREND</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>PARTICIPATION</Text>
        </View>

        {/* Table Rows */}
        {DEMO_CIRCLE_MEMBERS.map((member) => (
          <View key={member.id} style={styles.tableRow}>
            {/* Member */}
            <View style={[styles.tableCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{member.name[0]}</Text>
              </View>
              <View>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberUsername}>{member.username}</Text>
              </View>
            </View>

            {/* Capacity State */}
            <View style={[styles.tableCell, { flex: 1 }]}>
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

            {/* 7 Day Trend */}
            <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              {member.trend === 'improving' && <TrendingUp color="#10B981" size={14} />}
              {member.trend === 'declining' && <TrendingDown color="#F44336" size={14} />}
              {member.trend === 'flat' && <Minus color="#E8A830" size={14} />}
              <Text style={[
                styles.trendText,
                member.trend === 'improving' && { color: '#10B981' },
                member.trend === 'declining' && { color: '#F44336' },
                member.trend === 'flat' && { color: '#E8A830' },
              ]}>
                {member.trend.charAt(0).toUpperCase() + member.trend.slice(1)}
              </Text>
            </View>

            {/* Participation */}
            <View style={[styles.tableCell, { flex: 0.8 }]}>
              <Text style={styles.participationText}>{member.participation}</Text>
            </View>
          </View>
        ))}

        {/* Pagination hint */}
        <View style={styles.paginationHint}>
          <Text style={styles.paginationText}>1–5 of 5 members</Text>
        </View>
      </View>

      {/* Aggregate Capacity Section */}
      <View style={styles.aggregateSection}>
        <Text style={styles.aggregateSectionTitle}>Aggregate Capacity Over Time</Text>
        <View style={styles.aggregateBullets}>
          <Text style={styles.aggregateBullet}>• Identifies patterns of rising or <Text style={styles.boldText}>sustained load</Text></Text>
          <Text style={styles.aggregateBullet}>• Supports pacing, scheduling, and environmental <Text style={styles.boldText}>adjustments</Text></Text>
          <Text style={styles.aggregateBullet}>• Informs <Text style={styles.boldText}>preventive interventions</Text> before dysregulation <Text style={styles.boldText}>escalates</Text></Text>
          <Text style={styles.aggregateBullet}>• <Text style={styles.boldText}>Complements</Text> — does <Text style={styles.boldText}>not replace</Text> — clinical judgment</Text>
        </View>
        <Text style={styles.aggregateDisclaimer}>
          Not a diagnostic tool. Not a symptom severity scale.
        </Text>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Pressable style={styles.ctaPrimary}>
          <Text style={styles.ctaPrimaryText}>Generate Circle Capacity Summary (CCI)</Text>
          <Text style={styles.ctaPriceText}>$399</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary}>
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
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  circleHeaderLeft: {
    flex: 1,
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
    marginBottom: spacing.md,
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
});
