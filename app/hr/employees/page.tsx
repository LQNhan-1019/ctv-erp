import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import HrManagementPage from '@/features/hr/components/hr-management-page';

export const metadata: Metadata = { title: 'Quản lý nhân viên và phòng ban' };
export default function Page() {
  return <AuthenticatedShell><HrManagementPage /></AuthenticatedShell>;
}
