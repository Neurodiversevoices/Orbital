import { CapacityLog, CapacityState, Category } from '../../types';

export interface CsvOptions {
  includeNotes: boolean;
}

const CSV_HEADERS = ['timestamp', 'date', 'time', 'state', 'category', 'tags', 'has_note'];
const CSV_HEADERS_WITH_NOTES = [...CSV_HEADERS.slice(0, -1), 'note'];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toTimeString().split(' ')[0].slice(0, 5);
}

export function formatLogsAsCsv(logs: CapacityLog[], options: CsvOptions): string {
  const headers = options.includeNotes ? CSV_HEADERS_WITH_NOTES : CSV_HEADERS;
  const rows: string[] = [headers.join(',')];

  for (const log of logs) {
    const row: string[] = [
      log.timestamp.toString(),
      formatDate(log.timestamp),
      formatTime(log.timestamp),
      log.state,
      log.category || '',
      log.tags.join(';'),
    ];

    if (options.includeNotes) {
      row.push(escapeCSV(log.note || ''));
    } else {
      row.push(log.note ? 'true' : 'false');
    }

    rows.push(row.join(','));
  }

  return rows.join('\n');
}
