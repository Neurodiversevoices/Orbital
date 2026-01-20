/**
 * Security Audit Logging Service
 *
 * Logs security-relevant events to Supabase for audit trail and monitoring.
 * All events are immutable and timestamped.
 *
 * Event types:
 * - AUTH_SUCCESS / AUTH_FAILURE
 * - PURCHASE_INITIATED / PURCHASE_COMPLETED / PURCHASE_FAILED
 * - ENTITLEMENT_GRANTED / ENTITLEMENT_DENIED
 * - WEBHOOK_RECEIVED / WEBHOOK_INVALID
 * - RATE_LIMIT_EXCEEDED
 * - CORS_REJECTED
 * - INVALID_REQUEST
 *
 * SECURITY: No PII beyond user IDs. No tokens or secrets logged.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_TOKEN_INVALID'
  | 'PURCHASE_INITIATED'
  | 'PURCHASE_COMPLETED'
  | 'PURCHASE_FAILED'
  | 'ENTITLEMENT_GRANTED'
  | 'ENTITLEMENT_DENIED'
  | 'ENTITLEMENT_FETCH_SUCCESS'
  | 'ENTITLEMENT_FETCH_DENIED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_PROCESSING_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CORS_REJECTED'
  | 'INVALID_REQUEST'
  | 'SKU_VALIDATION_FAILED'
  | 'SESSION_OWNER_MISMATCH';

export interface SecurityEvent {
  event_type: SecurityEventType;
  user_id?: string | null;
  ip_address?: string | null;
  endpoint: string;
  method: string;
  status_code?: number;
  details?: Record<string, unknown>;
  request_id?: string;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[securityAudit] Supabase not configured, logging to console only');
    return null;
  }

  supabaseClient = createClient(url, serviceKey);
  return supabaseClient;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log a security event
 * Writes to Supabase security_audit_log table and console
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  const requestId = event.request_id || generateRequestId();

  // Sanitize details - remove any potential secrets
  const sanitizedDetails = sanitizeDetails(event.details);

  const logEntry = {
    ...event,
    details: sanitizedDetails,
    request_id: requestId,
    timestamp,
  };

  // Always log to console (structured for log aggregation)
  const consoleLog = {
    level: isFailureEvent(event.event_type) ? 'warn' : 'info',
    type: 'security_audit',
    ...logEntry,
  };
  console.log(JSON.stringify(consoleLog));

  // Write to Supabase if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: event.event_type,
          user_id: event.user_id || null,
          ip_address: event.ip_address || null,
          endpoint: event.endpoint,
          method: event.method,
          status_code: event.status_code || null,
          details: sanitizedDetails || null,
          request_id: requestId,
          created_at: timestamp,
        });

      if (error) {
        console.error('[securityAudit] Failed to write to DB:', error.message);
      }
    } catch (err) {
      console.error('[securityAudit] DB write error:', err);
    }
  }

  // Trigger alerts for critical events
  if (shouldAlert(event.event_type)) {
    await triggerAlert(logEntry);
  }
}

/**
 * Generate a unique request ID for correlation
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if event type indicates a failure/security concern
 */
function isFailureEvent(type: SecurityEventType): boolean {
  const failureTypes: SecurityEventType[] = [
    'AUTH_FAILURE',
    'AUTH_TOKEN_INVALID',
    'PURCHASE_FAILED',
    'ENTITLEMENT_DENIED',
    'ENTITLEMENT_FETCH_DENIED',
    'WEBHOOK_SIGNATURE_INVALID',
    'WEBHOOK_PROCESSING_FAILED',
    'RATE_LIMIT_EXCEEDED',
    'CORS_REJECTED',
    'INVALID_REQUEST',
    'SKU_VALIDATION_FAILED',
    'SESSION_OWNER_MISMATCH',
  ];
  return failureTypes.includes(type);
}

/**
 * Check if event should trigger an alert
 * Expanded for operator visibility into security-relevant patterns
 */
function shouldAlert(type: SecurityEventType): boolean {
  const alertTypes: SecurityEventType[] = [
    // Critical security events - always alert
    'WEBHOOK_SIGNATURE_INVALID',
    'SKU_VALIDATION_FAILED',
    'SESSION_OWNER_MISMATCH',
    // Auth anomalies - alert for investigation
    'AUTH_FAILURE',  // Repeated failures may indicate brute force
    // Operational concerns
    'RATE_LIMIT_EXCEEDED',  // May indicate abuse or misconfiguration
    'WEBHOOK_PROCESSING_FAILED',  // Payment flow broken
    'PURCHASE_FAILED',  // Revenue impact
  ];
  return alertTypes.includes(type);
}

/**
 * Sanitize details object to remove potential secrets
 */
function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'credential', 'bearer', 'api_key',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Trigger alert for critical security events
 * In production, integrate with PagerDuty, Slack, etc.
 */
async function triggerAlert(event: Record<string, unknown>): Promise<void> {
  // Log alert trigger
  console.log(JSON.stringify({
    level: 'alert',
    type: 'security_alert',
    message: `Security alert: ${event.event_type}`,
    event,
  }));

  // TODO: Integrate with alerting service
  // - Slack webhook
  // - PagerDuty
  // - Email via SendGrid/Resend
  const alertWebhook = process.env.SECURITY_ALERT_WEBHOOK;
  if (alertWebhook) {
    try {
      await fetch(alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Security Alert: ${event.event_type}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Event', value: String(event.event_type), short: true },
              { title: 'Endpoint', value: String(event.endpoint), short: true },
              { title: 'IP', value: String(event.ip_address || 'unknown'), short: true },
              { title: 'Request ID', value: String(event.request_id), short: true },
            ],
          }],
        }),
      });
    } catch (err) {
      console.error('[securityAudit] Alert webhook failed:', err);
    }
  }
}

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Log auth success
 */
export async function logAuthSuccess(
  userId: string,
  ip: string,
  endpoint: string,
  method: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'AUTH_SUCCESS',
    user_id: userId,
    ip_address: ip,
    endpoint,
    method,
    status_code: 200,
  });
}

/**
 * Log auth failure
 */
export async function logAuthFailure(
  ip: string,
  endpoint: string,
  method: string,
  reason: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'AUTH_FAILURE',
    ip_address: ip,
    endpoint,
    method,
    status_code: 401,
    details: { reason },
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  ip: string,
  endpoint: string,
  method: string,
  limiterName: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'RATE_LIMIT_EXCEEDED',
    ip_address: ip,
    endpoint,
    method,
    status_code: 429,
    details: { limiter: limiterName },
  });
}

/**
 * Log CORS rejection
 */
export async function logCorsRejected(
  ip: string,
  endpoint: string,
  method: string,
  origin: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'CORS_REJECTED',
    ip_address: ip,
    endpoint,
    method,
    status_code: 403,
    details: { origin },
  });
}

/**
 * Log webhook signature invalid
 */
export async function logWebhookInvalid(
  ip: string,
  endpoint: string,
  reason: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'WEBHOOK_SIGNATURE_INVALID',
    ip_address: ip,
    endpoint,
    method: 'POST',
    status_code: 400,
    details: { reason },
  });
}

/**
 * Log SKU validation failure
 */
export async function logSkuValidationFailed(
  userId: string | null,
  ip: string,
  endpoint: string,
  productId: string,
  reason: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'SKU_VALIDATION_FAILED',
    user_id: userId,
    ip_address: ip,
    endpoint,
    method: 'POST',
    status_code: 400,
    details: { productId, reason },
  });
}

/**
 * Log session owner mismatch
 */
export async function logSessionOwnerMismatch(
  authenticatedUserId: string,
  sessionUserId: string,
  ip: string,
  endpoint: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'SESSION_OWNER_MISMATCH',
    user_id: authenticatedUserId,
    ip_address: ip,
    endpoint,
    method: 'GET',
    status_code: 403,
    details: {
      authenticated_user: authenticatedUserId,
      session_owner: sessionUserId,
    },
  });
}

/**
 * Log entitlement granted
 */
export async function logEntitlementGranted(
  userId: string,
  entitlementId: string,
  productId: string,
  source: 'webhook' | 'verify-session',
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'ENTITLEMENT_GRANTED',
    user_id: userId,
    ip_address: ip || null,
    endpoint: source === 'webhook' ? '/api/stripe/webhook' : '/api/stripe/verify-session',
    method: 'POST',
    status_code: 200,
    details: { entitlementId, productId, source },
  });
}

/**
 * Log entitlement revoked (subscription cancelled)
 */
export async function logEntitlementRevoked(
  userId: string,
  entitlementId: string,
  reason: string,
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'ENTITLEMENT_DENIED',
    user_id: userId,
    ip_address: ip || null,
    endpoint: '/api/stripe/webhook',
    method: 'POST',
    status_code: 200,
    details: { entitlementId, reason, action: 'revoked' },
  });
}

/**
 * Log purchase completed
 */
export async function logPurchaseCompleted(
  userId: string,
  productId: string,
  sessionId: string,
  source: 'webhook' | 'verify-session',
  ip?: string
): Promise<void> {
  await logSecurityEvent({
    event_type: 'PURCHASE_COMPLETED',
    user_id: userId,
    ip_address: ip || null,
    endpoint: source === 'webhook' ? '/api/stripe/webhook' : '/api/stripe/verify-session',
    method: 'POST',
    status_code: 200,
    details: { productId, sessionId, source },
  });
}
