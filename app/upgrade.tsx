// PRICING PREMIUM v2 — Pro-only, 2-card, 7-day trial, no Free, no CCI
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert, Platform, InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useSubscription } from '../lib/subscription';
import { PAYMENTS_ENABLED } from '../lib/payments';
import { useAuth } from '../lib/supabase';

function BulletItem({ text }: { text: string }) {
  return (
    <View style={b.row}>
      <Check size={14} color="#5DD9D4" style={b.icon} />
      <Text style={b.text}>{text}</Text>
    </View>
  );
}
const b = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  icon: { marginTop: 3, marginRight: 8 },
  text: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#B8C0CC', flex: 1, lineHeight: 20 },
});

export default function UpgradeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const {
    isLoading: subLoading,
    restore,
    purchase: purchaseViaRevenueCat,
    isAvailable: rcAvailable,
  } = useSubscription();

  const [purchasingAnnual, setPurchasingAnnual] = useState(false);
  const [purchasingMonthly, setPurchasingMonthly] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Read package IDs from RC offerings
  const [annualProductId, setAnnualProductId] = useState<string | null>(null);
  const [monthlyProductId, setMonthlyProductId] = useState<string | null>(null);
  const [offeringsError, setOfferingsError] = useState(false);

  useEffect(() => {
    if (!rcAvailable) return;
    loadOfferings();
  }, [rcAvailable]);

  const loadOfferings = async () => {
    try {
      // Dynamically import to avoid crash if RC not initialized
      const Purchases = (await import('react-native-purchases')).default;
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all['ofrng013d7b7f46'] ?? offerings.current;
      if (!offering) { setOfferingsError(true); return; }
      const annual = offering.annual ?? offering.availablePackages.find(p => p.packageType === 'ANNUAL' || p.identifier.includes('annual'));
      const monthly = offering.monthly ?? offering.availablePackages.find(p => p.packageType === 'MONTHLY' || p.identifier.includes('monthly'));
      if (annual) setAnnualProductId(annual.product.identifier);
      if (monthly) setMonthlyProductId(monthly.product.identifier);
    } catch {
      setOfferingsError(true);
    }
  };

  const handlePurchase = useCallback(async (
    productId: string | null,
    setSelf: (v: boolean) => void,
  ) => {
    if (!productId) return;
    if (PAYMENTS_ENABLED && !auth.isAuthenticated) {
      router.push('/cloud-sync' as any); return;
    }
    setSelf(true);
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      if (!rcAvailable) {
        setSelf(false);
        Alert.alert('Subscriptions unavailable', 'Please check your connection and try again later.');
        return;
      }
      try {
        await new Promise<void>(resolve => InteractionManager.runAfterInteractions(resolve));
        await purchaseViaRevenueCat(productId);
        // Navigate away regardless of entitlement timing — RevenueCat may lag sandbox
        if (router.canGoBack()) router.back();
        else router.replace('/' as any);
      } catch (err: any) {
        if (err?.code !== 'PURCHASE_CANCELLED') {
          Alert.alert('Purchase failed', err?.message ?? 'Unknown error');
        }
      }
    }
    setSelf(false);
  }, [auth.isAuthenticated, rcAvailable, purchaseViaRevenueCat, router]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await restore?.();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch {
      Alert.alert('Restore failed', 'No purchases found or connection error.');
    }
    setRestoring(false);
  }, [restore]);

  const ctasDisabled = offeringsError || !rcAvailable || subLoading;

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      {/* Top bar */}
      <View style={[s.topBar, { marginTop: 4 }]}>
        <Pressable
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/' as any); }}
          style={s.closeBtn}
          hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={20} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={s.closeBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={s.heroEyebrow}>ORBITAL PRO</Text>
        <Text style={s.heroHeadline}>See your patterns.{'\n'}Use your signal.</Text>
        <Text style={s.heroSub}>
          Clinical-grade capacity tracking. Built for neurodivergent adults.
        </Text>

        {/* Trial chip */}
        <View style={s.trialChip}>
          <Text style={s.trialText}>7 DAYS FREE · CANCEL ANYTIME</Text>
        </View>

        {/* Offerings unavailable error */}
        {offeringsError && (
          <Text style={s.offeringsError}>
            Subscriptions unavailable. Try again later.
          </Text>
        )}

        {/* ANNUAL card */}
        <View style={s.annualCard}>
          <View style={s.bestValueBadge}>
            <Text style={s.bestValueText}>BEST VALUE</Text>
          </View>
          <Text style={s.cardEyebrow}>ANNUAL</Text>
          <View style={s.priceRow}>
            <Text style={s.priceBig}>$24.17</Text>
            <Text style={s.priceUnit}>/mo</Text>
          </View>
          <Text style={s.priceSub}>$290 billed annually · save $58/yr (17%)</Text>
          <View style={s.bullets}>
            <BulletItem text="Unlimited capacity history" />
            <BulletItem text="Full pattern detection" />
            <BulletItem text="Daily directive + system voice" />
            <BulletItem text="Trend sparklines" />
            <BulletItem text="Provider-shareable export" />
          </View>
          <Pressable
            style={[s.ctaPrimary, ctasDisabled && s.ctaDisabled]}
            onPress={() => handlePurchase(annualProductId, setPurchasingAnnual)}
            disabled={ctasDisabled || purchasingAnnual}
            accessibilityRole="button"
          >
            {purchasingAnnual
              ? <ActivityIndicator color="#01020A" size="small" />
              : <Text style={s.ctaPrimaryText}>Start 7-day free trial</Text>
            }
          </Pressable>
          <Text style={s.footnote}>After trial: $290/yr. Cancel anytime in Settings.</Text>
        </View>

        {/* MONTHLY card */}
        <View style={s.monthlyCard}>
          <Text style={s.cardEyebrowGray}>MONTHLY</Text>
          <View style={s.priceRow}>
            <Text style={s.priceBigMonthly}>$29</Text>
            <Text style={s.priceUnit}>/mo</Text>
          </View>
          <Text style={s.priceSub}>Billed monthly · cancel anytime</Text>
          <Pressable
            style={[s.ctaGhost, ctasDisabled && s.ctaDisabled]}
            onPress={() => handlePurchase(monthlyProductId, setPurchasingMonthly)}
            disabled={ctasDisabled || purchasingMonthly}
            accessibilityRole="button"
          >
            {purchasingMonthly
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.ctaGhostText}>Start 7-day free trial</Text>
            }
          </Pressable>
          <Text style={s.footnote}>After trial: $29/mo. Cancel anytime in Settings.</Text>
        </View>

        {/* Restore + trust footer */}
        <Pressable
          onPress={handleRestore}
          style={s.restoreBtn}
          accessibilityRole="button"
        >
          {restoring
            ? <ActivityIndicator color="#5DD9D4" size="small" />
            : <Text style={s.restoreText}>Restore Purchases</Text>
          }
        </Pressable>
        <Text style={s.trustLine}>
          Privacy by default · Your data stays yours · Cancel anytime in Settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    zIndex: 10,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, alignItems: 'center' },
  // Hero
  heroEyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: 11, letterSpacing: 2.5,
    color: '#5DD9D4', marginBottom: 12,
  },
  heroHeadline: {
    fontFamily: 'DMSans-Bold', fontSize: 30, fontWeight: '700', color: '#FFFFFF',
    lineHeight: 36, textAlign: 'center', maxWidth: 320, marginBottom: 12,
  },
  heroSub: {
    fontFamily: 'DMSans-Regular', fontSize: 15, color: '#B8C0CC',
    lineHeight: 22, textAlign: 'center', maxWidth: 340, marginBottom: 28,
  },
  // Trial chip
  trialChip: {
    backgroundColor: 'rgba(93,217,212,0.06)', borderWidth: 1,
    borderColor: 'rgba(93,217,212,0.18)', borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14, marginBottom: 24,
  },
  trialText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 11, letterSpacing: 2.5, color: '#5DD9D4',
  },
  // Offerings error
  offeringsError: {
    fontFamily: 'DMSans-Regular', fontSize: 13, color: '#E5484D',
    textAlign: 'center', marginBottom: 12,
  },
  // Annual card
  annualCard: {
    backgroundColor: 'rgba(93,217,212,0.04)', borderWidth: 1, borderColor: '#5DD9D4',
    borderRadius: 18, padding: 24, width: '100%', marginVertical: 12,
  },
  bestValueBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: '#5DD9D4', borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  bestValueText: {
    fontFamily: 'SpaceMono-Regular', fontSize: 9, letterSpacing: 2.5,
    fontWeight: '700', color: '#01020A',
  },
  cardEyebrow: {
    fontFamily: 'SpaceMono-Regular', fontSize: 10, letterSpacing: 2.5, color: '#5DD9D4',
  },
  cardEyebrowGray: {
    fontFamily: 'SpaceMono-Regular', fontSize: 10, letterSpacing: 2.5, color: '#7A8593',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  priceBig: { fontFamily: 'DMSans-Bold', fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  priceBigMonthly: { fontFamily: 'DMSans-Bold', fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  priceUnit: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#B8C0CC', marginBottom: 4 },
  priceSub: {
    fontFamily: 'DMSans-Regular', fontSize: 12, color: '#B8C0CC', marginTop: 4, marginBottom: 16,
  },
  bullets: { width: '100%', marginBottom: 16 },
  ctaPrimary: {
    backgroundColor: '#5DD9D4', borderRadius: 12, height: 52,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  ctaPrimaryText: { fontFamily: 'DMSans-Bold', fontSize: 16, fontWeight: '700', color: '#01020A' },
  ctaDisabled: { opacity: 0.45 },
  footnote: {
    fontFamily: 'DMSans-Regular', fontSize: 11, color: '#7A8593', textAlign: 'center',
  },
  // Monthly card
  monthlyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 20, width: '100%',
  },
  ctaGhost: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    height: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 8,
  },
  ctaGhostText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: '#FFFFFF' },
  // Footer
  restoreBtn: { marginTop: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: {
    fontFamily: 'DMSans-Regular', fontSize: 14, color: '#5DD9D4', textDecorationLine: 'underline',
  },
  trustLine: {
    fontFamily: 'DMSans-Regular', fontSize: 11, color: '#7A8593', textAlign: 'center', marginTop: 8,
  },
});
