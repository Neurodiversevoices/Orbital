/**
 * Experiment Suggestions
 *
 * Generates experiment suggestions from detected patterns.
 * Questions only - no advice, no commands.
 */

import { CapacityLog, CapacityState } from '../../types';
import { ExperimentSuggestion, EXPERIMENT_CONSTANTS } from './types';
import { getActiveExperiment, isPatternDeclined } from './storage';

interface PatternDetection {
  type: string;
  description: string;
  confidence: number;
  data: Record<string, unknown>;
}

function capacityToValue(state: CapacityState): number {
  return state === 'resourced' ? 100 : state === 'stretched' ? 50 : 0;
}

function detectDayOfWeekPattern(logs: CapacityLog[]): PatternDetection | null {
  const dayStats: { [key: number]: { total: number; count: number; depleted: number } } = {};
  for (let i = 0; i < 7; i++) dayStats[i] = { total: 0, count: 0, depleted: 0 };

  logs.forEach(log => {
    const day = new Date(log.timestamp).getDay();
    dayStats[day].total += capacityToValue(log.state);
    dayStats[day].count++;
    if (log.state === 'depleted') dayStats[day].depleted++;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let worstDay = -1;
  let worstAvg = 100;
  let worstDepleted = 0;

  for (let i = 0; i < 7; i++) {
    if (dayStats[i].count >= 3) {
      const avg = dayStats[i].total / dayStats[i].count;
      if (avg < worstAvg) {
        worstAvg = avg;
        worstDay = i;
        worstDepleted = dayStats[i].depleted;
      }
    }
  }

  if (worstDay >= 0 && worstAvg < 40 && worstDepleted >= 2) {
    return {
      type: `day_of_week_${dayNames[worstDay].toLowerCase()}`,
      description: `${dayNames[worstDay]}s often show lower capacity`,
      confidence: Math.min(0.9, worstDepleted / dayStats[worstDay].count),
      data: { day: worstDay, dayName: dayNames[worstDay], avgCapacity: worstAvg, depletedCount: worstDepleted },
    };
  }
  return null;
}

function detectCategoryPattern(logs: CapacityLog[]): PatternDetection | null {
  const categoryStats: { [key: string]: { total: number; count: number; depleted: number } } = {
    sensory: { total: 0, count: 0, depleted: 0 },
    social: { total: 0, count: 0, depleted: 0 },
    demand: { total: 0, count: 0, depleted: 0 },
  };

  logs.forEach(log => {
    if (log.category) {
      categoryStats[log.category].count++;
      categoryStats[log.category].total += capacityToValue(log.state);
      if (log.state === 'depleted') categoryStats[log.category].depleted++;
    }
    log.tags?.forEach(tag => {
      if (tag in categoryStats) {
        categoryStats[tag].count++;
        categoryStats[tag].total += capacityToValue(log.state);
        if (log.state === 'depleted') categoryStats[tag].depleted++;
      }
    });
  });

  const categoryNames: { [key: string]: string } = {
    sensory: 'Sensory load',
    social: 'Social demand',
    demand: 'Task demand',
  };

  let dominantCategory = '';
  let highestDepleted = 0;

  for (const cat of Object.keys(categoryStats)) {
    if (categoryStats[cat].depleted > highestDepleted && categoryStats[cat].count >= 3) {
      highestDepleted = categoryStats[cat].depleted;
      dominantCategory = cat;
    }
  }

  if (dominantCategory && highestDepleted >= 3) {
    return {
      type: `category_${dominantCategory}`,
      description: `${categoryNames[dominantCategory]} frequently appears with lower capacity`,
      confidence: Math.min(0.85, highestDepleted / categoryStats[dominantCategory].count),
      data: { category: dominantCategory, categoryName: categoryNames[dominantCategory], depletedCount: highestDepleted },
    };
  }
  return null;
}

function detectConsecutivePattern(logs: CapacityLog[]): PatternDetection | null {
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate = '';

  sorted.forEach(log => {
    const date = log.localDate || new Date(log.timestamp).toISOString().split('T')[0];
    if (log.state === 'depleted') {
      if (lastDate) {
        const prev = new Date(lastDate);
        const curr = new Date(date);
        const diff = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
        if (diff <= 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastDate = date;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
      lastDate = '';
    }
  });

  if (maxStreak >= 3) {
    return {
      type: 'consecutive_depletion',
      description: `Extended periods of low capacity observed`,
      confidence: Math.min(0.8, maxStreak / 5),
      data: { maxStreak },
    };
  }
  return null;
}

function patternToSuggestion(pattern: PatternDetection): ExperimentSuggestion {
  const suggestions: { [key: string]: { question: string; hypotheses: string[] } } = {
    day_of_week_monday: {
      question: "Mondays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Reduce commitments on Mondays",
        "Add recovery time Sunday evening",
        "Start Monday with lighter tasks",
        "Write your own...",
      ],
    },
    day_of_week_tuesday: {
      question: "Tuesdays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Reduce commitments on Tuesdays",
        "Schedule recovery after Monday",
        "Limit meetings on Tuesdays",
        "Write your own...",
      ],
    },
    day_of_week_wednesday: {
      question: "Wednesdays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Add a midweek break",
        "Reduce Wednesday commitments",
        "Schedule lighter work midweek",
        "Write your own...",
      ],
    },
    day_of_week_thursday: {
      question: "Thursdays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Reduce Thursday commitments",
        "Add recovery time Thursday",
        "Prepare for end-of-week earlier",
        "Write your own...",
      ],
    },
    day_of_week_friday: {
      question: "Fridays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Reduce Friday commitments",
        "End work earlier on Fridays",
        "Avoid scheduling draining tasks Friday",
        "Write your own...",
      ],
    },
    day_of_week_saturday: {
      question: "Saturdays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Protect Saturday for recovery",
        "Reduce weekend social obligations",
        "Schedule rest, not productivity",
        "Write your own...",
      ],
    },
    day_of_week_sunday: {
      question: "Sundays often show lower capacity. Would you like to explore why?",
      hypotheses: [
        "Reduce Sunday anticipation stress",
        "Create a Sunday wind-down ritual",
        "Avoid planning for Monday on Sunday",
        "Write your own...",
      ],
    },
    category_sensory: {
      question: "Sensory load often appears with lower capacity. Would you like to explore this?",
      hypotheses: [
        "Reduce sensory exposure when possible",
        "Add sensory breaks throughout the day",
        "Use noise-canceling or dim lighting",
        "Write your own...",
      ],
    },
    category_social: {
      question: "Social demand often appears with lower capacity. Would you like to explore this?",
      hypotheses: [
        "Limit social commitments per day",
        "Add recovery time after social events",
        "Schedule solo time daily",
        "Write your own...",
      ],
    },
    category_demand: {
      question: "Task demand often appears with lower capacity. Would you like to explore this?",
      hypotheses: [
        "Reduce concurrent tasks",
        "Set clearer boundaries on workload",
        "Add buffer time between tasks",
        "Write your own...",
      ],
    },
    consecutive_depletion: {
      question: "Extended periods of low capacity have occurred. Would you like to explore prevention?",
      hypotheses: [
        "Add a recovery day after 2 low days",
        "Reduce commitments when capacity drops",
        "Create an early warning ritual",
        "Write your own...",
      ],
    },
  };

  const match = suggestions[pattern.type] || {
    question: "A pattern was noticed. Would you like to explore it?",
    hypotheses: ["Try a change for a few weeks", "Write your own..."],
  };

  return {
    id: `sug_${pattern.type}_${Date.now()}`,
    patternType: pattern.type,
    patternDescription: pattern.description,
    question: match.question,
    hypotheses: match.hypotheses,
  };
}

export async function detectPatterns(logs: CapacityLog[]): Promise<PatternDetection[]> {
  if (logs.length < EXPERIMENT_CONSTANTS.MIN_DAYS_FOR_SUGGESTION) return [];

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter(l => l.timestamp >= cutoff);
  if (recentLogs.length < 7) return [];

  const patterns: PatternDetection[] = [];

  const dayPattern = detectDayOfWeekPattern(recentLogs);
  if (dayPattern) patterns.push(dayPattern);

  const categoryPattern = detectCategoryPattern(recentLogs);
  if (categoryPattern) patterns.push(categoryPattern);

  const consecutivePattern = detectConsecutivePattern(recentLogs);
  if (consecutivePattern) patterns.push(consecutivePattern);

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

export async function getSuggestion(logs: CapacityLog[]): Promise<ExperimentSuggestion | null> {
  const active = await getActiveExperiment();
  if (active) return null;

  const patterns = await detectPatterns(logs);

  for (const pattern of patterns) {
    const declined = await isPatternDeclined(pattern.type);
    if (!declined) {
      return patternToSuggestion(pattern);
    }
  }

  return null;
}
