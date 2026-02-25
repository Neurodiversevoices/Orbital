/**
 * Cloud-synced Circles Service
 *
 * Bridges the local AsyncStorage circles with the Supabase circles tables.
 * When a user is authenticated + has cloud sync, operations write to Supabase.
 * When offline or unauthenticated, falls back to local-only storage.
 *
 * Respects the Six Laws — only syncs consent records and membership status,
 * NOT signal data (signals remain ephemeral per L2: NO HISTORY).
 */

import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';

// =============================================================================
// TYPES
// =============================================================================

export interface CloudCircle {
  id: string;
  createdBy: string;
  name: string | null;
  status: 'active' | 'archived';
  maxMembers: number;
  createdAt: string;
}

export interface CloudCircleMember {
  id: string;
  circleId: string;
  userId: string;
  invitedBy: string | null;
  status: 'pending' | 'active' | 'revoked' | 'blocked';
  joinedAt: string | null;
}

export interface CloudInvite {
  id: string;
  circleId: string;
  token: string;
  inviterId: string;
  expiresAt: string;
  used: boolean;
}

// =============================================================================
// CIRCLE CRUD
// =============================================================================

/**
 * Create a new circle in Supabase.
 * The creating user is automatically added as an active member.
 */
export async function cloudCreateCircle(
  name?: string
): Promise<{ circle: CloudCircle | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { circle: null, error: 'Not authenticated or Supabase not configured' };
  }

  const supabase = getSupabase();

  // Create circle
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .insert({ created_by: userId, name: name || null })
    .select()
    .single();

  if (circleError || !circle) {
    return { circle: null, error: circleError?.message || 'Failed to create circle' };
  }

  // Add creator as active member
  const { error: memberError } = await supabase
    .from('circle_members')
    .insert({
      circle_id: circle.id,
      user_id: userId,
      status: 'active',
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    return { circle: null, error: memberError.message };
  }

  return {
    circle: {
      id: circle.id,
      createdBy: circle.created_by,
      name: circle.name,
      status: circle.status,
      maxMembers: circle.max_members,
      createdAt: circle.created_at,
    },
    error: null,
  };
}

/**
 * Get circles the current user belongs to.
 */
export async function cloudGetMyCircles(): Promise<CloudCircle[]> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) return [];

  const supabase = getSupabase();

  const { data: memberships } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!memberships || memberships.length === 0) return [];

  const circleIds = memberships.map(m => m.circle_id);

  const { data: circles } = await supabase
    .from('circles')
    .select('*')
    .in('id', circleIds)
    .eq('status', 'active');

  return (circles || []).map(c => ({
    id: c.id,
    createdBy: c.created_by,
    name: c.name,
    status: c.status,
    maxMembers: c.max_members,
    createdAt: c.created_at,
  }));
}

/**
 * Get active members of a circle.
 */
export async function cloudGetCircleMembers(
  circleId: string
): Promise<CloudCircleMember[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();

  const { data } = await supabase
    .from('circle_members')
    .select('*')
    .eq('circle_id', circleId)
    .in('status', ['active', 'pending']);

  return (data || []).map(m => ({
    id: m.id,
    circleId: m.circle_id,
    userId: m.user_id,
    invitedBy: m.invited_by,
    status: m.status,
    joinedAt: m.joined_at,
  }));
}

// =============================================================================
// INVITE FLOW (L3: BIDIRECTIONAL CONSENT)
// =============================================================================

/**
 * Create a shareable invite token for a circle.
 * Expires in 24 hours per L3 doctrine.
 */
export async function cloudCreateInvite(
  circleId: string,
  targetHint?: string
): Promise<{ token: string | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { token: null, error: 'Not authenticated' };
  }

  const supabase = getSupabase();

  // Generate secure token
  const token = `inv_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('circle_invites')
    .insert({
      circle_id: circleId,
      token,
      inviter_id: userId,
      target_hint: targetHint || null,
      expires_at: expiresAt,
    });

  if (error) return { token: null, error: error.message };
  return { token, error: null };
}

/**
 * Accept an invite token and join the circle.
 * Validates: token exists, not expired, not used, user not already member.
 */
export async function cloudAcceptInvite(
  token: string
): Promise<{ circleId: string | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { circleId: null, error: 'Not authenticated' };
  }

  const supabase = getSupabase();

  // Look up invite
  const { data: invite, error: lookupError } = await supabase
    .from('circle_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (lookupError || !invite) {
    return { circleId: null, error: 'Invalid invite token' };
  }

  if (invite.used) {
    return { circleId: null, error: 'Invite already used' };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { circleId: null, error: 'Invite expired' };
  }

  // Check not already a member
  const { data: existing } = await supabase
    .from('circle_members')
    .select('id, status')
    .eq('circle_id', invite.circle_id)
    .eq('user_id', userId)
    .single();

  if (existing && existing.status === 'active') {
    return { circleId: invite.circle_id, error: null }; // already a member
  }

  if (existing && existing.status === 'blocked') {
    return { circleId: null, error: 'You are blocked from this circle' };
  }

  // Join as active member (consent is implicit by accepting the invite)
  if (existing) {
    // Re-activate revoked membership
    await supabase
      .from('circle_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    const { error: joinError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: invite.circle_id,
        user_id: userId,
        invited_by: invite.inviter_id,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (joinError) return { circleId: null, error: joinError.message };
  }

  // Mark invite as used
  await supabase
    .from('circle_invites')
    .update({ used: true, used_by: userId })
    .eq('id', invite.id);

  return { circleId: invite.circle_id, error: null };
}

// =============================================================================
// MEMBERSHIP MANAGEMENT
// =============================================================================

/**
 * Revoke own membership from a circle (L3: instant revocation).
 */
export async function cloudRevokeMyMembership(
  circleId: string
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { error: 'Not authenticated' };
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('circle_members')
    .update({
      status: 'revoked',
      status_changed_at: new Date().toISOString(),
    })
    .eq('circle_id', circleId)
    .eq('user_id', userId);

  return { error: error?.message || null };
}
