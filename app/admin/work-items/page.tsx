import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import WorkManagementPage from '@/features/work/components/work-management-page';
export const metadata:Metadata={title:'Quản lý công việc'};
export default function Page(){return <AuthenticatedShell><WorkManagementPage/></AuthenticatedShell>;}
