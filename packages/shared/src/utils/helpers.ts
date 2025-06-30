import { StaffRole } from '../types';

// Helper functions for role checking
export const isSuperAdmin = (telegramId: string | bigint): boolean => {
  const superAdminId = process.env.SUPER_ADMIN_TELEGRAM_ID;
  if (!superAdminId) return false;
  return superAdminId === telegramId.toString();
};

export const hasPermission = (role: StaffRole, permission: string): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

export const canAssignRole = (assignerRole: StaffRole, targetRole: StaffRole): boolean => {
  // Super admin can assign any role
  if (assignerRole === StaffRole.SUPER_ADMIN) return true;
  
  // Admin can assign manager, kitchen, service roles
  if (assignerRole === StaffRole.ADMIN) {
    return [StaffRole.MANAGER, StaffRole.KITCHEN, StaffRole.SERVICE].includes(targetRole);
  }
  
  // Manager can assign kitchen, service roles
  if (assignerRole === StaffRole.MANAGER) {
    return [StaffRole.KITCHEN, StaffRole.SERVICE].includes(targetRole);
  }
  
  return false;
};

export const getRoleHierarchyLevel = (role: StaffRole): number => {
  const levels = {
    [StaffRole.SUPER_ADMIN]: 5,
    [StaffRole.ADMIN]: 4,
    [StaffRole.MANAGER]: 3,
    [StaffRole.KITCHEN]: 2,
    [StaffRole.SERVICE]: 1
  };
  return levels[role] || 0;
};

export const canManageStaff = (managerRole: StaffRole, targetRole: StaffRole): boolean => {
  return getRoleHierarchyLevel(managerRole) > getRoleHierarchyLevel(targetRole);
};
