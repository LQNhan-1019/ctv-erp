import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import PerformanceDataEntryPage from '@/features/performance/components/performance-data-entry-page';

export const metadata: Metadata = { title: 'Nhập số liệu theo ngày' };

export default function Page() {
  return <AuthenticatedShell><PerformanceDataEntryPage /></AuthenticatedShell>;
}
