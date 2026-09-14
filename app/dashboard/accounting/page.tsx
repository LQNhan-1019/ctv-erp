import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import DepartmentDashboard from '@/features/performance/components/department-dashboard';
export const metadata: Metadata = { title: 'Dashboard Tài chính - Kế toán | CTV ERP' };
export default function Page() { return <AuthenticatedShell><DepartmentDashboard kind="accounting"/></AuthenticatedShell>; }
