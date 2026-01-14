import { useState, useCallback } from 'react';
import { ExportFormat, ExportRange, Locale } from '../../types';
import {
  exportData,
  exportNinetyDaySummary,
  exportAnnualSummary,
  exportFullJson,
  exportFullCsv,
  getLogsForRange,
} from '../export';
import { getProfileForExport, getProfileForSharedExport } from '../profile';

interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportWithConfig: (
    format: ExportFormat,
    range: ExportRange,
    includeNotes: boolean,
    locale: Locale
  ) => Promise<boolean>;
  exportSummary90d: (locale: Locale) => Promise<boolean>;
  exportSummaryAnnual: (locale: Locale) => Promise<boolean>;
  /** Personal export - includes demographics (user owns their data) */
  exportJson: () => Promise<boolean>;
  exportCsv: (includeNotes?: boolean) => Promise<boolean>;
  getLogCount: (range: ExportRange) => Promise<number>;
  clearError: () => void;
  /** Get profile for personal export (includes all demographics) */
  getProfileForPersonalExport: () => Promise<Record<string, unknown>>;
  /** Get profile for shared export (excludes demographics by default) */
  getProfileForSharing: (includeDemographics?: boolean) => Promise<Record<string, unknown>>;
}

export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportWithConfig = useCallback(
    async (
      format: ExportFormat,
      range: ExportRange,
      includeNotes: boolean,
      locale: Locale
    ): Promise<boolean> => {
      setIsExporting(true);
      setError(null);
      try {
        const result = await exportData({ format, range, includeNotes }, locale);
        if (!result.success) {
          setError(result.error || 'export_failed');
          return false;
        }
        return true;
      } catch (e) {
        setError('export_failed');
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const exportSummary90d = useCallback(async (locale: Locale): Promise<boolean> => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportNinetyDaySummary(locale);
      if (!result.success) {
        setError(result.error || 'export_failed');
        return false;
      }
      return true;
    } catch (e) {
      setError('export_failed');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportSummaryAnnual = useCallback(async (locale: Locale): Promise<boolean> => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportAnnualSummary(locale);
      if (!result.success) {
        setError(result.error || 'export_failed');
        return false;
      }
      return true;
    } catch (e) {
      setError('export_failed');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportJson = useCallback(async (): Promise<boolean> => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportFullJson();
      if (!result.success) {
        setError(result.error || 'export_failed');
        return false;
      }
      return true;
    } catch (e) {
      setError('export_failed');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportCsv = useCallback(async (includeNotes = false): Promise<boolean> => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportFullCsv(includeNotes);
      if (!result.success) {
        setError(result.error || 'export_failed');
        return false;
      }
      return true;
    } catch (e) {
      setError('export_failed');
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const getLogCount = useCallback(async (range: ExportRange): Promise<number> => {
    try {
      const logs = await getLogsForRange(range);
      return logs.length;
    } catch {
      return 0;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Profile export helpers for demographics
  const getProfileForPersonalExport = useCallback(async (): Promise<Record<string, unknown>> => {
    const profile = await getProfileForExport();
    return profile as unknown as Record<string, unknown>;
  }, []);

  const getProfileForSharing = useCallback(async (includeDemographics = false): Promise<Record<string, unknown>> => {
    const profile = await getProfileForSharedExport(includeDemographics);
    return profile as unknown as Record<string, unknown>;
  }, []);

  return {
    isExporting,
    error,
    exportWithConfig,
    exportSummary90d,
    exportSummaryAnnual,
    exportJson,
    exportCsv,
    getLogCount,
    clearError,
    getProfileForPersonalExport,
    getProfileForSharing,
  };
}
