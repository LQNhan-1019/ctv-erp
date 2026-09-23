import AuthenticatedShell from '@/components/layout/authenticated-shell';
import LeaderKpiResultsDashboard from '@/features/performance/components/leader-kpi-results-dashboard';
export default function Page() { return <AuthenticatedShell><LeaderKpiResultsDashboard/></AuthenticatedShell>; }
