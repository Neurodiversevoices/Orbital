/**
 * Accessibility Settings Screen
 *
 * Comprehensive accessibility controls for visual, motor, cognitive,
 * audio, and data preferences.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Switch, Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  X,
  Eye,
  Hand,
  Brain,
  Volume2,
  Wifi,
  ChevronRight,
  Check,
  Accessibility,
  Contrast,
  Type,
  Vibrate,
  MessageSquare,
  Mic,
  Subtitles,
  WifiOff,
  HelpCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { useLocale } from '../lib/hooks/useLocale';
import { useAccessibility } from '../lib/hooks/useAccessibility';
import {
  ColorBlindMode,
  TextSize,
  ButtonSize,
  HapticIntensity,
} from '../types';
import * as Sentry from '@sentry/react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PickerType = 'colorBlind' | 'textSize' | 'buttonSize' | 'hapticIntensity' | 'oneHanded' | null;

export default function AccessibilityScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { settings, updateSetting, triggerHaptic, getTextScale, getButtonScale } = useAccessibility();
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  const textScale = getTextScale();
  const buttonScale = getButtonScale();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSetting(key, value);
    if (value) {
      triggerHaptic('selection');
    }
  };

  const handleSimpleModeToggle = async (enabled: boolean) => {
    // When Simple Mode is enabled, set optimal accessibility settings
    if (enabled) {
      try {
        await Promise.all([
          updateSetting('simpleMode', true),
          updateSetting('highContrast', true),
          updateSetting('textSize', 'xlarge'),
          updateSetting('reduceMotion', true),
          updateSetting('bigButtonMode', true),
          updateSetting('buttonSize', 'xlarge'),
          updateSetting('simplifiedText', true),
          updateSetting('hapticFeedback', true),
          updateSetting('hapticIntensity', 'strong'),
          updateSetting('confirmActions', true),
        ]);
      } catch (error) {
        Sentry.captureException(error, { tags: { screen: 'accessibility' } });
      }
      triggerHaptic('success');
    } else {
      await updateSetting('simpleMode', false);
      triggerHaptic('selection');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.titleContainer}>
          <Accessibility color={colors.textPrimary} size={24} />
          <Text style={[styles.title, { fontSize: 18 * textScale }]}>
            {t.accessibility?.title || 'Accessibility'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Simple Mode - One-Tap Maximum Accessibility */}
        <View style={styles.simpleModeSection}>
          <View style={styles.simpleModeCard}>
            <View style={styles.simpleModeHeader}>
              <View style={[styles.simpleModeIcon, settings.simpleMode && styles.simpleModeIconActive]}>
                <Accessibility color={settings.simpleMode ? '#000' : '#00E5FF'} size={28} />
              </View>
              <View style={styles.simpleModeContent}>
                <Text style={[styles.simpleModeTitle, { fontSize: 17 * textScale }]}>
                  {t.accessibility?.simpleMode || 'Simple Mode'}
                </Text>
                <Text style={[styles.simpleModeDesc, { fontSize: 12 * textScale }]}>
                  {t.accessibility?.simpleModeDesc || 'Maximum accessibility with one tap'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.simpleMode}
              onValueChange={handleSimpleModeToggle}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,229,255,0.3)' }}
              thumbColor={settings.simpleMode ? '#00E5FF' : 'rgba(255,255,255,0.5)'}
            />
          </View>
          {settings.simpleMode && (
            <View style={styles.simpleModeInfo}>
              <Text style={styles.simpleModeInfoText}>
                High contrast, large text, large buttons, simplified text, and strong haptics enabled.
              </Text>
            </View>
          )}
        </View>

        {/* Visual Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Eye color="rgba(255,255,255,0.5)" size={16} />
            <Text style={styles.sectionLabel}>
              {t.accessibility?.visualSection || 'VISUAL'}
            </Text>
          </View>

          <ToggleRow
            icon={Contrast}
            label={t.accessibility?.highContrast || 'High Contrast'}
            sublabel={t.accessibility?.highContrastDesc}
            value={settings.highContrast}
            onToggle={(v) => handleToggle('highContrast', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <PickerRow
            icon={Eye}
            label={t.accessibility?.colorBlindMode || 'Color Vision'}
            value={t.accessibility?.colorBlindOptions?.[settings.colorBlindMode] || settings.colorBlindMode}
            onPress={() => setActivePicker('colorBlind')}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <PickerRow
            icon={Type}
            label={t.accessibility?.textSize || 'Text Size'}
            value={t.accessibility?.textSizeOptions?.[settings.textSize] || settings.textSize}
            onPress={() => setActivePicker('textSize')}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={Eye}
            label={t.accessibility?.reduceMotion || 'Reduce Motion'}
            sublabel={t.accessibility?.reduceMotionDesc}
            value={settings.reduceMotion}
            onToggle={(v) => handleToggle('reduceMotion', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />
        </View>

        {/* Motor Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Hand color="rgba(255,255,255,0.5)" size={16} />
            <Text style={styles.sectionLabel}>
              {t.accessibility?.motorSection || 'MOTOR & INPUT'}
            </Text>
          </View>

          <ToggleRow
            icon={Hand}
            label={t.accessibility?.bigButtonMode || 'Large Touch Targets'}
            sublabel={t.accessibility?.bigButtonModeDesc}
            value={settings.bigButtonMode}
            onToggle={(v) => handleToggle('bigButtonMode', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          {settings.bigButtonMode && (
            <PickerRow
              icon={Hand}
              label={t.accessibility?.buttonSize || 'Button Size'}
              value={t.accessibility?.buttonSizeOptions?.[settings.buttonSize] || settings.buttonSize}
              onPress={() => setActivePicker('buttonSize')}
              textScale={textScale}
              buttonScale={buttonScale}
            />
          )}

          <PickerRow
            icon={Hand}
            label={t.accessibility?.oneHandedMode || 'One-Handed Mode'}
            value={t.accessibility?.oneHandedOptions?.[settings.oneHandedMode] || settings.oneHandedMode}
            onPress={() => setActivePicker('oneHanded')}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={Vibrate}
            label={t.accessibility?.hapticFeedback || 'Haptic Feedback'}
            sublabel={t.accessibility?.hapticFeedbackDesc}
            value={settings.hapticFeedback}
            onToggle={(v) => handleToggle('hapticFeedback', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          {settings.hapticFeedback && (
            <PickerRow
              icon={Vibrate}
              label={t.accessibility?.hapticIntensity || 'Haptic Intensity'}
              value={t.accessibility?.hapticIntensityOptions?.[settings.hapticIntensity] || settings.hapticIntensity}
              onPress={() => setActivePicker('hapticIntensity')}
              textScale={textScale}
              buttonScale={buttonScale}
            />
          )}
        </View>

        {/* Cognitive Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Brain color="rgba(255,255,255,0.5)" size={16} />
            <Text style={styles.sectionLabel}>
              {t.accessibility?.cognitiveSection || 'COGNITIVE'}
            </Text>
          </View>

          <ToggleRow
            icon={MessageSquare}
            label={t.accessibility?.simplifiedText || 'Simplified Text'}
            sublabel={t.accessibility?.simplifiedTextDesc}
            value={settings.simplifiedText}
            onToggle={(v) => handleToggle('simplifiedText', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={HelpCircle}
            label={t.accessibility?.confirmActions || 'Confirm Actions'}
            sublabel={t.accessibility?.confirmActionsDesc}
            value={settings.confirmActions}
            onToggle={(v) => handleToggle('confirmActions', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={HelpCircle}
            label={t.accessibility?.undoEnabled || 'Enable Undo'}
            sublabel={t.accessibility?.undoEnabledDesc}
            value={settings.undoEnabled}
            onToggle={(v) => handleToggle('undoEnabled', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={HelpCircle}
            label={t.accessibility?.showTooltips || 'Show Hints'}
            sublabel={t.accessibility?.showTooltipsDesc}
            value={settings.showTooltips}
            onToggle={(v) => handleToggle('showTooltips', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />
        </View>

        {/* Audio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Volume2 color="rgba(255,255,255,0.5)" size={16} />
            <Text style={styles.sectionLabel}>
              {t.accessibility?.audioSection || 'AUDIO'}
            </Text>
          </View>

          <ToggleRow
            icon={Mic}
            label={t.accessibility?.voiceControl || 'Voice Control'}
            sublabel={t.accessibility?.voiceControlDesc}
            value={settings.voiceControlEnabled}
            onToggle={(v) => handleToggle('voiceControlEnabled', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={Mic}
            label={t.accessibility?.dictation || 'Dictation'}
            sublabel={t.accessibility?.dictationDesc}
            value={settings.dictationEnabled}
            onToggle={(v) => handleToggle('dictationEnabled', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={Subtitles}
            label={t.accessibility?.liveCaptions || 'Live Captions'}
            sublabel={t.accessibility?.liveCaptionsDesc}
            value={settings.liveCaptionsEnabled}
            onToggle={(v) => handleToggle('liveCaptionsEnabled', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wifi color="rgba(255,255,255,0.5)" size={16} />
            <Text style={styles.sectionLabel}>
              {t.accessibility?.dataSection || 'DATA & CONNECTIVITY'}
            </Text>
          </View>

          <ToggleRow
            icon={WifiOff}
            label={t.accessibility?.offlineMode || 'Offline Mode'}
            sublabel={t.accessibility?.offlineModeDesc}
            value={settings.offlineMode}
            onToggle={(v) => handleToggle('offlineMode', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />

          <ToggleRow
            icon={Wifi}
            label={t.accessibility?.lowDataMode || 'Low Data Mode'}
            sublabel={t.accessibility?.lowDataModeDesc}
            value={settings.lowDataMode}
            onToggle={(v) => handleToggle('lowDataMode', v)}
            textScale={textScale}
            buttonScale={buttonScale}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Color Blind Mode Picker */}
      <OptionPicker
        visible={activePicker === 'colorBlind'}
        title={t.accessibility?.colorBlindMode || 'Color Vision'}
        options={[
          { value: 'none', label: t.accessibility?.colorBlindOptions?.none || 'Default' },
          { value: 'protanopia', label: t.accessibility?.colorBlindOptions?.protanopia || 'Protanopia' },
          { value: 'deuteranopia', label: t.accessibility?.colorBlindOptions?.deuteranopia || 'Deuteranopia' },
          { value: 'tritanopia', label: t.accessibility?.colorBlindOptions?.tritanopia || 'Tritanopia' },
          { value: 'monochrome', label: t.accessibility?.colorBlindOptions?.monochrome || 'Monochrome' },
        ]}
        selected={settings.colorBlindMode}
        onSelect={(v) => {
          updateSetting('colorBlindMode', v as ColorBlindMode);
          setActivePicker(null);
          triggerHaptic('selection');
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* Text Size Picker */}
      <OptionPicker
        visible={activePicker === 'textSize'}
        title={t.accessibility?.textSize || 'Text Size'}
        options={[
          { value: 'default', label: t.accessibility?.textSizeOptions?.default || 'Default' },
          { value: 'large', label: t.accessibility?.textSizeOptions?.large || 'Large' },
          { value: 'xlarge', label: t.accessibility?.textSizeOptions?.xlarge || 'Extra Large' },
        ]}
        selected={settings.textSize}
        onSelect={(v) => {
          updateSetting('textSize', v as TextSize);
          setActivePicker(null);
          triggerHaptic('selection');
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* Button Size Picker */}
      <OptionPicker
        visible={activePicker === 'buttonSize'}
        title={t.accessibility?.buttonSize || 'Button Size'}
        options={[
          { value: 'default', label: t.accessibility?.buttonSizeOptions?.default || 'Default' },
          { value: 'large', label: t.accessibility?.buttonSizeOptions?.large || 'Large' },
          { value: 'xlarge', label: t.accessibility?.buttonSizeOptions?.xlarge || 'Extra Large' },
        ]}
        selected={settings.buttonSize}
        onSelect={(v) => {
          updateSetting('buttonSize', v as ButtonSize);
          setActivePicker(null);
          triggerHaptic('selection');
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* Haptic Intensity Picker */}
      <OptionPicker
        visible={activePicker === 'hapticIntensity'}
        title={t.accessibility?.hapticIntensity || 'Haptic Intensity'}
        options={[
          { value: 'off', label: t.accessibility?.hapticIntensityOptions?.off || 'Off' },
          { value: 'light', label: t.accessibility?.hapticIntensityOptions?.light || 'Light' },
          { value: 'medium', label: t.accessibility?.hapticIntensityOptions?.medium || 'Medium' },
          { value: 'strong', label: t.accessibility?.hapticIntensityOptions?.strong || 'Strong' },
        ]}
        selected={settings.hapticIntensity}
        onSelect={(v) => {
          updateSetting('hapticIntensity', v as HapticIntensity);
          setActivePicker(null);
          triggerHaptic('impact');
        }}
        onClose={() => setActivePicker(null)}
      />

      {/* One-Handed Mode Picker */}
      <OptionPicker
        visible={activePicker === 'oneHanded'}
        title={t.accessibility?.oneHandedMode || 'One-Handed Mode'}
        options={[
          { value: 'off', label: t.accessibility?.oneHandedOptions?.off || 'Off' },
          { value: 'left', label: t.accessibility?.oneHandedOptions?.left || 'Left Hand' },
          { value: 'right', label: t.accessibility?.oneHandedOptions?.right || 'Right Hand' },
        ]}
        selected={settings.oneHandedMode}
        onSelect={(v) => {
          updateSetting('oneHandedMode', v as 'off' | 'left' | 'right');
          setActivePicker(null);
          triggerHaptic('selection');
        }}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

// Toggle Row Component
function ToggleRow({
  icon: Icon,
  label,
  sublabel,
  value,
  onToggle,
  textScale = 1,
  buttonScale = 1,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  textScale?: number;
  buttonScale?: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      onPress={() => onToggle(!value)}
      style={[styles.row, animatedStyle, { minHeight: 56 * buttonScale }]}
    >
      <View style={[styles.iconContainer, { width: 36 * buttonScale, height: 36 * buttonScale }]}>
        <Icon color="rgba(255,255,255,0.6)" size={20 * buttonScale} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { fontSize: 15 * textScale }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.rowSublabel, { fontSize: 12 * textScale }]}>{sublabel}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,229,255,0.3)' }}
        thumbColor={value ? '#00E5FF' : 'rgba(255,255,255,0.5)'}
      />
    </AnimatedPressable>
  );
}

// Picker Row Component
function PickerRow({
  icon: Icon,
  label,
  value,
  onPress,
  textScale = 1,
  buttonScale = 1,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
  onPress: () => void;
  textScale?: number;
  buttonScale?: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      onPress={onPress}
      style={[styles.row, animatedStyle, { minHeight: 56 * buttonScale }]}
    >
      <View style={[styles.iconContainer, { width: 36 * buttonScale, height: 36 * buttonScale }]}>
        <Icon color="rgba(255,255,255,0.6)" size={20 * buttonScale} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { fontSize: 15 * textScale }]}>{label}</Text>
        <Text style={[styles.rowValue, { fontSize: 13 * textScale }]}>{value}</Text>
      </View>
      <ChevronRight color="rgba(255,255,255,0.2)" size={18} />
    </AnimatedPressable>
  );
}

// Option Picker Modal
function OptionPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <X color={colors.textPrimary} size={20} />
            </Pressable>
          </View>
          <ScrollView style={styles.optionsList}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionRow,
                  option.value === selected && styles.optionRowSelected,
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    option.value === selected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {option.value === selected && <Check color="#00E5FF" size={18} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  rowSublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
  // Simple Mode styles
  simpleModeSection: {
    marginBottom: spacing.xl,
  },
  simpleModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0,229,255,0.3)',
  },
  simpleModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  simpleModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  simpleModeIconActive: {
    backgroundColor: '#00E5FF',
  },
  simpleModeContent: {
    flex: 1,
  },
  simpleModeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#00E5FF',
  },
  simpleModeDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  simpleModeInfo: {
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.1)',
  },
  simpleModeInfoText: {
    fontSize: 12,
    color: 'rgba(0,229,255,0.7)',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
    maxWidth: 320,
    maxHeight: 400,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  optionsList: {
    padding: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  optionLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  optionLabelSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
});
