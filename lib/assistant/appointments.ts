/**
 * Appointment / hold / reminder storage (device-local, AsyncStorage).
 * Scheduling is not a prohibited feature. No phone notifications are scheduled
 * in Phase 1; reminders are listed in the assistant only (and the reply says so).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Appointment } from './respond';

const KEY = '@orbital:assistant_appointments';

export async function getAppointments(): Promise<Appointment[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Appointment[]) : [];
  } catch {
    return [];
  }
}

export async function addAppointment(a: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment[]> {
  const list = await getAppointments();
  const entry: Appointment = {
    ...a,
    id: `appt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [...list, entry];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
