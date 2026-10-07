import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import FormulaManagementPage from '@/features/performance/components/formula-management-page';

export const metadata: Metadata = { title: 'Công thức dashboard' };

export default function Page() {
  return <AuthenticatedShell><FormulaManagementPage /></AuthenticatedShell>;
}
