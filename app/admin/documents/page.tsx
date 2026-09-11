import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import DocumentManagementPage from '@/features/administration/components/document-management-page';
export const metadata: Metadata = { title: 'Quản lý thời hạn giấy tờ' };
export default function Page() { return <AuthenticatedShell><DocumentManagementPage /></AuthenticatedShell>; }
