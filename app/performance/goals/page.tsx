import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import GoalManagementPage from '@/features/performance/components/goal-management-page';

export const metadata: Metadata = { title: 'Mục tiêu KPI / OKR' };

export default function Page() {
  return <AuthenticatedShell><GoalManagementPage /></AuthenticatedShell>;
}
