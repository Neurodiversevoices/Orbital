import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExportWatermark,
  WatermarkedExport,
  JurisdictionCode,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';

const WATERMARKED_EXPORTS_KEY = '@orbital:watermarked_exports';

// Simple hash for integrity verification
function generateIntegrityHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function generateExportId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const WATERMARK_DISCLAIMERS = {
  en: 'NON-DIAGNOSTIC | READ-ONLY | This export contains self-reported capacity data and does not constitute clinical evaluation or diagnosis.',
  es: 'SIN VALOR DIAGNÓSTICO | SOLO LECTURA | Esta exportación contiene datos de capacidad autorreportados y no constituye evaluación clínica ni diagnóstico.',
};

// ============================================
// WATERMARK GENERATION
// ============================================

export function generateWatermark(
  params: {
    orgName: string;
    scope: string;
    recordCount: number;
    exportedBy: string;
    jurisdiction?: JurisdictionCode;
    locale?: string;
  },
  contentForHash: string
): ExportWatermark {
  const locale = params.locale || 'en';

  return {
    orgName: params.orgName,
    exportDate: Date.now(),
    scope: params.scope,
    recordCount: params.recordCount,
    disclaimer: WATERMARK_DISCLAIMERS[locale === 'es' ? 'es' : 'en'],
    exportedBy: params.exportedBy,
    integrityHash: generateIntegrityHash(contentForHash),
    jurisdiction: params.jurisdiction,
  };
}

export function formatWatermarkHeader(watermark: ExportWatermark, locale: string = 'en'): string {
  const date = new Date(watermark.exportDate);
  const dateStr = date.toISOString().split('T')[0];

  const labels = locale === 'es' ? {
    exportedFor: 'Exportado para',
    date: 'Fecha',
    scope: 'Alcance',
    records: 'Registros',
    jurisdiction: 'Jurisdicción',
    integrityHash: 'Hash de integridad',
  } : {
    exportedFor: 'Exported for',
    date: 'Date',
    scope: 'Scope',
    records: 'Records',
    jurisdiction: 'Jurisdiction',
    integrityHash: 'Integrity Hash',
  };

  let header = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                              ORBITAL EXPORT                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ${labels.exportedFor}: ${watermark.orgName.padEnd(54)}║
║  ${labels.date}: ${dateStr.padEnd(62)}║
║  ${labels.scope}: ${watermark.scope.padEnd(61)}║
║  ${labels.records}: ${watermark.recordCount.toString().padEnd(59)}║`;

  if (watermark.jurisdiction) {
    header += `
║  ${labels.jurisdiction}: ${watermark.jurisdiction.padEnd(54)}║`;
  }

  header += `
║  ${labels.integrityHash}: ${watermark.integrityHash.padEnd(45)}║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ${watermark.disclaimer.substring(0, 76).padEnd(76)}║`;

  if (watermark.disclaimer.length > 76) {
    header += `
║  ${watermark.disclaimer.substring(76).padEnd(76)}║`;
  }

  header += `
╚══════════════════════════════════════════════════════════════════════════════╝
`;

  return header;
}

export function formatWatermarkFooter(watermark: ExportWatermark, locale: string = 'en'): string {
  const labels = locale === 'es' ? {
    endOfExport: 'FIN DE LA EXPORTACIÓN',
    verifyWith: 'Verificar integridad con hash',
  } : {
    endOfExport: 'END OF EXPORT',
    verifyWith: 'Verify integrity with hash',
  };

  return `
────────────────────────────────────────────────────────────────────────────────
${labels.endOfExport}
${watermark.disclaimer}
${labels.verifyWith}: ${watermark.integrityHash}
────────────────────────────────────────────────────────────────────────────────
`;
}

// ============================================
// WATERMARKED EXPORT TRACKING
// ============================================

export async function getWatermarkedExports(): Promise<WatermarkedExport[]> {
  const data = await AsyncStorage.getItem(WATERMARKED_EXPORTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function recordWatermarkedExport(
  format: 'pdf' | 'csv' | 'json',
  watermark: ExportWatermark,
  expiresInDays?: number
): Promise<WatermarkedExport> {
  const now = Date.now();

  const auditEntry = await logImmutableAuditEntry('data_export', {
    actorType: 'user',
    actorRef: watermark.exportedBy,
    action: `Watermarked ${format.toUpperCase()} export generated`,
    scope: watermark.scope,
    metadata: {
      orgName: watermark.orgName,
      recordCount: watermark.recordCount,
      integrityHash: watermark.integrityHash,
    },
  });

  const exportRecord: WatermarkedExport = {
    id: generateExportId(),
    format,
    watermark,
    createdAt: now,
    expiresAt: expiresInDays ? now + expiresInDays * 24 * 60 * 60 * 1000 : undefined,
    accessCount: 0,
    auditRef: auditEntry.id,
  };

  const exports = await getWatermarkedExports();
  exports.unshift(exportRecord);

  // Keep only last 100 exports
  const trimmed = exports.slice(0, 100);
  await AsyncStorage.setItem(WATERMARKED_EXPORTS_KEY, JSON.stringify(trimmed));

  return exportRecord;
}

export async function recordExportAccess(exportId: string): Promise<void> {
  const exports = await getWatermarkedExports();
  const index = exports.findIndex((e) => e.id === exportId);

  if (index >= 0) {
    exports[index].accessCount++;
    await AsyncStorage.setItem(WATERMARKED_EXPORTS_KEY, JSON.stringify(exports));

    await logImmutableAuditEntry('data_access', {
      actorType: 'user',
      actorRef: 'unknown',
      action: 'Watermarked export accessed',
      targetRef: exportId,
    });
  }
}

export async function verifyExportIntegrity(
  exportId: string,
  contentToVerify: string
): Promise<{
  isValid: boolean;
  storedHash: string;
  computedHash: string;
}> {
  const exports = await getWatermarkedExports();
  const exportRecord = exports.find((e) => e.id === exportId);

  if (!exportRecord) {
    return { isValid: false, storedHash: 'not_found', computedHash: '' };
  }

  const computedHash = generateIntegrityHash(contentToVerify);

  return {
    isValid: exportRecord.watermark.integrityHash === computedHash,
    storedHash: exportRecord.watermark.integrityHash,
    computedHash,
  };
}

// ============================================
// FULL WATERMARKED CONTENT GENERATION
// ============================================

export function wrapContentWithWatermark(
  content: string,
  watermark: ExportWatermark,
  locale: string = 'en'
): string {
  const header = formatWatermarkHeader(watermark, locale);
  const footer = formatWatermarkFooter(watermark, locale);

  return `${header}\n${content}\n${footer}`;
}

export async function createWatermarkedExport(
  params: {
    orgName: string;
    scope: string;
    recordCount: number;
    exportedBy: string;
    format: 'pdf' | 'csv' | 'json';
    content: string;
    jurisdiction?: JurisdictionCode;
    locale?: string;
    expiresInDays?: number;
  }
): Promise<{
  watermarkedContent: string;
  exportRecord: WatermarkedExport;
}> {
  const watermark = generateWatermark(
    {
      orgName: params.orgName,
      scope: params.scope,
      recordCount: params.recordCount,
      exportedBy: params.exportedBy,
      jurisdiction: params.jurisdiction,
      locale: params.locale,
    },
    params.content
  );

  const watermarkedContent = wrapContentWithWatermark(
    params.content,
    watermark,
    params.locale || 'en'
  );

  const exportRecord = await recordWatermarkedExport(
    params.format,
    watermark,
    params.expiresInDays
  );

  return { watermarkedContent, exportRecord };
}
