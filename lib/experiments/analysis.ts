/**
 * Experiment Analysis
 *
 * Computes outcomes without judgment.
 * Reports correlation, never causation.
 */

import { Experiment, ExperimentDay, ExperimentResult, OBSERVATIONAL_LANGUAGE } from './types';
import { getExperimentDays } from './storage';

export async function analyzeExperiment(experiment: Experiment): Promise<ExperimentResult> {
  const days = await getExperimentDays(experiment.id);

  const followedDays = days.filter(d => d.followed === 'yes');
  const notFollowedDays = days.filter(d => d.followed === 'no');

  const computeStats = (dayList: ExperimentDay[]) => {
    if (dayList.length === 0) {
      return {
        count: 0,
        avgCapacity: 0,
        distribution: { resourced: 0, stretched: 0, depleted: 0 },
      };
    }

    let totalCapacity = 0;
    let capacityCount = 0;
    const distribution = { resourced: 0, stretched: 0, depleted: 0 };

    dayList.forEach(day => {
      day.capacityValues.forEach(val => {
        totalCapacity += val;
        capacityCount++;
        if (val >= 75) distribution.resourced++;
        else if (val >= 25) distribution.stretched++;
        else distribution.depleted++;
      });
    });

    return {
      count: dayList.length,
      avgCapacity: capacityCount > 0 ? Math.round(totalCapacity / capacityCount) : 0,
      distribution,
    };
  };

  const followedStats = computeStats(followedDays);
  const notFollowedStats = computeStats(notFollowedDays);

  const capacityDiff = followedStats.avgCapacity - notFollowedStats.avgCapacity;
  const hasEnoughData = followedStats.count >= 2 && notFollowedStats.count >= 1;

  let correlationObserved = false;
  let correlationDirection: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (hasEnoughData && Math.abs(capacityDiff) >= 15) {
    correlationObserved = true;
    correlationDirection = capacityDiff > 0 ? 'positive' : 'negative';
  }

  let summary = '';

  if (!hasEnoughData) {
    summary = "Not enough data points to observe a pattern. Consider running another experiment.";
  } else if (correlationDirection === 'positive') {
    const followedLabel = followedStats.avgCapacity >= 75 ? 'Resourced' : followedStats.avgCapacity >= 25 ? 'Stretched' : 'Depleted';
    summary = `When you followed the experiment, capacity was ${followedLabel} on average (${followedStats.avgCapacity}%). ${OBSERVATIONAL_LANGUAGE.correlation}`;
  } else if (correlationDirection === 'negative') {
    summary = `Capacity was lower when following the experiment. This may indicate the hypothesis needs adjustment. ${OBSERVATIONAL_LANGUAGE.correlation}`;
  } else {
    summary = `${OBSERVATIONAL_LANGUAGE.noCorrelation} Capacity was similar whether the experiment was followed or not.`;
  }

  summary += ` ${OBSERVATIONAL_LANGUAGE.closing}`;

  return {
    experimentId: experiment.id,
    hypothesis: experiment.hypothesis,
    durationDays: Math.ceil((Date.now() - experiment.createdAt) / (24 * 60 * 60 * 1000)),
    followedDays: followedStats,
    notFollowedDays: notFollowedStats,
    correlationObserved,
    correlationDirection,
    summary,
  };
}

export function formatResultForDisplay(result: ExperimentResult): {
  headline: string;
  followedSummary: string;
  notFollowedSummary: string;
  conclusion: string;
} {
  const formatDistribution = (dist: { resourced: number; stretched: number; depleted: number }) => {
    const total = dist.resourced + dist.stretched + dist.depleted;
    if (total === 0) return 'No data';
    const parts: string[] = [];
    if (dist.resourced > 0) parts.push(`${dist.resourced} Resourced`);
    if (dist.stretched > 0) parts.push(`${dist.stretched} Stretched`);
    if (dist.depleted > 0) parts.push(`${dist.depleted} Depleted`);
    return parts.join(', ');
  };

  let headline = '';
  if (result.correlationObserved) {
    if (result.correlationDirection === 'positive') {
      headline = 'A positive correlation was observed';
    } else {
      headline = 'An unexpected correlation was observed';
    }
  } else {
    headline = 'No clear correlation was observed';
  }

  const followedSummary = result.followedDays.count > 0
    ? `${result.followedDays.count} days followed • Avg capacity: ${result.followedDays.avgCapacity}%\n${formatDistribution(result.followedDays.distribution)}`
    : 'No days marked as followed';

  const notFollowedSummary = result.notFollowedDays.count > 0
    ? `${result.notFollowedDays.count} days not followed • Avg capacity: ${result.notFollowedDays.avgCapacity}%\n${formatDistribution(result.notFollowedDays.distribution)}`
    : 'No days marked as not followed';

  return {
    headline,
    followedSummary,
    notFollowedSummary,
    conclusion: result.summary,
  };
}
