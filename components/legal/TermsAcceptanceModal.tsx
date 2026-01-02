import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { CURRENT_TERMS_VERSION } from '../../types';

interface TermsAcceptanceModalProps {
  visible: boolean;
  onAccept: () => void;
  onViewFullTerms?: () => void;
}

export function TermsAcceptanceModal({
  visible,
  onAccept,
  onViewFullTerms,
}: TermsAcceptanceModalProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtEnd) {
      setHasScrolledToEnd(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.version}>Version {CURRENT_TERMS_VERSION}</Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            onScroll={handleScroll}
            scrollEventThrottle={100}
          >
            <Text style={styles.sectionTitle}>Proprietary Rights</Text>
            <Text style={styles.bodyText}>
              By using Orbital, you agree to our Terms of Service, including the following key provisions:
            </Text>

            <View style={styles.bulletContainer}>
              <Text style={styles.bulletPoint}>
                {'\u2022'} The app, workflows, pattern systems, derived patterns, schemas, and outputs are proprietary and confidential business property of Orbital Health Intelligence, Inc.
              </Text>
              <Text style={styles.bulletPoint}>
                {'\u2022'} You receive a limited, revocable, non-transferable license for personal use only.
              </Text>
              <Text style={styles.bulletPoint}>
                {'\u2022'} Copying, scraping, reverse engineering, model training, resale, and competitive use are strictly prohibited.
              </Text>
              <Text style={styles.bulletPoint}>
                {'\u2022'} Use of outputs, patterns, or system behavior to build or improve competing products is prohibited.
              </Text>
              <Text style={styles.bulletPoint}>
                {'\u2022'} Breach constitutes misappropriation of trade secrets and confidential information.
              </Text>
              <Text style={styles.bulletPoint}>
                {'\u2022'} These obligations survive account deletion and termination.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Data Practices</Text>
            <Text style={styles.bodyText}>
              We retain de-identified pattern history permanently for product improvement and safety purposes. Deletion removes your access and identity linkage but does not erase retained patterns.
            </Text>

            <Text style={styles.continuedUseNotice}>
              Your continued use of Orbital constitutes acceptance of these terms.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            {onViewFullTerms && (
              <TouchableOpacity
                style={styles.viewTermsButton}
                onPress={onViewFullTerms}
              >
                <Text style={styles.viewTermsText}>View Full Terms</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.acceptButton,
                !hasScrolledToEnd && styles.acceptButtonDisabled,
              ]}
              onPress={onAccept}
              disabled={!hasScrolledToEnd}
            >
              <Text
                style={[
                  styles.acceptButtonText,
                  !hasScrolledToEnd && styles.acceptButtonTextDisabled,
                ]}
              >
                {hasScrolledToEnd ? 'I Accept' : 'Scroll to Accept'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  scrollContentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletContainer: {
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 8,
  },
  continuedUseNotice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  viewTermsButton: {
    alignItems: 'center',
    padding: 12,
  },
  viewTermsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
  acceptButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(74, 158, 255, 0.3)',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  acceptButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default TermsAcceptanceModal;
