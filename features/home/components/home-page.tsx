'use client';
import { CalendarDays, Check, ChevronRight, Clock3, Database, LayoutDashboard, Plug, ShieldCheck, Target, Users, UserRound, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context/auth-context';
import { getMyEmployee } from '@/features/hr/api/hr-api';
import type { Employee } from '@/features/hr/types/hr';
type Entry = { permission?: string; href: string; label: string; detail: string; icon: LucideIcon };
const entries: Entry[] = [
  { permission:'PERFORMANCE.DASHBOARD.VIEW', href:'/dashboard', label:'Dashboard điều hành', detail:'Theo dõi kết quả và tiến độ mục tiêu', icon:LayoutDashboard },
  { permission:'PERFORMANCE.GOAL.VIEW', href:'/performance/goals', label:'Mục tiêu KPI / OKR', detail:'Quản lý mục tiêu được giao', icon:Target },
  { permission:'HR.VIEW', href:'/hr/employees', label:'Nhân sự & phòng ban', detail:'Thông tin nhân viên và tổ chức', icon:Users },
  { permission:'HR.ATTENDANCE.VIEW', href:'/hr/attendance', label:'Chấm công', detail:'Ca làm việc, bảng công và ngoại lệ', icon:Clock3 },
  { permission:'ADMIN.EXPENSE.VIEW', href:'/admin/expenses', label:'Chi phí hành chính', detail:'Ngân sách, thực tế và danh mục chi phí', icon:Database },
  { permission:'ADMIN.DOCUMENT.VIEW', href:'/admin/documents', label:'Giấy tờ & thời hạn', detail:'Theo dõi hồ sơ sắp hết hạn', icon:CalendarDays },
  { permission:'SECURITY.MANAGE', href:'/accounts', label:'Tài khoản hệ thống', detail:'Người dùng, vai trò và quyền truy cập', icon:ShieldCheck },
  { permission:'SYSTEM.INTEGRATION.VIEW', href:'/system/integrations', label:'Kết nối dữ liệu', detail:'AMIS, máy chấm công và Google Drive', icon:Plug },
];
export default function HomePage() {
  const { user, request } = useAuth();
  const [employee, setEmployee] = useState<Employee | null | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyEmployee(request).then((profile) => { if (active) setEmployee(profile ?? null); })
      .catch(() => { if (active) setEmployee(null); });
    return () => { active = false; };
  }, [request, user]);
  if (!user) return null;
  const available = entries.filter((item) => !item.permission || user.permissions.includes(item.permission));
  const hour = new Date().getHours(); const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  return <div className="erp-home"><section className="erp-home-hero"><div><p>CTV DISTRIBUTION ERP</p><h1>{greeting}, {employee?.fullName || user.username}</h1><span>Chọn công việc cần xử lý. Hệ thống chỉ hiển thị những chức năng tài khoản của bạn được cấp quyền.</span></div><aside><small>VAI TRÒ HIỆN TẠI</small><b>{user.roles.join(', ') || 'Người dùng'}</b><span>{available.length} chức năng có thể truy cập</span></aside></section>
    {employee === undefined ? <section className="erp-employee-card loading">Đang tải thông tin nhân viên…</section> : employee ? <section className="erp-employee-card"><span className="erp-employee-avatar"><UserRound /></span><div className="erp-employee-identity"><small>THÔNG TIN NHÂN VIÊN</small><h2>{employee.fullName}</h2><p>{employee.employeeCode} · {employee.employmentStatus === 'ACTIVE' ? 'Đang làm việc' : 'Hồ sơ nhân sự'}</p></div><dl><div><dt>Phòng ban</dt><dd>{employee.departmentName}</dd></div><div><dt>Chức danh</dt><dd>{employee.jobTitleName || 'Chưa cập nhật'}</dd></div><div><dt>Liên hệ</dt><dd>{employee.workEmail || employee.phone || 'Chưa cập nhật'}</dd></div><div><dt>Ngày vào làm</dt><dd>{formatDate(employee.hiredOn)}</dd></div></dl></section> : <section className="erp-employee-card unlinked"><span className="erp-employee-avatar"><UserRound /></span><div><small>THÔNG TIN NHÂN VIÊN</small><h2>Tài khoản chưa liên kết hồ sơ nhân sự</h2><p>Quản trị viên hoặc nhân sự có quyền quản lý tài khoản có thể liên kết tại trang Nhân sự & phòng ban.</p></div></section>}
    <section className="erp-home-section"><header><div><p>TRUY CẬP NHANH</p><h2>Công việc của bạn</h2></div><span>{available.length} mục</span></header><div className="erp-home-grid">{available.map((item) => <Link href={item.href} key={item.href}><span><item.icon/></span><div><b>{item.label}</b><small>{item.detail}</small></div><ChevronRight/></Link>)}</div>{!available.length && <div className="erp-home-empty"><ShieldCheck/><b>Chưa có chức năng được cấp</b><span>Liên hệ quản trị viên để được phân quyền phù hợp.</span></div>}</section>
    <section className="erp-home-help"><Check/><div><b>Phiên làm việc được duy trì tự động</b><span>JWT được làm mới trước khi hết hạn; bạn chỉ cần đăng nhập lại khi refresh token hết hạn hoặc tài khoản bị thay đổi bảo mật.</span></div></section></div>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(value + 'T00:00:00')); }
