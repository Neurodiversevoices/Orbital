import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PolicyDocument,
  PolicyAcceptance,
  PolicyType,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';
import { getRequiredPolicies } from './jurisdictionDeployment';

const POLICIES_KEY = '@orbital:policy_documents';
const ACCEPTANCES_KEY = '@orbital:policy_acceptances';

// Simple hash for content integrity
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================
// POLICY DOCUMENT MANAGEMENT
// ============================================

export async function getPolicyDocuments(): Promise<PolicyDocument[]> {
  const data = await AsyncStorage.getItem(POLICIES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPolicyDocument(
  type: PolicyType,
  locale: string = 'en'
): Promise<PolicyDocument | null> {
  const policies = await getPolicyDocuments();
  return policies.find((p) => p.type === type && p.locale === locale) || null;
}

export async function getCurrentPolicyVersion(type: PolicyType): Promise<string | null> {
  const policy = await getPolicyDocument(type);
  return policy?.version || null;
}

export async function createPolicyDocument(
  type: PolicyType,
  content: string,
  locale: string,
  version: string
): Promise<PolicyDocument> {
  const policy: PolicyDocument = {
    type,
    version,
    effectiveDate: Date.now(),
    content,
    locale,
    hash: hashContent(content),
  };

  const policies = await getPolicyDocuments();

  // Remove existing policy of same type and locale
  const filtered = policies.filter((p) => !(p.type === type && p.locale === locale));
  filtered.push(policy);

  await AsyncStorage.setItem(POLICIES_KEY, JSON.stringify(filtered));

  await logImmutableAuditEntry('config_change', {
    actorType: 'admin',
    actorRef: 'system',
    action: `Policy document created: ${type} v${version} (${locale})`,
    metadata: { type, version, locale, hash: policy.hash },
  });

  return policy;
}

export async function updatePolicyDocument(
  type: PolicyType,
  content: string,
  locale: string,
  newVersion: string
): Promise<PolicyDocument> {
  const existing = await getPolicyDocument(type, locale);
  const oldVersion = existing?.version || '0.0';

  const policy = await createPolicyDocument(type, content, locale, newVersion);

  await logImmutableAuditEntry('config_change', {
    actorType: 'admin',
    actorRef: 'system',
    action: `Policy document updated: ${type} v${oldVersion} -> v${newVersion}`,
    metadata: { type, oldVersion, newVersion, locale },
  });

  return policy;
}

// ============================================
// POLICY ACCEPTANCE TRACKING
// ============================================

export async function getPolicyAcceptances(): Promise<PolicyAcceptance[]> {
  const data = await AsyncStorage.getItem(ACCEPTANCES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function acceptPolicy(
  policyType: PolicyType,
  policyVersion: string,
  options?: {
    ipHash?: string;
    userAgent?: string;
  }
): Promise<PolicyAcceptance> {
  const acceptance: PolicyAcceptance = {
    policyType,
    policyVersion,
    acceptedAt: Date.now(),
    ipHash: options?.ipHash,
    userAgent: options?.userAgent,
  };

  const acceptances = await getPolicyAcceptances();
  acceptances.push(acceptance);
  await AsyncStorage.setItem(ACCEPTANCES_KEY, JSON.stringify(acceptances));

  await logImmutableAuditEntry('policy_accepted', {
    actorType: 'user',
    actorRef: 'user',
    action: `Policy accepted: ${policyType} v${policyVersion}`,
    metadata: { policyType, policyVersion },
  });

  return acceptance;
}

export async function hasAcceptedPolicy(
  policyType: PolicyType,
  version?: string
): Promise<boolean> {
  const acceptances = await getPolicyAcceptances();

  if (version) {
    return acceptances.some(
      (a) => a.policyType === policyType && a.policyVersion === version
    );
  }

  // Check if accepted current version
  const currentVersion = await getCurrentPolicyVersion(policyType);
  if (!currentVersion) return false;

  return acceptances.some(
    (a) => a.policyType === policyType && a.policyVersion === currentVersion
  );
}

export async function hasAcceptedAllRequiredPolicies(): Promise<{
  complete: boolean;
  missing: PolicyType[];
}> {
  const required = await getRequiredPolicies();
  const missing: PolicyType[] = [];

  for (const policyType of required) {
    const accepted = await hasAcceptedPolicy(policyType);
    if (!accepted) {
      missing.push(policyType);
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

export async function getPendingPolicyAcceptances(): Promise<PolicyType[]> {
  const result = await hasAcceptedAllRequiredPolicies();
  return result.missing;
}

// ============================================
// DEFAULT POLICY CONTENT
// ============================================

export const DEFAULT_POLICIES: Record<PolicyType, { en: string; es: string }> = {
  terms_of_service: {
    en: `ORBITAL TERMS OF SERVICE

Last Updated: ${new Date().toISOString().split('T')[0]}

1. ACCEPTANCE OF TERMS
By accessing or using Orbital, you agree to be bound by these Terms of Service.

2. SERVICE DESCRIPTION
Orbital is a capacity tracking tool that records self-reported functional capacity data. It is designed for personal insight and optional sharing with trusted parties.

3. NON-DIAGNOSTIC NATURE
Orbital does not provide medical advice, diagnosis, or treatment. The data recorded is self-reported and should not be used as a substitute for professional medical consultation.

4. DATA OWNERSHIP
You retain ownership of your data. We process data only as necessary to provide the service.

5. ACCOUNT TERMINATION
You may terminate your account at any time. Upon termination, your data will be handled according to our Data Retention Policy.

6. LIMITATION OF LIABILITY
Orbital is provided "as is" without warranties of any kind. We are not liable for any damages arising from use of the service.

7. MODIFICATIONS
We reserve the right to modify these terms. Material changes will be disclosed through the app.`,

    es: `TÉRMINOS DE SERVICIO DE ORBITAL

Última actualización: ${new Date().toISOString().split('T')[0]}

1. ACEPTACIÓN DE TÉRMINOS
Al acceder o usar Orbital, acepta estar sujeto a estos Términos de Servicio.

2. DESCRIPCIÓN DEL SERVICIO
Orbital es una herramienta de seguimiento de capacidad que registra datos de capacidad funcional autorreportados. Está diseñada para perspectivas personales y compartición opcional con partes de confianza.

3. NATURALEZA NO DIAGNÓSTICA
Orbital no proporciona consejo médico, diagnóstico o tratamiento. Los datos registrados son autorreportados y no deben usarse como sustituto de consulta médica profesional.

4. PROPIEDAD DE DATOS
Usted retiene la propiedad de sus datos. Solo procesamos datos según sea necesario para proporcionar el servicio.

5. TERMINACIÓN DE CUENTA
Puede terminar su cuenta en cualquier momento. Tras la terminación, sus datos se manejarán según nuestra Política de Retención de Datos.

6. LIMITACIÓN DE RESPONSABILIDAD
Orbital se proporciona "tal cual" sin garantías de ningún tipo. No somos responsables de daños derivados del uso del servicio.

7. MODIFICACIONES
Nos reservamos el derecho de modificar estos términos. Los cambios materiales se divulgarán a través de la aplicación.`,
  },

  privacy_policy: {
    en: `ORBITAL PRIVACY POLICY

Last Updated: ${new Date().toISOString().split('T')[0]}

1. DATA WE COLLECT
- Capacity state entries (self-reported)
- Timestamps and optional notes
- Category attributions (sensory, demand, social)

2. DATA WE DO NOT COLLECT
- Location data
- Device identifiers
- Biometric data
- Third-party app data

3. HOW WE USE DATA
- Display your capacity patterns
- Generate summaries and exports
- Enable sharing with your chosen recipients

4. DATA STORAGE
- Data is stored locally on your device
- Optional cloud sync uses encrypted storage
- Data residency follows jurisdiction requirements

5. DATA SHARING
- We never sell your data
- Sharing occurs only at your explicit direction
- Recipients receive read-only access

6. YOUR RIGHTS
- Access your data at any time
- Export your data in multiple formats
- Delete your data permanently
- Revoke sharing access

7. CONTACT
For privacy inquiries, contact privacy@orbital.app`,

    es: `POLÍTICA DE PRIVACIDAD DE ORBITAL

Última actualización: ${new Date().toISOString().split('T')[0]}

1. DATOS QUE RECOPILAMOS
- Entradas de estado de capacidad (autorreportados)
- Marcas de tiempo y notas opcionales
- Atribuciones de categoría (sensorial, demanda, social)

2. DATOS QUE NO RECOPILAMOS
- Datos de ubicación
- Identificadores de dispositivo
- Datos biométricos
- Datos de aplicaciones de terceros

3. CÓMO USAMOS LOS DATOS
- Mostrar sus patrones de capacidad
- Generar resúmenes y exportaciones
- Habilitar compartición con destinatarios elegidos

4. ALMACENAMIENTO DE DATOS
- Los datos se almacenan localmente en su dispositivo
- La sincronización en la nube opcional usa almacenamiento cifrado
- La residencia de datos sigue requisitos jurisdiccionales

5. COMPARTICIÓN DE DATOS
- Nunca vendemos sus datos
- La compartición ocurre solo bajo su dirección explícita
- Los destinatarios reciben acceso de solo lectura

6. SUS DERECHOS
- Acceder a sus datos en cualquier momento
- Exportar sus datos en múltiples formatos
- Eliminar sus datos permanentemente
- Revocar acceso compartido

7. CONTACTO
Para consultas de privacidad, contacte privacy@orbital.app`,
  },

  data_retention_policy: {
    en: `ORBITAL DATA RETENTION POLICY

Last Updated: ${new Date().toISOString().split('T')[0]}

1. RETENTION PERIODS
- Active data: Retained while account is active
- Archived data: Subject to configured retention window
- Audit logs: Retained for compliance purposes

2. INSTITUTIONAL RETENTION
Organizations may configure retention windows of 1, 3, 5, 7 years, or indefinite retention based on regulatory requirements.

3. LEGAL HOLDS
Data subject to legal proceedings may be placed on legal hold, suspending normal retention schedules.

4. DATA DELETION
- Upon account termination, data enters deletion queue
- 30-day export window provided
- Permanent deletion occurs 14 days after export window closes

5. EXCEPTIONS
- Audit trail entries are immutable and retained separately
- Anonymized aggregate data may be retained for service improvement`,

    es: `POLÍTICA DE RETENCIÓN DE DATOS DE ORBITAL

Última actualización: ${new Date().toISOString().split('T')[0]}

1. PERÍODOS DE RETENCIÓN
- Datos activos: Retenidos mientras la cuenta esté activa
- Datos archivados: Sujetos a ventana de retención configurada
- Registros de auditoría: Retenidos para propósitos de cumplimiento

2. RETENCIÓN INSTITUCIONAL
Las organizaciones pueden configurar ventanas de retención de 1, 3, 5, 7 años, o retención indefinida según requisitos regulatorios.

3. RETENCIONES LEGALES
Los datos sujetos a procedimientos legales pueden colocarse en retención legal, suspendiendo los cronogramas normales de retención.

4. ELIMINACIÓN DE DATOS
- Tras terminación de cuenta, los datos entran en cola de eliminación
- Se proporciona ventana de exportación de 30 días
- La eliminación permanente ocurre 14 días después del cierre de la ventana

5. EXCEPCIONES
- Las entradas de auditoría son inmutables y se retienen por separado
- Los datos agregados anonimizados pueden retenerse para mejora del servicio`,
  },

  cancellation_refund_policy: {
    en: `ORBITAL CANCELLATION & REFUND POLICY

Last Updated: ${new Date().toISOString().split('T')[0]}

1. SUBSCRIPTION CANCELLATION
You may cancel your subscription at any time through your account settings.

2. EFFECT OF CANCELLATION
- Access continues until end of current billing period
- No partial refunds for unused time
- Data remains accessible for export

3. INSTITUTIONAL ACCOUNTS
- 30-day notice required for contract termination
- Pro-rated refunds may apply per contract terms
- Data exit procedures per offboarding policy

4. REFUND REQUESTS
Contact support@orbital.app for refund inquiries.`,

    es: `POLÍTICA DE CANCELACIÓN Y REEMBOLSO DE ORBITAL

Última actualización: ${new Date().toISOString().split('T')[0]}

1. CANCELACIÓN DE SUSCRIPCIÓN
Puede cancelar su suscripción en cualquier momento a través de la configuración de su cuenta.

2. EFECTO DE LA CANCELACIÓN
- El acceso continúa hasta el final del período de facturación actual
- No hay reembolsos parciales por tiempo no utilizado
- Los datos permanecen accesibles para exportación

3. CUENTAS INSTITUCIONALES
- Se requiere aviso de 30 días para terminación de contrato
- Pueden aplicarse reembolsos prorrateados según términos del contrato
- Procedimientos de salida de datos según política de baja

4. SOLICITUDES DE REEMBOLSO
Contacte support@orbital.app para consultas de reembolso.`,
  },

  non_diagnostic_disclaimer: {
    en: `ORBITAL NON-DIAGNOSTIC DISCLAIMER

IMPORTANT: READ CAREFULLY

Orbital is NOT a medical device, diagnostic tool, or clinical assessment instrument.

1. SELF-REPORTED DATA
All data in Orbital is self-reported by the user. It reflects subjective perception of functional capacity, not objective medical measurements.

2. NOT MEDICAL ADVICE
Nothing in Orbital constitutes medical advice, diagnosis, or treatment recommendation. Do not use Orbital data to make medical decisions.

3. PROFESSIONAL CONSULTATION
If you have health concerns, consult a qualified healthcare professional. Orbital data may be shared with healthcare providers as supplementary information only.

4. NO WARRANTIES
We make no warranties regarding the accuracy, completeness, or clinical validity of capacity assessments derived from Orbital data.

5. LIMITATION
Orbital is designed for personal insight and optional sharing. It should not replace professional evaluation or treatment.

By using Orbital, you acknowledge understanding and acceptance of this disclaimer.`,

    es: `AVISO DE NO DIAGNÓSTICO DE ORBITAL

IMPORTANTE: LEA CUIDADOSAMENTE

Orbital NO es un dispositivo médico, herramienta de diagnóstico, ni instrumento de evaluación clínica.

1. DATOS AUTORREPORTADOS
Todos los datos en Orbital son autorreportados por el usuario. Reflejan percepción subjetiva de capacidad funcional, no mediciones médicas objetivas.

2. NO ES CONSEJO MÉDICO
Nada en Orbital constituye consejo médico, diagnóstico o recomendación de tratamiento. No use datos de Orbital para tomar decisiones médicas.

3. CONSULTA PROFESIONAL
Si tiene preocupaciones de salud, consulte a un profesional de salud calificado. Los datos de Orbital pueden compartirse con proveedores de atención médica solo como información suplementaria.

4. SIN GARANTÍAS
No hacemos garantías sobre la precisión, completitud o validez clínica de evaluaciones de capacidad derivadas de datos de Orbital.

5. LIMITACIÓN
Orbital está diseñado para perspectiva personal y compartición opcional. No debe reemplazar evaluación o tratamiento profesional.

Al usar Orbital, reconoce que entiende y acepta este aviso.`,
  },

  jurisdiction_governing_law: {
    en: `ORBITAL JURISDICTION & GOVERNING LAW

Last Updated: ${new Date().toISOString().split('T')[0]}

1. GOVERNING LAW
These terms are governed by the laws of the jurisdiction in which you reside, subject to applicable data protection regulations.

2. DISPUTE RESOLUTION
Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules.

3. DATA PROCESSING JURISDICTION
Data processing activities are subject to the data protection laws of the configured jurisdiction (GDPR, CCPA, PIPEDA, etc.).

4. REGULATORY COMPLIANCE
For institutional deployments, additional regulatory frameworks may apply:
- FERPA for educational institutions
- HIPAA-adjacent practices for healthcare contexts
- Industry-specific requirements as applicable

5. CROSS-BORDER TRANSFERS
Data transfers across jurisdictions comply with applicable legal mechanisms (Standard Contractual Clauses, adequacy decisions, etc.).`,

    es: `JURISDICCIÓN Y LEY APLICABLE DE ORBITAL

Última actualización: ${new Date().toISOString().split('T')[0]}

1. LEY APLICABLE
Estos términos se rigen por las leyes de la jurisdicción en la que reside, sujeto a regulaciones de protección de datos aplicables.

2. RESOLUCIÓN DE DISPUTAS
Cualquier disputa se resolverá mediante arbitraje vinculante de acuerdo con las reglas de arbitraje aplicables.

3. JURISDICCIÓN DE PROCESAMIENTO DE DATOS
Las actividades de procesamiento de datos están sujetas a las leyes de protección de datos de la jurisdicción configurada (GDPR, CCPA, PIPEDA, etc.).

4. CUMPLIMIENTO REGULATORIO
Para implementaciones institucionales, pueden aplicar marcos regulatorios adicionales:
- FERPA para instituciones educativas
- Prácticas adyacentes a HIPAA para contextos de atención médica
- Requisitos específicos de la industria según corresponda

5. TRANSFERENCIAS TRANSFRONTERIZAS
Las transferencias de datos entre jurisdicciones cumplen con mecanismos legales aplicables (Cláusulas Contractuales Estándar, decisiones de adecuación, etc.).`,
  },
};

export async function initializeDefaultPolicies(): Promise<void> {
  const policyTypes: PolicyType[] = [
    'terms_of_service',
    'privacy_policy',
    'data_retention_policy',
    'cancellation_refund_policy',
    'non_diagnostic_disclaimer',
    'jurisdiction_governing_law',
  ];

  for (const type of policyTypes) {
    const existingEn = await getPolicyDocument(type, 'en');
    const existingEs = await getPolicyDocument(type, 'es');

    if (!existingEn) {
      await createPolicyDocument(type, DEFAULT_POLICIES[type].en, 'en', '1.0.0');
    }
    if (!existingEs) {
      await createPolicyDocument(type, DEFAULT_POLICIES[type].es, 'es', '1.0.0');
    }
  }
}
