/**
 * CCI Clinical Artifact v1 — FHIR DocumentReference Serializer
 *
 * Serializes CCIV1Data into an HL7 FHIR R4 DocumentReference resource
 * with dual content attachments (human-readable HTML + machine-readable JSON).
 *
 * LOINC Code Selection:
 * We use 77576-7 ("Patient-generated health data document") rather than
 * 89569-8 ("Patient-reported outcome measure panel") because:
 *  - The CCI is a longitudinal summary of self-reported capacity check-ins,
 *    not a single-administration validated questionnaire (PROM)
 *  - 89569-8 implies a standardized panel instrument with validated items
 *  - 77576-7 accurately describes a document generated from patient-
 *    contributed data over time, which is exactly what the CCI produces
 *  - This aligns with ONC/CMS guidance for non-PROM patient-generated data
 *
 * FHIR R4 Conformance:
 *  - resourceType: DocumentReference
 *  - status: current
 *  - meta.profile: Orbital CCI v1 StructureDefinition
 *  - identifier: reportId for deduplication
 *  - type: LOINC 77576-7
 *  - content[0]: HTML (human-readable EHR sidebar)
 *  - content[1]: JSON (machine-readable structured data)
 *  - extension[]: baseline, direction, coverage
 */

import type { CCIV1Data } from './generateCCIV1Data';
import { buildCCIV1HTML } from './cciV1HTML';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIV1FHIRDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  meta: {
    profile: string[];
    lastUpdated: string;
  };
  identifier: Array<{
    system: string;
    value: string;
  }>;
  status: 'current';
  type: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  date: string;
  author: Array<{
    reference: string;
    display: string;
  }>;
  description: string;
  content: Array<{
    attachment: {
      contentType: string;
      language?: string;
      title: string;
      data: string;
      creation: string;
    };
  }>;
  context: {
    period: {
      start: string;
      end: string;
    };
  };
  extension: Array<{
    url: string;
    valueString: string;
  }>;
}

// =============================================================================
// BASE64 ENCODING
// =============================================================================

/**
 * Encode a string to Base64.
 * Uses global btoa (available in Hermes) with fallback for edge cases.
 */
function toBase64(input: string): string {
  if (typeof btoa === 'function') {
    // Handle Unicode by encoding to UTF-8 first
    const utf8 = encodeURIComponent(input).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16)),
    );
    return btoa(utf8);
  }

  // Manual Base64 fallback for environments without btoa
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = Array.from(input).map((c) => c.charCodeAt(0));
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return result;
}

// =============================================================================
// SERIALIZER
// =============================================================================

/**
 * Serialize CCIV1Data into an HL7 FHIR R4 DocumentReference resource.
 *
 * Pure function — no side effects, no async, no network calls.
 *
 * @param data - The computed CCIV1Data
 * @returns FHIR R4 DocumentReference resource
 */
export function serializeCCIV1ToFHIR(data: CCIV1Data): CCIV1FHIRDocumentReference {
  const now = new Date().toISOString();

  // Build human-readable HTML attachment
  const htmlContent = buildCCIV1HTML(data);
  const htmlBase64 = toBase64(htmlContent);

  // Build machine-readable JSON attachment
  const jsonContent = JSON.stringify(data, null, 2);
  const jsonBase64 = toBase64(jsonContent);

  return {
    resourceType: 'DocumentReference',
    id: data.reportId,

    // Profile declaration — tells EHR what to expect
    meta: {
      profile: ['https://orbitalhealth.app/fhir/StructureDefinition/cci-v1'],
      lastUpdated: now,
    },

    // Deduplication — avoids duplicate reports if pushed twice
    identifier: [
      {
        system: 'https://orbitalhealth.app/cci',
        value: data.reportId,
      },
    ],

    status: 'current',

    // LOINC 77576-7: Patient-generated health data document
    // See module docblock for rationale on code selection
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '77576-7',
          display: 'Patient-generated health data document',
        },
      ],
      text: 'CCI Clinical Artifact v1',
    },

    subject: {
      reference: `Patient/${data.clientId}`,
      display: data.clientId,
    },

    date: data.generatedDate,

    author: [
      {
        reference: `Practitioner/${data.providerNPI}`,
        display: data.providerName,
      },
    ],

    description: 'Clinical Capacity Instrument — 90-Day Clinical Artifact v1',

    content: [
      {
        // Human-readable — EHR can render this directly in sidebar
        attachment: {
          contentType: 'text/html',
          language: 'en-US',
          title: `Clinical Capacity Instrument — 90-Day Report`,
          data: htmlBase64,
          creation: data.generatedDate,
        },
      },
      {
        // Machine-readable — for structured data consumers
        attachment: {
          contentType: 'application/json',
          title: 'CCI V1 Structured Data',
          data: jsonBase64,
          creation: data.generatedDate,
        },
      },
    ],

    context: {
      period: {
        start: data.periodStart,
        end: data.periodEnd,
      },
    },

    // Structured classification extensions
    extension: [
      {
        url: 'https://orbitalhealth.app/fhir/cci-v1-baseline',
        valueString: data.baseline90Day,
      },
      {
        url: 'https://orbitalhealth.app/fhir/cci-v1-direction',
        valueString: data.direction30Day,
      },
      {
        url: 'https://orbitalhealth.app/fhir/cci-v1-coverage',
        valueString: `${data.coverageDays} of ${data.coverageTotal} days`,
      },
    ],
  };
}
