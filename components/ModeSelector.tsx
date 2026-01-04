/**
 * Mode Selector Dropdown Component
 *
 * A dropdown that allows users to switch between the 7 Orbital modes.
 * Shows current mode with icon, expands to show all options.
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
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppMode, APP_MODE_CONFIGS, APP_MODES } from '../types';
import { useAppMode } from '../lib/hooks/useAppMode';

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
                <Text style={styles.modalTitle}>Select Mode</Text>
                <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                  <X size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <ScrollView style={styles.modeList} showsVerticalScrollIndicator={false}>
                {APP_MODES.map((mode) => {
                  const config = APP_MODE_CONFIGS[mode];
                  const ModeIcon = MODE_ICONS[config.icon] || User;
                  const isSelected = mode === currentMode;

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
                        <Text style={[styles.modeLabel, isSelected && { color: config.accentColor }]}>
                          {config.label}
                        </Text>
                        <Text style={styles.modeDescription} numberOfLines={1}>
                          {config.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Check size={18} color={config.accentColor} />
                      )}
                      {config.requiresOrgCode && !isSelected && (
                        <View style={styles.orgRequiredBadge}>
                          <Text style={styles.orgRequiredText}>ORG</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
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
});
