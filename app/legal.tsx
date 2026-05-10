/**
 * Policy Center
 *
 * Versioned legal documents with acknowledgment tracking.
 * Suitable for institutional compliance and individual review.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Scale,
  FileText,
  ChevronRight,
  Shield,
  Clock,
  AlertTriangle,
  CreditCard,
  Globe2,
  Check,
} from 'lucide-react-native';
import { colors, commonStyles, spacing } from '../theme';
import { getAllPolicies, PolicyDocument, POLICIES } from '../lib/policies/policyContent';
import { useLocale } from '../lib/hooks/useLocale';

const POLICY_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  terms_of_service: FileText,
  privacy_policy: Shield,
  data_retention_policy: Clock,
  non_diagnostic_disclaimer: AlertTriangle,
  cancellation_refund_policy: CreditCard,
  jurisdiction_governing_law: Globe2,
};

const POLICY_COLORS: Record<string, string> = {
  terms_of_service: '#0E8C7B',
  privacy_policy: '#0E8C7B',
  data_retention_policy: '#7B1FA2',
  non_diagnostic_disclaimer: '#B7791F',
  cancellation_refund_policy: '#1D4ED8',
  jurisdiction_governing_law: '#DC2626',
};

export default function LegalScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);
  const policies = getAllPolicies();

  const handlePolicyPress = useCallback((policy: PolicyDocument) => {
    setSelectedPolicy(policy);
  }, []);

  const closePolicy = useCallback(() => {
    setSelectedPolicy(null);
  }, []);

  return (
    <SafeAreaView style={commonStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Scale color={colors.primary} size={24} />
          <Text style={styles.headerTitle}>Legal & Policies</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Policy Center</Text>
        <Text style={styles.infoDesc}>
          Versioned legal documents governing your use of Orbital.
          All policies are effective as of January 1, 2025.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {policies.map((policy) => {
          const Icon = POLICY_ICONS[policy.id] || FileText;
          const color = POLICY_COLORS[policy.id] || '#0E8C7B';

          return (
            <Pressable
              key={policy.id}
              style={styles.policyRow}
              onPress={() => handlePolicyPress(policy)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Icon color={color} size={20} />
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                <Text style={styles.policyMeta}>
                  v{policy.version} | Effective {policy.effectiveDate}
                </Text>
              </View>
              <ChevronRight color={colors.textTertiary} size={18} />
            </Pressable>
          );
        })}

        {/* PATCH 2: Enhanced Not Medical Advice Disclaimer */}
        <View style={styles.disclaimerSection}>
          <AlertTriangle color="#B7791F" size={20} />
          <View style={styles.disclaimerContent}>
            <Text style={styles.disclaimerText}>
              Orbital does not provide clinical advice, professional evaluation, or care recommendations.
            </Text>
            <Text style={styles.disclaimerTextSecondary}>
              The Clinical Capacity Instrument (CCI-Q4) is informational and designed to
              support documentation and provider-compatible record review.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {policies.length} policies | All current as of 2025
          </Text>
        </View>
      </ScrollView>

      {/* Policy Detail Modal */}
      <Modal
        visible={selectedPolicy !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePolicy}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              {selectedPolicy && (
                <>
                  {(() => {
                    const Icon = POLICY_ICONS[selectedPolicy.id] || FileText;
                    const color = POLICY_COLORS[selectedPolicy.id] || '#0E8C7B';
                    return <Icon color={color} size={24} />;
                  })()}
                  <View>
                    <Text style={styles.modalTitle}>{selectedPolicy?.title}</Text>
                    <Text style={styles.modalMeta}>
                      v{selectedPolicy?.version}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <Pressable onPress={closePolicy} style={styles.closeButton}>
              <X color={colors.textPrimary} size={24} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.policyText}>{selectedPolicy?.content}</Text>
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                Effective Date: {selectedPolicy?.effectiveDate}
              </Text>
              <Text style={styles.modalFooterText}>
                Version: {selectedPolicy?.version}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  infoCard: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.22)',
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E8C7B',
    marginBottom: spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  policyMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#B7791F',
    lineHeight: 18,
    fontWeight: '500',
  },
  disclaimerTextSecondary: {
    fontSize: 11,
    color: '#B7791F',
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  policyText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  modalFooter: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingBottom: spacing.xl * 2,
  },
  modalFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
