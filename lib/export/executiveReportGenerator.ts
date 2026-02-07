import { CapacityLog, CapacityState, Category, ExecutiveReportConfig, ExecutiveReportData, ExportSummary } from '../../types';
import { getLogs, getVaultedLogs, getFullHistoryRange } from '../storage';
import { generateExportSummary } from './summaryGenerator';

const PERIOD_MS = {
  quarterly: 90 * 24 * 60 * 60 * 1000,
  annual: 365 * 24 * 60 * 60 * 1000,
};

export async function generateExecutiveReport(
  config: ExecutiveReportConfig,
  locale: string = 'en'
): Promise<ExecutiveReportData> {
  const now = Date.now();
  let periodStart: number;
  let periodEnd: number = now;

  if (config.period === 'custom' && config.customStartDate && config.customEndDate) {
    periodStart = config.customStartDate;
    periodEnd = config.customEndDate;
  } else {
    const periodMs = PERIOD_MS[config.period as keyof typeof PERIOD_MS] || PERIOD_MS.quarterly;
    periodStart = now - periodMs;
  }

  // Get logs for period
  const allLogs = await getLogs();
  const periodLogs = allLogs.filter(
    (log) => log.timestamp >= periodStart && log.timestamp <= periodEnd
  );

  // Generate summary
  const summary = generateExportSummary(periodLogs);

  // Calculate weekly averages for trend analysis
  const weeklyAverages = calculateWeeklyAverages(periodLogs, periodStart, periodEnd);

  // Determine overall trend
  const overallTrend = determineTrend(weeklyAverages);

  // Identify significant patterns
  const significantPatterns = identifyPatterns(periodLogs, locale);

  // Generate category insights
  const categoryInsights = generateCategoryInsights(periodLogs, locale);

  return {
    generatedAt: now,
    periodStart,
    periodEnd,
    summary,
    trajectoryAnalysis: {
      overallTrend,
      weeklyAverages,
      significantPatterns,
    },
    categoryInsights,
  };
}

function calculateWeeklyAverages(logs: CapacityLog[], start: number, end: number): number[] {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks: number[] = [];

  let weekStart = start;
  while (weekStart < end) {
    const weekEnd = Math.min(weekStart + weekMs, end);
    const weekLogs = logs.filter(
      (log) => log.timestamp >= weekStart && log.timestamp < weekEnd
    );

    if (weekLogs.length > 0) {
      const avg = weekLogs.reduce((sum, log) => sum + stateToValue(log.state), 0) / weekLogs.length;
      weeks.push(Math.round(avg * 100));
    } else {
      weeks.push(0);
    }

    weekStart = weekEnd;
  }

  return weeks;
}

function stateToValue(state: CapacityState): number {
  switch (state) {
    case 'resourced': return 1;
    case 'stretched': return 0.5;
    case 'depleted': return 0;
    default: return 0.5;
  }
}

function determineTrend(weeklyAverages: number[]): 'improving' | 'stable' | 'declining' {
  if (weeklyAverages.length < 2) return 'stable';

  const recent = weeklyAverages.slice(-4);
  const earlier = weeklyAverages.slice(0, Math.max(1, weeklyAverages.length - 4));

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  const diff = recentAvg - earlierAvg;

  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'stable';
}

function identifyPatterns(logs: CapacityLog[], locale: string): string[] {
  const patterns: string[] = [];

  if (logs.length < 7) {
    return locale === 'es'
      ? ['Datos insuficientes para análisis de patrones']
      : ['Insufficient data for pattern analysis'];
  }

  // Day of week analysis
  const dayStats: Record<number, { total: number; count: number }> = {};
  logs.forEach((log) => {
    const day = new Date(log.timestamp).getDay();
    if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 };
    dayStats[day].total += stateToValue(log.state);
    dayStats[day].count++;
  });

  const dayNames = locale === 'es'
    ? ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados']
    : ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

  let lowestDay = -1;
  let lowestAvg = 1;
  let highestDay = -1;
  let highestAvg = 0;

  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.count >= 2) {
      const avg = stats.total / stats.count;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestDay = parseInt(day);
      }
      if (avg > highestAvg) {
        highestAvg = avg;
        highestDay = parseInt(day);
      }
    }
  });

  if (lowestDay >= 0 && lowestAvg < 0.4) {
    patterns.push(
      locale === 'es'
        ? `${dayNames[lowestDay]} muestran capacidad consistentemente reducida`
        : `${dayNames[lowestDay]} show consistently reduced capacity`
    );
  }

  if (highestDay >= 0 && highestAvg > 0.7) {
    patterns.push(
      locale === 'es'
        ? `${dayNames[highestDay]} muestran capacidad más alta`
        : `${dayNames[highestDay]} show highest capacity`
    );
  }

  // Category correlation
  const categoryLoads: Record<Category, number[]> = {
    sensory: [],
    demand: [],
    social: [],
  };

  logs.forEach((log) => {
    if (log.category) {
      categoryLoads[log.category].push(stateToValue(log.state));
    }
  });

  Object.entries(categoryLoads).forEach(([category, values]) => {
    if (values.length >= 5) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg < 0.35) {
        const catLabel = locale === 'es'
          ? { sensory: 'sensorial', demand: 'demanda', social: 'social' }[category]
          : category;
        patterns.push(
          locale === 'es'
            ? `Carga ${catLabel} se correlaciona con capacidad reducida`
            : `${category.charAt(0).toUpperCase() + category.slice(1)} load correlates with reduced capacity`
        );
      }
    }
  });

  return patterns.length > 0 ? patterns : [
    locale === 'es' ? 'No se detectaron patrones significativos' : 'No significant patterns detected'
  ];
}

function generateCategoryInsights(
  logs: CapacityLog[],
  locale: string
): { category: Category; impactScore: number; recommendation?: string }[] {
  const categories: Category[] = ['sensory', 'demand', 'social'];

  return categories.map((category) => {
    const categoryLogs = logs.filter((log) => log.category === category);
    const depletedCount = categoryLogs.filter((log) => log.state === 'depleted').length;
    const impactScore = categoryLogs.length > 0
      ? Math.round((depletedCount / categoryLogs.length) * 100)
      : 0;

    let recommendation: string | undefined;

    if (impactScore > 50) {
      const recommendations = {
        sensory: {
          en: 'Consider environmental modifications to reduce sensory load',
          es: 'Considere modificaciones ambientales para reducir la carga sensorial',
        },
        demand: {
          en: 'Review task load distribution and prioritization strategies',
          es: 'Revise la distribución de tareas y estrategias de priorización',
        },
        social: {
          en: 'Evaluate social commitments and recovery time allocation',
          es: 'Evalúe compromisos sociales y asignación de tiempo de recuperación',
        },
      };
      const l: 'en' | 'es' = locale === 'es' ? 'es' : 'en';
      recommendation = recommendations[category][l];
    }

    return { category, impactScore, recommendation };
  });
}

export function formatExecutiveReportAsText(
  data: ExecutiveReportData,
  locale: string = 'en'
): string {
  const dateFormatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = locale === 'es'
    ? 'INFORME EJECUTIVO DE CAPACIDAD ORBITAL'
    : 'ORBITAL CAPACITY EXECUTIVE REPORT';

  const periodLabel = locale === 'es' ? 'Período' : 'Period';
  const generatedLabel = locale === 'es' ? 'Generado' : 'Generated';
  const summaryLabel = locale === 'es' ? 'RESUMEN' : 'SUMMARY';
  const totalSignals = locale === 'es' ? 'Señales totales' : 'Total signals';
  const avgCapacity = locale === 'es' ? 'Capacidad promedio' : 'Average capacity';
  const trajectoryLabel = locale === 'es' ? 'ANÁLISIS DE TRAYECTORIA' : 'TRAJECTORY ANALYSIS';
  const trendLabel = locale === 'es' ? 'Tendencia general' : 'Overall trend';
  const patternsLabel = locale === 'es' ? 'PATRONES SIGNIFICATIVOS' : 'SIGNIFICANT PATTERNS';
  const insightsLabel = locale === 'es' ? 'PERSPECTIVAS POR CATEGORÍA' : 'CATEGORY INSIGHTS';
  const disclaimer = locale === 'es'
    ? 'Sin valor diagnóstico. Datos de capacidad autorreportados normalizados.'
    : 'Non-diagnostic. Normalized self-reported capacity data.';

  const trendText = {
    improving: locale === 'es' ? 'Mejorando' : 'Improving',
    stable: locale === 'es' ? 'Estable' : 'Stable',
    declining: locale === 'es' ? 'En descenso' : 'Declining',
  };

  const categoryLabels = {
    sensory: locale === 'es' ? 'Sensorial' : 'Sensory',
    demand: locale === 'es' ? 'Demanda' : 'Demand',
    social: locale === 'es' ? 'Social' : 'Social',
  };

  let report = `
╔══════════════════════════════════════════════════════════════╗
║  ${title.padEnd(60)}║
╚══════════════════════════════════════════════════════════════╝

${periodLabel}: ${dateFormatter.format(data.periodStart)} - ${dateFormatter.format(data.periodEnd)}
${generatedLabel}: ${dateFormatter.format(data.generatedAt)}

────────────────────────────────────────────────────────────────
${summaryLabel}
────────────────────────────────────────────────────────────────

${totalSignals}: ${data.summary.totalLogs}
${avgCapacity}: ${data.summary.averageCapacity}%

State Distribution:
  • High Capacity: ${data.summary.stateDistribution.resourced}%
  • Stable: ${data.summary.stateDistribution.stretched}%
  • Depleted: ${data.summary.stateDistribution.depleted}%

────────────────────────────────────────────────────────────────
${trajectoryLabel}
────────────────────────────────────────────────────────────────

${trendLabel}: ${trendText[data.trajectoryAnalysis.overallTrend]}

Weekly Capacity Trend:
${formatSparkline(data.trajectoryAnalysis.weeklyAverages)}

────────────────────────────────────────────────────────────────
${patternsLabel}
────────────────────────────────────────────────────────────────

${data.trajectoryAnalysis.significantPatterns.map((p) => `• ${p}`).join('\n')}

────────────────────────────────────────────────────────────────
${insightsLabel}
────────────────────────────────────────────────────────────────

${data.categoryInsights.map((insight) => {
  const label = categoryLabels[insight.category];
  const bar = '█'.repeat(Math.floor(insight.impactScore / 10)) + '░'.repeat(10 - Math.floor(insight.impactScore / 10));
  let text = `${label.padEnd(10)} [${bar}] ${insight.impactScore}% strain`;
  if (insight.recommendation) {
    text += `\n            → ${insight.recommendation}`;
  }
  return text;
}).join('\n\n')}

────────────────────────────────────────────────────────────────
${disclaimer}
────────────────────────────────────────────────────────────────
`;

  return report;
}

function formatSparkline(values: number[]): string {
  if (values.length === 0) return '  [No data]';

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const max = Math.max(...values, 1);

  const sparkline = values.map((v) => {
    const normalized = v / max;
    const index = Math.min(Math.floor(normalized * 8), 7);
    return chars[index];
  }).join('');

  return `  ${sparkline}`;
}
