'use client';

import { useMemo, useState } from 'react';

export function useBulkSelection<T extends { id: string }>(rows: T[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedIds = useMemo(() => visibleIds.filter((id) => selected.has(id)), [selected, visibleIds]);
  const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected((current) => { const next = new Set(current); if (allSelected) visibleIds.forEach((id) => next.delete(id)); else visibleIds.forEach((id) => next.add(id)); return next; });
  const clear = () => setSelected(new Set());
  return { selected, selectedIds, selectedCount: selectedIds.length, allSelected, toggle, toggleAll, clear };
}
