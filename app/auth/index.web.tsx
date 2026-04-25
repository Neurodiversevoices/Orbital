import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/supabase';

type Mode = 'home' | 'signin' | 'signup' | 'forgot';

export default function AuthWeb() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => { setError(null); setSuccess(null); setPassword(''); };

  const onSuccess = useCallback(() => {
    router.replace('/(tabs)' as any);
  }, [router]);

  const handleEmail = async () => {
    if (!email.trim()) { setError('Enter your email'); return; }
    if (!password) { setError('Enter your password'); return; }
    setBusy(true); setError(null);
    if (mode === 'signup') {
      const r = await auth.signUpWithEmail(email, password);
      setBusy(false);
      if (r.success) {
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin'); setPassword('');
      } else { setError(r.error || 'Sign up failed'); }
    } else {
      const r = await auth.signInWithEmail(email, password);
      setBusy(false);
      if (r.success) { onSuccess(); }
      else { setError(r.error || 'Sign in failed'); }
    }
  };

  const handleGoogle = async () => {
    setBusy(true); setError(null);
    const r = await auth.signInWithGoogle();
    if (!r.success) { setBusy(false); setError(r.error || 'Google sign-in failed'); }
    // On success the page redirects via OAuth — no setBusy(false) needed
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError('Enter your email above first'); return; }
    setBusy(true); setError(null);
    const r = await auth.resetPassword(email.trim());
    setBusy(false);
    if (r.success) { setSuccess('Password reset email sent. Check your inbox.'); }
    else { setError(r.error || 'Could not send reset email'); }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} testID="screen-auth">
      {/* Logo mark */}
      <View style={s.logo}>
        <View style={s.orb} />
        <Text style={s.brand}>Orbital</Text>
        <Text style={s.sub}>CAPACITY INTELLIGENCE</Text>
      </View>

      {/* Banners */}
      {error ? <View style={s.errBanner}><Text style={s.errTxt}>{error}</Text></View> : null}
      {success ? <View style={s.okBanner}><Text style={s.okTxt}>{success}</Text></View> : null}

      {mode === 'home' && (
        <View style={s.stack}>
          <Pressable testID="auth-email-btn" style={s.glassBtn} onPress={() => { setMode('signin'); reset(); }}>
            <Text style={s.glassTxt}>Sign in with email</Text>
          </Pressable>
          <Pressable testID="auth-google-btn" style={s.glassBtn} onPress={handleGoogle} disabled={busy}>
            {busy ? <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" /> : <Text style={s.glassTxt}>Sign in with Google</Text>}
          </Pressable>
          <Pressable style={s.link} onPress={() => { setMode('signup'); reset(); }}>
            <Text style={s.linkTxt}>New here? Create account</Text>
          </Pressable>
          <Pressable style={s.link} onPress={() => { setMode('forgot'); reset(); }}>
            <Text style={s.dimTxt}>Forgot password?</Text>
          </Pressable>
        </View>
      )}

      {(mode === 'signin' || mode === 'signup') && (
        <View style={s.form}>
          <Text style={s.formTitle}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
          <TextInput
            testID="auth-email-input"
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#8A94AA"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            testID="auth-password-input"
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#8A94AA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable
            testID="auth-submit-btn"
            style={[s.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={handleEmail}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#01020A" size="small" />
              : <Text style={s.primaryTxt}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
            }
          </Pressable>
          {mode === 'signin' && (
            <Pressable style={s.link} onPress={handleForgot} disabled={busy}>
              <Text style={s.dimTxt}>Forgot password?</Text>
            </Pressable>
          )}
          <Pressable style={s.link} onPress={() => { setMode('home'); reset(); }}>
            <Text style={s.dimTxt}>← Back</Text>
          </Pressable>
        </View>
      )}

      {mode === 'forgot' && (
        <View style={s.form}>
          <Text style={s.formTitle}>Reset password</Text>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#8A94AA"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={handleForgot} disabled={busy}>
            {busy ? <ActivityIndicator color="#01020A" size="small" /> : <Text style={s.primaryTxt}>Send reset email</Text>}
          </Pressable>
          <Pressable style={s.link} onPress={() => { setMode('home'); reset(); }}>
            <Text style={s.dimTxt}>← Back</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#01020A' },
  content: { padding: 24, maxWidth: 420, alignSelf: 'center', width: '100%', paddingTop: 80, paddingBottom: 80, alignItems: 'center' },
  logo: { alignItems: 'center', marginBottom: 48 },
  orb: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(79,209,232,0.15)', borderWidth: 2, borderColor: '#4FD1E8', marginBottom: 16 },
  brand: { color: '#E9EEF8', fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: '#8A94AA', fontSize: 10, letterSpacing: 4, marginTop: 6 },
  errBanner: { width: '100%', backgroundColor: 'rgba(229,72,77,0.12)', borderWidth: 1, borderColor: 'rgba(229,72,77,0.30)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errTxt: { color: '#E5484D', fontSize: 14, textAlign: 'center' },
  okBanner: { width: '100%', backgroundColor: 'rgba(79,209,232,0.08)', borderWidth: 1, borderColor: 'rgba(79,209,232,0.28)', borderRadius: 12, padding: 12, marginBottom: 16 },
  okTxt: { color: '#4FD1E8', fontSize: 14, textAlign: 'center' },
  stack: { width: '100%', gap: 12 },
  glassBtn: { width: '100%', height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  glassTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500' },
  primaryBtn: { width: '100%', height: 54, borderRadius: 14, backgroundColor: '#4FD1E8', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryTxt: { color: '#01020A', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 12 },
  linkTxt: { color: '#4FD1E8', fontSize: 14 },
  dimTxt: { color: '#8A94AA', fontSize: 13 },
  form: { width: '100%' },
  formTitle: { color: '#E9EEF8', fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  input: { width: '100%', backgroundColor: 'rgba(20,24,38,0.55)', borderWidth: 1, borderColor: 'rgba(150,175,220,0.15)', borderRadius: 12, padding: 14, color: '#E9EEF8', fontSize: 16, marginBottom: 12 },
});
