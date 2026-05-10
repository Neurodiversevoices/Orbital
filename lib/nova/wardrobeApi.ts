// wardrobeApi — fetch wrapper for the nova-wardrobe Cloudflare Worker.
// Endpoints: GET /catalog/all, POST /preview, POST /render,
// POST /wardrobe/save, GET /wardrobe/:user_id.

const BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_NOVA_WARDROBE_URL) ||
  'https://nova-wardrobe.ericparrish133.workers.dev';

export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'golden_hour' | 'blue_hour' | 'night';

export const TIME_OF_DAY_STOPS: ReadonlyArray<TimeOfDay> = [
  'dawn', 'morning', 'midday', 'golden_hour', 'blue_hour', 'night',
];

export interface CatalogEntry { id: string; label: string; category?: string; thumbnail_url?: string }
export interface Catalog {
  outfits: CatalogEntry[]; scenes: CatalogEntry[]; actions: CatalogEntry[]; moods: CatalogEntry[];
}
export interface NovaCombo {
  outfit_id: string | null; scene_id: string | null;
  action_id: string | null; mood_id: string | null;
  time_of_day: TimeOfDay;
}
export interface PreviewResult {
  combo_hash: string; cached: boolean;
  estimate_usd?: number; queue_position?: number; poster_url?: string;
}
export interface RenderResult {
  combo_hash: string;
  status: 'cached' | 'rendering' | 'queued' | 'error';
  poster_url?: string; video_url?: string;
  duration_seconds?: number; message?: string;
}
export interface SavedLook {
  id: string; combo_hash: string; saved_name: string;
  poster_url?: string; video_url?: string; created_at: string;
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init);
  if (!r.ok) throw new Error(`Nova wardrobe ${path} → ${r.status}`);
  return (await r.json()) as T;
}
const post = (path: string, body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export const fetchCatalog = () => j<Catalog>('/catalog/all');
export const previewCombo = (c: NovaCombo) => j<PreviewResult>('/preview', post('/preview', c));
export const renderCombo = (c: NovaCombo) => j<RenderResult>('/render', post('/render', c));
export const saveLook = (user_id: string, combo_hash: string, saved_name: string) =>
  j<{ ok: true; id: string }>('/wardrobe/save', post('/wardrobe/save', { user_id, combo_hash, saved_name }));
export const userWardrobe = (id: string) =>
  j<{ looks: SavedLook[] }>(`/wardrobe/${encodeURIComponent(id)}`);

export const NOVA_WARDROBE_BASE = BASE;
