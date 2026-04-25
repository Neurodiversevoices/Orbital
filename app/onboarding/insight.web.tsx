import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Insight() {
  const router = useRouter();
  const drains = (typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('orbital_drains') || '[]') : []) as string[];
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-onboarding-insight">
      <Text style={s.eyebrow}>STEP 5 OF 5 · YOUR FIRST PATTERN</Text>
      <Text style={s.q}>You're in <Text style={{ color: '#F2B134' }}>elevated</Text> right now.</Text>
      <Text style={s.body}>
        Most people in your situation restore best with 20 minutes of low-stim time inside the next 90 minutes — before this slips into depleted.
      </Text>
      <View style={s.card}>
        <Text style={s.cardEyebrow}>WHAT YOU UNLOCK WITH ORBITAL</Text>
        <Text style={s.li}>· Daily capacity check-ins (30 seconds)</Text>
        <Text style={s.li}>· Weekly pattern detection</Text>
        <Text style={s.li}>· Predictive alerts before depletion</Text>
        <Text style={s.li}>· Capacity reports for your provider</Text>
        <Text style={s.li}>· {drains.length > 0 ? `Tracks your top ${drains.length} drain${drains.length > 1 ? 's' : ''}` : 'Tracks your top capacity costs'}</Text>
      </View>
      <Pressable testID="ob-paywall" style={s.btn} onPress={() => router.push('/onboarding/paywall' as any)}>
        <Text style={s.btnTxt}>See my plan →</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 520, alignSelf: 'center', width: '100%', paddingTop: 60, paddingBottom: 60 },
  eyebrow: { color: '#F2B134', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 16 },
  q: { color: '#E9EEF8', fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 16, letterSpacing: -0.5 },
  body: { color: '#8A94AA', fontSize: 16, lineHeight: 24, marginBottom: 32 },
  card: { padding: 22, borderRadius: 14, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.10)', marginBottom: 28 },
  cardEyebrow: { color: '#4FD1E8', fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 12 },
  li: { color: '#E9EEF8', fontSize: 14, lineHeight: 24 },
  btn: { backgroundColor: '#4FD1E8', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
});
