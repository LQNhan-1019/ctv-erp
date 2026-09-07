export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export type UserAccount = {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  securityVersion: number;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  systemRole: boolean;
  active: boolean;
  permissionCount: number;
};

export type UserRoleAssignment = {
  assignmentId: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scopeType: string;
  scopeId: string | null;
  active: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
};

export type CreateAccountInput = { username: string; email: string; password: string };
