/**
 * Privacy Policy Page — Static, Public, Unauthenticated
 *
 * App Store compliance page. No auth gates, no app layout.
 * Accessible at /privacy
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. Overview',
    content: `Orbital ("the App") is a personal capacity tracking tool developed by Eric Parris ("we", "us"). This policy explains what data is collected, how it is stored, and your rights regarding that data.

Orbital is not a medical device. It does not provide diagnoses, treatment recommendations, or health advice.`,
  },
  {
    title: '2. What Data We Collect',
    content: `2.1 Data you provide directly:
• Account information: email address, username, display name (when you create an account)
• Capacity check-ins: your self-reported capacity state (resourced, stretched, or depleted), optional category tags, and optional free-text notes
• Profile information: avatar selection

2.2 Data collected automatically:
• Device identifier: a locally-generated unique ID for session management
• Crash and performance data: collected via Sentry for stability monitoring (not linked to your identity)

2.3 Data collected with your explicit consent only:
• Purchase history: when you make in-app purchases
• Cloud-synced capacity data: only when you enable cloud sync`,
  },
  {
    title: '3. How Data Is Stored',
    content: `3.1 Local storage (default):
All capacity check-ins, preferences, and notes are stored on your device using local storage. No server communication occurs unless you explicitly enable cloud sync.

3.2 Cloud storage (optional):
If you create an account and enable cloud sync, your data is stored on Supabase-hosted infrastructure with:
• Row-level security (you can only access your own data)
• Authenticated access via Sign In with Apple or email
• Encrypted connections (HTTPS/TLS)`,
  },
  {
    title: '4. How Data Is Used',
    content: `Your data is used exclusively to:
• Display your capacity check-ins and patterns within the app
• Sync data across your devices (if cloud sync is enabled)
• Process in-app purchases and manage entitlements
• Monitor app stability via anonymous crash reports

We do NOT:
• Sell your data
• Share your data with third parties for advertising
• Use your data for profiling or targeted content
• Provide your data to insurers, employers, or healthcare providers`,
  },
  {
    title: '5. Data Retention',
    content: `• Local data: retained on your device until you delete it
• Cloud data: retained until you delete your account or request deletion
• Crash logs: retained for 90 days, then automatically purged
• De-identified pattern data: may be retained permanently for product improvement after personal identifiers are removed (see Section 7)`,
  },
  {
    title: '6. Your Rights',
    content: `You have the right to:
• Access: view all your stored data within the app (Settings → Your Data)
• Export: download a copy of your data at any time
• Delete: remove all your data from both device and cloud storage
• Withdraw consent: disable cloud sync at any time; data remains on your device only

To exercise any of these rights, use the in-app controls or contact us at privacy@orbitalapp.co.`,
  },
  {
    title: '7. De-identification',
    content: `If you delete your account, personal identifiers are removed from any retained pattern data. Retained data includes only aggregate patterns (capacity states, timestamps, category distributions) with no names, emails, notes, or device identifiers attached.`,
  },
  {
    title: '8. Children',
    content: `Orbital includes an age gate. Users must confirm they are 13 years of age or older before accessing the app. We do not knowingly collect data from children under 13.`,
  },
  {
    title: '9. Third-Party Services',
    content: `• Supabase: cloud database and authentication
• Sentry: crash and error monitoring
• Apple: Sign In with Apple authentication`,
  },
  {
    title: '10. Changes to This Policy',
    content: `We may update this policy from time to time. The "last updated" date at the top will reflect the most recent revision. Continued use of the app after changes constitutes acceptance.`,
  },
  {
    title: '11. Contact',
    content: `For privacy questions or data requests:
Email: privacy@orbitalapp.co

Eric Parris
Orbital`,
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:privacy@orbitalapp.co');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Orbital — Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: February 2026</Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Pressable onPress={handleEmail}>
            <Text style={styles.emailLink}>privacy@orbitalapp.co</Text>
          </Pressable>
          <Text style={styles.footerText}>© 2026 Eric Parris. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  updated: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  emailLink: {
    fontSize: 15,
    color: '#00E5FF',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
});
