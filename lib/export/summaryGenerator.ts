import { CapacityLog, CapacityState, Category, ExportSummary, SupportedLocale } from '../../types';

const STATE_CAPACITY_VALUES: Record<CapacityState, number> = {
  resourced: 100,
  stretched: 50,
  depleted: 0,
};

export function generateExportSummary(logs: CapacityLog[]): ExportSummary {
  const now = Date.now();
  const timestamps = logs.map((l) => l.timestamp);
  const rangeStart = logs.length > 0 ? Math.min(...timestamps) : now;
  const rangeEnd = logs.length > 0 ? Math.max(...timestamps) : now;

  // State distribution
  const stateDistribution: Record<CapacityState, number> = {
    resourced: 0,
    stretched: 0,
    depleted: 0,
  };
  for (const log of logs) {
    stateDistribution[log.state]++;
  }

  // Category breakdown
  const categoryBreakdown: Record<Category, { count: number; strainRate: number }> = {
    sensory: { count: 0, strainRate: 0 },
    demand: { count: 0, strainRate: 0 },
    social: { count: 0, strainRate: 0 },
  };

  for (const log of logs) {
    if (log.category) {
      categoryBreakdown[log.category].count++;
      if (log.state === 'depleted') {
        categoryBreakdown[log.category].strainRate++;
      }
    }
  }

  // Calculate strain rates as percentages
  for (const cat of Object.keys(categoryBreakdown) as Category[]) {
    const data = categoryBreakdown[cat];
    if (data.count > 0) {
      data.strainRate = Math.round((data.strainRate / data.count) * 100);
    }
  }

  // Average capacity
  const totalCapacity = logs.reduce(
    (sum, log) => sum + STATE_CAPACITY_VALUES[log.state],
    0
  );
  const averageCapacity = logs.length > 0 ? Math.round(totalCapacity / logs.length) : 0;

  // Depleted percentage
  const depletedPercentage =
    logs.length > 0 ? Math.round((stateDistribution.depleted / logs.length) * 100) : 0;

  return {
    generatedAt: now,
    rangeStart,
    rangeEnd,
    totalLogs: logs.length,
    averageCapacity,
    depletedPercentage,
    stateDistribution,
    categoryBreakdown,
  };
}

export function formatSummaryAsText(
  summary: ExportSummary,
  locale: SupportedLocale = 'en'
): string {
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const total = summary.totalLogs;
  const resourcedPct =
    total > 0 ? Math.round((summary.stateDistribution.resourced / total) * 100) : 0;
  const stretchedPct =
    total > 0 ? Math.round((summary.stateDistribution.stretched / total) * 100) : 0;
  const depletedPct =
    total > 0 ? Math.round((summary.stateDistribution.depleted / total) * 100) : 0;

  if (locale === 'es') {
    return `RESUMEN DE CAPACIDAD ORBITAL
Periodo: ${formatDate(summary.rangeStart)} - ${formatDate(summary.rangeEnd)}

Senales totales: ${summary.totalLogs}
Capacidad promedio: ${summary.averageCapacity}%

Distribucion de estados:
- Capacidad alta: ${resourcedPct}%
- Estable: ${stretchedPct}%
- Reducida: ${depletedPct}%

---
Sin valor diagnostico. Datos de capacidad autorreportados normalizados.`;
  }

  return `ORBITAL CAPACITY SUMMARY
Period: ${formatDate(summary.rangeStart)} - ${formatDate(summary.rangeEnd)}

Total Signals: ${summary.totalLogs}
Average Capacity: ${summary.averageCapacity}%

State Distribution:
- High Capacity: ${resourcedPct}%
- Stable: ${stretchedPct}%
- Depleted: ${depletedPct}%

---
Non-diagnostic. Normalized self-reported capacity data.`;
}
