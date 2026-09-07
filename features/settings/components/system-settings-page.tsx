'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { listSystemSettings, updateSystemSetting } from '../api/settings-api';
import type { SystemSetting } from '../types/setting';

const groupMetadata: Record<string, { label: string; description: string; icon: IconName }> = {
  ORGANIZATION: { label: 'Thông tin doanh nghiệp', description: 'Thông tin pháp lý và liên hệ hiển thị xuyên suốt ERP.', icon: 'users' },
  SYSTEM: { label: 'Thiết lập vận hành', description: 'Múi giờ và quy ước hiển thị dùng chung.', icon: 'settings' },
  DOCUMENT: { label: 'Hồ sơ & thời hạn', description: 'Cấu hình cảnh báo bảo hiểm, hợp đồng và giấy tờ.', icon: 'clock' },
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function SystemSettingsPage() {
  const { user, request } = useAuth();
  const canView = user?.permissions.includes('SYSTEM.SETTINGS.VIEW') ?? false;
  const canManage = user?.permissions.includes('SYSTEM.SETTINGS.MANAGE') ?? false;
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await listSystemSettings(request);
      setSettings(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.key, item.value])));
      setActiveGroup((current) => current || items[0]?.groupCode || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được cấu hình hệ thống');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!canView) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const groups = useMemo(() => Array.from(new Set(settings.map((item) => item.groupCode))), [settings]);
  const visibleSettings = settings.filter((item) => item.groupCode === activeGroup);
  const changedCount = settings.filter((item) => drafts[item.key] !== item.value).length;

  async function save(setting: SystemSetting) {
    const value = drafts[setting.key] ?? '';
    setSavingKey(setting.key);
    setError('');
    try {
      const updated = await updateSystemSetting(request, setting.key, value);
      setSettings((current) => current.map((item) => item.key === updated.key ? updated : item));
      setDrafts((current) => ({ ...current, [updated.key]: updated.value }));
      setToast('Đã cập nhật ' + updated.displayName);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu cấu hình');
    } finally {
      setSavingKey('');
    }
  }

  if (!canView) {
    return <section className="nova-access-denied"><span><Icon name="shield" /></span><p>KHÔNG ĐỦ QUYỀN</p><h1>Bạn không thể xem cấu hình hệ thống.</h1><div>Cần permission <code>SYSTEM.SETTINGS.VIEW</code> để truy cập chức năng này.</div></section>;
  }

  return (
    <div className="nova-account-page nova-settings-page">
      <header className="nova-page-header">
        <div><p className="nova-eyebrow">THIẾT LẬP NỀN TẢNG</p><h1>Cấu hình hệ thống</h1><span>Quản lý thông tin doanh nghiệp và quy tắc vận hành dùng chung.</span></div>
        <button className="nova-button secondary" onClick={() => void load()} disabled={loading}><Icon name="refresh" className={loading ? 'spin' : ''} />Đồng bộ lại</button>
      </header>

      <section className="nova-settings-summary">
        <div><span><Icon name="settings" /></span><div><small>CẤU HÌNH ĐANG HOẠT ĐỘNG</small><b>{settings.length} mục thuộc {groups.length} nhóm</b></div></div>
        <div className={changedCount ? 'changed' : ''}><small>THAY ĐỔI CHƯA LƯU</small><b>{changedCount.toString().padStart(2, '0')}</b></div>
      </section>

      {error && <div className="nova-panel-error"><span>{error}</span><button onClick={() => void load()}>Thử lại</button></div>}
      <section className="nova-settings-layout">
        <nav className="nova-settings-tabs" aria-label="Nhóm cấu hình">
          {groups.map((group) => {
            const meta = groupMetadata[group] ?? { label: group, description: 'Cấu hình dùng chung', icon: 'settings' as IconName };
            return <button key={group} onClick={() => setActiveGroup(group)} className={group === activeGroup ? 'active' : ''}><span><Icon name={meta.icon} /></span><div><b>{meta.label}</b><small>{settings.filter((item) => item.groupCode === group).length} mục</small></div><Icon name="chevronRight" /></button>;
          })}
        </nav>
        <section className="nova-settings-panel">
          {loading && <div className="nova-inline-loading"><span className="nova-session-spinner" />Đang tải cấu hình…</div>}
          {!loading && activeGroup && (
            <>
              <header>
                <div><span><Icon name={(groupMetadata[activeGroup]?.icon ?? 'settings')} /></span><div><p>{activeGroup}</p><h2>{groupMetadata[activeGroup]?.label ?? activeGroup}</h2><small>{groupMetadata[activeGroup]?.description}</small></div></div>
                {!canManage && <em>Chỉ xem</em>}
              </header>
              <div className="nova-setting-list">
                {visibleSettings.map((setting) => {
                  const changed = drafts[setting.key] !== setting.value;
                  const numeric = setting.valueType === 'INTEGER' || setting.valueType === 'DECIMAL';
                  return (
                    <article key={setting.key} className={changed ? 'changed' : ''}>
                      <div className="nova-setting-copy"><label htmlFor={'setting-' + setting.key}>{setting.displayName}</label><p>{setting.description}</p><code>{setting.key}</code></div>
                      <div className="nova-setting-control">
                        {setting.valueType === 'BOOLEAN' ? (
                          <select id={'setting-' + setting.key} value={drafts[setting.key] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))} disabled={!canManage || !setting.editable}><option value="true">Bật</option><option value="false">Tắt</option></select>
                        ) : (
                          <input
                            id={'setting-' + setting.key}
                            type={numeric ? 'number' : setting.valueFormat === 'EMAIL' ? 'email' : 'text'}
                            min={setting.minNumeric ?? undefined}
                            max={setting.maxNumeric ?? undefined}
                            maxLength={setting.maxLength ?? undefined}
                            value={drafts[setting.key] ?? ''}
                            onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                            disabled={!canManage || !setting.editable}
                          />
                        )}
                        <div><small>Cập nhật {formatUpdatedAt(setting.updatedAt)}</small><button className="nova-button secondary" onClick={() => void save(setting)} disabled={!changed || !canManage || savingKey === setting.key}><Icon name="save" />{savingKey === setting.key ? 'Đang lưu…' : 'Lưu'}</button></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </section>
      {toast && <div className="nova-admin-toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}
