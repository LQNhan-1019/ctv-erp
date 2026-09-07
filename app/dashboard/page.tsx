import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import PerformanceDashboard from '@/features/performance/components/performance-dashboard';

export const metadata: Metadata = { title: 'Tổng quan' };

export default function Page() {
  return <AuthenticatedShell><PerformanceDashboard /></AuthenticatedShell>;
}
