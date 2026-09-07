import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import AccountManagement from '@/features/accounts/components/account-management';

export const metadata: Metadata = { title: 'Quản lý tài khoản' };

export default function Page() {
  return (
    <AuthenticatedShell>
      <AccountManagement />
    </AuthenticatedShell>
  );
}
