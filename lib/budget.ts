/**
 * Budget Engine
 * Tracks real monthly bills, daily spend caps, and debt
 */

export interface DailyBudget {
  daily_cap: number;
  spent: number;
  remaining: number;
  percentage_used: number;
}

export interface WeeklyForecast {
  week_total: number;
  days: Array<{
    date: string;
    day: string;
    projected_spend: number;
    bills: string[];
  }>;
}

export interface MonthlyBreakdown {
  monthly_burn: number;
  by_service: Record<string, number>;
  runway_months: number;
  debt_total: number;
  weekly_debt_accrual: number;
}

export interface Debt {
  description: string;
  balance: number;
  weekly_payment: number;
  next_payment_date: string;
}

/**
 * BudgetEngine Singleton
 * Manages Orbital's finances, daily caps, and debt tracking
 */
class BudgetEngine {
  // Monthly bills (real data for Orbital)
  private monthlyBills: Record<string, number> = {
    supabase: 800,
    vercel: 150,
    eas_expo: 300,
    "claude-api": 1200,
    stripe_fees: 300,
    aws_backup: 50,
    domain_hosting: 50,
    monitoring: 150,
    other: 630,
  };

  // Debt tracking
  private debts: Map<string, Debt> = new Map();

  // Daily spend tracking (reset daily)
  private dailySpend: Record<string, number> = {};

  constructor() {
    this.initializeDebts();
  }

  private initializeDebts(): void {
    // WWS childcare debt
    this.debts.set("wws_childcare", {
      description: "WWS childcare",
      balance: 2172.36,
      weekly_payment: 91.4,
      next_payment_date: "Friday",
    });
  }

  getMonthlyBurn(): number {
    return Object.values(this.monthlyBills).reduce((sum, cost) => sum + cost, 0);
  }

  getDailyBudget(spendToday: number = 0): DailyBudget {
    const monthlyBurn = this.getMonthlyBurn();
    const dailyCap = (monthlyBurn * 0.9) / 30; // 90% of monthly burn / 30 days
    const spent = spendToday;
    const remaining = dailyCap - spent;
    const percentageUsed = (spent / dailyCap) * 100;

    return {
      daily_cap: Math.round(dailyCap * 100) / 100,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentage_used: Math.round(percentageUsed),
    };
  }

  getWeekForecast(): WeeklyForecast {
    const today = new Date();
    const days = [];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = dayNames[date.getDay()];

      // Simulate some bills mid-week
      const bills = [];
      if (date.getDay() === 3) {
        // Wednesday
        bills.push("Supabase bill: $800", "Claude API reserve: $400");
      }
      if (date.getDay() === 5) {
        // Friday
        bills.push("Childcare payment: $91.40");
      }

      const billTotal = bills.reduce((sum, bill) => {
        const match = bill.match(/\$([0-9.]+)/);
        return sum + (match ? parseFloat(match[1]) : 0);
      }, 0);

      days.push({
        date: dateStr,
        day: dayName,
        projected_spend: billTotal,
        bills,
      });
    }

    const weekTotal = days.reduce((sum, day) => sum + day.projected_spend, 0);
    return { week_total: Math.round(weekTotal * 100) / 100, days };
  }

  getMonthlyBreakdown(): MonthlyBreakdown {
    const monthlyBurn = this.getMonthlyBurn();
    const debtTotal = Array.from(this.debts.values()).reduce((sum, debt) => sum + debt.balance, 0);
    const weeklyDebtAccrual = Array.from(this.debts.values()).reduce((sum, debt) => sum + debt.weekly_payment, 0);

    // Assume 11 month runway (conservative)
    const runwayMonths = monthlyBurn > 0 ? Math.round((monthlyBurn * 11) * 10) / 10 : 0;

    return {
      monthly_burn: Math.round(monthlyBurn * 100) / 100,
      by_service: { ...this.monthlyBills },
      runway_months: parseFloat(runwayMonths.toFixed(1)),
      debt_total: Math.round(debtTotal * 100) / 100,
      weekly_debt_accrual: Math.round(weeklyDebtAccrual * 100) / 100,
    };
  }

  getDebts(): Debt[] {
    return Array.from(this.debts.values());
  }

  logSpend(amount: number, description: string): void {
    const today = new Date().toISOString().split("T")[0];
    if (!this.dailySpend[today]) {
      this.dailySpend[today] = 0;
    }
    this.dailySpend[today] += amount;
    console.log(`[BUDGET] +$${amount.toFixed(2)} (${description}) on ${today}`);
  }

  logDebtPayment(debtKey: string, amount: number): void {
    const debt = this.debts.get(debtKey);
    if (!debt) throw new Error(`Debt ${debtKey} not found`);
    debt.balance = Math.max(0, debt.balance - amount);
    console.log(`[DEBT] Paid $${amount.toFixed(2)} toward ${debt.description}. New balance: $${debt.balance.toFixed(2)}`);
  }

  getTodaySpend(): number {
    const today = new Date().toISOString().split("T")[0];
    return this.dailySpend[today] || 0;
  }
}

// Singleton instance
let budgetEngineInstance: BudgetEngine | null = null;

export function getBudgetEngine(): BudgetEngine {
  if (!budgetEngineInstance) {
    budgetEngineInstance = new BudgetEngine();
  }
  return budgetEngineInstance;
}

export function getBudget() {
  return getBudgetEngine();
}
