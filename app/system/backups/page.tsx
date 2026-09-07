import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import BackupsPage from '@/features/backups/components/backups-page';

export const metadata: Metadata = { title: 'Sao lưu dữ liệu' };

export default function Page() {
  return <AuthenticatedShell><BackupsPage /></AuthenticatedShell>;
}
