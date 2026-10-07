'use client';

import PerformanceDashboard from './performance-dashboard';
import type { KpiDepartment } from '../api/performance-api';

export default function DepartmentDashboard({ kind }: { kind: KpiDepartment }) {
  return <PerformanceDashboard department={kind}/>;
}
