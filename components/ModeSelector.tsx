/**
 * Explore Orbital Modes — Mode Selector with Governance
 *
 * GOVERNANCE:
 * - B2C users can SEE all modes and click around in DEMO
 * - Only Personal/Family/Circle are live
 * - All institutional modes are DEMO-ONLY with no export/config/pricing/activation
 * - Institutional mode CTAs route to "Contact Orbital"
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import {
  ChevronDown,
  User,
  Users,
  Briefcase,
  GraduationCap,
  HeartPulse,
  PlayCircle,
  Building2,
  Check,
  X,
  ExternalLink,
  Mail,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppMode, APP_MODE_CONFIGS, APP_MODES } from '../types';
import { useAppMode } from '../lib/hooks/useAppMode';

// =============================================================================
// GOVERNANCE: MODE ENTITLEMENTS
// =============================================================================

/**
 * Modes that are LIVE for B2C users
 */
const LIVE_MODES: AppMode[] = ['personal', 'caregiver'];

/**
 * Modes that are DEMO-ONLY (institutional)
 */
const DEMO_ONLY_MODES: AppMode[] = ['employer', 'school_district', 'university', 'healthcare', 'demo'];

/**
 * Check if a mode is live for B2C
 */
function isModeAvailable(mode: AppMode): boolean {
  return LIVE_MODES.includes(mode);
}

/**
 * Check if a mode is institutional (DEMO-ONLY)
 */
function isInstitutionalMode(mode: AppMode): boolean {
  return DEMO_ONLY_MODES.includes(mode);
}

/**
 * Contact URL for institutional access
 */
const INSTITUTIONAL_CONTACT_URL = 'mailto:contact@orbitalhealth.app?subject=Orbital%20Institutional%20Access%20Request';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Icon mapping
const MODE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  'user': User,
  'users': Users,
  'briefcase': Briefcase,
  'school': Building2,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  'play-circle': PlayCircle,
};

interface ModeSelectorProps {
  compact?: boolean;
}

export function ModeSelector({ compact = false }: ModeSelectorProps) {
  const { currentMode, modeConfig, setMode, orgCode } = useAppMode();
  const [isOpen, setIsOpen] = useState(false);
  const [showOrgInput, setShowOrgInput] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [orgCodeInput, setOrgCodeInput] = useState('');
  const [orgNameInput, setOrgNameInput] = useState('');

  const IconComponent = MODE_ICONS[modeConfig.icon] || User;

  const handleModeSelect = useCallback((mode: AppMode) => {
    const config = APP_MODE_CONFIGS[mode];

    if (config.requiresOrgCode) {
      // Show org code input modal
      setPendingMode(mode);
      setShowOrgInput(true);
      setIsOpen(false);
    } else {
      // Switch immediately
      setMode(mode);
      setIsOpen(false);
    }
  }, [setMode]);

  const handleOrgSubmit = useCallback(async () => {
    if (pendingMode && orgCodeInput.trim()) {
      await setMode(pendingMode, {
        orgCode: orgCodeInput.trim().toUpperCase(),
        orgName: orgNameInput.trim() || `Org ${orgCodeInput.trim().toUpperCase()}`,
      });
      setShowOrgInput(false);
      setPendingMode(null);
      setOrgCodeInput('');
      setOrgNameInput('');
    }
  }, [pendingMode, orgCodeInput, orgNameInput, setMode]);

  const handleOrgCancel = useCallback(() => {
    setShowOrgInput(false);
    setPendingMode(null);
    setOrgCodeInput('');
    setOrgNameInput('');
  }, []);

  return (
    <>
      {/* Selector Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
      >
        <View style={styles.selectorContent}>
          <IconComponent size={compact ? 16 : 20} color={modeConfig.accentColor} />
          {!compact && (
            <Text style={[styles.selectorLabel, { color: modeConfig.accentColor }]}>
              {modeConfig.label}
            </Text>
          )}
          {orgCode && !compact && (
            <View style={[styles.orgBadge, { backgroundColor: `${modeConfig.accentColor}20` }]}>
              <Text style={[styles.orgBadgeText, { color: modeConfig.accentColor }]}>
                {orgCode}
              </Text>
            </View>
          )}
        </View>
        <ChevronDown size={compact ? 14 : 16} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* Mode Selection Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Animated.View
            entering={SlideInDown.springify().damping(20)}
            exiting={SlideOutDown.springify()}
            style={styles.modalContent}
          >
            <Pressable onPress={() => {}} style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Explore Orbital Modes</Text>
                <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                  <X size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              {/* Governance Notice */}
              <View style={styles.governanceNotice}>
                <Text style={styles.governanceText}>
                  Personal and Family modes are live. Institutional modes are demo-only previews.
                </Text>
              </View>

              <ScrollView style={styles.modeList} showsVerticalScrollIndicator={false}>
                {APP_MODES.map((mode) => {
                  const config = APP_MODE_CONFIGS[mode];
                  const ModeIcon = MODE_ICONS[config.icon] || User;
                  const isSelected = mode === currentMode;
                  const isDemo = isInstitutionalMode(mode);
                  const isLive = isModeAvailable(mode);

                  return (
                    <Pressable
                      key={mode}
                      onPress={() => handleModeSelect(mode)}
                      style={[
                        styles.modeItem,
                        isSelected && { backgroundColor: `${config.accentColor}15` },
                      ]}
                    >
                      <View style={[styles.modeIconContainer, { backgroundColor: `${config.accentColor}20` }]}>
                        <ModeIcon size={20} color={config.accentColor} />
                      </View>
                      <View style={styles.modeInfo}>
                        <View style={styles.modeLabelRow}>
                          <Text style={[styles.modeLabel, isSelected && { color: config.accentColor }]}>
                            {config.label}
                          </Text>
                          {isDemo && (
                            <View style={styles.demoBadge}>
                              <Text style={styles.demoBadgeText}>DEMO</Text>
                            </View>
                          )}
                          {isLive && !isSelected && (
                            <View style={styles.liveBadge}>
                              <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.modeDescription} numberOfLines={1}>
                          {isDemo ? 'Preview only — Contact Orbital for access' : config.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Check size={18} color={config.accentColor} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Institutional Contact CTA */}
              <Pressable
                style={styles.institutionalCta}
                onPress={() => {
                  Linking.openURL(INSTITUTIONAL_CONTACT_URL);
                  setIsOpen(false);
                }}
              >
                <Mail color="#000" size={16} />
                <Text style={styles.institutionalCtaText}>Request Institutional Access</Text>
                <ExternalLink color="#000" size={14} />
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Org Code Input Modal */}
      <Modal
        visible={showOrgInput}
        transparent
        animationType="fade"
        onRequestClose={handleOrgCancel}
      >
        <Pressable style={styles.modalOverlay} onPress={handleOrgCancel}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.orgInputModal}
          >
            <Pressable onPress={() => {}} style={styles.orgInputContent}>
              {pendingMode && (
                <>
                  <Text style={styles.orgInputTitle}>
                    Join {APP_MODE_CONFIGS[pendingMode].label}
                  </Text>
                  <Text style={styles.orgInputSubtitle}>
                    Enter your organization code to join
                  </Text>

                  <TextInput
                    style={styles.orgInput}
                    placeholder="ORG CODE"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={orgCodeInput}
                    onChangeText={setOrgCodeInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />

                  <TextInput
                    style={styles.orgInput}
                    placeholder="Organization Name (optional)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={orgNameInput}
                    onChangeText={setOrgNameInput}
                    autoCorrect={false}
                  />

                  <View style={styles.orgInputButtons}>
                    <Pressable onPress={handleOrgCancel} style={styles.orgCancelButton}>
                      <Text style={styles.orgCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleOrgSubmit}
                      style={[
                        styles.orgSubmitButton,
                        { backgroundColor: APP_MODE_CONFIGS[pendingMode].accentColor },
                        !orgCodeInput.trim() && { opacity: 0.5 },
                      ]}
                      disabled={!orgCodeInput.trim()}
                    >
                      <Text style={styles.orgSubmitText}>Join</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  selectorButtonCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  orgBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  orgBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalInner: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.xs,
  },
  modeList: {
    maxHeight: 400,
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  orgRequiredBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orgRequiredText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  orgInputModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  orgInputContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  orgInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  orgInputSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  orgInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  orgInputButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  orgCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  orgCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  orgSubmitButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  orgSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  // Governance styles
  governanceNotice: {
    backgroundColor: 'rgba(232,168,48,0.1)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  governanceText: {
    fontSize: 11,
    color: '#E8A830',
    textAlign: 'center',
  },
  modeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoBadge: {
    backgroundColor: 'rgba(232,168,48,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E8A830',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  institutionalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00D7FF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  institutionalCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
});
