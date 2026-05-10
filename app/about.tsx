/**
 * About Orbital - Product Charter
 *
 * Defines scope, exclusions, and governance posture.
 * Suitable for demos, sales, and institutional evaluation.
 */

import React from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  CircleDot,
  Target,
  ShieldCheck,
  AlertTriangle,
  Users,
  Building2,
  Scale,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { ProprietaryFooter } from '../components/legal';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoOrb}>
            <View style={styles.logoInner} />
          </View>
          <Text style={styles.headerTitle}>About Orbital</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mission Statement */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Longitudinal Capacity Intelligence</Text>
          <Text style={styles.heroSubtitle}>
            A calm, serious tool for tracking functional capacity over time.
            No diagnoses. No prescriptions. Just signal and pattern.
          </Text>
        </View>

        {/* What Orbital Is */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>What Orbital Is</Text>
          </View>
          <View style={styles.bulletList}>
            <BulletPoint text="A longitudinal self-reporting tool for functional capacity" />
            <BulletPoint text="A private record you own and control" />
            <BulletPoint text="A pattern recognition system for personal insight" />
            <BulletPoint text="A communication bridge for sharing with trusted parties" />
            <BulletPoint text="An institutional-ready platform for aggregate monitoring" />
          </View>
        </View>

        {/* What Orbital Is NOT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle color="#F59E0B" size={20} />
            <Text style={styles.sectionTitle}>What Orbital Is NOT</Text>
          </View>
          <View style={styles.bulletList}>
            <BulletPoint text="Not a regulated health instrument or evaluative tool" warning />
            <BulletPoint text="Not a substitute for professional medical advice" warning />
            <BulletPoint text="Not a wellness or productivity app" warning />
            <BulletPoint text="Not a streak-based gamification system" warning />
            <BulletPoint text="Not a surveillance tool for individuals" warning />
          </View>
        </View>

        {/* Design Principles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CircleDot color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Design Principles</Text>
          </View>
          <View style={styles.principleGrid}>
            <PrincipleCard
              title="Calm"
              description="No notifications, nudges, or noise. You log when you want."
            />
            <PrincipleCard
              title="Private"
              description="Your data stays yours. Local-first. Export anytime."
            />
            <PrincipleCard
              title="Non-Diagnostic"
              description="Observations only. No labels, no scores, no judgments."
            />
            <PrincipleCard
              title="Longitudinal"
              description="Value compounds over time. Patterns emerge from patience."
            />
          </View>
        </View>

        {/* Institutional Deployment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Institutional Deployment</Text>
          </View>
          <Text style={styles.sectionText}>
            Orbital supports deployment for employers, schools, clinics, and research
            institutions. In these contexts:
          </Text>
          <View style={styles.bulletList}>
            <BulletPoint text="Aggregate insights only - no individual surveillance" />
            <BulletPoint text="Compliance-ready exports with audit trails" />
            <BulletPoint text="Role-based access controls" />
            <BulletPoint text="Time-bounded sharing with automatic expiration" />
            <BulletPoint text="Policy acknowledgment and consent management" />
          </View>
        </View>

        {/* Governance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Governance Posture</Text>
          </View>
          <View style={styles.governanceGrid}>
            <GovernanceItem
              title="Data Ownership"
              value="User retains ownership. Export anytime."
            />
            <GovernanceItem
              title="Retention"
              value="User-controlled. Institutional: 1-7 years."
            />
            <GovernanceItem
              title="Deletion"
              value="Right to erasure. Deletion certificates."
            />
            <GovernanceItem
              title="Sharing"
              value="Explicit consent. Time-limited. Revocable."
            />
            <GovernanceItem
              title="Security"
              value="Encrypted at rest and in transit."
            />
            <GovernanceItem
              title="Audit"
              value="Immutable activity logs. Exportable."
            />
          </View>
        </View>

        {/* Target Users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Who Uses Orbital</Text>
          </View>
          <View style={styles.userGrid}>
            <UserTypeCard
              title="Individuals"
              description="Personal longitudinal tracking for self-awareness and pattern recognition."
            />
            <UserTypeCard
              title="Families"
              description="Shared visibility for caregivers and partners with consent."
            />
            <UserTypeCard
              title="Clinicians"
              description="Read-only shared views to supplement clinical conversations."
            />
            <UserTypeCard
              title="Institutions"
              description="Aggregate capacity monitoring for wellness programs."
            />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <ShieldCheck color={colors.textSecondary} size={24} />
          <Text style={styles.disclaimerText}>
            Orbital records self-reported functional capacity. It is not a regulated
            health instrument and does not provide professional evaluation, care recommendations, or
            clinical decision support.
          </Text>
        </View>

        {/* Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Orbital v1.0.0</Text>
          <Text style={styles.versionSubtext}>Longitudinal Capacity Intelligence</Text>
          <View style={styles.colorDots}>
            <View style={[styles.dot, { backgroundColor: '#2DD4BF' }]} />
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
          </View>
        </View>

        <ProprietaryFooter compact />
      </ScrollView>
    </SafeAreaView>
  );
}

function BulletPoint({ text, warning = false }: { text: string; warning?: boolean }) {
  return (
    <View style={styles.bulletItem}>
      <View style={[styles.bulletDot, warning && styles.bulletDotWarning]} />
      <Text style={[styles.bulletText, warning && styles.bulletTextWarning]}>{text}</Text>
    </View>
  );
}

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.principleCard}>
      <Text style={styles.principleTitle}>{title}</Text>
      <Text style={styles.principleDesc}>{description}</Text>
    </View>
  );
}

function GovernanceItem({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.governanceItem}>
      <Text style={styles.governanceTitle}>{title}</Text>
      <Text style={styles.governanceValue}>{value}</Text>
    </View>
  );
}

function UserTypeCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.userCard}>
      <Text style={styles.userTitle}>{title}</Text>
      <Text style={styles.userDesc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  bulletDotWarning: {
    backgroundColor: '#F59E0B',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bulletTextWarning: {
    color: '#B7791F',
  },
  principleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  principleCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  principleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0E8C7B',
    marginBottom: spacing.xs,
  },
  principleDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  governanceGrid: {
    gap: spacing.sm,
  },
  governanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  governanceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  governanceValue: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  userGrid: {
    gap: spacing.sm,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  versionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  colorDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
