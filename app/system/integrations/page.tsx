import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import IntegrationsPage from '@/features/integrations/components/integrations-page';

export const metadata: Metadata = { title: 'Kết nối hệ thống' };

export default function Page() {
  return <AuthenticatedShell><IntegrationsPage /></AuthenticatedShell>;
}
