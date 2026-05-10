/**
 * Executive Engagement — DEMO ONLY
 *
 * GOVERNANCE: Founder-Led Briefings — Available by Request
 * - NO PRICING IN-APP
 * - Contact flows only
 * - Demo/preview surfaces
 *
 * Three tiers:
 * 1. Executive Alignment Brief (Pre-Pilot)
 * 2. Board-Level Risk Brief (Post-Pilot)
 * 3. Executive Advisory (Ongoing)
 */

import React from 'react';
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
  Users,
  Building2,
  Phone,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, commonStyles } from '../theme';

// =============================================================================
// CONTACT URLs — All route to founder/sales engagement
// =============================================================================

const CONTACT_URLS = {
  alignmentBrief: 'mailto:contact@orbitalhealth.app?subject=Executive%20Alignment%20Brief%20Request',
  boardBrief: 'mailto:contact@orbitalhealth.app?subject=Board-Level%20Risk%20Brief%20Request',
  advisory: 'mailto:contact@orbitalhealth.app?subject=Executive%20Advisory%20Inquiry',
};

// =============================================================================
// BRIEFING DEFINITIONS
// =============================================================================

interface BriefingDefinition {
  id: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
  title: string;
  timing: string;
  purpose: string[];
  description: string;
  deliverables?: string[];
  cta: string;
  ctaUrl: string;
}

const BRIEFINGS: BriefingDefinition[] = [
  {
    id: 'alignment-brief',
    icon: Users,
    color: '#0E8C7B',
    title: 'Executive Alignment Brief',
    timing: 'Pre-Pilot',
    purpose: [
      'Align leadership on the real problem',
      'De-risk pilot politically',
      'Prevent pilot failure due to misalignment',
    ],
    description: 'This ensures the pilot is asking the right question.',
    deliverables: [
      '60\u201390 min executive session',
      'Framing of system strain, risk exposure, governance boundaries',
      'Clear definition of what the pilot will / will not answer',
    ],
    cta: 'Request Executive Alignment Brief',
    ctaUrl: CONTACT_URLS.alignmentBrief,
  },
  {
    id: 'board-brief',
    icon: Building2,
    color: '#9C27B0',
    title: 'Board-Level Risk Brief',
    timing: 'Post-Pilot',
    purpose: [
      'Interpret real signal',
      'Frame board-level risk',
      'Support oversight and expansion decisions',
    ],
    description: 'Founder-led interpretation of institutional volatility signals.',
    cta: 'Request Board Briefing',
    ctaUrl: CONTACT_URLS.boardBrief,
  },
  {
    id: 'executive-advisory',
    icon: Phone,
    color: '#F59E0B',
    title: 'Executive Advisory',
    timing: 'Ongoing',
    purpose: [
      'High-end advisory during stress windows',
      'Interpretation only \u2014 no ops, no management',
    ],
    description: 'Light-touch founder access for leadership.',
    cta: 'Contact Orbital \u00B7 Executive Advisory',
    ctaUrl: CONTACT_URLS.advisory,
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ExecutiveEngagementScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* DEMO Banner — Required */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>FOUNDER-LED \u00B7 AVAILABLE BY REQUEST</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Sparkles size={18} color="#F59E0B" />
          <Text style={styles.headerTitle}>Executive Engagement</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Strategic Context */}
      <View style={styles.contextCard}>
        <Text style={styles.contextTitle}>Strategic Context</Text>
        <Text style={styles.contextText}>
          Institutions do not buy software access. They buy:
        </Text>
        <View style={styles.contextList}>
          <Text style={styles.contextItem}>\u2022 Permission to act</Text>
          <Text style={styles.contextItem}>\u2022 Defensible language</Text>
          <Text style={styles.contextItem}>\u2022 External authority</Text>
          <Text style={styles.contextItem}>\u2022 Political cover</Text>
          <Text style={styles.contextItem}>\u2022 Governance confidence</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {BRIEFINGS.map((briefing) => (
          <BriefingCard key={briefing.id} briefing={briefing} />
        ))}

        {/* Governance Notice */}
        <View style={styles.governanceNotice}>
          <Text style={styles.governanceTitle}>Pricing</Text>
          <Text style={styles.governanceText}>
            Executive engagement pricing is scoped during discovery.
            No pricing is displayed in-app.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            "When institutions see this, they immediately want it \u2014
          </Text>
          <Text style={styles.footerTextEmphasis}>
            and have to call us to get it."
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// BRIEFING CARD COMPONENT
// =============================================================================

function BriefingCard({ briefing }: { briefing: BriefingDefinition }) {
  const Icon = briefing.icon;

  const handleContact = () => {
    Linking.openURL(briefing.ctaUrl);
  };

  return (
    <View style={[styles.card, { borderColor: `${briefing.color}40` }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${briefing.color}20` }]}>
          <Icon size={24} color={briefing.color} />
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{briefing.title}</Text>
          </View>
          <View style={[styles.timingBadge, { backgroundColor: `${briefing.color}20` }]}>
            <Text style={[styles.timingText, { color: briefing.color }]}>
              {briefing.timing}
            </Text>
          </View>
        </View>
      </View>

      {/* Purpose */}
      <View style={styles.purposeSection}>
        <Text style={styles.sectionLabel}>PURPOSE</Text>
        {briefing.purpose.map((item, idx) => (
          <Text key={idx} style={styles.purposeItem}>\u2022 {item}</Text>
        ))}
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>"{briefing.description}"</Text>
      </View>

      {/* Deliverables (if present) */}
      {briefing.deliverables && (
        <View style={styles.deliverablesSection}>
          <Text style={styles.sectionLabel}>DELIVERABLES</Text>
          {briefing.deliverables.map((item, idx) => (
            <Text key={idx} style={styles.deliverableItem}>\u2022 {item}</Text>
          ))}
        </View>
      )}

      {/* Founder-Led Badge */}
      <View style={styles.founderBadge}>
        <Sparkles size={12} color="#F59E0B" />
        <Text style={styles.founderBadgeText}>Founder-Led \u00B7 Available by Request</Text>
      </View>

      {/* CTA Button */}
      <Pressable
        style={[styles.ctaButton, { backgroundColor: briefing.color }]}
        onPress={handleContact}
      >
        <Text style={styles.ctaButtonText}>{briefing.cta}</Text>
        <ExternalLink size={14} color="#000" />
      </Pressable>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  demoBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerBack: {
    padding: spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  contextCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A6A0A',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  contextList: {
    gap: 4,
  },
  contextItem: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  timingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timingText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  purposeSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  purposeItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  descriptionContainer: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
  },
  deliverablesSection: {
    marginBottom: spacing.md,
  },
  deliverableItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  founderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  founderBadgeText: {
    fontSize: 11,
    color: '#9A6A0A',
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  governanceNotice: {
    backgroundColor: colors.backgroundSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  governanceTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  governanceText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerTextEmphasis: {
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
