/**
 * Poison Pill Consent Gate
 *
 * CRITICAL ANTI-COERCION ENFORCEMENT
 *
 * This component BLOCKS visibility access until the individual has:
 * 1. Read the adversarial warning (3-second minimum)
 * 2. Explicitly acknowledged they are NOT under workplace/academic pressure
 * 3. Confirmed they understand reporting coercion is available
 *
 * Requirements from Final Deployment Checklist:
 * - Adversarial warning that workplace or academic monitoring is a TOS violation
 * - Explicit language stating inviter may be violating labor rules
 * - 3-second read delay before consent button enables
 * - Log time-on-page
 * - Visibility blocked until individual consent is granted
 * - Include discrete 'Report potential coercion' duress link
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { logImmutableAuditEntry } from '../../lib/governance/immutableAuditLog';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// TYPES
// =============================================================================

export interface PoisonPillConsentResult {
  consented: boolean;
  consentedAt: string;
  timeOnPageMs: number;
  duressLinkClicked: boolean;
  inviteId: string;
  userId: string;
  auditRef: string;
}

interface PoisonPillConsentGateProps {
  visible: boolean;
  inviteId: string;
  inviterName?: string; // Do NOT expose full name if this is from a restricted domain
  userId: string;
  onConsent: (result: PoisonPillConsentResult) => void;
  onReject: () => void;
  onReportCoercion: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const READ_DELAY_MS = 3000; // 3-second minimum read time
const CONSENT_STORAGE_KEY = '@orbital:poison_pill_consents';
const DURESS_EMAIL = 'contact@orbital.health';
const DURESS_URL = 'https://orbital.health/report-coercion';

// =============================================================================
// COMPONENT
// =============================================================================

export function PoisonPillConsentGate({
  visible,
  inviteId,
  inviterName,
  userId,
  onConsent,
  onReject,
  onReportCoercion,
}: PoisonPillConsentGateProps) {
  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(3);
  const [canConsent, setCanConsent] = useState(false);
  const [duressClicked, setDuressClicked] = useState(false);

  // Time tracking
  const pageOpenedAt = useRef<number>(Date.now());
  const totalTimeOnPage = useRef<number>(0);

  // Timer effect - 3 second countdown
  useEffect(() => {
    if (!visible) {
      // Reset when modal closes
      setSecondsRemaining(3);
      setCanConsent(false);
      return;
    }

    // Record page open time
    pageOpenedAt.current = Date.now();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setCanConsent(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Track time on page when visibility changes
  useEffect(() => {
    if (!visible && pageOpenedAt.current) {
      totalTimeOnPage.current = Date.now() - pageOpenedAt.current;
    }
  }, [visible]);

  // Handle duress link click
  const handleDuressClick = useCallback(async () => {
    setDuressClicked(true);

    // Log the duress action immediately
    await logImmutableAuditEntry('coercion_report_initiated', {
      actorType: 'user',
      actorRef: userId,
      action: 'User clicked duress link (potential coercion report)',
      targetRef: inviteId,
      metadata: {
        timeOnPageMs: Date.now() - pageOpenedAt.current,
        platform: Platform.OS,
      },
    });

    // Show options
    Alert.alert(
      'Report Potential Coercion',
      'If you feel pressured to join this group by your employer, school, or anyone in a position of authority, we want to help.\n\nThis is a violation of Orbital\'s Terms of Service and may violate labor laws.',
      [
        {
          text: 'Email Safety Team',
          onPress: () => Linking.openURL(`mailto:${DURESS_EMAIL}?subject=Potential%20Coercion%20Report&body=Invite%20ID:%20${inviteId}`),
        },
        {
          text: 'Open Report Form',
          onPress: () => Linking.openURL(DURESS_URL),
        },
        {
          text: 'Decline Invite',
          style: 'destructive',
          onPress: () => {
            onReportCoercion();
            onReject();
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [userId, inviteId, onReportCoercion, onReject]);

  // Handle consent
  const handleConsent = useCallback(async () => {
    if (!canConsent) return;

    const timeOnPageMs = Date.now() - pageOpenedAt.current;

    // Log consent with full audit trail
    const auditEntry = await logImmutableAuditEntry('poison_pill_consent_granted', {
      actorType: 'user',
      actorRef: userId,
      action: 'User explicitly consented after reading adversarial warning',
      targetRef: inviteId,
      metadata: {
        timeOnPageMs,
        duressLinkClicked: duressClicked,
        readDelayEnforced: true,
        platform: Platform.OS,
      },
    });

    // Store consent locally
    const consent: PoisonPillConsentResult = {
      consented: true,
      consentedAt: new Date().toISOString(),
      timeOnPageMs,
      duressLinkClicked: duressClicked,
      inviteId,
      userId,
      auditRef: auditEntry.id,
    };

    try {
      const existing = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
      const consents: PoisonPillConsentResult[] = existing ? JSON.parse(existing) : [];
      consents.push(consent);
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consents));
    } catch {
      // Non-fatal - consent still valid, just not cached locally
    }

    onConsent(consent);
  }, [canConsent, userId, inviteId, duressClicked, onConsent]);

  // Handle reject
  const handleReject = useCallback(async () => {
    const timeOnPageMs = Date.now() - pageOpenedAt.current;

    await logImmutableAuditEntry('poison_pill_consent_rejected', {
      actorType: 'user',
      actorRef: userId,
      action: 'User declined invitation after reading adversarial warning',
      targetRef: inviteId,
      metadata: {
        timeOnPageMs,
        duressLinkClicked: duressClicked,
        platform: Platform.OS,
      },
    });

    onReject();
  }, [userId, inviteId, duressClicked, onReject]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent
      onRequestClose={handleReject}
    >
      <View style={styles.overlay} testID="consent-gate" data-testid="consent-gate">
        <View style={styles.modalContainer} testID="poison-pill-gate" data-testid="poison-pill-gate">
          {/* Header with warning */}
          <View style={styles.warningHeader}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Important Notice</Text>
            <Text style={styles.warningSubtitle}>Please read carefully before proceeding</Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Primary Warning */}
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxTitle}>Workplace & Academic Monitoring is Prohibited</Text>
              <Text style={styles.warningBoxText}>
                Orbital is designed for{' '}
                <Text style={styles.emphasis}>voluntary capacity sharing among trusted individuals</Text>.
                Using Orbital to monitor employees, students, or anyone who may feel obligated to participate
                is a <Text style={styles.emphasis}>Terms of Service violation</Text>.
              </Text>
            </View>

            {/* Inviter Warning */}
            <View style={styles.cautionBox}>
              <Text style={styles.cautionTitle}>About This Invitation</Text>
              <Text style={styles.cautionText}>
                You have been invited to join a Circle{inviterName ? ` by ${inviterName}` : ''}.
              </Text>
              <Text style={styles.cautionText}>
                If this invitation was sent by an employer, supervisor, teacher, or anyone in a position of
                authority over you, <Text style={styles.emphasis}>they may be violating labor laws</Text> and
                Orbital's Terms of Service.
              </Text>
            </View>

            {/* Your Rights */}
            <View style={styles.rightsSection}>
              <Text style={styles.sectionTitle}>Your Rights</Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletPoint}>
                  • You have the right to <Text style={styles.emphasis}>decline</Text> this invitation without explanation
                </Text>
                <Text style={styles.bulletPoint}>
                  • You can <Text style={styles.emphasis}>leave at any time</Text> without consequence
                </Text>
                <Text style={styles.bulletPoint}>
                  • Your participation must be <Text style={styles.emphasis}>entirely voluntary</Text>
                </Text>
                <Text style={styles.bulletPoint}>
                  • Employment, grades, or standing cannot be contingent on joining
                </Text>
              </View>
            </View>

            {/* Consent Affirmation */}
            <View style={styles.affirmationBox}>
              <Text style={styles.affirmationTitle}>By Accepting, You Affirm:</Text>
              <Text style={styles.affirmationText}>
                "I am joining this Circle voluntarily. No one in a position of authority over me has
                required, pressured, or incentivized my participation. I understand I can leave at any time."
              </Text>
            </View>
          </ScrollView>

          {/* Footer with actions */}
          <View style={styles.footer}>
            {/* Duress Link - Discrete but accessible */}
            <TouchableOpacity
              style={styles.duressLink}
              onPress={handleDuressClick}
              testID="duress-link"
              data-testid="duress-link"
            >
              <Text style={styles.duressLinkText}>
                🛡️ Report potential coercion
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleReject}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  !canConsent && styles.acceptButtonDisabled,
                ]}
                onPress={handleConsent}
                disabled={!canConsent}
                testID="consent-accept"
                data-testid="consent-accept"
              >
                <Text
                  style={[
                    styles.acceptButtonText,
                    !canConsent && styles.acceptButtonTextDisabled,
                  ]}
                >
                  {canConsent
                    ? 'I Accept Voluntarily'
                    : `Please read (${secondsRemaining}s)`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user has previously granted poison pill consent for an invite
 */
export async function hasPoisonPillConsent(inviteId: string): Promise<boolean> {
  try {
    const existing = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    if (!existing) return false;
    const consents: PoisonPillConsentResult[] = JSON.parse(existing);
    return consents.some((c) => c.inviteId === inviteId && c.consented);
  } catch {
    return false;
  }
}

/**
 * Get all poison pill consent records (for audit purposes)
 */
export async function getPoisonPillConsents(): Promise<PoisonPillConsentResult[]> {
  try {
    const existing = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  warningHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  warningSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  scrollContentContainer: {
    padding: 20,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  warningBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  warningBoxText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
  },
  emphasis: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cautionBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  cautionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFC107',
    marginBottom: 8,
  },
  cautionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 8,
  },
  rightsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00FFFF',
    marginBottom: 12,
  },
  bulletContainer: {
    gap: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    paddingLeft: 4,
  },
  affirmationBox: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  affirmationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00FFFF',
    marginBottom: 8,
  },
  affirmationText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  duressLink: {
    alignItems: 'center',
    padding: 8,
  },
  duressLinkText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'underline',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#00FFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  acceptButtonTextDisabled: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
});

export default PoisonPillConsentGate;
