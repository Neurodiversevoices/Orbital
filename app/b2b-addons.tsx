/**
 * B2B Add-Ons — DEMO ONLY
 *
 * GOVERNANCE: All features are DEMO/SAMPLE only.
 * - Clearly labeled
 * - Non-configurable
 * - Non-exportable
 * - Non-activatable
 * - Routes to CONTACT flows only
 *
 * NO PRICING. NO ACTIVATION. NO RAW DATA.
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
  TrendingUp,
  Stethoscope,
  Plane,
  GraduationCap,
  School,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, commonStyles } from '../theme';

// =============================================================================
// CONTACT URLs — All route to sales/contact flows
// =============================================================================

const CONTACT_URLS = {
  licensing: 'mailto:contact@orbitalhealth.app?subject=Volatility%20Index%20Licensing%20Inquiry',
  healthcare: 'mailto:contact@orbitalhealth.app?subject=Nursing%20Sentinel%20%2B%20Clinical%20Briefs%20Inquiry',
  frms: 'mailto:contact@orbitalhealth.app?subject=FRMS%20Safety%20Layer%20Inquiry',
  higherEd: 'mailto:contact@orbitalhealth.app?subject=Higher%20Ed%20Benchmarks%20Inquiry',
  k12: 'mailto:contact@orbitalhealth.app?subject=K-12%20District%20Sentinel%20Inquiry',
  compliance: 'mailto:contact@orbitalhealth.app?subject=Compliance%20%2F%20Vendor%20Risk%20Pack%20Inquiry',
};

// =============================================================================
// ADD-ON DEFINITIONS
// =============================================================================

interface AddOnDefinition {
  id: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
  title: string;
  subtitle: string;
  demoLabel: string;
  sampleAlert?: string;
  mustNotShow: string[];
  cta: string;
  ctaUrl: string;
}

const ADD_ONS: AddOnDefinition[] = [
  {
    id: 'insurer-index',
    icon: TrendingUp,
    color: '#FFD700',
    title: 'Insurer Index / Heuristics Licensing',
    subtitle: 'Highest-ceiling signal authority licensing',
    demoLabel: 'Orbital Volatility Index\u2122 (DEMO)',
    sampleAlert: 'Aggregate volatility exceeds baseline risk class (DEMO)',
    mustNotShow: ['Methodology', 'Weighting', 'Population sizes', 'Export', 'Pricing'],
    cta: 'Contact Orbital \u00B7 Licensing by Engagement',
    ctaUrl: CONTACT_URLS.licensing,
  },
  {
    id: 'healthcare-sentinel',
    icon: Stethoscope,
    color: '#F44336',
    title: 'Healthcare Nursing Sentinel\u2122 + Clinical Briefs+\u2122',
    subtitle: 'Fastest close, operational + legal relevance',
    demoLabel: 'Sentinel\u2122 Alert (DEMO)',
    sampleAlert: 'Operational strain exceeds historical baseline (DEMO)',
    mustNotShow: ['Live alerts', 'Threshold tuning', 'Unit-level data', 'Generate buttons'],
    cta: 'Request Institutional Access',
    ctaUrl: CONTACT_URLS.healthcare,
  },
  {
    id: 'frms-safety',
    icon: Plane,
    color: '#FF9800',
    title: 'FRMS Safety-Critical Layer',
    subtitle: 'Aviation, transport, utilities, industrial safety',
    demoLabel: 'FRMS Overlay \u2014 DEMO',
    sampleAlert: 'Aggregate fatigue risk elevated across operational cohort (DEMO)',
    mustNotShow: ['Individual risk', 'Surveillance framing', 'Incident replay', 'Compliance checklists'],
    cta: 'Talk to Orbital Safety Team',
    ctaUrl: CONTACT_URLS.frms,
  },
  {
    id: 'higher-ed',
    icon: GraduationCap,
    color: '#9C27B0',
    title: 'Higher-Ed Benchmarks + Exam-Week Sentinel\u2122',
    subtitle: 'Repeatable university deployments',
    demoLabel: 'Exam-Week Volatility Curve (DEMO)',
    sampleAlert: 'System-level strain increases during high-demand academic periods (DEMO)',
    mustNotShow: ['Student identifiers', 'Course-level data', 'Predictive claims'],
    cta: 'Contact Orbital for Institutional Access',
    ctaUrl: CONTACT_URLS.higherEd,
  },
  {
    id: 'k12-district',
    icon: School,
    color: '#2196F3',
    title: 'K-12 District Sentinel\u2122 + Governance Briefs',
    subtitle: 'District-level duty-of-care + governance protection',
    demoLabel: 'District Dashboard (DEMO)',
    sampleAlert: 'Grade-band cohort signals available at aggregate level only (DEMO)',
    mustNotShow: ['Student-level data', 'Teacher-level data', 'Intervention controls'],
    cta: 'Request District Briefing',
    ctaUrl: CONTACT_URLS.k12,
  },
  {
    id: 'compliance-pack',
    icon: ShieldCheck,
    color: '#00BCD4',
    title: 'Compliance / Vendor Risk Pack',
    subtitle: 'Deal-unblocker, margin accelerator',
    demoLabel: 'Governance Sample (DEMO)',
    sampleAlert: 'Sample audit language and surveillance-prevention summary available (DEMO)',
    mustNotShow: ['Actual contracts', 'Editable documents', 'Pricing'],
    cta: 'Contact Orbital \u00B7 Governance Review',
    ctaUrl: CONTACT_URLS.compliance,
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function B2BAddOnsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* DEMO Banner — Required */}
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerText}>DEMO / SAMPLE DATA ONLY</Text>
        <Text style={styles.demoBannerSubtext}>
          Contact Orbital for institutional access
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>B2B Add-Ons</Text>
          <Text style={styles.headerSubtitle}>Institutional Signal Authority</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Governance Notice */}
      <View style={styles.governanceNotice}>
        <AlertTriangle size={16} color="#E8A830" />
        <Text style={styles.governanceText}>
          All features below are demo-only previews. Real institutional access
          requires direct engagement with Orbital.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ADD_ONS.map((addon) => (
          <AddOnCard key={addon.id} addon={addon} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Institutions do not buy dashboards.
          </Text>
          <Text style={styles.footerTextEmphasis}>
            They buy permission to act, defensible language, and governance confidence.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// ADD-ON CARD COMPONENT
// =============================================================================

function AddOnCard({ addon }: { addon: AddOnDefinition }) {
  const Icon = addon.icon;

  const handleContact = () => {
    Linking.openURL(addon.ctaUrl);
  };

  return (
    <View style={[styles.card, { borderColor: `${addon.color}40` }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${addon.color}20` }]}>
          <Icon size={24} color={addon.color} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{addon.title}</Text>
          <Text style={styles.cardSubtitle}>{addon.subtitle}</Text>
        </View>
      </View>

      {/* Demo Label */}
      <View style={[styles.demoLabelContainer, { backgroundColor: `${addon.color}15` }]}>
        <Text style={[styles.demoLabel, { color: addon.color }]}>{addon.demoLabel}</Text>
      </View>

      {/* Sample Alert */}
      {addon.sampleAlert && (
        <View style={styles.sampleAlertContainer}>
          <Text style={styles.sampleAlertLabel}>Sample Alert:</Text>
          <Text style={styles.sampleAlertText}>"{addon.sampleAlert}"</Text>
        </View>
      )}

      {/* Must NOT Show */}
      <View style={styles.mustNotShowContainer}>
        <Text style={styles.mustNotShowLabel}>Not Available in Demo:</Text>
        <Text style={styles.mustNotShowText}>
          {addon.mustNotShow.join(' \u00B7 ')}
        </Text>
      </View>

      {/* CTA Button */}
      <Pressable
        style={[styles.ctaButton, { backgroundColor: addon.color }]}
        onPress={handleContact}
      >
        <Text style={styles.ctaButtonText}>{addon.cta}</Text>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  demoLabelContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  demoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sampleAlertContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sampleAlertLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  sampleAlertText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  mustNotShowContainer: {
    marginBottom: spacing.md,
  },
  mustNotShowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  mustNotShowText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
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
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  footerTextEmphasis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
