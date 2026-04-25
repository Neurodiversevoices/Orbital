// 2026 avatar tunings — orb-as-avatar
// Rule: no stock photos, no generated faces, no copyrighted IP.
// Each tuning is a non-identity-loaded label + Skia render parameters.
// Matches the app's capacity spectrum color system from orbColors.ts.

export type OrbTuningId =
  | 'aurora' | 'dusk' | 'storm' | 'tide'
  | 'quartz' | 'ember' | 'mist'  | 'glow';

export type OrbTuning = {
  id: OrbTuningId;
  label: string;
  seedColor: string;       // hex — dominant before state-shift overlay
  haloIntensity: number;   // 0..1
  particleDensity: number; // 0..1
};

export const ORB_TUNINGS: Record<OrbTuningId, OrbTuning> = {
  aurora: { id: 'aurora', label: 'Aurora', seedColor: '#2DD4BF', haloIntensity: 0.6, particleDensity: 0.4 },
  dusk:   { id: 'dusk',   label: 'Dusk',   seedColor: '#7A5BD9', haloIntensity: 0.5, particleDensity: 0.3 },
  storm:  { id: 'storm',  label: 'Storm',  seedColor: '#3A4A6A', haloIntensity: 0.4, particleDensity: 0.6 },
  tide:   { id: 'tide',   label: 'Tide',   seedColor: '#2D8AA8', haloIntensity: 0.5, particleDensity: 0.5 },
  quartz: { id: 'quartz', label: 'Quartz', seedColor: '#B8C0CC', haloIntensity: 0.7, particleDensity: 0.2 },
  ember:  { id: 'ember',  label: 'Ember',  seedColor: '#E58547', haloIntensity: 0.6, particleDensity: 0.4 },
  mist:   { id: 'mist',   label: 'Mist',   seedColor: '#8FA8B8', haloIntensity: 0.4, particleDensity: 0.3 },
  glow:   { id: 'glow',   label: 'Glow',   seedColor: '#F5B547', haloIntensity: 0.7, particleDensity: 0.5 },
};
