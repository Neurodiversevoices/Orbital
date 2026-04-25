import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PRICES_CENTS, fmt, annualSavings, TRIAL_DAYS } from '../../lib/subscription/pricing';

export default function Paywall() {
  const router = useRouter();
  const [period, setPeriod] = useState<'monthly' | 'annual'>('annual');
  const [plan, setPlan] = useState<'pro' | 'circle'>('pro');
  const proSavings = annualSavings(PRICES_CENTS.PRO.monthly, PRICES_CENTS.PRO.annual);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-onboarding-paywall">
      <Text style={s.eyebrow}>CHOOSE YOUR PLAN</Text>
      <Text style={s.q}>{TRIAL_DAYS} days free. Cancel anytime.</Text>
      <Text style={s.hint}>Annual saves {proSavings}%.</Text>

      {/* Period toggle */}
      <View style={s.toggle}>
        <Pressable testID="period-monthly" onPress={() => setPeriod('monthly')} style={[s.tBtn, period === 'monthly' && s.tBtnOn]}>
          <Text style={[s.tTxt, period === 'monthly' && { color: '#4FD1E8' }]}>Monthly</Text>
        </Pressable>
        <Pressable testID="period-annual" onPress={() => setPeriod('annual')} style={[s.tBtn, period === 'annual' && s.tBtnOn]}>
          <Text style={[s.tTxt, period === 'annual' && { color: '#4FD1E8' }]}>Annual <Text style={{ color: '#F2B134' }}>· save {proSavings}%</Text></Text>
        </Pressable>
      </View>

      {/* Pro plan */}
      <Pressable testID="plan-pro" onPress={() => setPlan('pro')} style={[s.plan, plan === 'pro' && s.planOn]}>
        <View style={s.planRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.planName}>Pro</Text>
            <Text style={s.planDesc}>For one person. All features.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.planPrice}>{fmt(period === 'annual' ? PRICES_CENTS.PRO.annual : PRICES_CENTS.PRO.monthly)}</Text>
            <Text style={s.per}>/{period === 'annual' ? 'yr' : 'mo'}</Text>
          </View>
        </View>
      </Pressable>

      {/* Circle plan */}
      <Pressable testID="plan-circle" onPress={() => setPlan('circle')} style={[s.plan, plan === 'circle' && s.planOn]}>
        <View style={s.planRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.planName}>Circle <Text style={s.tag}>5 SEATS</Text></Text>
            <Text style={s.planDesc}>For a household, team, or care circle.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.planPrice}>{fmt(period === 'annual' ? PRICES_CENTS.CIRCLE.annual : PRICES_CENTS.CIRCLE.monthly)}</Text>
            <Text style={s.per}>/{period === 'annual' ? 'yr' : 'mo'}</Text>
          </View>
        </View>
      </Pressable>

      {/* CTA */}
      <Pressable
        testID="cta-trial"
        style={s.btn}
        onPress={() => { if (typeof window !== 'undefined') window.location.href = '/'; }}
      >
        <Text style={s.btnTxt}>Start {TRIAL_DAYS}-day free trial →</Text>
      </Pressable>

      <Pressable testID="cta-later" onPress={() => router.push('/' as any)}>
        <Text style={s.later}>Maybe later — continue with limited access</Text>
      </Pressable>

      <Text style={s.fine}>No charge for {TRIAL_DAYS} days. Cancel anytime in Settings.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 520, alignSelf: 'center', width: '100%', paddingTop: 50, paddingBottom: 60 },
  eyebrow: { color: '#4FD1E8', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 12 },
  q: { color: '#E9EEF8', fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 6, letterSpacing: -0.5 },
  hint: { color: '#8A94AA', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(20,24,38,0.55)', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(150,175,220,0.10)' },
  tBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
  tBtnOn: { backgroundColor: 'rgba(79,209,232,0.10)' },
  tTxt: { color: '#8A94AA', fontSize: 13, fontWeight: '600' },
  plan: { padding: 18, borderRadius: 14, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.10)', marginBottom: 12 },
  planOn: { borderColor: '#4FD1E8', backgroundColor: 'rgba(79,209,232,0.06)' },
  planRow: { flexDirection: 'row', alignItems: 'center' },
  planName: { color: '#E9EEF8', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tag: { color: '#4FD1E8', fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  planDesc: { color: '#8A94AA', fontSize: 13, lineHeight: 18 },
  planPrice: { color: '#E9EEF8', fontSize: 24, fontWeight: '700' },
  per: { color: '#8A94AA', fontSize: 12, fontWeight: '500' },
  btn: { backgroundColor: '#4FD1E8', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
  later: { color: '#8A94AA', fontSize: 14, textAlign: 'center', marginTop: 16, padding: 12 },
  fine: { color: '#8A94AA', fontSize: 11, textAlign: 'center', marginTop: 8 },
});
