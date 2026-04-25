import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// Inline gauge for onboarding demo — no external deps needed here
function MiniGauge({ value }: { value: number }) {
  const c = value < 0.4 ? '#E5484D' : value > 0.7 ? '#4FD1E8' : '#F2B134';
  const label = value < 0.4 ? 'DEPLETED' : value > 0.7 ? 'RESOURCED' : 'ELEVATED';
  const pct = Math.round(value * 100);
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: c, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,24,38,0.6)' }}>
        <Text style={{ color: '#E9EEF8', fontSize: 52, fontWeight: '600' }}>{pct}</Text>
        <Text style={{ color: c, fontSize: 12, letterSpacing: 3, fontWeight: '600' }}>{label}</Text>
      </View>
    </View>
  );
}

export default function Demo() {
  const router = useRouter();
  const [val, setVal] = useState(0.55);
  useEffect(() => {
    const t = setInterval(() => setVal(0.30 + Math.random() * 0.55), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={s.root} testID="screen-onboarding-demo">
      <View style={s.inner}>
        <Text style={s.eyebrow}>STEP 4 OF 5</Text>
        <Text style={s.q}>This is your capacity, live.</Text>
        <Text style={s.hint}>Cyan = Resourced. Amber = Elevated. Crimson = Depleted.</Text>
        <View style={s.gaugeWrap}>
          <MiniGauge value={val} />
        </View>
        <Pressable testID="ob-continue" style={s.btn} onPress={() => router.push('/onboarding/insight' as any)}>
          <Text style={s.btnTxt}>Log my first capacity →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A', padding: 24, justifyContent: 'center', alignItems: 'center', minHeight: 600 },
  inner: { maxWidth: 520, width: '100%', alignItems: 'center' },
  eyebrow: { color: '#8A94AA', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 16 },
  q: { color: '#E9EEF8', fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 12, letterSpacing: -0.5, textAlign: 'center' },
  hint: { color: '#8A94AA', fontSize: 15, lineHeight: 22, marginBottom: 32, textAlign: 'center' },
  gaugeWrap: { marginBottom: 40 },
  btn: { backgroundColor: '#4FD1E8', padding: 18, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
});
