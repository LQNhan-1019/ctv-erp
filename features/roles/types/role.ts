export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  systemRole: boolean;
  active: boolean;
  permissionCount: number;
};

export type Permission = {
  id: string;
  code: string;
  module: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type CreateRoleInput = {
  code: string;
  name: string;
  description: string;
};

export type UpdateRoleInput = {
  name: string;
  description: string;
  active: boolean;
};
