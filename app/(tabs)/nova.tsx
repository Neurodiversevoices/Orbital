// Nova tab — wardrobe picker & live customization surface.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useAuth } from '../../lib/supabase';
import { useHaptics } from '../../lib/haptics/useHaptics';
import { useSpringIn } from '../../lib/animations/useSpringIn';
import { NovaPicker } from '../../components/nova/NovaPicker';
import { NovaPreview } from '../../components/nova/NovaPreview';
import { NovaCollection } from '../../components/nova/NovaCollection';
import {
  fetchCatalog, previewCombo, renderCombo, saveLook, userWardrobe,
  type Catalog, type NovaCombo, type RenderResult, type SavedLook,
} from '../../lib/nova/wardrobeApi';

const INITIAL: NovaCombo = {
  outfit_id: null, scene_id: null, action_id: null, mood_id: null, time_of_day: 'midday',
};
const isComplete = (c: NovaCombo) =>
  Boolean(c.outfit_id && c.scene_id && c.action_id && c.mood_id);

export default function NovaScreen() {
  const auth = useAuth();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const entry = useSpringIn(80);

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [combo, setCombo] = useState<NovaCombo>(INITIAL);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [busy, setBusy] = useState(false);

  // Boot — pull catalog + saved wardrobe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, w] = await Promise.all([
          fetchCatalog(),
          auth.user?.id ? userWardrobe(auth.user.id) : Promise.resolve({ looks: [] }),
        ]);
        if (!cancelled) { setCatalog(cat); setLooks(w.looks); }
      } catch { /* surface inline */ }
    })();
    return () => { cancelled = true; };
  }, [auth.user?.id]);

  // Cheap preview lookup whenever the combo is fully specified.
  useEffect(() => {
    if (!isComplete(combo)) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setLoadingLabel('Checking cache...');
      try {
        const p = await previewCombo(combo);
        if (cancelled) return;
        setRender(p.cached && p.poster_url
          ? { combo_hash: p.combo_hash, status: 'cached', poster_url: p.poster_url }
          : {
              combo_hash: p.combo_hash, status: 'queued', poster_url: p.poster_url,
              message: typeof p.estimate_usd === 'number'
                ? `first time render · ~$${p.estimate_usd.toFixed(2)}`
                : undefined,
            });
      } catch { /* user can still hit Make her live */ }
      finally { if (!cancelled) { setBusy(false); setLoadingLabel(''); } }
    })();
    return () => { cancelled = true; };
  }, [combo]);

  const makeLive = useCallback(async () => {
    if (!isComplete(combo)) {
      haptics.error();
      Alert.alert('Pick all four', 'Choose an outfit, scene, action, and mood first.');
      return;
    }
    haptics.press();
    setBusy(true);
    const start = Date.now();
    setLoadingLabel('Composing scene...');
    const t1 = setTimeout(() => setLoadingLabel('Rendering still...'), 5_000);
    const t2 = setTimeout(() => setLoadingLabel('Generating motion...'), 30_000);
    try {
      const result = await renderCombo(combo);
      const seconds = Math.max(1, Math.round((Date.now() - start) / 1000));
      setRender(result);
      setLoadingLabel(`Done · ${seconds}s`);
      haptics.success();
    } catch (e) {
      haptics.error();
      Alert.alert('Render failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      clearTimeout(t1); clearTimeout(t2);
      setBusy(false);
      setTimeout(() => setLoadingLabel(''), 1_500);
    }
  }, [combo, haptics]);

  const onSave = useCallback(async () => {
    if (!auth.user?.id) {
      haptics.error(); Alert.alert('Sign in to save', 'Saved looks live in your wardrobe.'); return;
    }
    if (!render?.combo_hash) {
      haptics.error(); Alert.alert('Render first', 'Make her live so we have something to save.'); return;
    }
    haptics.press();
    try {
      const name = `Look · ${new Date().toLocaleDateString()}`;
      await saveLook(auth.user.id, render.combo_hash, name);
      const next = await userWardrobe(auth.user.id);
      setLooks(next.looks); haptics.success();
    } catch (e) {
      haptics.error();
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again');
    }
  }, [auth.user?.id, render?.combo_hash, haptics]);

  const ctaLabel = useMemo(() => {
    if (busy) return loadingLabel || 'Working...';
    if (render?.status === 'cached') return 'Loaded from library';
    return 'Make her live';
  }, [busy, render?.status, loadingLabel]);

  return (
    <View style={[s.container, { paddingTop: insets.top + 12 }]} testID="nova-screen">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={entry}>
          <Text style={s.title}>Nova</Text>
          <Text style={s.subtitle}>Dress her. Set the scene. Make her live.</Text>
        </Animated.View>

        <NovaPreview result={render} loading={busy} loadingLabel={loadingLabel} />
        <NovaPicker catalog={catalog} value={combo} onChange={setCombo} />

        <Pressable
          onPress={makeLive} disabled={busy}
          style={[s.ctaPrimary, busy && s.ctaDisabled]}
          accessibilityRole="button" accessibilityLabel={ctaLabel}
        >
          <Text style={s.ctaPrimaryText}>{ctaLabel}</Text>
        </Pressable>

        <Pressable onPress={onSave} style={s.ctaSecondary} accessibilityRole="button">
          <Text style={s.ctaSecondaryText}>Save look</Text>
        </Pressable>

        <Text style={s.sectionLabel}>Your wardrobe</Text>
        <NovaCollection
          looks={looks}
          onSelect={l => {
            haptics.tick();
            if (l.poster_url || l.video_url) {
              setRender({
                combo_hash: l.combo_hash, status: 'cached',
                poster_url: l.poster_url, video_url: l.video_url,
              });
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { color: colors.textPrimary, fontFamily: 'DMSans_700Bold', fontSize: 28, letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 2 },
  ctaPrimary: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaPrimaryText: {
    color: colors.background, fontFamily: 'DMSans_700Bold', fontSize: 15, letterSpacing: 0.5,
  },
  ctaSecondary: {
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card,
  },
  ctaSecondaryText: { color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  sectionLabel: {
    color: colors.textSecondary, fontFamily: 'DMSans_500Medium',
    fontSize: 12, letterSpacing: 1, marginTop: 8,
  },
});
