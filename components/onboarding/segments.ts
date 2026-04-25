export const SEGMENTS = [
  { id: 'founder',    label: 'Founders & Leaders',      sub: 'Run hard without breaking',                                             color: '#4FD1E8' },
  { id: 'parent',     label: 'Parents & Caregivers',    sub: 'Read your capacity before the day demands more than you have',          color: '#F2B134' },
  { id: 'frontline',  label: 'Frontline & Healthcare',  sub: 'Track the cost of always being on',                                     color: '#E5484D' },
  { id: 'recovery',   label: 'Burnout Recovery',        sub: 'Rebuild without relapsing',                                             color: '#F2B134' },
  { id: 'nd',         label: 'Neurodivergent Adults',   sub: 'Run on your own clock, not someone else\u2019s',                        color: '#4FD1E8' },
  { id: 'clinician',  label: 'Therapists & Clinicians', sub: 'Read your clients without violating privacy',                           color: '#4FD1E8' },
] as const;

export type SegmentId = typeof SEGMENTS[number]['id'];

export const DRAINS = [
  { id: 'meetings',  label: 'Back-to-back meetings' },
  { id: 'sensory',   label: 'Sensory overload' },
  { id: 'social',    label: 'High social demand' },
  { id: 'physical',  label: 'Physical exhaustion' },
  { id: 'sleep',     label: 'Sleep disruption' },
  { id: 'masking',   label: 'Masking / suppressing' },
  { id: 'emotional', label: 'Emotional labor' },
  { id: 'context',   label: 'Constant context-switching' },
];
