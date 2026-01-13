/**
 * "What Happens to My Data" Screen
 *
 * Plain-language explanation of data handling.
 * Accessible from Onboarding + Settings.
 * No legal jargon. Trust-first.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { ProprietaryFooter } from '../components/legal';

interface DataPointProps {
  icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  description: string;
  type: 'kept' | 'deidentified' | 'never' | 'protected';
  delay?: number;
}

function DataPoint({ icon: Icon, title, description, type, delay = 0 }: DataPointProps) {
  const typeConfig = {
    kept: { color: '#00E5FF', badge: 'Kept', icon: CheckCircle },
    deidentified: { color: '#FF9800', badge: 'De-identified', icon: Eye },
    never: { color: '#4CAF50', badge: 'Never stored', icon: EyeOff },
    protected: { color: '#9C27B0', badge: 'Protected', icon: Lock },
  };

  const config = typeConfig[type];
  const BadgeIcon = config.icon;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.dataPoint}>
      <View style={[styles.dataPointIcon, { backgroundColor: `${config.color}15` }]}>
        <Icon color={config.color} size={20} />
      </View>
      <View style={styles.dataPointContent}>
        <View style={styles.dataPointHeader}>
          <Text style={styles.dataPointTitle}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
            <BadgeIcon color={config.color} size={10} />
            <Text style={[styles.badgeText, { color: config.color }]}>{config.badge}</Text>
          </View>
        </View>
        <Text style={styles.dataPointDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
}

export default function YourDataScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Your Data</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <Shield size={40} color="#00E5FF" />
          </View>
          <Text style={styles.heroTitle}>Privacy by Design</Text>
          <Text style={styles.heroSubtitle}>
            Your capacity signals belong to you. Here's exactly what happens with your data—no legal jargon, just straight answers.
          </Text>
        </Animated.View>

        {/* What We Keep */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>What We Keep</Text>
          <Text style={styles.sectionSubtitle}>Pattern data helps you discover trends over time</Text>
        </Animated.View>

        <DataPoint
          icon={CheckCircle}
          title="Your Capacity Patterns"
          description="Capacity levels, timestamps, and drivers are stored locally on your device. This data builds your personal pattern history and never leaves your phone unless you choose to export or share it."
          type="kept"
          delay={150}
        />

        <DataPoint
          icon={CheckCircle}
          title="Pattern History (Forever)"
          description="Your pattern history is retained permanently so you can track long-term trends. Even if you delete individual entries, the anonymized pattern data remains for your future reference."
          type="kept"
          delay={200}
        />

        {/* What Gets De-identified */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>What Gets De-identified</Text>
          <Text style={styles.sectionSubtitle}>If you delete, we strip identity but keep patterns</Text>
        </Animated.View>

        <DataPoint
          icon={Eye}
          title="When You Delete"
          description="Deleting removes your data from view and strips all identity information. The anonymized pattern remains to help improve Orbital, but it can never be traced back to you."
          type="deidentified"
          delay={300}
        />

        {/* What We Never Store */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>What We Never Store</Text>
          <Text style={styles.sectionSubtitle}>Some data never touches our servers</Text>
        </Animated.View>

        <DataPoint
          icon={EyeOff}
          title="Raw Diary Text"
          description="The notes you write in the detail field are stored only on your device. We never send raw text to any analytics service, Sentry, or our servers. What you write stays private."
          type="never"
          delay={400}
        />

        <DataPoint
          icon={EyeOff}
          title="Personal Identifiers"
          description="We don't collect your name, email, location, or any personally identifiable information. Orbital works without requiring an account for a reason."
          type="never"
          delay={450}
        />

        {/* What Organizations Can't See */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>What Organizations Can't See</Text>
          <Text style={styles.sectionSubtitle}>Even in org modes, your privacy is protected</Text>
        </Animated.View>

        <DataPoint
          icon={Building2}
          title="Individual Entries"
          description="Organizations only see aggregate, anonymized patterns across groups. They cannot see your individual capacity signals, notes, or identify you personally."
          type="protected"
          delay={550}
        />

        <DataPoint
          icon={Lock}
          title="Your Notes & Details"
          description="Any text you add to your signals is never visible to organizations, managers, or anyone else—even if you're in an org mode. This is by design."
          type="protected"
          delay={600}
        />

        {/* Bottom Summary */}
        <Animated.View entering={FadeInDown.delay(650).duration(400)} style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>The Short Version</Text>
          <View style={styles.summaryItem}>
            <CheckCircle size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>Patterns are kept to help you discover trends</Text>
          </View>
          <View style={styles.summaryItem}>
            <CheckCircle size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>Delete = de-identified, not erased (for your history)</Text>
          </View>
          <View style={styles.summaryItem}>
            <CheckCircle size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>Raw notes never leave your device</Text>
          </View>
          <View style={styles.summaryItem}>
            <CheckCircle size={16} color="#4CAF50" />
            <Text style={styles.summaryText}>Organizations see only aggregates, never you</Text>
          </View>
        </Animated.View>

        {/* Trust Statement */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)} style={styles.trustStatement}>
          <Text style={styles.trustText}>
            Orbital exists to help you understand your capacity patterns over time. We designed every feature with your privacy as the foundation—not an afterthought.
          </Text>
        </Animated.View>

        <ProprietaryFooter compact />

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  dataPoint: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dataPointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dataPointContent: {
    flex: 1,
  },
  dataPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  dataPointTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  dataPointDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  summaryCard: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  trustStatement: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  trustText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
