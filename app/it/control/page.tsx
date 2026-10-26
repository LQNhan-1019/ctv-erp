import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import ItControlPage from '@/features/it-control/components/it-control-page';

export const metadata: Metadata = { title: 'Kiểm soát máy tính nội bộ' };

export default function Page() {
  return <AuthenticatedShell><ItControlPage /></AuthenticatedShell>;
}
