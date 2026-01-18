/**
 * Customer ID Store
 *
 * Maps Orbital user IDs to Stripe customer IDs.
 *
 * IMPORTANT: This is an in-memory store for development/demo.
 * In production, this MUST be replaced with database storage
 * to persist customer IDs across server restarts.
 *
 * The customer ID is essential for:
 * - Creating checkout sessions for returning customers
 * - Creating Customer Portal sessions for subscription management
 * - Linking payments to user accounts
 */

// In-memory store (REPLACE WITH DATABASE IN PRODUCTION)
const customerIdMap = new Map<string, string>();

/**
 * Get the Stripe customer ID for a user
 */
export function getCustomerId(userId: string): string | undefined {
  return customerIdMap.get(userId);
}

/**
 * Store a Stripe customer ID for a user
 */
export function setCustomerId(userId: string, customerId: string): void {
  customerIdMap.set(userId, customerId);
  console.log(`[CustomerStore] Mapped user ${userId} to customer ${customerId}`);
}

/**
 * Check if a user has a stored customer ID
 */
export function hasCustomerId(userId: string): boolean {
  return customerIdMap.has(userId);
}

/**
 * Get all stored customer mappings (for debugging)
 */
export function getAllCustomerIds(): Map<string, string> {
  return new Map(customerIdMap);
}
