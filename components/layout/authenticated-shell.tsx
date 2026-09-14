'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon, { type IconName } from '@/components/ui/icon';
import { useAuth } from '@/features/auth/context/auth-context';
import { listMyNavigation } from '@/features/navigation/api/navigation-api';
import type { NavigationItem } from '@/features/navigation/types/navigation';

type ShellLink = { href: string; label: string; icon: IconName };
type ShellGroup = { label: string; items: ShellLink[] };

const routeMap: Record<string, string> = {
  '/home': '/home',
  '/dashboard': '/dashboard',
  '/dashboard/sales': '/dashboard/sales',
  '/dashboard/accounting': '/dashboard/accounting',
  '/dashboard/hr-admin': '/dashboard/hr-admin',
  '/performance/goals': '/performance/goals',
  '/performance/data-entry': '/performance/data-entry',
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

const iconByCode: Record<string, IconName> = {
  NAV_DASHBOARD: 'dashboard',
  NAV_DASHBOARD_EXECUTIVE: 'dashboard',
  NAV_DASHBOARD_SALES: 'target',
  NAV_DASHBOARD_ACCOUNTING: 'database',
  NAV_DASHBOARD_HR_ADMIN: 'users',
  NAV_PERFORMANCE_GOALS: 'target',
  NAV_PERFORMANCE_DATA_ENTRY: 'table',
  NAV_SECURITY_USERS: 'users',
  NAV_SECURITY_ROLES: 'key',
  NAV_SECURITY_AUDIT: 'scroll',
  NAV_SYSTEM_SETTINGS: 'settings',
  NAV_SYSTEM_INTEGRATIONS: 'plug',
  NAV_SYSTEM_BACKUPS: 'database',
  NAV_HR_EMPLOYEES: 'users',
  NAV_HR_ATTENDANCE: 'clock',
  NAV_ADMIN_EXPENSES: 'database',
  NAV_ADMIN_DOCUMENTS: 'calendar',
  NAV_ADMIN_WORK: 'clipboard',
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
    icon: iconByCode[item.code] ?? 'chevronRight',
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
      { href: '/accounts', label: 'Tài khoản', icon: 'users' },
      { href: '/security/roles', label: 'Vai trò & quyền', icon: 'key' },
    );
  }
  if (permissions.includes('AUDIT.VIEW')) access.push({ href: '/security/audit', label: 'Nhật ký hoạt động', icon: 'scroll' });
  if (permissions.includes('SYSTEM.SETTINGS.VIEW')) system.push({ href: '/system/settings', label: 'Cấu hình hệ thống', icon: 'settings' });
  if (permissions.includes('SYSTEM.INTEGRATION.VIEW')) system.push({ href: '/system/integrations', label: 'Kết nối dịch vụ', icon: 'plug' });
  if (permissions.includes('SYSTEM.BACKUP.VIEW')) system.push({ href: '/system/backups', label: 'Sao lưu dữ liệu', icon: 'database' });
  if (permissions.includes('PERFORMANCE.GOAL.VIEW')) performance.push({ href: '/performance/goals', label: 'Mục tiêu KPI / OKR', icon: 'target' });
  if (permissions.includes('PERFORMANCE.DATA.ENTER')) performance.push({ href: '/performance/data-entry', label: 'Nhập số liệu theo ngày', icon: 'table' });
  if (permissions.includes('HR.VIEW')) humanResources.push({ href: '/hr/employees', label: 'Nhân viên & phòng ban', icon: 'users' });
  if (permissions.includes('HR.ATTENDANCE.VIEW')) humanResources.push({ href: '/hr/attendance', label: 'Quản lý chấm công', icon: 'clock' });
  if (permissions.includes('ADMIN.EXPENSE.VIEW')) humanResources.push({ href: '/admin/expenses', label: 'Chi phí hành chính', icon: 'database' });
  if (permissions.includes('ADMIN.DOCUMENT.VIEW')) humanResources.push({ href: '/admin/documents', label: 'Hồ sơ & thời hạn', icon: 'calendar' });
  if (permissions.includes('ADMIN.WORK.VIEW')) humanResources.push({ href: '/admin/work-items', label: 'Quản lý công việc', icon: 'clipboard' });

  const dashboard: ShellLink[] = [];
  if (permissions.includes('PERFORMANCE.DASHBOARD.VIEW')) dashboard.push({ href: '/dashboard', label: 'Dashboard điều hành', icon: 'dashboard' });
  if (permissions.includes('DASHBOARD.SALES.VIEW')) dashboard.push({ href: '/dashboard/sales', label: 'Dashboard Kinh doanh', icon: 'target' });
  if (permissions.includes('DASHBOARD.ACCOUNTING.VIEW')) dashboard.push({ href: '/dashboard/accounting', label: 'Dashboard Tài chính', icon: 'database' });
  if (permissions.includes('DASHBOARD.HR_ADMIN.VIEW')) dashboard.push({ href: '/dashboard/hr-admin', label: 'Dashboard HCNS', icon: 'users' });
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
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigation, setNavigation] = useState<ShellGroup[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

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
        setNavigation([{ label: 'TRANG CHỦ', items: [{ href: '/home', label: 'Trang chủ', icon: 'dashboard' }] }, ...(groups.length ? groups : fallbackGroups(user.permissions))]);
        setUsingFallback(groups.length === 0);
      })
      .catch(() => {
        if (!active) return;
        setNavigation([{ label: 'TRANG CHỦ', items: [{ href: '/home', label: 'Trang chủ', icon: 'dashboard' }] }, ...fallbackGroups(user.permissions)]);
        setUsingFallback(true);
      });

    return () => { active = false; };
  }, [request, status, user]);

  const heading = useMemo(() => pageHeadings[pathname] ?? pageHeadings['/dashboard'], [pathname]);

  async function handleLogout() {
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
    <main className="nova-admin-shell">
      {mobileOpen && <button className="nova-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}
      <aside className={`nova-admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <Link className="nova-admin-brand" href="/home"><span>CTV</span><div><b>CTV</b><small>Distribution ERP</small></div></Link>
        <div className="nova-admin-context"><span><Icon name="shield" /></span><div><small>KHÔNG GIAN LÀM VIỆC</small><b>Quản trị hệ thống</b></div></div>
        <nav aria-label="Chức năng được cấp quyền">
          {navigation.map((group) => (
            <div className="nova-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={isActive ? 'active' : ''}>
                    <Icon name={item.icon} /><span>{item.label}</span>{isActive && <i />}
                  </Link>
                );
              })}
            </div>
          ))}
          {usingFallback && <small className="nova-nav-note">Menu dự phòng theo quyền tài khoản</small>}
        </nav>
        <div className="nova-admin-profile"><span>{initials}</span><div><b>{user.username}</b><small>{user.roles[0] ?? 'Người dùng'}</small></div><button onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="logout" /></button></div>
      </aside>
      <section className="nova-admin-workspace">
        <header className="nova-admin-topbar">
          <button className="nova-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Icon name="menu" /></button>
          <div><p>{heading.eyebrow}</p><b>{heading.title}</b></div>
          <div className="nova-admin-actions"><span aria-label={`Tài khoản ${user.username}`}>{initials}</span></div>
        </header>
        {children}
      </section>
    </main>
  );
}
