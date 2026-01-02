import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PricingBand,
  PricingTier,
  BillingCycle,
  EscalatorConfig,
  EscalatorType,
  SubscriptionRecord,
  RevenueEvent,
  RenewalForecast,
} from '../../types';

const PRICING_BANDS_KEY = '@orbital:pricing_bands';
const SUBSCRIPTIONS_KEY = '@orbital:subscriptions';
const REVENUE_EVENTS_KEY = '@orbital:revenue_events';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PRICING BANDS
// ============================================

export const DEFAULT_PRICING_BANDS: PricingBand[] = [
  // Personal tier
  { tier: 'personal', minSeats: 1, maxSeats: 1, pricePerSeat: 0, currency: 'USD', billingCycle: 'monthly' },

  // Family tier
  { tier: 'family', minSeats: 2, maxSeats: 6, pricePerSeat: 4.99, currency: 'USD', billingCycle: 'monthly' },
  { tier: 'family', minSeats: 2, maxSeats: 6, pricePerSeat: 49.99, currency: 'USD', billingCycle: 'annual' },

  // Pilot tier
  { tier: 'pilot', minSeats: 10, maxSeats: 50, pricePerSeat: 8.00, currency: 'USD', billingCycle: 'monthly' },
  { tier: 'pilot', minSeats: 10, maxSeats: 50, pricePerSeat: 80.00, currency: 'USD', billingCycle: 'annual' },

  // Enterprise tier (volume discounts)
  { tier: 'enterprise', minSeats: 51, maxSeats: 100, pricePerSeat: 7.00, currency: 'USD', billingCycle: 'annual' },
  { tier: 'enterprise', minSeats: 101, maxSeats: 500, pricePerSeat: 6.00, currency: 'USD', billingCycle: 'annual' },
  { tier: 'enterprise', minSeats: 501, maxSeats: 1000, pricePerSeat: 5.00, currency: 'USD', billingCycle: 'annual' },
  { tier: 'enterprise', minSeats: 1001, maxSeats: 999999, pricePerSeat: 4.00, currency: 'USD', billingCycle: 'annual' },
];

export async function getPricingBands(): Promise<PricingBand[]> {
  const data = await AsyncStorage.getItem(PRICING_BANDS_KEY);
  if (!data) return DEFAULT_PRICING_BANDS;
  return JSON.parse(data);
}

export async function setPricingBands(bands: PricingBand[]): Promise<void> {
  await AsyncStorage.setItem(PRICING_BANDS_KEY, JSON.stringify(bands));
}

export async function getPriceForConfig(
  tier: PricingTier,
  seats: number,
  billingCycle: BillingCycle
): Promise<PricingBand | null> {
  const bands = await getPricingBands();
  return bands.find(
    (b) =>
      b.tier === tier &&
      b.billingCycle === billingCycle &&
      seats >= b.minSeats &&
      seats <= b.maxSeats
  ) || null;
}

// ============================================
// ESCALATORS
// ============================================

export function createEscalator(
  type: EscalatorType,
  options: {
    annualPercent?: number;
    capPercent?: number;
    floorPercent?: number;
    effectiveAfterMonths?: number;
  }
): EscalatorConfig {
  return {
    type,
    annualPercent: options.annualPercent || (type === 'fixed_percent' ? 3 : undefined),
    capPercent: options.capPercent,
    floorPercent: options.floorPercent,
    effectiveAfterMonths: options.effectiveAfterMonths || 12,
  };
}

export function calculateEscalatedPrice(
  currentPrice: number,
  escalator: EscalatorConfig,
  yearsInContract: number
): number {
  if (yearsInContract < escalator.effectiveAfterMonths / 12) {
    return currentPrice;
  }

  let escalationPercent = 0;

  switch (escalator.type) {
    case 'fixed_percent':
      escalationPercent = escalator.annualPercent || 3;
      break;
    case 'cpi_linked':
      // In production, fetch CPI from external source
      // Default to 2.5% as CPI proxy
      escalationPercent = Math.min(
        Math.max(2.5, escalator.floorPercent || 0),
        escalator.capPercent || 10
      );
      break;
    case 'custom':
      escalationPercent = escalator.annualPercent || 0;
      break;
  }

  const yearsToApply = yearsInContract - (escalator.effectiveAfterMonths / 12);
  const multiplier = Math.pow(1 + escalationPercent / 100, Math.floor(yearsToApply));

  return Math.round(currentPrice * multiplier * 100) / 100;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export async function getSubscriptions(): Promise<SubscriptionRecord[]> {
  const data = await AsyncStorage.getItem(SUBSCRIPTIONS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getSubscriptionsByOrg(orgId: string): Promise<SubscriptionRecord[]> {
  const subs = await getSubscriptions();
  return subs.filter((s) => s.orgId === orgId);
}

export async function getActiveSubscription(orgId: string): Promise<SubscriptionRecord | null> {
  const subs = await getSubscriptionsByOrg(orgId);
  return subs.find((s) => s.status === 'active' || s.status === 'trial') || null;
}

export async function getSubscription(subscriptionId: string): Promise<SubscriptionRecord | null> {
  const subs = await getSubscriptions();
  return subs.find((s) => s.id === subscriptionId) || null;
}

export async function createSubscription(
  params: {
    orgId: string;
    tier: PricingTier;
    seats: number;
    billingCycle: BillingCycle;
    currency?: 'USD' | 'EUR' | 'GBP';
    contractId?: string;
    multiYearTermMonths?: number;
    prepaidMonths?: number;
    discountPercent?: number;
    escalator?: EscalatorConfig;
    startAsTrial?: boolean;
  }
): Promise<SubscriptionRecord> {
  const pricingBand = await getPriceForConfig(params.tier, params.seats, params.billingCycle);
  const pricePerSeat = pricingBand?.pricePerSeat || 0;

  const now = Date.now();
  const periodDays = params.billingCycle === 'monthly' ? 30 :
                     params.billingCycle === 'quarterly' ? 90 : 365;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;

  const subscription: SubscriptionRecord = {
    id: generateId('sub'),
    orgId: params.orgId,
    tier: params.tier,
    seats: params.seats,
    pricePerSeat,
    currency: params.currency || 'USD',
    billingCycle: params.billingCycle,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: now + periodMs,
    renewalDate: now + periodMs,
    escalator: params.escalator,
    contractId: params.contractId,
    status: params.startAsTrial ? 'trial' : 'active',
    multiYearTermMonths: params.multiYearTermMonths,
    prepaidMonths: params.prepaidMonths,
    discountPercent: params.discountPercent,
  };

  const subs = await getSubscriptions();
  subs.push(subscription);
  await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));

  // Log revenue event
  const amount = calculateSubscriptionAmount(subscription);
  await logRevenueEvent({
    subscriptionId: subscription.id,
    orgId: params.orgId,
    eventType: 'new',
    amount,
    currency: subscription.currency,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  });

  return subscription;
}

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Pick<SubscriptionRecord, 'seats' | 'tier' | 'status' | 'escalator' | 'discountPercent'>>
): Promise<SubscriptionRecord | null> {
  const subs = await getSubscriptions();
  const index = subs.findIndex((s) => s.id === subscriptionId);
  if (index === -1) return null;

  const oldSub = subs[index];
  const newSub = { ...oldSub, ...updates };

  // Recalculate price if tier or seats changed
  if (updates.tier || updates.seats) {
    const pricingBand = await getPriceForConfig(
      newSub.tier,
      newSub.seats,
      newSub.billingCycle
    );
    if (pricingBand) {
      newSub.pricePerSeat = pricingBand.pricePerSeat;
    }
  }

  subs[index] = newSub;
  await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));

  // Log upgrade/downgrade event
  if (updates.tier || updates.seats) {
    const oldAmount = calculateSubscriptionAmount(oldSub);
    const newAmount = calculateSubscriptionAmount(newSub);
    const eventType = newAmount > oldAmount ? 'upgrade' : 'downgrade';

    await logRevenueEvent({
      subscriptionId,
      orgId: newSub.orgId,
      eventType,
      amount: newAmount - oldAmount,
      currency: newSub.currency,
      periodStart: newSub.currentPeriodStart,
      periodEnd: newSub.currentPeriodEnd,
      notes: `${eventType}: ${oldSub.seats} → ${newSub.seats} seats`,
    });
  }

  return newSub;
}

export async function renewSubscription(
  subscriptionId: string
): Promise<SubscriptionRecord | null> {
  const subs = await getSubscriptions();
  const index = subs.findIndex((s) => s.id === subscriptionId);
  if (index === -1) return null;

  const sub = subs[index];
  const periodDays = sub.billingCycle === 'monthly' ? 30 :
                     sub.billingCycle === 'quarterly' ? 90 : 365;
  const periodMs = periodDays * 24 * 60 * 60 * 1000;

  // Apply escalator if applicable
  let newPricePerSeat = sub.pricePerSeat;
  if (sub.escalator) {
    const yearsInContract = (Date.now() - sub.startDate) / (365 * 24 * 60 * 60 * 1000);
    newPricePerSeat = calculateEscalatedPrice(sub.pricePerSeat, sub.escalator, yearsInContract);
  }

  const now = Date.now();
  subs[index] = {
    ...sub,
    pricePerSeat: newPricePerSeat,
    currentPeriodStart: now,
    currentPeriodEnd: now + periodMs,
    renewalDate: now + periodMs,
    status: 'active',
  };

  await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));

  const escalationApplied = newPricePerSeat !== sub.pricePerSeat;
  const amount = calculateSubscriptionAmount(subs[index]);

  await logRevenueEvent({
    subscriptionId,
    orgId: sub.orgId,
    eventType: escalationApplied ? 'escalation' : 'renewal',
    amount,
    currency: sub.currency,
    periodStart: subs[index].currentPeriodStart,
    periodEnd: subs[index].currentPeriodEnd,
    notes: escalationApplied
      ? `Escalation applied: ${sub.pricePerSeat} → ${newPricePerSeat}/seat`
      : undefined,
  });

  return subs[index];
}

export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<SubscriptionRecord | null> {
  const subs = await getSubscriptions();
  const index = subs.findIndex((s) => s.id === subscriptionId);
  if (index === -1) return null;

  subs[index].status = 'cancelled';
  await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));

  await logRevenueEvent({
    subscriptionId,
    orgId: subs[index].orgId,
    eventType: 'cancellation',
    amount: -calculateSubscriptionAmount(subs[index]),
    currency: subs[index].currency,
    periodStart: subs[index].currentPeriodStart,
    periodEnd: subs[index].currentPeriodEnd,
    notes: reason,
  });

  return subs[index];
}

function calculateSubscriptionAmount(sub: SubscriptionRecord): number {
  let amount = sub.seats * sub.pricePerSeat;
  if (sub.discountPercent) {
    amount = amount * (1 - sub.discountPercent / 100);
  }
  return Math.round(amount * 100) / 100;
}

// ============================================
// REVENUE EVENTS
// ============================================

async function logRevenueEvent(
  params: Omit<RevenueEvent, 'id' | 'occurredAt'>
): Promise<RevenueEvent> {
  const event: RevenueEvent = {
    id: generateId('rev'),
    ...params,
    occurredAt: Date.now(),
  };

  const data = await AsyncStorage.getItem(REVENUE_EVENTS_KEY);
  const events: RevenueEvent[] = data ? JSON.parse(data) : [];
  events.unshift(event);
  await AsyncStorage.setItem(REVENUE_EVENTS_KEY, JSON.stringify(events));

  return event;
}

export async function getRevenueEvents(
  filter?: { orgId?: string; subscriptionId?: string; startDate?: number; endDate?: number }
): Promise<RevenueEvent[]> {
  const data = await AsyncStorage.getItem(REVENUE_EVENTS_KEY);
  if (!data) return [];
  let events: RevenueEvent[] = JSON.parse(data);

  if (filter?.orgId) {
    events = events.filter((e) => e.orgId === filter.orgId);
  }
  if (filter?.subscriptionId) {
    events = events.filter((e) => e.subscriptionId === filter.subscriptionId);
  }
  if (filter?.startDate) {
    events = events.filter((e) => e.occurredAt >= filter.startDate!);
  }
  if (filter?.endDate) {
    events = events.filter((e) => e.occurredAt <= filter.endDate!);
  }

  return events;
}

// ============================================
// REVENUE ANALYTICS
// ============================================

export async function calculateARR(): Promise<{
  total: number;
  byTier: Record<PricingTier, number>;
  currency: 'USD';
}> {
  const subs = await getSubscriptions();
  const activeSubs = subs.filter((s) => s.status === 'active');

  const result = {
    total: 0,
    byTier: {
      personal: 0,
      family: 0,
      pilot: 0,
      enterprise: 0,
      custom: 0,
    } as Record<PricingTier, number>,
    currency: 'USD' as const,
  };

  activeSubs.forEach((sub) => {
    let annualAmount = calculateSubscriptionAmount(sub);

    // Normalize to annual
    if (sub.billingCycle === 'monthly') {
      annualAmount *= 12;
    } else if (sub.billingCycle === 'quarterly') {
      annualAmount *= 4;
    }

    result.total += annualAmount;
    result.byTier[sub.tier] += annualAmount;
  });

  return result;
}

export async function calculateMRR(): Promise<number> {
  const arr = await calculateARR();
  return Math.round((arr.total / 12) * 100) / 100;
}

export async function getRenewalForecast(daysAhead: number = 90): Promise<RenewalForecast[]> {
  const subs = await getSubscriptions();
  const now = Date.now();
  const threshold = daysAhead * 24 * 60 * 60 * 1000;

  const forecasts: RenewalForecast[] = [];

  for (const sub of subs) {
    if (sub.status !== 'active' || !sub.renewalDate) continue;

    const timeToRenewal = sub.renewalDate - now;
    if (timeToRenewal <= 0 || timeToRenewal > threshold) continue;

    let currentARR = calculateSubscriptionAmount(sub);
    if (sub.billingCycle === 'monthly') currentARR *= 12;
    else if (sub.billingCycle === 'quarterly') currentARR *= 4;

    let projectedARR = currentARR;
    let escalatorApplied = false;

    if (sub.escalator) {
      const yearsInContract = (sub.renewalDate - sub.startDate) / (365 * 24 * 60 * 60 * 1000);
      const escalatedPrice = calculateEscalatedPrice(sub.pricePerSeat, sub.escalator, yearsInContract);
      if (escalatedPrice !== sub.pricePerSeat) {
        escalatorApplied = true;
        const ratio = escalatedPrice / sub.pricePerSeat;
        projectedARR = Math.round(currentARR * ratio * 100) / 100;
      }
    }

    forecasts.push({
      subscriptionId: sub.id,
      orgId: sub.orgId,
      orgName: sub.orgId, // Would be populated from org data
      currentARR,
      renewalDate: sub.renewalDate,
      projectedARR,
      escalatorApplied,
      riskLevel: timeToRenewal < 30 * 24 * 60 * 60 * 1000 ? 'high' :
                 timeToRenewal < 60 * 24 * 60 * 60 * 1000 ? 'medium' : 'low',
    });
  }

  return forecasts.sort((a, b) => a.renewalDate - b.renewalDate);
}

export async function getRevenueMetrics(): Promise<{
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalSeats: number;
  averageRevenuePerSeat: number;
  churnThisMonth: number;
  newRevenueThisMonth: number;
  netRevenueChange: number;
}> {
  const subs = await getSubscriptions();
  const activeSubs = subs.filter((s) => s.status === 'active');

  const arr = await calculateARR();
  const mrr = await calculateMRR();

  const now = Date.now();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const events = await getRevenueEvents({
    startDate: monthStart.getTime(),
    endDate: now,
  });

  const totalSeats = activeSubs.reduce((sum, s) => sum + s.seats, 0);

  const churn = events
    .filter((e) => e.eventType === 'cancellation')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  const newRevenue = events
    .filter((e) => e.eventType === 'new')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    mrr,
    arr: arr.total,
    activeSubscriptions: activeSubs.length,
    totalSeats,
    averageRevenuePerSeat: totalSeats > 0 ? Math.round((arr.total / totalSeats) * 100) / 100 : 0,
    churnThisMonth: churn,
    newRevenueThisMonth: newRevenue,
    netRevenueChange: newRevenue - churn,
  };
}
