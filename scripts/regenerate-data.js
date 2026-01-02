// Script to regenerate demo data for web testing
// Run with: node scripts/regenerate-data.js

const fs = require('fs');
const path = require('path');

const categories = ['sensory', 'demand', 'social'];

const notesByCategory = {
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

const generalNotes = [
  "Didn't sleep well",
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

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTimeOfDayModifier(hour) {
  if (hour < 7) return -0.2;
  if (hour >= 7 && hour < 10) return 0.1;
  if (hour >= 13 && hour < 15) return -0.15;
  if (hour >= 21) return -0.1;
  return 0;
}

function getDayOfWeekModifier(dayOfWeek) {
  if (dayOfWeek === 1) return -0.15;
  if (dayOfWeek === 5) return 0.1;
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.05;
  return 0;
}

function getCategoryModifier(category) {
  if (!category) return 0;
  switch (category) {
    case 'sensory': return -0.25;
    case 'demand': return -0.15;
    case 'social': return -0.1;
  }
  return 0;
}

function determineState(baseCapacity, hour, dayOfWeek, category, inCrisis, inRecovery) {
  let capacity = baseCapacity;
  capacity += getTimeOfDayModifier(hour);
  capacity += getDayOfWeekModifier(dayOfWeek);
  capacity += getCategoryModifier(category);
  if (inCrisis) capacity -= 0.3;
  if (inRecovery) capacity += 0.2;
  capacity += (Math.random() - 0.5) * 0.3;
  capacity = Math.max(0, Math.min(1, capacity));

  if (capacity > 0.6) return 'resourced';
  if (capacity > 0.3) return 'stretched';
  return 'depleted';
}

function pickNote(category, state) {
  if (Math.random() > 0.4) return undefined;
  if (category && Math.random() > 0.3) {
    const notes = notesByCategory[category];
    return notes[Math.floor(Math.random() * notes.length)];
  }
  return generalNotes[Math.floor(Math.random() * generalNotes.length)];
}

function generateFakeData(years = 4) {
  const logs = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = years * 365;

  let baseCapacity = 0.6;
  let crisisCounter = 0;
  let recoveryCounter = 0;

  for (let day = totalDays; day >= 0; day--) {
    const date = new Date(now - day * msPerDay);
    const dayOfWeek = date.getDay();

    baseCapacity += (Math.random() - 0.5) * 0.02;
    baseCapacity = Math.max(0.3, Math.min(0.8, baseCapacity));

    if (crisisCounter === 0 && recoveryCounter === 0 && Math.random() < 0.02) {
      crisisCounter = Math.floor(Math.random() * 7) + 3;
    }

    if (crisisCounter === 1 && Math.random() < 0.7) {
      recoveryCounter = Math.floor(Math.random() * 5) + 3;
    }

    const inCrisis = crisisCounter > 0;
    const inRecovery = recoveryCounter > 0;

    if (crisisCounter > 0) crisisCounter--;
    if (recoveryCounter > 0) recoveryCounter--;

    const baseEntries = inCrisis ? 3 : 2;
    const entriesThisDay = Math.floor(Math.random() * 2) + baseEntries - 1;

    for (let entry = 0; entry < entriesThisDay; entry++) {
      let hour;
      if (entry === 0) hour = 7 + Math.floor(Math.random() * 3);
      else if (entry === 1) hour = 12 + Math.floor(Math.random() * 3);
      else if (entry === 2) hour = 17 + Math.floor(Math.random() * 3);
      else hour = 20 + Math.floor(Math.random() * 3);

      const minute = Math.floor(Math.random() * 60);
      const timestamp = now - day * msPerDay + hour * 60 * 60 * 1000 + minute * 60 * 1000;

      let category = null;
      if (Math.random() < 0.6) {
        const rand = Math.random();
        if (inCrisis) {
          if (rand < 0.4) category = 'sensory';
          else if (rand < 0.75) category = 'demand';
          else category = 'social';
        } else {
          if (rand < 0.33) category = 'sensory';
          else if (rand < 0.66) category = 'demand';
          else category = 'social';
        }
      }

      const state = determineState(baseCapacity, hour, dayOfWeek, category, inCrisis, inRecovery);
      const note = pickNote(category, state);

      logs.push({
        id: generateId(),
        state,
        timestamp,
        tags: category ? [category] : [],
        note,
      });
    }
  }

  logs.sort((a, b) => b.timestamp - a.timestamp);
  return logs;
}

// Generate and output
const logs = generateFakeData(4);
const data = { '@orbital:logs': JSON.stringify(logs) };

console.log(`Generated ${logs.length} entries`);
console.log('Copy this localStorage data to browser console:');
console.log(`localStorage.setItem('@orbital:logs', '${JSON.stringify(logs).replace(/'/g, "\\'")}');`);
console.log('Then refresh the page.');
