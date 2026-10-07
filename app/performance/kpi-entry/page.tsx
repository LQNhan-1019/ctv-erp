import AuthenticatedShell from '@/components/layout/authenticated-shell';
import KpiBonusEntryPage from '@/features/performance/components/kpi-bonus-entry-page';

export default function Page() {
  return <AuthenticatedShell><KpiBonusEntryPage/></AuthenticatedShell>;
}
