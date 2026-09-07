import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import RoleManagement from '@/features/roles/components/role-management';

export const metadata: Metadata = { title: 'Vai trò và phân quyền' };

export default function Page() {
  return <AuthenticatedShell><RoleManagement /></AuthenticatedShell>;
}
