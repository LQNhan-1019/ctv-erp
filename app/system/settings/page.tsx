import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import SystemSettingsPage from '@/features/settings/components/system-settings-page';

export const metadata: Metadata = { title: 'Cấu hình hệ thống' };

export default function Page() {
  return <AuthenticatedShell><SystemSettingsPage /></AuthenticatedShell>;
}
