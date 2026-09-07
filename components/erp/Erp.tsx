'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Order, View } from '@/types/erp';
import { seedOrders } from '@/data/orders';
import { nav } from '@/data/nav';
import { modules } from '@/data/modules';
import Dashboard from './Dashboard';
import Sales from './Sales';
import Inventory from './Inventory';

import ModulePage from './ModulePage';
import OrderModal from './OrderModal';
import OrderDrawer from './OrderDrawer';

export default function ErpApp() {
  const [view, setView] = useState<View>('dashboard');
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tất cả');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setModal(false);
        setDetail(null);
        setNotifications(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (status === 'Tất cả' || o.status === status) &&
          `${o.id} ${o.customer} ${o.warehouse}`.toLowerCase().includes(query.toLowerCase())
      ),
    [orders, query, status]
  );

  const go = (next: View) => {
    setView(next);
    setDetail(null);
    setNotifications(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const customer = String(data.get('customer'));
    const product = String(data.get('product'));
    const quantity = Number(data.get('quantity'));
    const price = product === 'RON95-III' ? 24600 : product === 'DO-0.05S' ? 21800 : 23200;
    const order: Order = {
      id: `SO-260824-${String(orders.length + 19).padStart(3, '0')}`,
      customer,
      channel: 'Đại lý',
      warehouse: String(data.get('warehouse')),
      date: '24/08/2026',
      value: quantity * price,
      status: 'Chờ duyệt',
      tone: 'amber',
      items: 1,
    };
    setOrders([order, ...orders]);
    setModal(false);
    setView('sales');
    setToast(`Đã tạo ${order.id}`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => go('dashboard')}>
          <span className="brand-mark">CTV</span>
          <span><b>CTV</b><small>Distribution ERP</small></span>
        </button>
        <nav aria-label="Điều hướng chính">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="nav-label">{group.section}</p>
              {group.items.map(([id, icon, label]) => (
                <button
                  key={id}
                  className={`nav-item ${view === id ? 'active' : ''}`}
                  onClick={() => go(id as View)}
                >
                  <i>{icon}</i>
                  {label}
                  {id === 'sales' && <em>12</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="support-card" onClick={() => go('architecture')}>
          <span>DB</span>
          <div><b>PostgreSQL</b><small>Lựa chọn phù hợp nhất</small></div>
        </button>
        <div className="profile">
          <span className="avatar">CTV</span>
          <div><b>CTV</b><small>Quản trị hệ thống</small></div>
          <button aria-label="Mở menu tài khoản">•••</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <label className="search">
            <span>⌕</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query) go('sales');
              }}
              aria-label="Tìm kiếm"
              placeholder="Tìm đơn hàng, khách hàng, SKU..."
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setNotifications(!notifications)} aria-label="Thông báo">
              ♢<span />
            </button>
            <button className="primary-button" onClick={() => setModal(true)}>＋ Tạo đơn hàng</button>
          </div>
          {notifications && (
            <div className="notification-popover">
              <div><b>Thông báo</b><button onClick={() => setNotifications(false)}>×</button></div>
              <p><i className="status-dot amber" /><span><b>Đơn hàng chờ duyệt</b><small>SO-260824-016 · 4 phút trước</small></span></p>
              <p><i className="status-dot red" /><span><b>Giao hàng trễ SLA</b><small>SO-260822-035 · 18 phút trước</small></span></p>
              <p><i className="status-dot green" /><span><b>Đã nhận thanh toán</b><small>312,8 triệu · 32 phút trước</small></span></p>
            </div>
          )}
        </header>

        <div className="content">
          {view === 'dashboard' && <Dashboard orders={orders} onOpen={setDetail} onSales={() => go('sales')} />}
          {view === 'sales' && (
            <Sales orders={filtered} status={status} setStatus={setStatus} onOpen={setDetail} onCreate={() => setModal(true)} />
          )}
          {view === 'inventory' && <Inventory />}
       
          {modules[view] && <ModulePage data={modules[view]} />}
        </div>
      </section>

      {modal && <OrderModal onClose={() => setModal(false)} onSubmit={submitOrder} />}
      {detail && <OrderDrawer order={detail} onClose={() => setDetail(null)} onToast={setToast} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}