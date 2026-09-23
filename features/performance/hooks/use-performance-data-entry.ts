'use client';

import { useCallback, useState } from 'react';
import { useApiResource } from '@/lib/api/use-api-resource';
import type { AuthorizedRequest } from '@/types/api';
import { getDataSheet, listInputDepartments, updateDataSheet } from '../api/performance-api';
import type { DataSheet, PerformanceDepartment } from '../types/performance';

const EMPTY_DEPARTMENTS: PerformanceDepartment[] = [];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export type DayChange = { metricId: string; value: number | null };

export function usePerformanceDataEntry(request: AuthorizedRequest) {
  const [month, setMonth] = useState(currentMonth);
  const [chosenDepartmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const departmentResource = useApiResource({
    key: 'performance-input-departments',
    load: () => listInputDepartments(request),
  });
  const departments = departmentResource.data ?? EMPTY_DEPARTMENTS;
  const departmentId = departments.some((item) => item.id === chosenDepartmentId)
    ? chosenDepartmentId : (departments[0]?.id ?? '');

  const sheetResource = useApiResource<DataSheet | null>({
    key: `${departmentId}:${month}`,
    load: () => departmentId ? getDataSheet(request, departmentId, month) : Promise.resolve(null),
  });
  const sheet = sheetResource.data?.department.id === departmentId && sheetResource.data.month === month
    ? sheetResource.data : null;
  const replaceSheet = sheetResource.replace;
  const clearSaveError = useCallback(() => setSaveError(''), []);

  const saveDay = useCallback(async (day: number, changes: DayChange[]) => {
    if (!sheet || !changes.length) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateDataSheet(request, departmentId, month,
        changes.map((item) => ({ ...item, day })));
      replaceSheet(updated);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không lưu được số liệu';
      setSaveError(message);
      throw cause;
    } finally {
      setSaving(false);
    }
  }, [departmentId, month, request, replaceSheet, sheet]);

  return {
    departments,
    departmentId,
    setDepartmentId,
    month,
    setMonth,
    sheet,
    loading: departmentResource.loading || (Boolean(departmentId) && (sheetResource.loading || !sheet && !sheetResource.error)),
    error: departmentResource.error || sheetResource.error || saveError,
    clearSaveError,
    saving,
    saveDay,
    refresh: sheetResource.refresh,
  };
}
