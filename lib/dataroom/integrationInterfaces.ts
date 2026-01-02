import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IntegrationConfig,
  IntegrationType,
  IntegrationStatus,
  WebhookEndpoint,
  APICredential,
  Permission,
} from '../../types';

const INTEGRATIONS_KEY = '@orbital:integrations';
const WEBHOOKS_KEY = '@orbital:webhooks';
const API_CREDENTIALS_KEY = '@orbital:api_credentials';
const INTEGRATION_AUDIT_KEY = '@orbital:integration_audit';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'orb_' + Math.random().toString(36).substr(2, 8);
  const secret = Math.random().toString(36).substr(2, 32);
  const key = `${prefix}_${secret}`;
  const hash = hashContent(key);
  return { key, prefix: prefix.substring(0, 12), hash };
}

function generateWebhookSecret(): string {
  return 'whsec_' + Math.random().toString(36).substr(2, 32);
}

// ============================================
// INTEGRATION AUDIT LOG
// ============================================

interface IntegrationAuditEntry {
  id: string;
  orgId: string;
  integrationType: IntegrationType;
  integrationId?: string;
  action:
    | 'integration_configured'
    | 'integration_activated'
    | 'integration_disabled'
    | 'integration_error'
    | 'webhook_created'
    | 'webhook_triggered'
    | 'webhook_failed'
    | 'api_key_created'
    | 'api_key_used'
    | 'api_key_revoked';
  performedBy: string;
  performedAt: number;
  details?: string;
  metadata?: Record<string, unknown>;
}

async function logIntegrationAudit(
  action: IntegrationAuditEntry['action'],
  orgId: string,
  integrationType: IntegrationType,
  performedBy: string,
  options?: {
    integrationId?: string;
    details?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<IntegrationAuditEntry> {
  const entry: IntegrationAuditEntry = {
    id: generateId('iaud'),
    orgId,
    integrationType,
    integrationId: options?.integrationId,
    action,
    performedBy,
    performedAt: Date.now(),
    details: options?.details,
    metadata: options?.metadata,
  };

  const data = await AsyncStorage.getItem(INTEGRATION_AUDIT_KEY);
  const log: IntegrationAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(INTEGRATION_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getIntegrationAuditLog(
  filter?: { orgId?: string; integrationType?: IntegrationType }
): Promise<IntegrationAuditEntry[]> {
  const data = await AsyncStorage.getItem(INTEGRATION_AUDIT_KEY);
  if (!data) return [];
  let log: IntegrationAuditEntry[] = JSON.parse(data);

  if (filter?.orgId) {
    log = log.filter((e) => e.orgId === filter.orgId);
  }
  if (filter?.integrationType) {
    log = log.filter((e) => e.integrationType === filter.integrationType);
  }

  return log;
}

// ============================================
// INTEGRATION CONFIGURATIONS
// ============================================

export async function getIntegrations(): Promise<IntegrationConfig[]> {
  const data = await AsyncStorage.getItem(INTEGRATIONS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getOrgIntegrations(orgId: string): Promise<IntegrationConfig[]> {
  const integrations = await getIntegrations();
  return integrations.filter((i) => i.orgId === orgId);
}

export async function getIntegration(integrationId: string): Promise<IntegrationConfig | null> {
  const integrations = await getIntegrations();
  return integrations.find((i) => i.id === integrationId) || null;
}

export async function getIntegrationByType(
  orgId: string,
  type: IntegrationType
): Promise<IntegrationConfig | null> {
  const integrations = await getOrgIntegrations(orgId);
  return integrations.find((i) => i.type === type) || null;
}

export async function configureIntegration(
  orgId: string,
  type: IntegrationType,
  settings: Record<string, string | boolean | number>,
  configuredBy: string,
  provider?: string
): Promise<IntegrationConfig> {
  const integrations = await getIntegrations();

  // Check for existing integration
  const existingIndex = integrations.findIndex((i) => i.orgId === orgId && i.type === type);

  const integration: IntegrationConfig = {
    id: existingIndex >= 0 ? integrations[existingIndex].id : generateId('int'),
    orgId,
    type,
    status: 'configured',
    provider,
    configuredAt: Date.now(),
    configuredBy,
    settings,
  };

  if (existingIndex >= 0) {
    integrations[existingIndex] = integration;
  } else {
    integrations.push(integration);
  }

  await AsyncStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));

  await logIntegrationAudit('integration_configured', orgId, type, configuredBy, {
    integrationId: integration.id,
    details: `${type} integration configured${provider ? ` with ${provider}` : ''}`,
  });

  return integration;
}

export async function activateIntegration(
  integrationId: string,
  activatedBy: string
): Promise<IntegrationConfig | null> {
  const integrations = await getIntegrations();
  const index = integrations.findIndex((i) => i.id === integrationId);
  if (index === -1) return null;

  integrations[index].status = 'active';
  integrations[index].lastActivityAt = Date.now();
  await AsyncStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));

  await logIntegrationAudit(
    'integration_activated',
    integrations[index].orgId,
    integrations[index].type,
    activatedBy,
    { integrationId }
  );

  return integrations[index];
}

export async function disableIntegration(
  integrationId: string,
  disabledBy: string
): Promise<IntegrationConfig | null> {
  const integrations = await getIntegrations();
  const index = integrations.findIndex((i) => i.id === integrationId);
  if (index === -1) return null;

  integrations[index].status = 'disabled';
  await AsyncStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));

  await logIntegrationAudit(
    'integration_disabled',
    integrations[index].orgId,
    integrations[index].type,
    disabledBy,
    { integrationId }
  );

  return integrations[index];
}

export async function recordIntegrationError(
  integrationId: string,
  errorMessage: string
): Promise<IntegrationConfig | null> {
  const integrations = await getIntegrations();
  const index = integrations.findIndex((i) => i.id === integrationId);
  if (index === -1) return null;

  integrations[index].status = 'error';
  integrations[index].errorMessage = errorMessage;
  await AsyncStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));

  await logIntegrationAudit(
    'integration_error',
    integrations[index].orgId,
    integrations[index].type,
    'system',
    { integrationId, details: errorMessage }
  );

  return integrations[index];
}

// ============================================
// WEBHOOKS
// ============================================

export const WEBHOOK_EVENTS = [
  'capacity.logged',
  'share.created',
  'share.accessed',
  'share.revoked',
  'export.generated',
  'user.created',
  'user.updated',
  'user.deleted',
  'org.provisioned',
  'org.activated',
  'org.suspended',
  'subscription.created',
  'subscription.renewed',
  'subscription.cancelled',
  'contract.signed',
  'incident.detected',
  'incident.resolved',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export async function getWebhooks(): Promise<WebhookEndpoint[]> {
  const data = await AsyncStorage.getItem(WEBHOOKS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getOrgWebhooks(orgId: string): Promise<WebhookEndpoint[]> {
  const webhooks = await getWebhooks();
  return webhooks.filter((w) => w.orgId === orgId);
}

export async function getWebhook(webhookId: string): Promise<WebhookEndpoint | null> {
  const webhooks = await getWebhooks();
  return webhooks.find((w) => w.id === webhookId) || null;
}

export async function createWebhook(
  orgId: string,
  url: string,
  events: string[],
  createdBy: string
): Promise<{ webhook: WebhookEndpoint; secret: string }> {
  const secret = generateWebhookSecret();

  const webhook: WebhookEndpoint = {
    id: generateId('whk'),
    orgId,
    url,
    events,
    secret: hashContent(secret), // Store hash, return plain secret once
    isActive: true,
    createdAt: Date.now(),
    failureCount: 0,
  };

  const webhooks = await getWebhooks();
  webhooks.push(webhook);
  await AsyncStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  await logIntegrationAudit('webhook_created', orgId, 'webhook', createdBy, {
    integrationId: webhook.id,
    details: `Webhook created for events: ${events.join(', ')}`,
  });

  return { webhook, secret };
}

export async function updateWebhookEvents(
  webhookId: string,
  events: string[],
  updatedBy: string
): Promise<WebhookEndpoint | null> {
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex((w) => w.id === webhookId);
  if (index === -1) return null;

  webhooks[index].events = events;
  await AsyncStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  return webhooks[index];
}

export async function toggleWebhook(
  webhookId: string,
  isActive: boolean,
  updatedBy: string
): Promise<WebhookEndpoint | null> {
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex((w) => w.id === webhookId);
  if (index === -1) return null;

  webhooks[index].isActive = isActive;
  webhooks[index].failureCount = 0;
  webhooks[index].lastFailure = undefined;
  await AsyncStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  return webhooks[index];
}

export async function deleteWebhook(
  webhookId: string,
  deletedBy: string
): Promise<boolean> {
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex((w) => w.id === webhookId);
  if (index === -1) return false;

  const deleted = webhooks.splice(index, 1)[0];
  await AsyncStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  await logIntegrationAudit('webhook_created', deleted.orgId, 'webhook', deletedBy, {
    integrationId: webhookId,
    details: 'Webhook deleted',
  });

  return true;
}

export async function recordWebhookTrigger(
  webhookId: string,
  event: string,
  success: boolean,
  errorMessage?: string
): Promise<WebhookEndpoint | null> {
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex((w) => w.id === webhookId);
  if (index === -1) return null;

  webhooks[index].lastTriggeredAt = Date.now();

  if (success) {
    webhooks[index].failureCount = 0;
    webhooks[index].lastFailure = undefined;
  } else {
    webhooks[index].failureCount++;
    webhooks[index].lastFailure = {
      at: Date.now(),
      error: errorMessage || 'Unknown error',
    };

    // Auto-disable after 5 consecutive failures
    if (webhooks[index].failureCount >= 5) {
      webhooks[index].isActive = false;
    }
  }

  await AsyncStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  await logIntegrationAudit(
    success ? 'webhook_triggered' : 'webhook_failed',
    webhooks[index].orgId,
    'webhook',
    'system',
    {
      integrationId: webhookId,
      details: `Event: ${event}${errorMessage ? ` - ${errorMessage}` : ''}`,
    }
  );

  return webhooks[index];
}

// ============================================
// API CREDENTIALS
// ============================================

export async function getAPICredentials(): Promise<APICredential[]> {
  const data = await AsyncStorage.getItem(API_CREDENTIALS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getOrgAPICredentials(orgId: string): Promise<APICredential[]> {
  const credentials = await getAPICredentials();
  return credentials.filter((c) => c.orgId === orgId && c.isActive);
}

export async function createAPICredential(
  orgId: string,
  name: string,
  permissions: Permission[],
  createdBy: string,
  options?: {
    expiresAt?: number;
    rateLimit?: number;
  }
): Promise<{ credential: APICredential; apiKey: string }> {
  const { key, prefix, hash } = generateApiKey();

  const credential: APICredential = {
    id: generateId('apic'),
    orgId,
    name,
    keyPrefix: prefix,
    keyHash: hash,
    permissions,
    createdAt: Date.now(),
    createdBy,
    expiresAt: options?.expiresAt,
    isActive: true,
    rateLimit: options?.rateLimit || 1000,
  };

  const credentials = await getAPICredentials();
  credentials.push(credential);
  await AsyncStorage.setItem(API_CREDENTIALS_KEY, JSON.stringify(credentials));

  await logIntegrationAudit('api_key_created', orgId, 'api', createdBy, {
    integrationId: credential.id,
    details: `API key created: ${name} (${prefix}...)`,
  });

  return { credential, apiKey: key };
}

export async function validateAPIKey(
  apiKey: string
): Promise<{ valid: boolean; credential?: APICredential }> {
  const hash = hashContent(apiKey);
  const credentials = await getAPICredentials();

  const credential = credentials.find((c) => c.keyHash === hash && c.isActive);

  if (!credential) {
    return { valid: false };
  }

  // Check expiration
  if (credential.expiresAt && credential.expiresAt < Date.now()) {
    return { valid: false };
  }

  // Update last used
  const index = credentials.findIndex((c) => c.id === credential.id);
  credentials[index].lastUsedAt = Date.now();
  await AsyncStorage.setItem(API_CREDENTIALS_KEY, JSON.stringify(credentials));

  await logIntegrationAudit('api_key_used', credential.orgId, 'api', 'system', {
    integrationId: credential.id,
  });

  return { valid: true, credential };
}

export async function revokeAPICredential(
  credentialId: string,
  revokedBy: string
): Promise<boolean> {
  const credentials = await getAPICredentials();
  const index = credentials.findIndex((c) => c.id === credentialId);
  if (index === -1) return false;

  credentials[index].isActive = false;
  await AsyncStorage.setItem(API_CREDENTIALS_KEY, JSON.stringify(credentials));

  await logIntegrationAudit('api_key_revoked', credentials[index].orgId, 'api', revokedBy, {
    integrationId: credentialId,
    details: `API key revoked: ${credentials[index].name}`,
  });

  return true;
}

// ============================================
// SSO CONFIGURATION
// ============================================

export interface SSOConfig {
  provider: 'okta' | 'azure_ad' | 'google' | 'onelogin' | 'custom';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: {
    email: string;
    firstName?: string;
    lastName?: string;
    groups?: string;
  };
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRole: string;
}

export async function configureSSOIntegration(
  orgId: string,
  config: SSOConfig,
  configuredBy: string
): Promise<IntegrationConfig> {
  return await configureIntegration(
    orgId,
    'sso',
    {
      provider: config.provider,
      entityId: config.entityId,
      ssoUrl: config.ssoUrl,
      certificateHash: hashContent(config.certificate),
      attributeMapping: JSON.stringify(config.attributeMapping),
      allowedDomains: config.allowedDomains.join(','),
      autoProvision: config.autoProvision,
      defaultRole: config.defaultRole,
    },
    configuredBy,
    config.provider
  );
}

// ============================================
// INTEGRATION SUMMARY
// ============================================

export async function getIntegrationSummary(orgId: string): Promise<{
  sso: { configured: boolean; provider?: string; status?: IntegrationStatus };
  webhooks: { count: number; active: number; failingCount: number };
  apiCredentials: { count: number; active: number };
  integrations: IntegrationConfig[];
}> {
  const integrations = await getOrgIntegrations(orgId);
  const webhooks = await getOrgWebhooks(orgId);
  const credentials = await getOrgAPICredentials(orgId);

  const ssoIntegration = integrations.find((i) => i.type === 'sso');

  return {
    sso: {
      configured: !!ssoIntegration,
      provider: ssoIntegration?.provider,
      status: ssoIntegration?.status,
    },
    webhooks: {
      count: webhooks.length,
      active: webhooks.filter((w) => w.isActive).length,
      failingCount: webhooks.filter((w) => w.failureCount > 0).length,
    },
    apiCredentials: {
      count: credentials.length,
      active: credentials.filter((c) => c.isActive).length,
    },
    integrations,
  };
}
