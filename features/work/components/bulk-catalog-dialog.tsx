'use client';

import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkCatalog } from '../types/work';

export default function BulkCatalogDialog({ catalogs, businessUnitId, close, save }: {
  catalogs: WorkCatalog[];
  businessUnitId: string | null;
  close: () => void;
  save: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [busy, setBusy] = useState(false);

  const available = useMemo(() => catalogs.filter(item =>
    item.active && (!item.businessUnitId || item.businessUnitId === businessUnitId)
  ), [businessUnitId, catalogs]);
  const categories = useMemo(() => Array.from(
    new Map(available.filter(item => item.categoryId).map(item =>
      [item.categoryId!, item.categoryName ?? 'Công tác chưa đặt tên'] as const
    ))
  ).sort((left, right) => left[1].localeCompare(right[1], 'vi')), [available]);
  const visible = useMemo(() => available.filter(item =>
    (categoryId === 'ALL' || (categoryId === 'UNCATEGORIZED' ? !item.categoryId : item.categoryId === categoryId)) &&
    `${item.categoryName ?? ''} ${item.name} ${item.code}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))
  ), [available, categoryId, search]);
  const all = visible.length > 0 && visible.every(item => selected.includes(item.id));

  async function commit() {
    setBusy(true);
    try {
      await save(selected);
      close();
    } finally {
      setBusy(false);
    }
  }

  return <div className="nova-overlay"><section className="nova-dialog work-bulk-dialog">
    <header><div><p>TẠO NHANH BẢNG THÁNG</p><h2>Chọn công việc theo công tác</h2><span>Lọc theo cột Công tác của file Excel rồi chọn một hoặc nhiều công việc chi tiết.</span></div><button onClick={close}><X/></button></header>
    <div className="nova-dialog-body">
      <div className="work-bulk-filters">
        <label><span>Loại công tác</span><select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
          <option value="ALL">Tất cả công tác</option>
          {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          {available.some(item => !item.categoryId) && <option value="UNCATEGORIZED">Chưa phân công tác</option>}
        </select></label>
        <label><span>Tìm công việc</span><input placeholder="Tên công việc hoặc mã…" value={search} onChange={event => setSearch(event.target.value)}/></label>
      </div>
      <div className="work-bulk-selection">
        <label><input type="checkbox" checked={all} disabled={!visible.length} onChange={event => setSelected(event.target.checked
          ? Array.from(new Set([...selected, ...visible.map(item => item.id)]))
          : selected.filter(id => !visible.some(item => item.id === id)))}/>Chọn tất cả trong bộ lọc ({visible.length})</label>
        <span>Đã chọn {selected.length}</span>
      </div>
      <div className="work-bulk-list">
        {visible.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event => setSelected(current =>
          event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)
        )}/><span><b>{item.name}</b><small>{item.categoryName ?? 'Chưa phân công tác'} · SL {item.defaultQuantity} · HS {item.defaultWeight}</small></span></label>)}
        {!visible.length && <p className="work-bulk-empty">Không có công việc phù hợp với bộ lọc.</p>}
      </div>
    </div>
    <footer><button className="nova-button secondary" onClick={close}>Hủy</button><button className="nova-button primary" disabled={!selected.length || busy} onClick={() => void commit()}><Plus/>Tạo {selected.length} công việc</button></footer>
  </section></div>;
}
