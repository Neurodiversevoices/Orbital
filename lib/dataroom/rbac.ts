import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SystemRole,
  Permission,
  RoleDefinition,
  UserRoleAssignment,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../types';

const ROLES_KEY = '@orbital:role_definitions';
const ASSIGNMENTS_KEY = '@orbital:role_assignments';
const RBAC_AUDIT_KEY = '@orbital:rbac_audit';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// RBAC AUDIT LOG
// ============================================

interface RBACauditEntry {
  id: string;
  userId: string;
  orgId?: string;
  action:
    | 'role_assigned'
    | 'role_revoked'
    | 'role_expired'
    | 'permission_check_granted'
    | 'permission_check_denied'
    | 'role_definition_created'
    | 'role_definition_modified';
  role?: SystemRole;
  permission?: Permission;
  performedBy: string;
  performedAt: number;
  details?: string;
  ipAddress?: string;
}

async function logRBACaudit(
  action: RBACauditEntry['action'],
  userId: string,
  performedBy: string,
  options?: {
    orgId?: string;
    role?: SystemRole;
    permission?: Permission;
    details?: string;
  }
): Promise<RBACauditEntry> {
  const entry: RBACauditEntry = {
    id: generateId('rbac'),
    userId,
    orgId: options?.orgId,
    action,
    role: options?.role,
    permission: options?.permission,
    performedBy,
    performedAt: Date.now(),
    details: options?.details,
  };

  const data = await AsyncStorage.getItem(RBAC_AUDIT_KEY);
  const log: RBACauditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);

  // Keep last 10000 entries
  if (log.length > 10000) {
    log.length = 10000;
  }

  await AsyncStorage.setItem(RBAC_AUDIT_KEY, JSON.stringify(log));
  return entry;
}

export async function getRBACauditLog(
  filter?: { userId?: string; orgId?: string; action?: RBACauditEntry['action'] }
): Promise<RBACauditEntry[]> {
  const data = await AsyncStorage.getItem(RBAC_AUDIT_KEY);
  if (!data) return [];
  let log: RBACauditEntry[] = JSON.parse(data);

  if (filter?.userId) {
    log = log.filter((e) => e.userId === filter.userId);
  }
  if (filter?.orgId) {
    log = log.filter((e) => e.orgId === filter.orgId);
  }
  if (filter?.action) {
    log = log.filter((e) => e.action === filter.action);
  }

  return log;
}

// ============================================
// ROLE DEFINITIONS
// ============================================

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access. Reserved for platform operators.',
    permissions: DEFAULT_ROLE_PERMISSIONS.super_admin,
    isSystemRole: true,
    createdAt: 0,
  },
  {
    role: 'org_admin',
    displayName: 'Organization Administrator',
    description: 'Manages users, settings, and data for their organization.',
    permissions: DEFAULT_ROLE_PERMISSIONS.org_admin,
    isSystemRole: true,
    createdAt: 0,
  },
  {
    role: 'billing_admin',
    displayName: 'Billing Administrator',
    description: 'Manages billing, invoices, and contracts.',
    permissions: DEFAULT_ROLE_PERMISSIONS.billing_admin,
    isSystemRole: true,
    createdAt: 0,
  },
  {
    role: 'support',
    displayName: 'Support',
    description: 'Read-only access for customer support purposes.',
    permissions: DEFAULT_ROLE_PERMISSIONS.support,
    isSystemRole: true,
    createdAt: 0,
  },
  {
    role: 'auditor',
    displayName: 'Auditor',
    description: 'Read-only access for compliance and audit purposes.',
    permissions: DEFAULT_ROLE_PERMISSIONS.auditor,
    isSystemRole: true,
    createdAt: 0,
  },
  {
    role: 'user',
    displayName: 'User',
    description: 'Standard user with access to their own data only.',
    permissions: DEFAULT_ROLE_PERMISSIONS.user,
    isSystemRole: true,
    createdAt: 0,
  },
];

export async function getRoleDefinitions(): Promise<RoleDefinition[]> {
  const data = await AsyncStorage.getItem(ROLES_KEY);
  if (!data) return DEFAULT_ROLE_DEFINITIONS;
  return JSON.parse(data);
}

export async function getRoleDefinition(role: SystemRole): Promise<RoleDefinition | null> {
  const definitions = await getRoleDefinitions();
  return definitions.find((d) => d.role === role) || null;
}

export async function initializeRoleDefinitions(): Promise<void> {
  const existing = await AsyncStorage.getItem(ROLES_KEY);
  if (!existing) {
    await AsyncStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLE_DEFINITIONS));
  }
}

// ============================================
// ROLE ASSIGNMENTS
// ============================================

export async function getRoleAssignments(): Promise<UserRoleAssignment[]> {
  const data = await AsyncStorage.getItem(ASSIGNMENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getUserRoles(userId: string, orgId?: string): Promise<UserRoleAssignment[]> {
  const assignments = await getRoleAssignments();
  const now = Date.now();

  return assignments.filter((a) => {
    if (a.userId !== userId) return false;
    if (!a.isActive) return false;
    if (a.expiresAt && a.expiresAt < now) return false;
    if (orgId && a.orgId !== orgId) return false;
    return true;
  });
}

export async function getEffectiveRole(userId: string, orgId: string): Promise<SystemRole> {
  const roles = await getUserRoles(userId, orgId);
  if (roles.length === 0) return 'user'; // Default to least privilege

  // Role hierarchy: super_admin > org_admin > billing_admin > auditor > support > user
  const hierarchy: SystemRole[] = ['super_admin', 'org_admin', 'billing_admin', 'auditor', 'support', 'user'];

  for (const role of hierarchy) {
    if (roles.some((r) => r.role === role)) {
      return role;
    }
  }

  return 'user';
}

export async function assignRole(
  userId: string,
  orgId: string,
  role: SystemRole,
  assignedBy: string,
  options?: {
    expiresAt?: number;
  }
): Promise<UserRoleAssignment> {
  const assignment: UserRoleAssignment = {
    userId,
    orgId,
    role,
    assignedBy,
    assignedAt: Date.now(),
    expiresAt: options?.expiresAt,
    isActive: true,
  };

  const assignments = await getRoleAssignments();

  // Deactivate any existing assignment for same user/org
  assignments.forEach((a, i) => {
    if (a.userId === userId && a.orgId === orgId && a.isActive) {
      assignments[i].isActive = false;
    }
  });

  assignments.push(assignment);
  await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));

  await logRBACaudit('role_assigned', userId, assignedBy, {
    orgId,
    role,
    details: `Assigned role ${role} to user`,
  });

  return assignment;
}

export async function revokeRole(
  userId: string,
  orgId: string,
  revokedBy: string
): Promise<boolean> {
  const assignments = await getRoleAssignments();
  let revoked = false;

  assignments.forEach((a, i) => {
    if (a.userId === userId && a.orgId === orgId && a.isActive) {
      assignments[i].isActive = false;
      revoked = true;
    }
  });

  if (revoked) {
    await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));

    await logRBACaudit('role_revoked', userId, revokedBy, {
      orgId,
      details: `Role revoked for user`,
    });
  }

  return revoked;
}

export async function expireRoles(): Promise<number> {
  const assignments = await getRoleAssignments();
  const now = Date.now();
  let expiredCount = 0;

  assignments.forEach((a, i) => {
    if (a.isActive && a.expiresAt && a.expiresAt < now) {
      assignments[i].isActive = false;
      expiredCount++;
    }
  });

  if (expiredCount > 0) {
    await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }

  return expiredCount;
}

// ============================================
// PERMISSION CHECKING
// ============================================

export async function hasPermission(
  userId: string,
  orgId: string,
  permission: Permission,
  options?: { logCheck?: boolean }
): Promise<boolean> {
  const effectiveRole = await getEffectiveRole(userId, orgId);
  const roleDef = await getRoleDefinition(effectiveRole);

  if (!roleDef) {
    if (options?.logCheck) {
      await logRBACaudit('permission_check_denied', userId, 'system', {
        orgId,
        permission,
        details: 'No role definition found',
      });
    }
    return false;
  }

  const hasPermission = roleDef.permissions.includes(permission);

  if (options?.logCheck) {
    await logRBACaudit(
      hasPermission ? 'permission_check_granted' : 'permission_check_denied',
      userId,
      'system',
      {
        orgId,
        permission,
        role: effectiveRole,
        details: hasPermission ? 'Permission granted' : 'Permission denied',
      }
    );
  }

  return hasPermission;
}

export async function hasAnyPermission(
  userId: string,
  orgId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, orgId, permission)) {
      return true;
    }
  }
  return false;
}

export async function hasAllPermissions(
  userId: string,
  orgId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, orgId, permission))) {
      return false;
    }
  }
  return true;
}

export async function getEffectivePermissions(
  userId: string,
  orgId: string
): Promise<Permission[]> {
  const effectiveRole = await getEffectiveRole(userId, orgId);
  const roleDef = await getRoleDefinition(effectiveRole);
  return roleDef?.permissions || DEFAULT_ROLE_PERMISSIONS.user;
}

// ============================================
// PERMISSION GUARDS
// ============================================

export async function requirePermission(
  userId: string,
  orgId: string,
  permission: Permission
): Promise<void> {
  const has = await hasPermission(userId, orgId, permission, { logCheck: true });
  if (!has) {
    throw new Error(`Access denied: Missing permission '${permission}'`);
  }
}

export async function requireRole(
  userId: string,
  orgId: string,
  minimumRole: SystemRole
): Promise<void> {
  const effectiveRole = await getEffectiveRole(userId, orgId);
  const hierarchy: SystemRole[] = ['super_admin', 'org_admin', 'billing_admin', 'auditor', 'support', 'user'];

  const effectiveIndex = hierarchy.indexOf(effectiveRole);
  const requiredIndex = hierarchy.indexOf(minimumRole);

  if (effectiveIndex > requiredIndex) {
    throw new Error(`Access denied: Role '${minimumRole}' or higher required`);
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function getOrgMembers(orgId: string): Promise<{
  userId: string;
  role: SystemRole;
  assignedAt: number;
  expiresAt?: number;
}[]> {
  const assignments = await getRoleAssignments();
  const now = Date.now();

  return assignments
    .filter((a) => {
      if (a.orgId !== orgId) return false;
      if (!a.isActive) return false;
      if (a.expiresAt && a.expiresAt < now) return false;
      return true;
    })
    .map((a) => ({
      userId: a.userId,
      role: a.role,
      assignedAt: a.assignedAt,
      expiresAt: a.expiresAt,
    }));
}

export async function getRoleStats(orgId: string): Promise<Record<SystemRole, number>> {
  const members = await getOrgMembers(orgId);
  const stats: Record<SystemRole, number> = {
    super_admin: 0,
    org_admin: 0,
    billing_admin: 0,
    support: 0,
    auditor: 0,
    user: 0,
  };

  members.forEach((m) => {
    stats[m.role]++;
  });

  return stats;
}

// ============================================
// LEAST PRIVILEGE HELPERS
// ============================================

export function getMinimumRoleForPermission(permission: Permission): SystemRole {
  const hierarchy: SystemRole[] = ['user', 'support', 'auditor', 'billing_admin', 'org_admin', 'super_admin'];

  for (const role of hierarchy) {
    if (DEFAULT_ROLE_PERMISSIONS[role].includes(permission)) {
      return role;
    }
  }

  return 'super_admin'; // Fallback to highest privilege
}

export function validateRoleAssignment(
  assignerRole: SystemRole,
  targetRole: SystemRole
): boolean {
  // Users can only assign roles at or below their level
  const hierarchy: SystemRole[] = ['super_admin', 'org_admin', 'billing_admin', 'auditor', 'support', 'user'];

  const assignerIndex = hierarchy.indexOf(assignerRole);
  const targetIndex = hierarchy.indexOf(targetRole);

  // Can't assign higher privilege than you have
  return targetIndex >= assignerIndex;
}

export async function suggestLeastPrivilegeRole(
  requiredPermissions: Permission[]
): Promise<SystemRole> {
  const hierarchy: SystemRole[] = ['user', 'support', 'auditor', 'billing_admin', 'org_admin', 'super_admin'];

  for (const role of hierarchy) {
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[role];
    if (requiredPermissions.every((p) => rolePerms.includes(p))) {
      return role;
    }
  }

  return 'super_admin';
}
