import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import AuditLogPage from '@/features/audit/components/audit-log-page';

export const metadata: Metadata = { title: 'Nhật ký hoạt động' };

export default function Page() {
  return <AuthenticatedShell><AuditLogPage /></AuthenticatedShell>;
}
