import AsyncStorage from '@react-native-async-storage/async-storage';
import { CapacityLog, CapacityState, Category } from '../types';
import { getLocalDate } from './baselineUtils';

const LOGS_KEY = '@orbital:logs';

const categories: Category[] = ['sensory', 'demand', 'social'];

// Realistic notes by category
const notesByCategory: Record<Category, string[]> = {
  sensory: [
    'Loud construction outside',
    'Crowded grocery store',
    'Bright fluorescent lights',
    'Noisy restaurant',
    'Strong perfume in elevator',
    'Scratchy clothing tag',
    'Too many notifications',
    'Loud music from neighbors',
    'Overwhelming mall visit',
    'Sirens outside window',
  ],
  demand: [
    'Back-to-back meetings',
    'Deadline pressure',
    'Complex problem solving',
    'Learning new system',
    'Too many tasks',
    'Decision fatigue',
    'Unexpected urgent request',
    'Documentation marathon',
    'Budget planning',
    'Performance review prep',
  ],
  social: [
    'Family dinner',
    'Networking event',
    'Video calls all day',
    'Unexpected visitors',
    'Group project meeting',
    'Birthday party',
    'Difficult conversation',
    'Small talk exhaustion',
    'Crowded social event',
    'Phone call marathon',
  ],
};

const generalNotes: string[] = [
  'Didn\'t sleep well',
  'Skipped breakfast',
  'Forgot medication',
  'Good rest last night',
  'Morning meditation helped',
  'Exercise this morning',
  'Quiet day at home',
  'Took a nap',
  'Went for a walk',
  'Early bedtime',
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Time-of-day energy patterns (0-23 hours)
function getTimeOfDayModifier(hour: number): number {
  // Lower energy: early morning, post-lunch, late evening
  if (hour < 7) return -0.2;        // Early morning fatigue
  if (hour >= 7 && hour < 10) return 0.1;  // Morning energy
  if (hour >= 13 && hour < 15) return -0.15; // Post-lunch dip
  if (hour >= 21) return -0.1;      // Evening fatigue
  return 0;
}

// Day-of-week patterns (0 = Sunday)
function getDayOfWeekModifier(dayOfWeek: number): number {
  // Monday tends to be harder, weekends mixed
  if (dayOfWeek === 1) return -0.15; // Monday blues
  if (dayOfWeek === 5) return 0.1;   // Friday relief
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.05; // Weekends slightly better
  return 0;
}

// Category affects energy state
function getCategoryModifier(category: Category | null): number {
  if (!category) return 0;
  switch (category) {
    case 'sensory': return -0.25;  // Sensory often draining
    case 'demand': return -0.15;   // Demand moderately draining
    case 'social': return -0.1;    // Social varies but slightly draining on average
  }
}

function determineState(
  baseCapacity: number,
  hour: number,
  dayOfWeek: number,
  category: Category | null,
  inCrisis: boolean,
  inRecovery: boolean
): CapacityState {
  let capacity = baseCapacity;

  capacity += getTimeOfDayModifier(hour);
  capacity += getDayOfWeekModifier(dayOfWeek);
  capacity += getCategoryModifier(category);

  if (inCrisis) capacity -= 0.3;
  if (inRecovery) capacity += 0.2;

  // Add some randomness
  capacity += (Math.random() - 0.5) * 0.3;

  // Clamp to 0-1
  capacity = Math.max(0, Math.min(1, capacity));

  if (capacity > 0.6) return 'resourced';
  if (capacity > 0.3) return 'stretched';
  return 'depleted';
}

function pickNote(category: Category | null, state: CapacityState, date: Date): string {
  // Always include a note with context
  const timeOfDay = date.getHours() < 12 ? 'Morning' : date.getHours() < 17 ? 'Afternoon' : 'Evening';
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

  let contextNote = '';

  // Add category-specific note if category exists
  if (category && Math.random() > 0.3) {
    const notes = notesByCategory[category];
    contextNote = notes[Math.floor(Math.random() * notes.length)];
  } else if (Math.random() > 0.5) {
    contextNote = generalNotes[Math.floor(Math.random() * generalNotes.length)];
  }

  // Build the note with time context
  if (contextNote) {
    return `${timeOfDay} - ${contextNote}`;
  }

  // Fallback: just time and day context
  const timeContexts = [
    `${timeOfDay} check-in`,
    `${dayName} ${timeOfDay.toLowerCase()}`,
    `${timeOfDay} log`,
    `End of ${timeOfDay.toLowerCase()}`,
    `${dayName} check-in`,
  ];

  return timeContexts[Math.floor(Math.random() * timeContexts.length)];
}

// Detailed notes with richer context
const detailedNoteTemplates = {
  resourced: [
    'Feeling centered and capable today. {context}',
    'Good energy levels. {context}',
    'Steady and grounded. {context}',
    'Capacity feels solid right now. {context}',
    'In a good rhythm today. {context}',
    'Managed well despite {challenge}. {context}',
    'Recovery going well. {context}',
    'Feeling restored after rest. {context}',
  ],
  stretched: [
    'Managing but running thin. {context}',
    'Feeling the pressure from {challenge}. {context}',
    'Holding it together. {context}',
    'Need to pace myself. {context}',
    'Noticing early warning signs. {context}',
    'Capacity dipping. {context}',
    'Could use a break soon. {context}',
    'Pushing through but aware of limits. {context}',
  ],
  depleted: [
    'Hit the wall. {context}',
    'Overwhelmed by {challenge}. {context}',
    'Need to step back and recover. {context}',
    'Too much today. {context}',
    'Capacity completely drained. {context}',
    'Shutting down. {context}',
    'Everything feels like too much right now. {context}',
    'Need quiet and rest. {context}',
  ],
};

const challengesByCategory: Record<Category, string[]> = {
  sensory: [
    'loud environment', 'bright lights', 'crowded spaces', 'strong smells',
    'uncomfortable textures', 'noise levels', 'visual clutter', 'temperature swings',
  ],
  demand: [
    'deadline pressure', 'back-to-back meetings', 'complex decisions', 'unexpected tasks',
    'mental load', 'cognitive demands', 'multitasking', 'information overload',
  ],
  social: [
    'social obligations', 'difficult conversations', 'group dynamics', 'networking',
    'emotional labor', 'family interactions', 'conflict resolution', 'performance anxiety',
  ],
};

const contextSnippets = [
  'Took a short walk to reset.',
  'Deep breathing helped.',
  'Stepped away for 10 minutes.',
  'Listened to calming music.',
  'Had a quiet lunch alone.',
  'Skipped the optional meeting.',
  'Set boundaries on notifications.',
  'Asked for help with one task.',
  'Moved to a quieter space.',
  'Used noise-canceling headphones.',
  'Took medication on time.',
  'Got outside briefly.',
  'Hydrated and had a snack.',
  'Declined an invitation.',
  'Rescheduled a non-urgent call.',
  'Dimmed the lights.',
  'Wore comfortable clothes.',
  'Limited screen time.',
  '',
  '',
  '',
];

const crisisContexts = [
  'Multiple stressors converging.',
  'Sleep has been poor all week.',
  'No buffer left.',
  'Cumulative strain catching up.',
  'System overload.',
  'Need significant recovery time.',
];

const recoveryContexts = [
  'Taking it slow today.',
  'Prioritizing rest.',
  'Lighter schedule helping.',
  'Being gentle with myself.',
  'Gradual improvement.',
  'One thing at a time.',
];

function pickDetailedNote(
  categories: Category[],
  state: CapacityState,
  date: Date,
  inCrisis: boolean,
  inRecovery: boolean
): string {
  const timeOfDay = date.getHours() < 12 ? 'Morning' : date.getHours() < 17 ? 'Afternoon' : 'Evening';
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

  // Pick a template based on state
  const templates = detailedNoteTemplates[state];
  let note = templates[Math.floor(Math.random() * templates.length)];

  // Pick a challenge based on categories
  const primaryCategory = categories[0];
  const challenges = challengesByCategory[primaryCategory];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];

  // Pick context
  let context = '';
  if (inCrisis) {
    context = crisisContexts[Math.floor(Math.random() * crisisContexts.length)];
  } else if (inRecovery) {
    context = recoveryContexts[Math.floor(Math.random() * recoveryContexts.length)];
  } else {
    context = contextSnippets[Math.floor(Math.random() * contextSnippets.length)];
  }

  // Replace placeholders
  note = note.replace('{challenge}', challenge);
  note = note.replace('{context}', context).trim();

  // Add time prefix
  return `${timeOfDay} - ${note}`;
}

// Helper to yield to event loop
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

export async function generateFakeData(years: number = 1): Promise<number> {
  console.log('[Orbital] Starting data generation for', years, 'years');
  const logs: CapacityLog[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor(years * 365);
  console.log('[Orbital] Will generate', totalDays, 'days of data');

  // Base capacity level that drifts over time (simulates life phases)
  let baseCapacity = 0.6;
  let crisisCounter = 0;  // Days remaining in crisis
  let recoveryCounter = 0; // Days remaining in recovery

  for (let day = totalDays; day >= 0; day--) {
    // Yield every day to prevent UI blocking
    await yieldToMain();
    const date = new Date(now - (day * msPerDay));
    const dayOfWeek = date.getDay();

    // Slowly drift base capacity (simulates life changes)
    baseCapacity += (Math.random() - 0.5) * 0.02;
    baseCapacity = Math.max(0.3, Math.min(0.8, baseCapacity));

    // Randomly trigger crisis periods (bad weeks)
    if (crisisCounter === 0 && recoveryCounter === 0 && Math.random() < 0.02) {
      crisisCounter = Math.floor(Math.random() * 7) + 3; // 3-10 day crisis
    }

    // After crisis, often comes recovery
    if (crisisCounter === 1 && Math.random() < 0.7) {
      recoveryCounter = Math.floor(Math.random() * 5) + 3; // 3-8 day recovery
    }

    const inCrisis = crisisCounter > 0;
    const inRecovery = recoveryCounter > 0;

    if (crisisCounter > 0) crisisCounter--;
    if (recoveryCounter > 0) recoveryCounter--;

    // 1-4 entries per day (more entries on harder days)
    const baseEntries = inCrisis ? 3 : 2;
    const entriesThisDay = Math.floor(Math.random() * 2) + baseEntries - 1;

    for (let entry = 0; entry < entriesThisDay; entry++) {
      // Spread entries throughout day: morning, midday, evening
      let hour: number;
      if (entry === 0) {
        hour = 7 + Math.floor(Math.random() * 3); // 7-9 AM
      } else if (entry === 1) {
        hour = 12 + Math.floor(Math.random() * 3); // 12-2 PM
      } else if (entry === 2) {
        hour = 17 + Math.floor(Math.random() * 3); // 5-7 PM
      } else {
        hour = 20 + Math.floor(Math.random() * 3); // 8-10 PM
      }

      const minute = Math.floor(Math.random() * 60);
      // Calculate from midnight of target day
      const targetDate = new Date(now - (day * msPerDay));
      targetDate.setHours(hour, minute, 0, 0);
      const timestamp = targetDate.getTime();

      // Determine categories (always at least one, sometimes multiple)
      const selectedCategories: Category[] = [];

      // Always pick at least one primary category
      const rand = Math.random();
      if (inCrisis) {
        // During crisis, more sensory and demand issues
        if (rand < 0.4) selectedCategories.push('sensory');
        else if (rand < 0.75) selectedCategories.push('demand');
        else selectedCategories.push('social');
      } else {
        // Normal distribution
        if (rand < 0.33) selectedCategories.push('sensory');
        else if (rand < 0.66) selectedCategories.push('demand');
        else selectedCategories.push('social');
      }

      // 40% chance of adding a second category
      if (Math.random() < 0.4) {
        const remaining = categories.filter(c => !selectedCategories.includes(c));
        if (remaining.length > 0) {
          selectedCategories.push(remaining[Math.floor(Math.random() * remaining.length)]);
        }
      }

      // 15% chance of all three categories (overwhelm days)
      if (Math.random() < 0.15 && selectedCategories.length < 3) {
        const remaining = categories.filter(c => !selectedCategories.includes(c));
        remaining.forEach(c => selectedCategories.push(c));
      }

      const state = determineState(baseCapacity, hour, dayOfWeek, selectedCategories[0], inCrisis, inRecovery);
      const entryDate = new Date(timestamp);
      const note = pickDetailedNote(selectedCategories, state, entryDate, inCrisis, inRecovery);

      logs.push({
        id: generateId(),
        state,
        timestamp,
        tags: selectedCategories,
        note,
        localDate: getLocalDate(timestamp),
        detailsText: note,
      });
    }
  }

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => b.timestamp - a.timestamp);

  console.log('[Orbital] Generated', logs.length, 'entries, saving...');

  // Save to storage
  try {
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    console.log('[Orbital] Saved successfully!');
  } catch (error) {
    console.error('[Orbital] Failed to save:', error);
    throw error;
  }

  return logs.length;
}

export async function clearFakeData(): Promise<void> {
  await AsyncStorage.removeItem(LOGS_KEY);
}
