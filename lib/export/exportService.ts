import { Share } from 'react-native';
import { CapacityLog, ExportConfig, ExportRange, ExportFormat } from '../../types';
import { getLogs } from '../storage';
import { logAuditEntry } from '../storage';
import { formatLogsAsCsv } from './csvFormatter';
import { generateExportSummary, formatSummaryAsText } from './summaryGenerator';

const RANGE_MS: Record<ExportRange, number> = {
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

export async function getLogsForRange(range: ExportRange): Promise<CapacityLog[]> {
  const logs = await getLogs();
  if (range === 'all') return logs;

  const cutoff = Date.now() - RANGE_MS[range];
  return logs.filter((log) => log.timestamp >= cutoff);
}

export async function exportData(
  config: ExportConfig,
  locale: string = 'en'
): Promise<{ success: boolean; error?: string }> {
  try {
    const logs = await getLogsForRange(config.range);

    if (logs.length === 0) {
      return { success: false, error: 'no_data' };
    }

    let content: string;
    let title: string;

    switch (config.format) {
      case 'json':
        content = formatAsJson(logs);
        title = `Orbital Export - ${config.range}`;
        break;
      case 'csv':
        content = formatLogsAsCsv(logs, { includeNotes: config.includeNotes });
        title = `Orbital Export - ${config.range}`;
        break;
      case 'summary':
        const summary = generateExportSummary(logs);
        content = formatSummaryAsText(summary, locale);
        title = locale === 'es' ? 'Resumen Orbital' : 'Orbital Summary';
        break;
      default:
        return { success: false, error: 'invalid_format' };
    }

    await Share.share({
      message: content,
      title,
    });

    // Log the export action
    await logAuditEntry('export_generated', {
      details: `${config.format} export (${config.range})`,
    });

    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('[Orbital Export] Failed:', error);
    return { success: false, error: 'export_failed' };
  }
}

function formatAsJson(logs: CapacityLog[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      logCount: logs.length,
      logs,
    },
    null,
    2
  );
}

// Quick export helpers for common use cases
export async function exportNinetyDaySummary(locale: string = 'en') {
  return exportData({ format: 'summary', range: '90d', includeNotes: false }, locale);
}

export async function exportAnnualSummary(locale: string = 'en') {
  return exportData({ format: 'summary', range: '1y', includeNotes: false }, locale);
}

export async function exportFullJson() {
  return exportData({ format: 'json', range: 'all', includeNotes: true });
}

export async function exportFullCsv(includeNotes = false) {
  return exportData({ format: 'csv', range: 'all', includeNotes });
}
