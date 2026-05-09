/**
 * Orbital Platform — In-app landing
 *
 * Cinematic three-layer overview:
 *   1. Trustworthy core
 *   2. Capability engine
 *   3. Segment packs
 *
 * The orb sits visually at the center as a static surrogate (we do NOT
 * mount the live orb here — that's home-screen-only per project rules).
 * Below the layers, a "Pick your tier" CTA routes to the sub-brand picker.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useSubBrand } from '../../lib/platform/SubBrandProvider';

const BACKGROUND = '#01020A';
const TEAL = '#2DD4BF';
const GLASS_BG = 'rgba(255,255,255,0.07)';
const GLASS_BORDER = 'rgba(255,255,255,0.15)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';

// =============================================================================
// LAYER CARD
// =============================================================================

interface LayerCardProps {
  index: 1 | 2 | 3;
  title: string;
  body: string;
  accent: string;
}

function LayerCard({
  index,
  title,
  body,
  accent,
}: LayerCardProps): React.ReactElement {
  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Layer ${index}: ${title}. ${body}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.layerBadge, { borderColor: accent }]}>
          <Text style={[styles.layerBadgeText, { color: accent }]}>
            LAYER {index}
          </Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

// =============================================================================
// SCREEN
// =============================================================================

export default function PlatformLandingScreen(): React.ReactElement {
  const router = useRouter();
  const { config } = useSubBrand();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>HUMAN-CAPACITY INTELLIGENCE</Text>
          <Text style={styles.heroTitle}>The Orbital Platform</Text>
          <Text style={styles.heroSubtitle}>
            Three layers. One orb. {config.tagline}
          </Text>

          {/* Orb proxy — cinematic, non-interactive */}
          <View
            style={styles.orbWrap}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <View style={[styles.orbHalo, { borderColor: config.themeAccent }]} />
            <View
              style={[
                styles.orbCore,
                {
                  backgroundColor: config.themeAccent,
                  shadowColor: config.themeAccent,
                },
              ]}
            />
          </View>
        </View>

        {/* LAYERS */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ARCHITECTURE</Text>
          <View style={styles.cardStack}>
            <LayerCard
              index={1}
              title="Trustworthy Core"
              body="Auth, audit, posture, tenancy. Every action is observable, every grant revocable. Memory is off by default."
              accent={TEAL}
            />
            <LayerCard
              index={2}
              title="Capability Engine"
              body="Capacity logging, baselines, signals, pattern detection. The math that makes a felt sense legible."
              accent="#06B6D4"
            />
            <LayerCard
              index={3}
              title="Segment Packs"
              body="Personal, Workspace, Enterprise, Health, Edu, Gov. Same engine, six postures."
              accent="#F59E0B"
            />
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXPLORE</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pick your tier"
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push('/(platform)/sub-brand')}
          >
            <Text style={styles.primaryButtonText}>Pick your tier</Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open memory dashboard"
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => router.push('/(platform)/memory')}
            >
              <Text style={styles.secondaryButtonText}>Memory</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open permissions ledger"
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => router.push('/(platform)/permissions')}
            >
              <Text style={styles.secondaryButtonText}>Permissions</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open audit log"
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => router.push('/(platform)/audit')}
            >
              <Text style={styles.secondaryButtonText}>Audit</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND },
  scroll: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 64,
  },

  hero: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  eyebrow: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76, // 0.16em on 11px
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 32,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },

  orbWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  orbHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    opacity: 0.4,
  },
  orbCore: {
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.85,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },

  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    letterSpacing: 1.76,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardStack: {
    gap: 16,
  },
  card: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  layerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  layerBadgeText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
  },
  cardTitle: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 18,
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  cardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_SECONDARY,
  },

  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 16,
    color: '#01020A',
  },

  linkRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
});
