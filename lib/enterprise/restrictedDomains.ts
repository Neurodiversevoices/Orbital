/**
 * Restricted Domain Registry
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  NON-NEGOTIABLE SECURITY CONTROL — DOMAIN LOCK (FORTUNE 500 SEED DATA)      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Enterprise domains MUST be blocked from Class A (Relational) accounts.     ║
 * ║  This prevents organizations from misusing Orbital for surveillance.        ║
 * ║  Employees of restricted domains MUST use Institutional SSO or contact      ║
 * ║  sales for proper governance agreements.                                    ║
 * ║                                                                              ║
 * ║  FAIL CLOSED: If registry load fails, default to blocking restricted        ║
 * ║  domains using seed data. NEVER fail open.                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * CRITICAL: Server-side enforcement of enterprise domain restrictions.
 * UI-only blocking is INSUFFICIENT - this module provides the canonical enforcement.
 *
 * Any signup or purchase attempt using a restricted domain:
 * - CANNOT create a Class A (Relational) account
 * - CANNOT purchase bundles
 * - MUST be redirected to Institutional SSO or "Contact Sales"
 */

import {
  RestrictedDomain,
  DomainCheckResult,
  EnforcementResult,
  EnforcementPoint,
} from './types';

// =============================================================================
// CANONICAL RESTRICTED DOMAIN REGISTRY — NON-NEGOTIABLE SEED DATA
// =============================================================================

/**
 * NON-NEGOTIABLE: Initial enterprise domain list (Fortune 500 seed data).
 *
 * These domains are BLOCKED from Class A by default. In production, this
 * list is augmented from Supabase `restricted_domains` table.
 *
 * FAIL CLOSED: If cloud load fails, this seed data MUST be used.
 * DO NOT remove domains from this list without LEGAL review.
 */
const INITIAL_RESTRICTED_DOMAINS: RestrictedDomain[] = [
  // Fortune 500 / Large Enterprise (examples - configure as needed)
  {
    domain: 'microsoft.com',
    organizationName: 'Microsoft Corporation',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'google.com',
    organizationName: 'Google LLC',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'amazon.com',
    organizationName: 'Amazon.com Inc.',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'apple.com',
    organizationName: 'Apple Inc.',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'meta.com',
    organizationName: 'Meta Platforms Inc.',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'netflix.com',
    organizationName: 'Netflix Inc.',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  // Healthcare (HIPAA considerations)
  {
    domain: 'kaiserpermanente.org',
    organizationName: 'Kaiser Permanente',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  // Education (FERPA considerations)
  {
    domain: 'harvard.edu',
    organizationName: 'Harvard University',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'stanford.edu',
    organizationName: 'Stanford University',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
  {
    domain: 'mit.edu',
    organizationName: 'Massachusetts Institute of Technology',
    enforcementLevel: 'contact_sales',
    addedAt: '2025-01-01T00:00:00Z',
    addedBy: 'system',
    salesContactUrl: '/enterprise/contact',
  },
];

// In-memory registry (loaded from DB in production)
let domainRegistry: Map<string, RestrictedDomain> = new Map();
let registryInitialized = false;

// =============================================================================
// REGISTRY INITIALIZATION
// =============================================================================

/**
 * Initialize the domain registry.
 * In production, this loads from Supabase. Falls back to seed data.
 */
export async function initializeRestrictedDomainRegistry(): Promise<void> {
  if (registryInitialized) return;

  try {
    // Attempt to load from Supabase
    const cloudDomains = await loadDomainsFromCloud();
    if (cloudDomains && cloudDomains.length > 0) {
      domainRegistry = new Map(cloudDomains.map(d => [d.domain.toLowerCase(), d]));
    } else {
      // Fallback to seed data
      domainRegistry = new Map(INITIAL_RESTRICTED_DOMAINS.map(d => [d.domain.toLowerCase(), d]));
    }
    registryInitialized = true;
  } catch {
    // FAIL CLOSED: If we can't load the registry, use seed data
    domainRegistry = new Map(INITIAL_RESTRICTED_DOMAINS.map(d => [d.domain.toLowerCase(), d]));
    registryInitialized = true;
  }
}

async function loadDomainsFromCloud(): Promise<RestrictedDomain[] | null> {
  // Dynamic import to avoid circular dependencies
  try {
    const { getSupabase, isSupabaseConfigured } = await import('../supabase/client');
    if (!isSupabaseConfigured()) return null;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('restricted_domains')
      .select('*')
      .eq('is_active', true);

    if (error) {
      if (__DEV__) console.error('[RestrictedDomains] Cloud load failed:', error);
      return null;
    }

    return data?.map((row: Record<string, unknown>) => ({
      domain: row.domain as string,
      organizationName: row.organization_name as string,
      enforcementLevel: row.enforcement_level as 'block_all' | 'redirect_sso' | 'contact_sales',
      addedAt: row.added_at as string,
      addedBy: row.added_by as string,
      ssoEndpoint: row.sso_endpoint as string | undefined,
      salesContactUrl: row.sales_contact_url as string | undefined,
    })) ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// DOMAIN EXTRACTION
// =============================================================================

/**
 * Extract domain from email address.
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');

  if (atIndex === -1 || atIndex === trimmed.length - 1) return null;

  return trimmed.substring(atIndex + 1);
}

/**
 * Normalize domain for comparison (handles subdomains).
 */
export function normalizeDomain(domain: string): string {
  const lower = domain.toLowerCase().trim();

  // Remove common subdomains for matching
  const parts = lower.split('.');
  if (parts.length > 2) {
    // Check if it's a known TLD pattern (e.g., .co.uk)
    const lastTwo = parts.slice(-2).join('.');
    if (['co.uk', 'com.au', 'co.nz', 'ac.uk', 'gov.uk'].includes(lastTwo)) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }

  return lower;
}

// =============================================================================
// DOMAIN CHECK (SERVER-SIDE ENFORCEMENT)
// =============================================================================

/**
 * Check if a domain is restricted.
 * This is the CANONICAL enforcement point.
 */
export async function checkDomainRestriction(email: string): Promise<DomainCheckResult> {
  // Ensure registry is initialized
  await initializeRestrictedDomainRegistry();

  const domain = extractDomainFromEmail(email);

  if (!domain) {
    return {
      isRestricted: false,
      domain: '',
      action: 'allowed',
    };
  }

  const normalizedDomain = normalizeDomain(domain);

  // Check exact match first
  let restriction = domainRegistry.get(normalizedDomain);

  // Check parent domain if no exact match
  if (!restriction) {
    const parts = normalizedDomain.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parentDomain = parts.slice(i).join('.');
      restriction = domainRegistry.get(parentDomain);
      if (restriction) break;
    }
  }

  if (!restriction) {
    return {
      isRestricted: false,
      domain: normalizedDomain,
      action: 'allowed',
    };
  }

  // Domain IS restricted
  switch (restriction.enforcementLevel) {
    case 'block_all':
      return {
        isRestricted: true,
        domain: normalizedDomain,
        action: 'block_class_a',
        message: `${restriction.organizationName} requires an institutional deployment. Please contact your IT administrator.`,
      };

    case 'redirect_sso':
      return {
        isRestricted: true,
        domain: normalizedDomain,
        action: 'redirect_sso',
        redirectUrl: restriction.ssoEndpoint,
        message: `${restriction.organizationName} uses Single Sign-On. Redirecting...`,
      };

    case 'contact_sales':
      return {
        isRestricted: true,
        domain: normalizedDomain,
        action: 'contact_sales',
        redirectUrl: restriction.salesContactUrl || '/enterprise/contact',
        message: `${restriction.organizationName} requires an enterprise agreement. Please contact our sales team.`,
      };

    default:
      // FAIL CLOSED: Unknown enforcement level blocks access
      return {
        isRestricted: true,
        domain: normalizedDomain,
        action: 'block_class_a',
        message: 'This domain requires special handling. Please contact support.',
      };
  }
}

// =============================================================================
// ENFORCEMENT POINTS
// =============================================================================

/**
 * Enforce domain restriction at signup flow.
 * Returns enforcement result with fail-closed behavior.
 */
export async function enforceAtSignup(email: string): Promise<EnforcementResult> {
  const check = await checkDomainRestriction(email);

  if (!check.isRestricted) {
    return {
      allowed: true,
      reason: 'Domain not restricted',
      failClosed: false,
      enforcementPoint: 'signup_flow',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    allowed: false,
    reason: check.message || 'Domain restricted',
    failClosed: true,
    enforcementPoint: 'signup_flow',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enforce domain restriction at checkout flow.
 * Prevents bundle purchases for restricted domains.
 */
export async function enforceAtCheckout(email: string): Promise<EnforcementResult> {
  const check = await checkDomainRestriction(email);

  if (!check.isRestricted) {
    return {
      allowed: true,
      reason: 'Domain not restricted',
      failClosed: false,
      enforcementPoint: 'checkout_flow',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    allowed: false,
    reason: `Bundle purchases are not available for ${check.domain}. Enterprise agreements required.`,
    failClosed: true,
    enforcementPoint: 'checkout_flow',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enforce domain restriction at API level.
 * This is the final backstop for any missed UI enforcement.
 */
export async function enforceAtAPI(email: string, operation: string): Promise<EnforcementResult> {
  const check = await checkDomainRestriction(email);

  if (!check.isRestricted) {
    return {
      allowed: true,
      reason: 'Domain not restricted',
      failClosed: false,
      enforcementPoint: 'api_validation',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    allowed: false,
    reason: `Operation "${operation}" blocked for restricted domain: ${check.domain}`,
    failClosed: true,
    enforcementPoint: 'api_validation',
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Add a domain to the restricted registry.
 * Should only be called by admin functions.
 */
export async function addRestrictedDomain(
  domain: RestrictedDomain,
  adminUserId: string
): Promise<boolean> {
  try {
    const { getSupabase, isSupabaseConfigured } = await import('../supabase/client');
    if (!isSupabaseConfigured()) {
      // Local-only: add to in-memory registry
      domainRegistry.set(domain.domain.toLowerCase(), {
        ...domain,
        addedBy: adminUserId,
        addedAt: new Date().toISOString(),
      });
      return true;
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('restricted_domains').insert({
      domain: domain.domain.toLowerCase(),
      organization_name: domain.organizationName,
      enforcement_level: domain.enforcementLevel,
      sso_endpoint: domain.ssoEndpoint,
      sales_contact_url: domain.salesContactUrl,
      added_by: adminUserId,
      is_active: true,
    } as any);

    if (error) {
      if (__DEV__) console.error('[RestrictedDomains] Failed to add domain:', error);
      return false;
    }

    // Update local cache
    domainRegistry.set(domain.domain.toLowerCase(), {
      ...domain,
      addedBy: adminUserId,
      addedAt: new Date().toISOString(),
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a specific domain is in the registry.
 */
export async function isDomainRestricted(domain: string): Promise<boolean> {
  await initializeRestrictedDomainRegistry();
  return domainRegistry.has(normalizeDomain(domain));
}

/**
 * Get all restricted domains (admin function).
 */
export async function getAllRestrictedDomains(): Promise<RestrictedDomain[]> {
  await initializeRestrictedDomainRegistry();
  return Array.from(domainRegistry.values());
}
