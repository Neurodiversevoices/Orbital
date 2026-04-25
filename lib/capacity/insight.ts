import type { CapacityScore, Insight } from './types';

export function generateInsight(score: CapacityScore): Insight {
  if (score.state === 'DEPLETED') {
    return { title: 'One thing today', recommendation: '20 minutes of low-stim time before 4 PM.' };
  }
  if (score.state === 'ELEVATED') {
    return {
      title: 'One thing today',
      recommendation: 'Protect tomorrow’s morning block, no meetings before 10 AM.',
    };
  }
  return { title: 'One thing today', recommendation: 'You’re in your typical range. Use it.' };
}
