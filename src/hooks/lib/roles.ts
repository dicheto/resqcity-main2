export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COUNCILOR'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role?: string): boolean {
  if (!role) {
    return false;
  }

  return ADMIN_ROLES.includes(role as AdminRole);
}
