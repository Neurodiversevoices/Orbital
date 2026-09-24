/**
 * Intent -> reply + effect. Pure: the screen performs the effect.
 * Every reply string comes from templates.ts; nothing is generated.
 */

import { REFUSAL_SENTENCE, T } from './templates';
import {
  STATE_LABEL,
  absenceWindow,
  formatTime,
  formatWhen,
  type AppointmentKind,
  type CapacityStateKey,
  type Intent,
} from './intent';

export interface Appointment {
  id: string;
  kind: AppointmentKind;
  title: string;
  when: number;
  createdAt: number;
}

export type Effect =
  | { type: 'none' }
  | { type: 'saveCapacity'; state: CapacityStateKey }
  | { type: 'saveAppointment'; appointment: Omit<Appointment, 'id' | 'createdAt'> };

export interface RespondContext {
  now: Date;
  logTimestamps: number[];
  appointments: Appointment[];
}

export function respond(intent: Intent, ctx: RespondContext): { reply: string; effect: Effect } {
  switch (intent.type) {
    case 'empty':
      return { reply: T.empty, effect: { type: 'none' } };
    case 'refuse':
      return { reply: REFUSAL_SENTENCE, effect: { type: 'none' } };
    case 'greeting':
      return { reply: T.greeting, effect: { type: 'none' } };
    case 'capacity':
      return {
        reply: T.capacityLogged(STATE_LABEL[intent.state], formatTime(ctx.now.getTime())),
        effect: { type: 'saveCapacity', state: intent.state },
      };
    case 'capacityAsk':
      return { reply: T.capacityAsk, effect: { type: 'none' } };
    case 'appointment': {
      if (intent.when === null) return { reply: T.appointmentNeedsTime(intent.title), effect: { type: 'none' } };
      const when = formatWhen(intent.when);
      const reply =
        intent.kind === 'hold'
          ? T.appointmentHeld(intent.title, when)
          : intent.kind === 'remind'
            ? T.reminderSaved(intent.title, when)
            : T.appointmentBooked(intent.title, when);
      return {
        reply,
        effect: { type: 'saveAppointment', appointment: { kind: intent.kind, title: intent.title, when: intent.when } },
      };
    }
    case 'listAppointments': {
      const upcoming = ctx.appointments
        .filter((a) => a.when >= ctx.now.getTime())
        .sort((a, b) => a.when - b.when);
      if (upcoming.length === 0) return { reply: T.appointmentsNone, effect: { type: 'none' } };
      const lines = upcoming.map((a) => `${a.title}, ${formatWhen(a.when)}${a.kind === 'hold' ? ' (hold)' : a.kind === 'remind' ? ' (reminder)' : ''}`);
      return { reply: T.appointmentsList(lines), effect: { type: 'none' } };
    }
    case 'absence': {
      const { logged, missing } = absenceWindow(ctx.logTimestamps, intent.days, ctx.now);
      if (logged === 0) return { reply: T.absenceNone(intent.days), effect: { type: 'none' } };
      return { reply: T.absenceSummary(logged, intent.days, missing), effect: { type: 'none' } };
    }
    case 'help':
      return { reply: T.help[intent.topic], effect: { type: 'none' } };
    case 'unknown':
    default:
      return { reply: T.unknown, effect: { type: 'none' } };
  }
}
