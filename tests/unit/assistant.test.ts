/**
 * Assistant Phase 1 (Option A) — boundary proofs.
 * Run: npm run test:assistant   (node:test via tsx, no RN runtime needed)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent, parseWhen, absenceWindow } from '../../lib/assistant/intent';
import { respond } from '../../lib/assistant/respond';
import { allStaticTemplates, containsProhibitedWord, REFUSAL_SENTENCE } from '../../lib/assistant/templates';
import { resolveIdentity } from '../../lib/assistant/config';

// Wed Sep 23 2026, 10:00 local
const NOW = new Date(2026, 8, 23, 10, 0);
const ctx = { now: NOW, logTimestamps: [] as number[], appointments: [] };

test('every non-refusal template is free of prohibited words', () => {
  for (const t of allStaticTemplates()) {
    assert.equal(containsProhibitedWord(t), null, `prohibited word in: ${t}`);
  }
});

test('medication is refused everywhere, including inside a reminder', () => {
  for (const s of [
    'remind me to take my meds tomorrow at 8am',
    'set a reminder for my medication at 9pm',
    'book a prescription refill friday 10am',
    'what dose should I take',
    'pills',
  ]) {
    assert.equal(parseIntent(s, NOW).type, 'refuse', s);
    assert.equal(respond(parseIntent(s, NOW), ctx).reply, REFUSAL_SENTENCE);
  }
});

test('advice, coaching, diagnosis, therapy, interpretation and crisis are refused', () => {
  for (const s of [
    'what should I do about being depleted',
    'give me advice',
    'can you coach me',
    'do I have ADHD, diagnose me',
    'talk to me like a therapist',
    'why am I depleted',
    'what does my week mean',
    'how can I feel better',
    'any wellness tips',
    'I am in crisis',
  ]) {
    assert.equal(parseIntent(s, NOW).type, 'refuse', s);
  }
});

test('the refusal points to professionals and emergency services', () => {
  assert.match(REFUSAL_SENTENCE, /qualified professional/);
  assert.match(REFUSAL_SENTENCE, /emergency services/);
});

test('capacity reports map to the three states and save nothing else', () => {
  const r = respond(parseIntent('log depleted', NOW), ctx);
  assert.deepEqual(r.effect, { type: 'saveCapacity', state: 'depleted' });
  assert.match(r.reply, /^Logged: DEPLETED at 10:00 AM\./);
  assert.equal(parseIntent('elevated', NOW).type, 'capacity');
  assert.equal(parseIntent('I am resourced', NOW).type, 'capacity');
});

test('appointments: book, hold, remind; a missing time is asked, never invented', () => {
  const b = parseIntent('book dentist tomorrow at 3pm', NOW);
  assert.equal(b.type, 'appointment');
  if (b.type === 'appointment') {
    assert.equal(b.kind, 'book');
    assert.equal(b.title, 'dentist');
    assert.equal(b.when, new Date(2026, 8, 24, 15, 0).getTime());
  }
  const h = parseIntent('hold haircut friday 10:30am', NOW);
  assert.equal(h.type === 'appointment' && h.kind, 'hold');
  assert.equal(h.type === 'appointment' && h.when, new Date(2026, 8, 25, 10, 30).getTime());
  const r = parseIntent('remind me about the car inspection today 4pm', NOW);
  assert.equal(r.type === 'appointment' && r.kind, 'remind');
  const noTime = respond(parseIntent('book dentist', NOW), ctx);
  assert.deepEqual(noTime.effect, { type: 'none' });
  assert.match(noTime.reply, /^When is dentist\?/);
});

test('parseWhen rolls a past time-of-day to the next day', () => {
  assert.equal(parseWhen('at 9am', NOW).when, new Date(2026, 8, 24, 9, 0).getTime());
});

test('absence is stated, never filled in', () => {
  const ts = [new Date(2026, 8, 23, 8).getTime(), new Date(2026, 8, 21, 8).getTime()];
  const w = absenceWindow(ts, 7, NOW);
  assert.equal(w.logged, 2);
  assert.deepEqual(w.missing, ['Thu', 'Fri', 'Sat', 'Sun', 'Tue']);
  const r = respond({ type: 'absence', days: 7 }, { ...ctx, logTimestamps: ts });
  assert.match(r.reply, /Those days stay blank\.$/);
  assert.match(respond({ type: 'absence', days: 7 }, ctx).reply, /^No capacity reports/);
});

test('app help routes', () => {
  assert.deepEqual(parseIntent('how do I cancel my subscription', NOW), { type: 'help', topic: 'subscription' });
  assert.deepEqual(parseIntent('delete my account', NOW), { type: 'help', topic: 'account' });
  assert.equal(parseIntent('show my week', NOW).type, 'absence');
  assert.equal(parseIntent('what are my appointments', NOW).type, 'listAppointments');
});

test('identity always carries the AI-generated disclosure', () => {
  assert.match(resolveIdentity(undefined).disclosure, /AI-generated/);
  assert.match(resolveIdentity('does-not-exist').disclosure, /AI-generated/);
  assert.equal(resolveIdentity(undefined).avatarUri, null);
});
