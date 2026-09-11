import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import AttendanceManagementPage from '@/features/attendance/components/attendance-management-page';
export const metadata: Metadata = { title: 'Quản lý chấm công' };
export default function Page() { return <AuthenticatedShell><AttendanceManagementPage /></AuthenticatedShell>; }
