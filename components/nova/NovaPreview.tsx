// NovaPreview — 9:16 still preview. expo-av is intentionally not imported.
import { memo } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import type { RenderResult } from '../../lib/nova/wardrobeApi';

interface Props { result: RenderResult | null; loading: boolean; loadingLabel?: string }

function Base({ result, loading, loadingLabel }: Props) {
  return (
    <View style={s.frame} testID="nova-preview">
      {result?.poster_url ? (
        <Image source={{ uri: result.poster_url }} style={s.poster} resizeMode="cover" />
      ) : (
        <View style={[s.poster, s.empty]}>
          <Text style={s.emptyText}>Pick a combo to see Nova</Text>
        </View>
      )}
      {loading ? (
        <View style={s.overlay}>
          <ActivityIndicator color={colors.accent} />
          <Text style={s.overlayText} numberOfLines={1}>{loadingLabel || 'Working...'}</Text>
        </View>
      ) : null}
      {result?.video_url && !loading ? (
        <View style={s.badge} pointerEvents="none"><Text style={s.badgeText}>LIVE</Text></View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    aspectRatio: 9 / 16, width: '100%', borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  poster: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(1,2,10,0.70)',
  },
  overlayText: { color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 13, flexShrink: 1 },
  badge: {
    position: 'absolute', top: 12, left: 12, paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 6, backgroundColor: 'rgba(0,255,255,0.18)',
    borderWidth: 1, borderColor: colors.accentDim,
  },
  badgeText: { color: colors.accent, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.4 },
});

export const NovaPreview = memo(Base);
