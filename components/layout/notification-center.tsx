'use client';

import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  browserSubscription, decodeVapidKey, getPushConfiguration, listNotifications,
  markAllNotificationsRead, markNotificationRead, savePushSubscription,
  type NotificationSummary, type PushConfiguration, type UserNotification,
} from '@/features/notifications/api/notification-api';

type Props = { summary: NotificationSummary; refreshSummary: () => Promise<void> };

async function pushErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Không thể bật thông báo trình duyệt.';
  const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave;
  const isBrave = Boolean(brave?.isBrave && await brave.isBrave().catch(() => false));
  if (isBrave && /registration failed|push service error/i.test(message)) {
    return 'Brave đang tắt dịch vụ Push. Mở Cài đặt → Quyền riêng tư và bảo mật, bật “Use Google services for push messaging”, khởi động lại Brave rồi thử lại.';
  }
  return message;
}

export default function NotificationCenter({ summary, refreshSummary }: Props) {
  const { request } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [config, setConfig] = useState<PushConfiguration | null>(null);
  const [pushActive, setPushActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    void getPushConfiguration(request).then(async next => {
      if (!active) return;
      setConfig(next);
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
      if (!next.enabled || Notification.permission !== 'granted') return;
      await navigator.serviceWorker.register('/erp-push-sw.js', { scope: '/', updateViaCache: 'none' });
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!active || !existing) return;
      await savePushSubscription(request, browserSubscription(existing));
      if (active) {
        setPushActive(true);
        setSuccess('Cấu hình thông báo thành công trên trình duyệt này.');
      }
    }).catch(async cause => {
      if (active) setError(await pushErrorMessage(cause));
    });
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void listNotifications(request).then(data => { if (active) setItems(data); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được thông báo.'); });
    return () => { active = false; };
  }, [open, request, summary.unreadTotal]);

  async function enablePush() {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (!config?.enabled || !config.publicKey) throw new Error('Máy chủ chưa cấu hình Web Push.');
      if (!window.isSecureContext) {
        throw new Error('Thông báo trình duyệt cần HTTPS hoặc localhost.');
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
        throw new Error('Trình duyệt này không hỗ trợ Web Push.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Bạn chưa cấp quyền thông báo. Hãy cho phép trong cài đặt của trình duyệt rồi thử lại.');
      await navigator.serviceWorker.register('/erp-push-sw.js', { scope: '/', updateViaCache: 'none' });
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey),
      });
      await savePushSubscription(request, browserSubscription(subscription));
      setPushActive(true);
      setSuccess('Cấu hình thông báo thành công trên trình duyệt này.');
    } catch (cause) {
      setError(await pushErrorMessage(cause));
    } finally { setBusy(false); }
  }

  async function openNotification(item: UserNotification) {
    setError('');
    try {
      if (!item.readAt) await markNotificationRead(request, item.id);
      await refreshSummary();
      const route = item.targetRoute;
      if (route.startsWith('/') && !route.startsWith('//')) window.location.assign(route);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể mở thông báo.');
    }
  }

  async function markAllRead() {
    setBusy(true); setError('');
    try {
      await markAllNotificationsRead(request);
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      await refreshSummary();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đánh dấu đã đọc.');
    } finally { setBusy(false); }
  }

  return <div className="nova-notification-wrap">
    <button className="nova-notification-trigger" type="button" aria-label={'Thông báo, ' + summary.unreadTotal + ' chưa đọc'}
      aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell aria-hidden="true" />
      {summary.unreadTotal > 0 && <span className="nova-notification-count">{summary.unreadTotal > 99 ? '99+' : summary.unreadTotal}</span>}
    </button>
    {open && <div className="nova-notification-panel" role="dialog" aria-label="Thông báo">
      <header><div><strong>Thông báo</strong><small>{summary.unreadTotal} chưa đọc</small></div>
        <button type="button" onClick={() => void markAllRead()} disabled={busy || !summary.unreadTotal} title="Đánh dấu tất cả đã đọc"><CheckCheck /></button>
      </header>
      <div className="nova-notification-list">
        {items.length ? items.map(item => <button type="button" className={'nova-notification-item ' + (!item.readAt ? 'unread' : '')}
          key={item.id} onClick={() => void openNotification(item)}>
          <span className="nova-notification-item-top"><strong>{item.title}</strong>{!item.readAt && <i />}</span>
          <span>{item.message}</span>
          <small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small>
          <ExternalLink aria-hidden="true" />
        </button>) : <p className="nova-notification-empty">Chưa có thông báo.</p>}
      </div>
      <footer>
        {!config && !error && <span>Đang kiểm tra cấu hình thông báo…</span>}
        {config?.enabled && !pushActive && <button type="button" onClick={() => void enablePush()} disabled={busy}>Bật thông báo trình duyệt</button>}
        {pushActive && success && <p className="nova-notification-success" role="status">{success}</p>}
        {config && !config.enabled && <span>Backend chưa cấu hình Web Push. Quản trị viên cần đặt WEB_PUSH_PRIVATE_KEY_FILE, WEB_PUSH_PUBLIC_KEY_FILE và WEB_PUSH_SUBJECT rồi khởi động lại backend. Thông báo trong ERP vẫn hoạt động.</span>}
        {error && <p role="alert">{error}</p>}
      </footer>
    </div>}
  </div>;
}
