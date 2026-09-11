import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import ExpenseManagementPage from '@/features/administration/components/expense-management-page';
export const metadata: Metadata = { title: 'Tổng hợp chi phí hành chính' };
export default function Page() { return <AuthenticatedShell><ExpenseManagementPage /></AuthenticatedShell>; }
