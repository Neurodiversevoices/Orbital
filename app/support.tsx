/**
 * Support Page — Static, Public, Unauthenticated
 *
 * App Store compliance page. No auth gates, no app layout.
 * Accessible at /support
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const FAQ = [
  {
    q: 'What is Orbital?',
    a: 'Orbital is a daily check-in tool. You record how much capacity you have to give today. Over time, patterns become visible across days and weeks.',
  },
  {
    q: 'How do I use it?',
    a: 'Open the app. Tap where your capacity feels. Save. That\'s it. Do it once a day for best results.',
  },
  {
    q: 'Is this a medical app?',
    a: 'No. Orbital is not a medical device. It does not diagnose, treat, or provide advice for any condition. It is a personal tracking tool only.',
  },
  {
    q: 'Does Orbital give advice or recommendations?',
    a: 'No. Orbital shows you your own patterns. It does not interpret them, score them, or suggest actions.',
  },
  {
    q: 'Where is my data stored?',
    a: 'By default, all data stays on your device. If you create an account and enable cloud sync, data is stored securely using authenticated infrastructure with row-level security. No data is sold or shared with third parties.',
  },
  {
    q: 'Can I delete my data?',
    a: 'Yes. Go to Settings → Your Data → Delete All Data. If you have cloud sync enabled, this removes data from both your device and the server. You can also export your data at any time.',
  },
  {
    q: 'What about Sign In with Apple?',
    a: 'Orbital supports Sign In with Apple for account creation and authentication. Your Apple ID email can be hidden using Apple\'s relay service.',
  },
  {
    q: 'What platforms are supported?',
    a: 'Orbital is available for iPhone (iOS 15.1+) and on the web.',
  },
];

export default function SupportPage() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:support@orbitalapp.co');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Orbital — Support</Text>
        <Text style={styles.subtitle}>Frequently Asked Questions</Text>

        {FAQ.map((item, idx) => (
          <View key={idx} style={styles.faqItem}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact</Text>
          <Pressable onPress={handleEmail}>
            <Text style={styles.emailLink}>support@orbitalapp.co</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
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
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  faqItem: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  answer: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.7)',
  },
  contactSection: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emailLink: {
    fontSize: 15,
    color: '#00E5FF',
  },
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
