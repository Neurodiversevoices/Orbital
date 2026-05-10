// NovaCollection — 3-col grid of saved Nova looks for the current user.
import { memo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import type { SavedLook } from '../../lib/nova/wardrobeApi';

interface Props { looks: SavedLook[]; onSelect: (look: SavedLook) => void }

function Base({ looks, onSelect }: Props) {
  if (looks.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>No saved looks yet</Text>
        <Text style={s.emptyHint}>Compose a combo, hit Save look, and Nova lives here.</Text>
      </View>
    );
  }
  return (
    <View style={s.grid}>
      {looks.map(l => (
        <Pressable
          key={l.id} onPress={() => onSelect(l)} style={s.tile}
          accessibilityRole="button" accessibilityLabel={`Saved look ${l.saved_name}`}
        >
          {l.poster_url
            ? <Image source={{ uri: l.poster_url }} style={s.tileImg} />
            : <View style={[s.tileImg, s.tilePlaceholder]} />}
          <Text style={s.tileName} numberOfLines={1}>{l.saved_name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '31%', aspectRatio: 9 / 16, borderRadius: 10, overflow: 'hidden',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tileImg: { width: '100%', height: '100%' },
  tilePlaceholder: { backgroundColor: colors.card },
  tileName: {
    position: 'absolute', bottom: 6, left: 6, right: 6,
    color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 11,
    backgroundColor: 'rgba(1,2,10,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  empty: { paddingVertical: 24, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  emptyText: { color: colors.textPrimary, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  emptyHint: { color: colors.textSecondary, fontFamily: 'DMSans_500Medium', fontSize: 12, textAlign: 'center' },
});

export const NovaCollection = memo(Base);
