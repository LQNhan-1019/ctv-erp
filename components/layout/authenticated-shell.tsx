'use client';

import { BarChart3, CalendarDays, ChevronRight, ClipboardList, Clock3, Database, KeyRound, LayoutDashboard, LogOut, Menu, Moon, Plug, ScrollText, Settings, ShieldCheck, Sun, Table2, Target, Users, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/auth-context';
import { listMyNavigation } from '@/features/navigation/api/navigation-api';
import type { NavigationItem } from '@/features/navigation/types/navigation';
import { useTheme } from '@/components/theme-provider';
import NotificationCenter from '@/components/layout/notification-center';
import { getNotificationSummary, removePushSubscription, type NotificationSummary } from '@/features/notifications/api/notification-api';

type ShellLink = { href: string; label: string; icon: LucideIcon; code?: string };
type ShellGroup = { label: string; items: ShellLink[] };

const routeMap: Record<string, string> = {
  '/home': '/home',
  '/dashboard': '/dashboard',
  '/dashboard/sales': '/dashboard/sales',
  '/dashboard/accounting': '/dashboard/accounting',
  '/dashboard/hr-admin': '/dashboard/hr-admin',
  '/performance/goals': '/performance/goals',
  '/performance/data-entry': '/performance/data-entry',
  '/performance/results': '/performance/results',
  '/security/users': '/accounts',
  '/security/roles': '/security/roles',
  '/security/audit': '/security/audit',
  '/system/settings': '/system/settings',
  '/system/integrations': '/system/integrations',
  '/system/backups': '/system/backups',
  '/hr/employees': '/hr/employees',
  '/hr/attendance': '/hr/attendance',
  '/admin/expenses': '/admin/expenses',
  '/admin/documents': '/admin/documents',
  '/admin/work-items': '/admin/work-items',
};

const iconByCode: Record<string, LucideIcon> = {
  NAV_DASHBOARD: LayoutDashboard,
  NAV_DASHBOARD_EXECUTIVE: LayoutDashboard,
  NAV_DASHBOARD_SALES: Target,
  NAV_DASHBOARD_ACCOUNTING: Database,
  NAV_DASHBOARD_HR_ADMIN: Users,
  NAV_PERFORMANCE_GOALS: Target,
  NAV_PERFORMANCE_DATA_ENTRY: Table2,
  NAV_PERFORMANCE_RESULTS: BarChart3,
  NAV_SECURITY_USERS: Users,
  NAV_SECURITY_ROLES: KeyRound,
  NAV_SECURITY_AUDIT: ScrollText,
  NAV_SYSTEM_SETTINGS: Settings,
  NAV_SYSTEM_INTEGRATIONS: Plug,
  NAV_SYSTEM_BACKUPS: Database,
  NAV_HR_EMPLOYEES: Users,
  NAV_HR_ATTENDANCE: Clock3,
  NAV_ADMIN_EXPENSES: Database,
  NAV_ADMIN_DOCUMENTS: CalendarDays,
  NAV_ADMIN_WORK: ClipboardList,
};

const pageHeadings: Record<string, { eyebrow: string; title: string }> = {
  '/home': { eyebrow: 'KHÔNG GIAN LÀM VIỆC', title: 'Trang chủ' },
  '/accounts': { eyebrow: 'QUẢN TRỊ TRUY CẬP', title: 'Quản lý tài khoản' },
  '/security/roles': { eyebrow: 'QUẢN TRỊ TRUY CẬP', title: 'Vai trò và phân quyền' },
  '/security/audit': { eyebrow: 'AN TOÀN HỆ THỐNG', title: 'Nhật ký hoạt động' },
  '/system/settings': { eyebrow: 'CẤU HÌNH NỀN TẢNG', title: 'Thông tin hệ thống' },
  '/system/integrations': { eyebrow: 'CẤU HÌNH NỀN TẢNG', title: 'Kết nối dịch vụ' },
  '/system/backups': { eyebrow: 'AN TOÀN DỮ LIỆU', title: 'Sao lưu dữ liệu' },
  '/dashboard': { eyebrow: 'TỔNG QUAN', title: 'Dashboard ERP' },
  '/dashboard/sales': { eyebrow: 'KINH DOANH', title: 'Dashboard Kinh doanh' },
  '/dashboard/accounting': { eyebrow: 'TÀI CHÍNH KẾ TOÁN', title: 'Dashboard Tài chính - Kế toán' },
  '/dashboard/hr-admin': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Dashboard HCNS' },
  '/performance/goals': { eyebrow: 'HIỆU SUẤT', title: 'Mục tiêu KPI / OKR' },
  '/performance/data-entry': { eyebrow: 'HIỆU SUẤT', title: 'Nhập số liệu theo ngày' },
  '/performance/results': { eyebrow: 'KẾT QUẢ KPI', title: 'Dashboard kết quả vận hành' },
  '/hr/employees': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Nhân viên và phòng ban' },
  '/hr/attendance': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Quản lý chấm công' },
  '/admin/expenses': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Tổng hợp chi phí hành chính' },
  '/admin/documents': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Quản lý thời hạn giấy tờ' },
  '/admin/work-items': { eyebrow: 'HÀNH CHÍNH NHÂN SỰ', title: 'Quản lý công việc' },
};

function toShellLink(item: NavigationItem): ShellLink | null {
  if (!item.route || !routeMap[item.route]) return null;
  return {
    href: routeMap[item.route],
    label: item.label,
    icon: iconByCode[item.code] ?? ChevronRight,
    code: item.code,
  };
}

function toShellGroups(items: NavigationItem[]): ShellGroup[] {
  const groups: ShellGroup[] = [];
  const direct: ShellLink[] = [];

  items.forEach((item) => {
    const link = toShellLink(item);
    if (link) direct.push(link);

    const children = item.children.map(toShellLink).filter((child): child is ShellLink => child !== null);
    if (children.length) groups.push({ label: item.label.toUpperCase(), items: children });
  });

  if (direct.length) groups.unshift({ label: 'TỔNG QUAN', items: direct });
  return groups;
}

function fallbackGroups(permissions: string[]): ShellGroup[] {
  const canManage = permissions.includes('SECURITY.MANAGE');
  const access: ShellLink[] = [];
  const system: ShellLink[] = [];
  const performance: ShellLink[] = [];
  const humanResources: ShellLink[] = [];

  if (canManage) {
    access.push(
      { href: '/accounts', label: 'Tài khoản', icon: Users },
      { href: '/security/roles', label: 'Vai trò & quyền', icon: KeyRound },
    );
  }
  if (permissions.includes('AUDIT.VIEW')) access.push({ href: '/security/audit', label: 'Nhật ký hoạt động', icon: ScrollText });
  if (permissions.includes('SYSTEM.SETTINGS.VIEW')) system.push({ href: '/system/settings', label: 'Cấu hình hệ thống', icon: Settings });
  if (permissions.includes('SYSTEM.INTEGRATION.VIEW')) system.push({ href: '/system/integrations', label: 'Kết nối dịch vụ', icon: Plug });
  if (permissions.includes('SYSTEM.BACKUP.VIEW')) system.push({ href: '/system/backups', label: 'Sao lưu dữ liệu', icon: Database });
  if (permissions.includes('PERFORMANCE.GOAL.VIEW')) performance.push({ href: '/performance/goals', label: 'Mục tiêu KPI / OKR', icon: Target });
  if (permissions.includes('PERFORMANCE.DATA.ENTER')) performance.push({ href: '/performance/data-entry', label: 'Nhập số liệu theo ngày', icon: Table2 });
  if (permissions.includes('PERFORMANCE.RESULTS.VIEW')) performance.push({ href: '/performance/results', label: 'Dashboard kết quả KPI', icon: BarChart3 });
  if (permissions.includes('HR.VIEW')) humanResources.push({ href: '/hr/employees', label: 'Nhân viên & phòng ban', icon: Users });
  if (permissions.includes('HR.ATTENDANCE.VIEW')) humanResources.push({ href: '/hr/attendance', label: 'Quản lý chấm công', icon: Clock3 });
  if (permissions.includes('ADMIN.EXPENSE.VIEW')) humanResources.push({ href: '/admin/expenses', label: 'Chi phí hành chính', icon: Database });
  if (permissions.includes('ADMIN.DOCUMENT.VIEW')) humanResources.push({ href: '/admin/documents', label: 'Hồ sơ & thời hạn', icon: CalendarDays });
  if (permissions.includes('ADMIN.WORK.VIEW')) humanResources.push({ href: '/admin/work-items', label: 'Quản lý công việc', icon: ClipboardList, code: 'NAV_ADMIN_WORK' });

  const dashboard: ShellLink[] = [];
  if (permissions.includes('PERFORMANCE.DASHBOARD.VIEW')) dashboard.push({ href: '/dashboard', label: 'Dashboard điều hành', icon: LayoutDashboard });
  if (permissions.includes('DASHBOARD.SALES.VIEW')) dashboard.push({ href: '/dashboard/sales', label: 'Dashboard Kinh doanh', icon: Target });
  if (permissions.includes('DASHBOARD.ACCOUNTING.VIEW')) dashboard.push({ href: '/dashboard/accounting', label: 'Dashboard Tài chính', icon: Database });
  if (permissions.includes('DASHBOARD.HR_ADMIN.VIEW')) dashboard.push({ href: '/dashboard/hr-admin', label: 'Dashboard HCNS', icon: Users });
  const groups: ShellGroup[] = [
    { label: 'DASHBOARD PHÒNG BAN', items: dashboard },
    { label: 'MỤC TIÊU & HIỆU SUẤT', items: performance },
    { label: 'HÀNH CHÍNH NHÂN SỰ', items: humanResources },
    { label: 'QUẢN TRỊ TRUY CẬP', items: access },
    { label: 'HỆ THỐNG', items: system },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export default function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, status, sessionError, retrySession, logout, request } = useAuth();
  const { toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigation, setNavigation] = useState<ShellGroup[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>({ unreadTotal: 0, unreadByNavigation: {} });

  const refreshNotificationSummary = useCallback(async () => {
    const next = await getNotificationSummary(request);
    setNotificationSummary(next);
  }, [request]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshNotificationSummary().catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('erp-notifications-changed', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('erp-notifications-changed', refresh);
    };
  }, [refreshNotificationSummary, status]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    let active = true;

    listMyNavigation(request)
      .then((items) => {
        if (!active) return;
        const groups = toShellGroups(items);
        setNavigation([{ label: 'TRANG CHỦ', items: [{ href: '/home', label: 'Trang chủ', icon: LayoutDashboard }] }, ...(groups.length ? groups : fallbackGroups(user.permissions))]);
        setUsingFallback(groups.length === 0);
      })
      .catch(() => {
        if (!active) return;
        setNavigation([{ label: 'TRANG CHỦ', items: [{ href: '/home', label: 'Trang chủ', icon: LayoutDashboard }] }, ...fallbackGroups(user.permissions)]);
        setUsingFallback(true);
      });

    return () => { active = false; };
  }, [request, status, user]);

  const heading = useMemo(() => pageHeadings[pathname] ?? pageHeadings['/dashboard'], [pathname]);
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  async function handleLogout() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/erp-push-sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          try { await removePushSubscription(request, subscription.endpoint); }
          finally { await subscription.unsubscribe(); }
        }
      } catch { /* Đăng xuất vẫn tiếp tục khi trình duyệt chặn Web Push. */ }
    }
    await logout();
    router.replace('/login');
  }

  if (status === 'unavailable') {
    return <main className="nova-session-screen nova-session-unavailable"><p>{sessionError}</p><button className="nova-button primary" onClick={() => void retrySession()}>Thử kết nối lại</button></main>;
  }
  if (status !== 'authenticated' || !user) {
    return <main className="nova-session-screen"><span className="nova-session-spinner" /><p>Đang xác thực phiên làm việc…</p></main>;
  }

  const initials = user.username.slice(0, 2).toUpperCase();
  return (
    <main className={`nova-admin-shell snowui-shell ${isDashboardRoute ? 'snowui-dashboard-shell' : ''}`}>
      {mobileOpen && <button className="nova-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}
      <aside className={`nova-admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <Link className="nova-admin-brand" href="/home"><span>CTV</span><div><b>CTV ERP</b><small>Hệ thống điều hành</small></div></Link>
        <div className="nova-admin-context"><span><ShieldCheck /></span><div><small>KHÔNG GIAN LÀM VIỆC</small><b>Quản trị hệ thống</b></div></div>
        <nav aria-label="Chức năng được cấp quyền">
          {navigation.map((group) => (
            <div className="nova-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const ItemIcon = item.icon;
                const unread = notificationSummary.unreadByNavigation[item.code ?? ''] ?? 0;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={isActive ? 'active' : ''}>
                    <ItemIcon /><span>{item.label}</span>{unread > 0 && <span className="nova-nav-alert-dot" title={unread + ' thông báo chưa đọc'} aria-label={unread + ' thông báo chưa đọc'} />}{isActive && !unread && <i />}
                  </Link>
                );
              })}
            </div>
          ))}
          {usingFallback && <small className="nova-nav-note">Menu dự phòng theo quyền tài khoản</small>}
        </nav>
        <div className="nova-admin-profile"><span>{initials}</span><div><b>{user.username}</b><small>{user.roles[0] ?? 'Người dùng'}</small></div><button onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất"><LogOut /></button></div>
      </aside>
      <section className="nova-admin-workspace">
        <header className="nova-admin-topbar">
          <button className="nova-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu /></button>
          <div><p>{heading.eyebrow}</p><b>{heading.title}</b></div>
          <div className="nova-admin-actions"><NotificationCenter summary={notificationSummary} refreshSummary={refreshNotificationSummary} /><button className="nova-theme-toggle" type="button" onClick={toggleTheme} title="Chuyển chế độ màu" aria-label="Chuyển chế độ màu"><span className="snow-theme-icon-light"><Moon /></span><span className="snow-theme-icon-dark"><Sun /></span></button><span aria-label={`Tài khoản ${user.username}`}>{initials}</span></div>
        </header>
        {children}
      </section>
    </main>
  );
}
