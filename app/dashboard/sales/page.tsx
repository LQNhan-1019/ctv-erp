import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import DepartmentDashboard from '@/features/performance/components/department-dashboard';
export const metadata: Metadata = { title: 'Dashboard Kinh doanh | CTV ERP' };
export default function Page() { return <AuthenticatedShell><DepartmentDashboard kind="sales"/></AuthenticatedShell>; }
