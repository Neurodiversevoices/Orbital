/**
 * Capacity Intelligence Interstitial
 *
 * Shown when a Core user attempts to access Pro-only interpretation features:
 * - Tap a data point to ask "why"
 * - Open correlations
 * - Access composition breakdown
 * - Attempt to view interpretation text
 *
 * UI: Full-screen modal. Neutral styling. No urgency cues.
 * No pricing on this screen. No marketing language.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

interface CapacityIntelligenceInterstitialProps {
  visible: boolean;
  onContinueWithout: () => void;
  onEnableIntelligence: () => void;
}

export function CapacityIntelligenceInterstitial({
  visible,
  onContinueWithout,
  onEnableIntelligence,
}: CapacityIntelligenceInterstitialProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Interpretation Requires Context</Text>

          <View style={styles.body}>
            <Text style={styles.paragraph}>
              You are currently viewing the raw magnitude of your capacity over
              the selected period. This visualizes what happened, but not the
              structural drivers behind it.
            </Text>

            <Text style={styles.paragraph}>
              A drop in capacity can be caused by sleep debt, cognitive overload,
              or normal energy variance. In isolation, the signal is ambiguous.
            </Text>

            <Text style={styles.paragraph}>
              The Capacity Intelligence Engine triangulates these separate inputs
              to distinguish between noise and emerging risk, identifying whether
              this trend is a temporary fluctuation or the start of a structural
              decline.
            </Text>

            <Text style={styles.emphasisText}>
              Correlation requires multi-variate analysis.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onContinueWithout}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                Continue without analysis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onEnableIntelligence}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                Enable Capacity Intelligence
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  body: {
    marginBottom: 48,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#a0a0a0',
    textAlign: 'left',
    marginBottom: 20,
  },
  emphasisText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6a8a9a',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888',
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#1a2a3a',
    borderWidth: 1,
    borderColor: '#2a4a5a',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8ab0c0',
    textAlign: 'center',
  },
});

export default CapacityIntelligenceInterstitial;
