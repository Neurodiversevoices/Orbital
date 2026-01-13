/**
 * Record Access Screen - B2C Add-Ons & Subscriptions
 *
 * CANONICAL B2C PRICING (LOCKED):
 *
 * PRO: $29/mo | $290/yr
 * FAMILY: $79/mo | $790/yr (includes 5 members)
 *   - Additional members: +$9/mo | +$90/yr per member
 * CIRCLES: $79/mo | $790/yr (up to 5 Pro users)
 * BUNDLES: ANNUAL-ONLY
 *   - 10 seats: $1,990/yr
 *   - 15 seats: $2,790/yr
 *   - 20 seats: $3,490/yr
 * ADMIN ADD-ON: $29/mo | $290/yr
 * CCI-Q4 (Issuance Fee):
 *   - Free users: $199
 *   - Pro/Family/Circle: $149
 *
 * All pricing from lib/subscription/pricing.ts (canonical source)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Check,
  RefreshCw,
  Users,
  Gift,
  Crown,
  ChevronRight,
  FileText,
  Shield,
  Sparkles,
  UserPlus,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useSubscription, FREE_TIER_LIMITS } from '../lib/subscription';
import {
  PRODUCT_IDS,
  PRO_PRICING,
  FAMILY_ADDON_PRICING,
  FAMILY_EXTRA_SEAT_PRICING,
  CIRCLE_PRICING,
  BUNDLE_PRICING,
  ADMIN_ADDON_PRICING,
  CCI_PRICING,
  formatPrice,
} from '../lib/subscription/pricing';
import {
  PAYMENTS_ENABLED,
  executePurchase,
} from '../lib/payments';
import { getUserEntitlements, type UserEntitlements } from '../lib/entitlements';

// =============================================================================
// PURCHASE HANDLER (Mock Checkout)
// =============================================================================

async function handleMockPurchase(
  productId: string,
  onSuccess: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const result = await executePurchase(productId as any);
    if (result.success) {
      onSuccess();
    } else {
      onError(result.error || 'Purchase failed');
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Purchase failed');
  }
}

// =============================================================================
// TIER CARD COMPONENT
// =============================================================================

interface TierCardProps {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isRecommended?: boolean;
  isCurrentTier?: boolean;
  onSelectMonthly: () => void;
  onSelectAnnual: () => void;
  disabled?: boolean;
  color?: string;
  requiresText?: string;
}

function TierCard({
  name,
  description,
  monthlyPrice,
  annualPrice,
  features,
  isRecommended,
  isCurrentTier,
  onSelectMonthly,
  onSelectAnnual,
  disabled,
  color = '#00E5FF',
  requiresText,
}: TierCardProps) {
  const annualSavings = Math.round(100 - (annualPrice / (monthlyPrice * 12)) * 100);

  return (
    <View style={[styles.tierCard, isRecommended && styles.tierCardRecommended]}>
      {isRecommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
        </View>
      )}
      {isCurrentTier && (
        <View style={[styles.recommendedBadge, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.recommendedBadgeText}>ACTIVE</Text>
        </View>
      )}

      <Text style={[styles.tierName, { color }]}>{name}</Text>
      <Text style={styles.tierDescription}>{description}</Text>

      {requiresText && (
        <Text style={styles.requiresText}>{requiresText}</Text>
      )}

      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>${annualPrice}</Text>
        <Text style={styles.pricePeriod}>/year</Text>
      </View>
      <Text style={styles.monthlyAvailable}>Monthly available for continuity testing</Text>

      <View style={styles.featuresContainer}>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Check size={14} color={color} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tierActions}>
        <Pressable
          style={[styles.tierButton, disabled && styles.tierButtonDisabled]}
          onPress={onSelectAnnual}
          disabled={disabled || isCurrentTier}
        >
          <Text style={[styles.tierButtonText, disabled && styles.tierButtonTextDisabled]}>
            {isCurrentTier ? 'Current' : `${formatPrice(annualPrice, 'year')}`}
          </Text>
          {!isCurrentTier && annualSavings > 0 && (
            <Text style={styles.savingsTextPrimary}>Save {annualSavings}%</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.tierButtonSecondary, disabled && styles.tierButtonDisabled]}
          onPress={onSelectMonthly}
          disabled={disabled || isCurrentTier}
        >
          <Text style={styles.tierButtonSecondaryText}>
            {formatPrice(monthlyPrice, 'month')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// =============================================================================
// BUNDLE CARD (Annual-only)
// =============================================================================

interface BundleCardProps {
  seats: number;
  annualPrice: number;
  onSelect: () => void;
  disabled?: boolean;
  isOwned?: boolean;
}

function BundleCard({ seats, annualPrice, onSelect, disabled, isOwned }: BundleCardProps) {
  return (
    <Pressable
      style={[styles.bundleItem, isOwned && styles.bundleItemOwned]}
      onPress={onSelect}
      disabled={disabled || isOwned}
    >
      <View style={styles.bundleItemLeft}>
        <Users size={20} color={isOwned ? '#4CAF50' : '#00E5FF'} />
        <Text style={styles.bundleItemSeats}>{seats} Seats</Text>
      </View>
      <View style={styles.bundleItemRight}>
        <Text style={styles.bundleItemPrice}>{formatPrice(annualPrice)}/yr</Text>
        {isOwned && <Text style={styles.bundleItemOwned}>OWNED</Text>}
      </View>
    </Pressable>
  );
}

// =============================================================================
// CCI PURCHASE CARD — WITH LEGAL CONFIRMATION (FIX 5)
// =============================================================================

// Legal confirmation text (exact copy)
const CCI_CONFIRMATION_TEXT =
  'I confirm this record is for my own use or for a dependent I am legally authorized to represent.';

// Issuance confirmation checkboxes (PATCH D)
const CCI_PERMANENT_RECORD_TEXT = 'I understand this creates a permanent record.';
const CCI_NOT_DIAGNOSIS_TEXT = 'I understand this is documentation, not diagnosis.';

interface CCICardProps {
  isPro: boolean;
  onPurchase: (confirmed: boolean) => void;
  disabled?: boolean;
  hasPurchased?: boolean;
}

function CCICard({ isPro, onPurchase, disabled, hasPurchased }: CCICardProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [permanentRecordChecked, setPermanentRecordChecked] = useState(false);
  const [notDiagnosisChecked, setNotDiagnosisChecked] = useState(false);
  const price = isPro ? CCI_PRICING.proUser : CCI_PRICING.freeUser;

  const allConfirmed = confirmationChecked && permanentRecordChecked && notDiagnosisChecked;
  const canPurchase = allConfirmed && !disabled && !hasPurchased;

  return (
    <View style={styles.cciCard}>
      <View style={styles.cciHeader}>
        <FileText size={24} color="#7A9AAA" />
        <View style={styles.cciHeaderText}>
          <Text style={styles.cciTitle}>CCI-Q4 Issuance</Text>
          <Text style={styles.cciSubtitle}>Clinical Capacity Instrument</Text>
        </View>
      </View>

      <View style={styles.cciPricing}>
        <View style={styles.cciPriceRow}>
          <Text style={styles.cciPriceLabel}>Issuance Fee:</Text>
          <Text style={styles.cciPriceValue}>{formatPrice(price)}</Text>
          {isPro && (
            <View style={styles.cciProBadge}>
              <Text style={styles.cciProBadgeText}>PRO DISCOUNT</Text>
            </View>
          )}
        </View>
        {!isPro && (
          <Text style={styles.cciProHint}>
            Pro users pay {formatPrice(CCI_PRICING.proUser)} (save {formatPrice(CCI_PRICING.freeUser - CCI_PRICING.proUser)})
          </Text>
        )}
        {/* CPT 90885 Reimbursement Notice — PATCH 1 */}
        <Text style={styles.cciCptNotice}>
          Supports clinical documentation and record review (e.g., CPT 90885 review).
          Reimbursement is not guaranteed and varies by payer.
        </Text>
      </View>

      {/* ISSUANCE CONFIRMATION — BLOCKING MODAL (PHASE 2-D) */}
      {!hasPurchased && (
        <View style={styles.cciConfirmationContainer}>
          <Text style={styles.cciModalTitle}>Confirm CCI-Q4 Issuance</Text>
          <Text style={styles.cciModalBody}>
            This action creates a fixed clinical-grade record derived from your stored capacity history.
            Once issued, the artifact cannot be altered.
          </Text>
          <Pressable
            style={styles.cciConfirmationRow}
            onPress={() => setPermanentRecordChecked(!permanentRecordChecked)}
            disabled={disabled}
          >
            <View style={[styles.cciCheckbox, permanentRecordChecked && styles.cciCheckboxChecked]}>
              {permanentRecordChecked && <Text style={styles.cciCheckboxMark}>✓</Text>}
            </View>
            <Text style={styles.cciConfirmationText}>{CCI_PERMANENT_RECORD_TEXT}</Text>
          </Pressable>

          <Pressable
            style={styles.cciConfirmationRow}
            onPress={() => setNotDiagnosisChecked(!notDiagnosisChecked)}
            disabled={disabled}
          >
            <View style={[styles.cciCheckbox, notDiagnosisChecked && styles.cciCheckboxChecked]}>
              {notDiagnosisChecked && <Text style={styles.cciCheckboxMark}>✓</Text>}
            </View>
            <Text style={styles.cciConfirmationText}>{CCI_NOT_DIAGNOSIS_TEXT}</Text>
          </Pressable>

          <Pressable
            style={styles.cciConfirmationRow}
            onPress={() => setConfirmationChecked(!confirmationChecked)}
            disabled={disabled}
          >
            <View style={[styles.cciCheckbox, confirmationChecked && styles.cciCheckboxChecked]}>
              {confirmationChecked && <Text style={styles.cciCheckboxMark}>✓</Text>}
            </View>
            <Text style={styles.cciConfirmationText}>{CCI_CONFIRMATION_TEXT}</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.cciButton, !canPurchase && styles.cciButtonDisabled]}
        onPress={() => onPurchase(allConfirmed)}
        disabled={!canPurchase}
      >
        <Text style={[styles.cciButtonText, !canPurchase && styles.cciButtonTextDisabled]}>
          {hasPurchased ? 'Issued' : `Issue CCI-Q4 · ${formatPrice(price)}`}
        </Text>
      </Pressable>

      {!hasPurchased && !allConfirmed && (
        <Text style={styles.cciConfirmationHint}>
          All confirmations required to proceed.
        </Text>
      )}

      {/* ISSUANCE METADATA (E) — Shown after issuance */}
      {hasPurchased && (
        <View style={styles.cciIssuedMetadata}>
          <Text style={styles.cciIssuedLabel}>Issuance ID:</Text>
          <Text style={styles.cciIssuedValue}>CCI-{Date.now().toString(36).toUpperCase()}</Text>
          <Text style={styles.cciIssuedLabel}>Issued:</Text>
          <Text style={styles.cciIssuedValue}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.cciReissuanceNote}>Re-issuance requires a new issuance fee.</Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function UpgradeScreen() {
  const router = useRouter();
  const { isLoading: subscriptionLoading, restore } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);

  // Load entitlements
  useEffect(() => {
    loadEntitlements();
  }, []);

  const loadEntitlements = async () => {
    setLoadingEntitlements(true);
    try {
      const ent = await getUserEntitlements();
      setEntitlements(ent);
    } catch {
      // Default to free
      setEntitlements(null);
    }
    setLoadingEntitlements(false);
  };

  const handlePurchase = useCallback(async (productId: string, productName: string) => {
    setIsPurchasing(true);

    await handleMockPurchase(
      productId,
      () => {
        Alert.alert(
          'Success!',
          `${productName} has been activated.`,
          [{ text: 'Continue', onPress: () => { loadEntitlements(); } }]
        );
        setIsPurchasing(false);
      },
      (error) => {
        Alert.alert('Purchase Failed', error);
        setIsPurchasing(false);
      }
    );
  }, []);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    const success = await restore();
    setIsRestoring(false);

    if (success) {
      loadEntitlements();
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } else {
      Alert.alert('No Purchase Found', "We couldn't find a previous purchase to restore.");
    }
  }, [restore]);

  if (subscriptionLoading || loadingEntitlements) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00E5FF" size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPro = entitlements?.isPro ?? false;
  const hasFamily = entitlements?.hasFamily ?? false;
  const hasCircle = entitlements?.hasCircle ?? false;
  const hasAdminAddOn = entitlements?.hasAdminAddOn ?? false;
  const hasCCIPurchased = entitlements?.hasCCIPurchased ?? false;
  const bundleSize = entitlements?.bundleSize ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>RECORD ACCESS</Text>
          <Text style={styles.headerSubtitle}>Access levels determine retention, eligibility, and issuance rights.</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[styles.statusBadge, isPro && styles.statusBadgePro]}>
              <Text style={styles.statusBadgeText}>{isPro ? 'PRO' : 'FREE'}</Text>
            </View>
          </View>
          {!isPro && (
            <Text style={styles.statusHint}>
              {FREE_TIER_LIMITS.maxSignalsPerMonth} signals/month · {FREE_TIER_LIMITS.maxPatternHistoryDays} days history
            </Text>
          )}
        </Animated.View>

        {/* =============================================================== */}
        {/* PRO SUBSCRIPTION */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.sectionTitle}>PRO SUBSCRIPTION</Text>

          <TierCard
            name="Pro"
            description="Unlimited signals & full pattern history"
            monthlyPrice={PRO_PRICING.monthly}
            annualPrice={PRO_PRICING.annual}
            features={[
              'Unlimited daily signals',
              'Full pattern history',
              'Required for Circles & Bundles',
              'Priority support',
            ]}
            isRecommended={!isPro}
            isCurrentTier={isPro}
            onSelectMonthly={() => handlePurchase(PRODUCT_IDS.PRO_MONTHLY, 'Pro (Monthly)')}
            onSelectAnnual={() => handlePurchase(PRODUCT_IDS.PRO_ANNUAL, 'Pro (Annual)')}
            disabled={isPurchasing}
            color="#FFD700"
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* FAMILY ADD-ON */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Text style={styles.sectionTitle}>FAMILY ADD-ON</Text>
          <Text style={styles.sectionSubtitle}>
            Base includes {FAMILY_ADDON_PRICING.baseSeats} family members
          </Text>

          <TierCard
            name="Family"
            description="Shared capacity tracking for your household"
            monthlyPrice={FAMILY_ADDON_PRICING.monthly}
            annualPrice={FAMILY_ADDON_PRICING.annual}
            features={[
              `Up to ${FAMILY_ADDON_PRICING.baseSeats} family members included`,
              'Family circle visibility',
              'Household capacity insights',
              'Family-level trend analysis',
            ]}
            isCurrentTier={hasFamily}
            onSelectMonthly={() => handlePurchase(PRODUCT_IDS.FAMILY_MONTHLY, 'Family (Monthly)')}
            onSelectAnnual={() => handlePurchase(PRODUCT_IDS.FAMILY_ANNUAL, 'Family (Annual)')}
            disabled={isPurchasing || !isPro}
            requiresText={!isPro ? 'Requires Pro' : undefined}
            color="#FF9800"
          />

          {/* Family Expansion Pricing - Additional members beyond base 5 */}
          <View style={styles.expansionPricingCard}>
            <View style={styles.expansionHeader}>
              <UserPlus size={18} color="#FF9800" />
              <Text style={styles.expansionTitle}>Additional Family Members</Text>
            </View>
            <Text style={styles.expansionSubtitle}>
              Beyond the base {FAMILY_ADDON_PRICING.baseSeats} members included
            </Text>
            <View style={styles.expansionPriceRow}>
              <View style={styles.expansionPriceOption}>
                <Text style={styles.expansionPriceAmount}>
                  +{formatPrice(FAMILY_EXTRA_SEAT_PRICING.monthly)}
                </Text>
                <Text style={styles.expansionPricePeriod}>/month per member</Text>
              </View>
              <Text style={styles.expansionPriceOr}>or</Text>
              <View style={styles.expansionPriceOption}>
                <Text style={styles.expansionPriceAmount}>
                  +{formatPrice(FAMILY_EXTRA_SEAT_PRICING.annual)}
                </Text>
                <Text style={styles.expansionPricePeriod}>/year per member</Text>
              </View>
            </View>
            {hasFamily && (
              <Pressable
                style={styles.addMemberButton}
                onPress={() => handlePurchase(PRODUCT_IDS.FAMILY_EXTRA_SEAT_ANNUAL, 'Family Extra Member (Annual)')}
                disabled={isPurchasing}
              >
                <UserPlus size={16} color="#000" />
                <Text style={styles.addMemberButtonText}>Add Family Member</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* =============================================================== */}
        {/* CIRCLES */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.sectionTitle}>CIRCLES</Text>
          <Text style={styles.sectionSubtitle}>Shared capacity awareness + optional Admin visibility</Text>

          <TierCard
            name="Circle"
            description="Create a circle with up to 5 trusted buddies"
            monthlyPrice={CIRCLE_PRICING.monthly}
            annualPrice={CIRCLE_PRICING.annual}
            features={[
              'Up to 5 buddies (all must be Pro)',
              'Shared capacity awareness',
              'Circle-level insights',
              'Admin access available after creation',
            ]}
            isCurrentTier={hasCircle}
            onSelectMonthly={() => handlePurchase(PRODUCT_IDS.CIRCLE_MONTHLY, 'Circle (Monthly)')}
            onSelectAnnual={() => handlePurchase(PRODUCT_IDS.CIRCLE_ANNUAL, 'Circle (Annual)')}
            disabled={isPurchasing || !isPro}
            requiresText={!isPro ? 'Requires Pro for all members' : undefined}
            color="#00E5FF"
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* BUNDLES (Annual-only) */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Text style={styles.sectionTitle}>BUNDLES</Text>
          <Text style={styles.sectionSubtitle}>Annual-only · B2C group packages</Text>

          <View style={styles.bundleContainer}>
            <BundleCard
              seats={10}
              annualPrice={BUNDLE_PRICING.bundle_10.annual}
              onSelect={() => handlePurchase(PRODUCT_IDS.BUNDLE_10_ANNUAL, '10-Seat Bundle')}
              disabled={isPurchasing}
              isOwned={bundleSize === 10}
            />
            <BundleCard
              seats={15}
              annualPrice={BUNDLE_PRICING.bundle_15.annual}
              onSelect={() => handlePurchase(PRODUCT_IDS.BUNDLE_15_ANNUAL, '15-Seat Bundle')}
              disabled={isPurchasing}
              isOwned={bundleSize === 15}
            />
            <BundleCard
              seats={20}
              annualPrice={BUNDLE_PRICING.bundle_20.annual}
              onSelect={() => handlePurchase(PRODUCT_IDS.BUNDLE_20_ANNUAL, '20-Seat Bundle')}
              disabled={isPurchasing}
              isOwned={bundleSize === 20}
            />
          </View>
        </Animated.View>

        {/* =============================================================== */}
        {/* ADMIN ADD-ON — VISIBILITY GUARD: Only shown if Pro AND (Circle OR Bundle) */}
        {/* =============================================================== */}
        {isPro && (hasCircle || bundleSize !== null) && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.sectionTitle}>ADMIN ADD-ON</Text>
            <Text style={styles.sectionSubtitle}>Admin access available after Circle or Bundle creation</Text>

            <TierCard
              name="Admin"
              description="READ-ONLY view of member pattern history (consent required)"
              monthlyPrice={ADMIN_ADDON_PRICING.monthly}
              annualPrice={ADMIN_ADDON_PRICING.annual}
              features={[
                'READ-ONLY access only',
                'Member pattern history',
                'Requires member consent',
                'Audit logged',
              ]}
              isCurrentTier={hasAdminAddOn}
              onSelectMonthly={() => handlePurchase(PRODUCT_IDS.ADMIN_ADDON_MONTHLY, 'Admin (Monthly)')}
              onSelectAnnual={() => handlePurchase(PRODUCT_IDS.ADMIN_ADDON_ANNUAL, 'Admin (Annual)')}
              disabled={isPurchasing}
              color="#9C27B0"
            />
          </Animated.View>
        )}

        {/* =============================================================== */}
        {/* CCI-Q4 ISSUANCE */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <Text style={styles.sectionTitle}>CCI-Q4 ISSUANCE</Text>
          <Text style={styles.sectionSubtitle}>
            {isPro ? `Pro price: ${formatPrice(CCI_PRICING.proUser)}` : `Free user: ${formatPrice(CCI_PRICING.freeUser)} · Pro: ${formatPrice(CCI_PRICING.proUser)}`}
          </Text>

          <CCICard
            isPro={isPro}
            onPurchase={(confirmed) => {
              if (confirmed) {
                handlePurchase(
                  isPro ? PRODUCT_IDS.CCI_PRO : PRODUCT_IDS.CCI_FREE,
                  'CCI-Q4 Issuance'
                );
              }
            }}
            disabled={isPurchasing}
            hasPurchased={hasCCIPurchased}
          />
        </Animated.View>

        {/* =============================================================== */}
        {/* SPONSOR CODE */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Pressable
            style={styles.sponsorCard}
            onPress={() => router.push('/redeem')}
          >
            <Gift size={24} color="#00E5FF" />
            <View style={styles.sponsorCardContent}>
              <Text style={styles.sponsorCardTitle}>Have a Sponsor Code?</Text>
              <Text style={styles.sponsorCardDescription}>
                Redeem a code from your organization
              </Text>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </Animated.View>

        {/* =============================================================== */}
        {/* FOOTER */}
        {/* =============================================================== */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.footerSection}>
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring}
            style={styles.restoreButton}
          >
            {isRestoring ? (
              <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
            ) : (
              <>
                <RefreshCw size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </>
            )}
          </Pressable>

          {!PAYMENTS_ENABLED && (
            <View style={styles.stubNotice}>
              <Text style={styles.stubNoticeText}>
                Payments are in demo mode. Purchases are simulated.
              </Text>
            </View>
          )}

          <Text style={styles.footerText}>
            Subscriptions auto-renew unless cancelled. Annual plans are recommended.
          </Text>

          <View style={styles.footerLinks}>
            <Pressable onPress={() => Linking.openURL('https://orbital.health/terms')}>
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable onPress={() => Linking.openURL('https://orbital.health/privacy')}>
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  // Status Card
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgePro: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  statusHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
    marginTop: -4,
  },

  // Tier Card
  tierCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tierCardRecommended: {
    borderColor: 'rgba(255,215,0,0.4)',
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  tierName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
  },
  requiresText: {
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.95)',
  },
  pricePeriod: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  tierActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tierButton: {
    flex: 1,
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tierButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  tierButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  tierButtonAnnual: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tierButtonAnnualText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  savingsText: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
  },
  savingsTextPrimary: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
  },
  monthlyAvailable: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginBottom: spacing.md,
    marginTop: -4,
  },
  tierButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tierButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },

  // Family Expansion Pricing
  expansionPricingCard: {
    backgroundColor: 'rgba(255,152,0,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.15)',
    borderStyle: 'dashed',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  expansionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  expansionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  expansionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },
  expansionPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  expansionPriceOption: {
    alignItems: 'center',
  },
  expansionPriceAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF9800',
  },
  expansionPricePeriod: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  expansionPriceOr: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FF9800',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  addMemberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  // Bundle
  bundleContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bundleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
  },
  bundleItemOwned: {
    borderColor: 'rgba(76,175,80,0.4)',
    backgroundColor: 'rgba(76,175,80,0.05)',
  },
  bundleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bundleItemSeats: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  bundleItemRight: {
    alignItems: 'flex-end',
  },
  bundleItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E5FF',
  },

  // CCI Card
  cciCard: {
    backgroundColor: 'rgba(122,154,170,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(122,154,170,0.2)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cciHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cciHeaderText: {
    flex: 1,
  },
  cciTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  cciSubtitle: {
    fontSize: 12,
    color: '#7A9AAA',
    marginTop: 2,
  },
  cciPricing: {
    marginBottom: spacing.md,
  },
  cciPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cciPriceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  cciPriceValue: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  cciProBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cciProBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFD700',
  },
  cciProHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },
  cciCptNotice: {
    fontSize: 10,
    color: 'rgba(122,154,170,0.8)',
    marginTop: spacing.sm,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  cciButton: {
    backgroundColor: '#7A9AAA',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cciButtonDisabled: {
    backgroundColor: 'rgba(122,154,170,0.3)',
  },
  cciButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  cciButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },

  // CCI Confirmation (FIX 5 — Legal Required)
  cciConfirmationContainer: {
    marginBottom: spacing.md,
  },
  cciConfirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cciCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
  },
  cciCheckboxChecked: {
    backgroundColor: '#7A9AAA',
    borderColor: '#7A9AAA',
  },
  cciCheckboxMark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  cciConfirmationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  cciConfirmationHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  // CCI Modal Title/Body (Phase 2-D)
  cciModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
  },
  cciModalBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  // CCI Issuance Metadata (Phase 2-E)
  cciIssuedMetadata: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cciIssuedLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  cciIssuedValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'monospace',
  },
  cciReissuanceNote: {
    fontSize: 11,
    color: 'rgba(122,154,170,0.7)',
    fontStyle: 'italic',
    marginTop: spacing.md,
  },

  // Sponsor Card
  sponsorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,229,255,0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  sponsorCardContent: {
    flex: 1,
  },
  sponsorCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  sponsorCardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // Footer
  footerSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  restoreButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  stubNotice: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  stubNoticeText: {
    fontSize: 11,
    color: '#FF9800',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  footerDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
});
