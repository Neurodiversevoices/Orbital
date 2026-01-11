/**
 * SECURITY CONTROLS
 *
 * Procurement-safe explanation of Circles security implementation.
 * Readable by non-technical stakeholders without exposing internal codes.
 *
 * This is a static documentation page with no network calls.
 */

import React from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { ProprietaryFooter } from '../components/legal';

// Use app version for "Last updated" footer
const APP_VERSION = '1.0.0';
const LAST_UPDATED = 'January 2026';

export default function SecurityControlsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Security Controls</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Circles Header */}
        <Text style={styles.featureTitle}>Circles</Text>

        {/* Overview Section */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <Text style={styles.overviewText}>
            Circles is a peer-to-peer capacity signaling feature designed to
            reduce harm without creating institutional surveillance, monitoring
            obligations, or retained individual records.
          </Text>
          <Text style={styles.overviewEmphasis}>
            Circles is architected to prevent the creation of institutional
            knowledge of individual distress.
          </Text>
        </View>

        {/* Section 1: Standardized Security Events */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>1. Standardized Security Events</Text>
          <Text style={styles.sectionDesc}>
            Circles uses a standardized, machine-readable security event
            framework to ensure consistent handling of security-relevant actions.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>All security outcomes are handled deterministically</Text>
            <Text style={styles.bullet}>Events are suitable for internal auditing and monitoring</Text>
            <Text style={styles.bullet}>No free-form or ambiguous security states</Text>
          </View>
          <Text style={styles.sectionNote}>
            These controls operate behind the scenes and are not visible to users.
          </Text>
        </View>

        {/* Section 2: One-Time Invite Enforcement */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>2. One-Time Invite Enforcement</Text>
          <Text style={styles.sectionDesc}>
            Invites are designed to be used once and cannot be replayed.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>Invites are immediately locked after successful use</Text>
            <Text style={styles.bullet}>Reuse, replay, or race-condition abuse is structurally prevented</Text>
            <Text style={styles.bullet}>Even valid credentials cannot be reused after redemption</Text>
          </View>
          <Text style={styles.sectionNote}>
            This prevents unauthorized access even if an invite is shared or intercepted.
          </Text>
        </View>

        {/* Section 3: Ephemeral Data Containment */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>3. Ephemeral Data Containment</Text>
          <Text style={styles.sectionDesc}>
            Sensitive or contextual data is never exposed through navigation or URLs.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>URLs contain no sensitive information</Text>
            <Text style={styles.bullet}>No contextual labels or metadata appear in browser history</Text>
            <Text style={styles.bullet}>All descriptive data is retrieved securely at runtime</Text>
          </View>
          <Text style={styles.sectionNote}>
            This prevents accidental disclosure through screenshots, logs, or link sharing.
          </Text>
        </View>

        {/* Section 4: Security-Aware User Interface */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>4. Security-Aware User Interface</Text>
          <Text style={styles.sectionDesc}>
            The app provides clear feedback without exposing internal system logic.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>Messages explain what happened, not how validation works</Text>
            <Text style={styles.bullet}>No internal rules, checks, or security logic are revealed</Text>
            <Text style={styles.bullet}>Feedback is consistent, neutral, and user-safe</Text>
          </View>
          <Text style={styles.sectionNote}>
            This balances transparency with security.
          </Text>
        </View>

        {/* Section 5: Build Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionNumber}>5. Build Verification</Text>
          <Text style={styles.sectionDesc}>
            Circles security logic is enforced at build time.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>All security states and transitions are type-checked</Text>
            <Text style={styles.bullet}>No runtime-only security assumptions</Text>
            <Text style={styles.bullet}>Verified during compilation</Text>
          </View>
          <Text style={styles.sectionNote}>
            This reduces the risk of silent regressions.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version: v{APP_VERSION}</Text>
          <Text style={styles.footerText}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <ProprietaryFooter compact />
      </ScrollView>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00E5FF',
    marginBottom: spacing.lg,
  },
  overviewSection: {
    marginBottom: spacing.xl,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
  },
  overviewText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  overviewEmphasis: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  bullets: {
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  bullet: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  sectionNote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
