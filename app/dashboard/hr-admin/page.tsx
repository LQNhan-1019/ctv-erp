import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import DepartmentDashboard from '@/features/performance/components/department-dashboard';
export const metadata: Metadata = { title: 'Dashboard HCNS | CTV ERP' };
export default function Page() { return <AuthenticatedShell><DepartmentDashboard kind="hr-admin"/></AuthenticatedShell>; }
