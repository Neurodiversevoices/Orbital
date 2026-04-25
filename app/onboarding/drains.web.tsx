import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DRAINS } from '../../components/onboarding/segments';

export default function Drains() {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id].slice(0, 3));
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-onboarding-drains">
      <Text style={s.eyebrow}>STEP 3 OF 5</Text>
      <Text style={s.q}>What drains you most?</Text>
      <Text style={s.hint}>Pick up to 3. Orbital will track these as your top capacity costs.</Text>
      <View style={s.grid}>
        {DRAINS.map(d => {
          const on = picked.includes(d.id);
          return (
            <Pressable key={d.id} testID={`drain-${d.id}`} onPress={() => toggle(d.id)} style={[s.chip, on && { borderColor: '#4FD1E8', backgroundColor: 'rgba(79,209,232,0.10)' }]}>
              <Text style={[s.chipTxt, on && { color: '#4FD1E8' }]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable testID="ob-continue" style={[s.btn, picked.length === 0 && { opacity: 0.4 }]} disabled={picked.length === 0} onPress={() => {
        if (typeof window !== 'undefined') sessionStorage.setItem('orbital_drains', JSON.stringify(picked));
        router.push('/onboarding/demo' as any);
      }}>
        <Text style={s.btnTxt}>Continue →</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 540, alignSelf: 'center', width: '100%', paddingTop: 60, paddingBottom: 60 },
  eyebrow: { color: '#8A94AA', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 16 },
  q: { color: '#E9EEF8', fontSize: 32, fontWeight: '600', lineHeight: 38, marginBottom: 8, letterSpacing: -0.5 },
  hint: { color: '#8A94AA', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.15)' },
  chipTxt: { color: '#E9EEF8', fontSize: 14, fontWeight: '500' },
  btn: { backgroundColor: '#4FD1E8', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
});
