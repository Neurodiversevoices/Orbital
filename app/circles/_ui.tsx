/**
 * CIRCLES UI COMPONENTS
 *
 * Minimal, reusable UI primitives for the Circles screens.
 * No external dependencies beyond React Native.
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

// =============================================================================
// COLORS (Orbital Dark Theme)
// =============================================================================

const COLORS = {
  background: '#0B1220',
  card: '#111B33',
  cardBorder: '#1B2A52',
  primary: '#19D3FF',
  primaryDark: '#001018',
  secondary: '#1A2442',
  secondaryDisabled: '#121A2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#B9C6E4',
  textMuted: '#6E7AA8',
  textDisabled: '#566189',
  textHighlight: '#D8E5FF',
  mono: '#0E1730',
} as const;

// =============================================================================
// SCREEN CONTAINER
// =============================================================================

export function Screen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>{title}</Text>
      {children}
    </View>
  );
}

// =============================================================================
// CARD
// =============================================================================

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// =============================================================================
// BUTTONS
// =============================================================================

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={!!disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled ? styles.buttonPrimaryDisabled : styles.buttonPrimary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          disabled ? styles.buttonTextDisabled : styles.buttonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={!!disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled ? styles.buttonSecondaryDisabled : styles.buttonSecondary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          disabled ? styles.buttonTextSecondaryDisabled : styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DangerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={!!disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled ? styles.buttonSecondaryDisabled : styles.buttonDanger,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          disabled ? styles.buttonTextSecondaryDisabled : styles.buttonTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// TEXT
// =============================================================================

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

// =============================================================================
// MONO BOX (for codes/tokens)
// =============================================================================

export function MonoBox({ text }: { text: string }) {
  return (
    <View style={styles.monoBox}>
      <Text style={styles.monoText}>{text}</Text>
    </View>
  );
}

// =============================================================================
// INPUT
// =============================================================================

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize ?? 'characters'}
      style={styles.input}
    />
  );
}

// =============================================================================
// STATUS MESSAGE
// =============================================================================

export function StatusMessage({
  message,
  type = 'info',
}: {
  message: string;
  type?: 'info' | 'error' | 'success';
}) {
  if (!message) return null;

  const color =
    type === 'error'
      ? '#F44336'
      : type === 'success'
        ? '#4CAF50'
        : COLORS.textSecondary;

  return <Text style={[styles.statusMessage, { color }]}>{message}</Text>;
}

// =============================================================================
// CONFIRM DIALOG
// =============================================================================

export function dangerConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Yes', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// =============================================================================
// DIVIDER
// =============================================================================

export function Divider() {
  return <View style={styles.divider} />;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryDisabled: {
    backgroundColor: '#2A3558',
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonSecondaryDisabled: {
    backgroundColor: COLORS.secondaryDisabled,
  },
  buttonDanger: {
    backgroundColor: '#3D1A1A',
  },
  buttonText: {
    fontWeight: '900',
  },
  buttonTextPrimary: {
    color: COLORS.primaryDark,
  },
  buttonTextDisabled: {
    color: '#96A7D0',
  },
  buttonTextSecondary: {
    color: COLORS.textPrimary,
  },
  buttonTextSecondaryDisabled: {
    color: COLORS.textDisabled,
  },
  buttonTextDanger: {
    color: '#F44336',
  },
  muted: {
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  label: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    marginBottom: 6,
  },
  monoBox: {
    backgroundColor: COLORS.mono,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  monoText: {
    color: COLORS.textHighlight,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  input: {
    color: COLORS.textPrimary,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  statusMessage: {
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 8,
  },
});
