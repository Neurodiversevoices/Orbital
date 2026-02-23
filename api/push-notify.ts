/**
 * Push Notification API Route
 *
 * Vercel API route: POST /api/push-notify
 *
 * Handles three operations:
 * 1. Register a push token (action: 'register')
 * 2. Send a notification to a user (action: 'send') — service-key protected
 * 3. Send scheduled daily reminders (action: 'send-reminders') — cron-triggered
 *
 * When the next binary ships with expo-notifications, the client:
 * 1. Calls Notifications.getExpoPushTokenAsync()
 * 2. POSTs to /api/push-notify with action: 'register'
 * 3. Backend stores the token and uses it for reminders/milestones
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

function getSupabaseAdmin() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role not configured');
  return createClient(url, serviceKey);
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// =============================================================================
// EXPO PUSH API
// =============================================================================

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo Push API accepts batches of up to 100
  const batches: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];

  for (const batch of batches) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    const result = await response.json();
    const tickets: ExpoPushTicket[] = result.data || [];
    allTickets.push(...tickets);
  }

  return allTickets;
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function getDailyReminderTemplate(): NotificationTemplate {
  const prompts = [
    'How are you doing right now? Log your capacity in under 30 seconds.',
    'Quick check-in: where is your capacity today?',
    'Take 30 seconds to log your state. Patterns build over time.',
    'Your daily capacity check-in is waiting.',
    'One swipe. That\'s all it takes to track today.',
  ];
  const body = prompts[Math.floor(Math.random() * prompts.length)];

  return {
    type: 'daily_reminder',
    title: 'Orbital Check-in',
    body,
    data: { screen: 'log' },
  };
}

function getMilestoneTemplate(milestone: string): NotificationTemplate {
  const templates: Record<string, { title: string; body: string }> = {
    '7_day_streak': {
      title: '7-Day Streak!',
      body: 'You\'ve logged for 7 days straight. Patterns are starting to emerge.',
    },
    '30_days': {
      title: '30 Days of Data',
      body: 'You\'ve been logging for a month. Your weekly rhythms are becoming visible.',
    },
    '90_days_cci_ready': {
      title: 'CCI Report Ready',
      body: 'You\'ve hit 90 days of logging. Your Capacity Clinical Summary is now available.',
    },
    'pattern_unlocked': {
      title: 'New Pattern Unlocked',
      body: 'Your data has revealed a new capacity pattern. Open Orbital to explore it.',
    },
  };

  const tmpl = templates[milestone] || {
    title: 'Orbital Milestone',
    body: `You've reached a new milestone: ${milestone}`,
  };

  return { type: 'milestone', ...tmpl, data: { milestone } };
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action } = req.body || {};

  switch (action) {
    case 'register':
      return handleRegister(req, res);
    case 'send':
      return handleSend(req, res);
    case 'send-reminders':
      return handleSendReminders(req, res);
    default:
      res.status(400).json({ error: 'Unknown action. Use: register, send, send-reminders' });
  }
}

// =============================================================================
// ACTION: Register push token
// =============================================================================

async function handleRegister(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { supabase_user_id, expo_push_token, platform, device_id } = req.body;

  if (!supabase_user_id || !expo_push_token || !platform) {
    res.status(400).json({
      error: 'Missing required fields: supabase_user_id, expo_push_token, platform',
    });
    return;
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    res.status(400).json({ error: 'Invalid platform. Use: ios, android, web' });
    return;
  }

  // Validate Expo push token format
  if (!expo_push_token.startsWith('ExponentPushToken[') && !expo_push_token.startsWith('ExpoPushToken[')) {
    res.status(400).json({ error: 'Invalid Expo push token format' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Upsert token (dedup by user + token)
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: supabase_user_id,
          expo_push_token,
          platform,
          device_id: device_id || null,
          active: true,
        },
        { onConflict: 'user_id,expo_push_token' }
      );

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ registered: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

// =============================================================================
// ACTION: Send notification to specific user
// =============================================================================

async function handleSend(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Require service-level auth (CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY in header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized — requires CRON_SECRET' });
    return;
  }

  const { user_id, notification_type, title, body, data } = req.body;

  if (!user_id || !title || !body) {
    res.status(400).json({ error: 'Missing required fields: user_id, title, body' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get active tokens for the user
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', user_id)
      .eq('active', true);

    if (!tokens || tokens.length === 0) {
      res.status(200).json({ sent: 0, reason: 'No active push tokens' });
      return;
    }

    // Send via Expo Push API
    const messages: ExpoPushMessage[] = tokens.map(t => ({
      to: t.expo_push_token,
      title,
      body,
      data: data || {},
      sound: 'default',
    }));

    const tickets = await sendExpoPushNotifications(messages);

    // Log notifications
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      await supabase.from('notification_log').insert({
        user_id,
        notification_type: notification_type || 'system',
        title,
        body,
        data: data || {},
        expo_ticket_id: ticket.id || null,
        status: ticket.status === 'ok' ? 'sent' : 'failed',
        error_message: ticket.status === 'error' ? (ticket.message || ticket.details?.error) : null,
      });
    }

    // Deactivate tokens that returned DeviceNotRegistered
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i].details?.error === 'DeviceNotRegistered') {
        await supabase
          .from('user_push_tokens')
          .update({ active: false })
          .eq('expo_push_token', tokens[i].expo_push_token);
      }
    }

    const sent = tickets.filter(t => t.status === 'ok').length;
    res.status(200).json({ sent, total: tickets.length });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}

// =============================================================================
// ACTION: Send daily reminders to all users with active tokens
// =============================================================================

async function handleSendReminders(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Require CRON_SECRET
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized — requires CRON_SECRET' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get all users with active tokens who have notifications enabled
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('user_id, expo_push_token')
      .eq('active', true);

    if (!tokens || tokens.length === 0) {
      res.status(200).json({ sent: 0, reason: 'No active push tokens' });
      return;
    }

    // Check which users have notifications enabled
    const userIds = [...new Set(tokens.map(t => t.user_id))];
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id, notifications_enabled')
      .in('user_id', userIds)
      .eq('notifications_enabled', true);

    const enabledUserIds = new Set((prefs || []).map(p => p.user_id));

    // Filter tokens to only enabled users
    const eligibleTokens = tokens.filter(t => enabledUserIds.has(t.user_id));

    if (eligibleTokens.length === 0) {
      res.status(200).json({ sent: 0, reason: 'No users with notifications enabled' });
      return;
    }

    // Check which users already logged today (don't nag them)
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayLogs } = await supabase
      .from('capacity_logs')
      .select('user_id')
      .in('user_id', Array.from(enabledUserIds))
      .gte('occurred_at', `${today}T00:00:00Z`)
      .is('deleted_at', null);

    const loggedTodayIds = new Set((todayLogs || []).map(l => l.user_id));

    // Only send to users who haven't logged today
    const needReminder = eligibleTokens.filter(t => !loggedTodayIds.has(t.user_id));

    if (needReminder.length === 0) {
      res.status(200).json({ sent: 0, reason: 'All eligible users already logged today' });
      return;
    }

    const template = getDailyReminderTemplate();

    const messages: ExpoPushMessage[] = needReminder.map(t => ({
      to: t.expo_push_token,
      title: template.title,
      body: template.body,
      data: template.data,
      sound: 'default',
    }));

    const tickets = await sendExpoPushNotifications(messages);

    // Log all sent notifications
    const logEntries = needReminder.map((t, i) => ({
      user_id: t.user_id,
      notification_type: 'daily_reminder',
      title: template.title,
      body: template.body,
      data: template.data || {},
      expo_ticket_id: tickets[i]?.id || null,
      status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
      error_message: tickets[i]?.status === 'error'
        ? (tickets[i]?.message || tickets[i]?.details?.error || null)
        : null,
    }));

    // Batch insert notification logs
    if (logEntries.length > 0) {
      await supabase.from('notification_log').insert(logEntries);
    }

    // Clean up dead tokens
    for (let i = 0; i < tickets.length; i++) {
      if (tickets[i]?.details?.error === 'DeviceNotRegistered') {
        await supabase
          .from('user_push_tokens')
          .update({ active: false })
          .eq('expo_push_token', needReminder[i].expo_push_token);
      }
    }

    const sent = tickets.filter(t => t.status === 'ok').length;
    const failed = tickets.filter(t => t.status === 'error').length;

    res.status(200).json({
      sent,
      failed,
      skipped_already_logged: loggedTodayIds.size,
      skipped_notifications_off: tokens.length - eligibleTokens.length,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[push-notify] send-reminders error:', message);
    res.status(500).json({ error: message });
  }
}

// =============================================================================
// EXPORT TEMPLATES (for milestone notifications from webhooks etc.)
// =============================================================================

export { getMilestoneTemplate, getDailyReminderTemplate };
