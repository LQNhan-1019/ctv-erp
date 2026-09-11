import type { Metadata } from 'next';
import AuthenticatedShell from '@/components/layout/authenticated-shell';
import HomePage from '@/features/home/components/home-page';
export const metadata: Metadata = { title: 'Trang chủ | CTV ERP' };
export default function Page() { return <AuthenticatedShell><HomePage /></AuthenticatedShell>; }
