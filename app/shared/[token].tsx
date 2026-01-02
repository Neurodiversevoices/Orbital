import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, spacing } from '../../theme';
import { useLocale } from '../../lib/hooks/useLocale';
import { validateShareAccess, ValidationResult } from '../../lib/sharing';
import { ReadOnlyBanner } from '../../components/sharing/ReadOnlyBanner';

export default function SharedViewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setValidationResult({ isValid: false, error: 'invalid_token' });
        setIsLoading(false);
        return;
      }

      const result = await validateShareAccess(token);
      setValidationResult(result);
      setIsLoading(false);
    }

    validate();
  }, [token]);

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00E5FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!validationResult?.isValid) {
    const errorMessages = {
      invalid_token: 'This share link is invalid.',
      expired: 'This share link has expired.',
      revoked: 'Access to this share has been revoked.',
    };

    const errorMessagesEs = {
      invalid_token: 'Este enlace de acceso no es válido.',
      expired: 'Este enlace de acceso ha expirado.',
      revoked: 'El acceso a este enlace ha sido revocado.',
    };

    const message = t === require('../../locales/es').es
      ? errorMessagesEs[validationResult?.error || 'invalid_token']
      : errorMessages[validationResult?.error || 'invalid_token'];

    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorMessage}>{message}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Valid share - show read-only view
  // In a full implementation, this would render the patterns/history view
  // with the ReadOnlyBanner and disabled input controls
  return (
    <SafeAreaView style={commonStyles.screen}>
      <ReadOnlyBanner message={t.sharing.readOnlyBanner} />
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Shared View Active</Text>
          <Text style={styles.infoText}>
            You are viewing shared capacity data in read-only mode.
          </Text>
          <Text style={styles.infoSubtext}>
            This view will expire when the share period ends.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  infoSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
