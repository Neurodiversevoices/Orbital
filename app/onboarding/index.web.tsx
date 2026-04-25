import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={s.root} testID="screen-onboarding-welcome">
      <View style={s.inner}>
        <Text style={s.eyebrow}>WELCOME TO ORBITAL</Text>
        <Text style={s.headline}>Know your capacity before it breaks.</Text>
        <Text style={s.sub}>Capacity intelligence for anyone running close to their limit. Three minutes to set up. Seven days free.</Text>
        <Pressable testID="ob-continue" style={s.btn} onPress={() => router.push('/onboarding/segment' as any)}>
          <Text style={s.btnTxt}>Begin →</Text>
        </Pressable>
        <Text style={s.fine}>Step 1 of 5</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A', padding: 24, justifyContent: 'center', alignItems: 'center', minHeight: 600 },
  inner: { maxWidth: 520, width: '100%' },
  eyebrow: { color: '#4FD1E8', fontSize: 11, letterSpacing: 4, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  headline: { color: '#E9EEF8', fontSize: 40, fontWeight: '600', textAlign: 'center', lineHeight: 44, marginBottom: 20, letterSpacing: -1 },
  sub: { color: '#8A94AA', fontSize: 17, textAlign: 'center', lineHeight: 26, marginBottom: 48 },
  btn: { backgroundColor: '#4FD1E8', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: '#01020A', fontSize: 17, fontWeight: '700' },
  fine: { color: '#8A94AA', fontSize: 11, letterSpacing: 2, marginTop: 20, textAlign: 'center' },
});
