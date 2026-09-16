'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { useAuth } from '../context/auth-context';
import { useTheme } from '@/components/theme-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const { toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') router.replace('/home');
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ username, password });
      router.replace('/home');
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="nova-login-page">
      <button className="nova-login-theme-toggle" type="button" onClick={toggleTheme} title="Chuyển chế độ màu" aria-label="Chuyển chế độ màu"><span className="snow-theme-icon-light"><Moon /></span><span className="snow-theme-icon-dark"><Sun /></span></button>
      <section className="nova-login-story" aria-label="Giới thiệu CTV ERP">
        <div className="nova-login-brand"><span>CTV</span><strong>CTV</strong><small>Distribution ERP</small></div>
        <div className="nova-story-content">
          <p className="nova-eyebrow nova-eyebrow-light">NỀN TẢNG ĐIỀU HÀNH CTV</p>
          <h1>CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ DỊCH VỤ CTV<br /></h1>
         
          <p>Từ kho xăng, đội xe đến công nợ — dữ liệu được bảo vệ và kết nối xuyên suốt ba miền.</p>
          <div className="nova-story-metrics">
            <article><strong>03</strong><span>Miền vận hành</span></article>
            <article><strong>24/7</strong><span>Giám sát hệ thống</span></article>
            <article><strong>01</strong><span>Nguồn dữ liệu chuẩn</span></article>
          </div>
        </div>

      </section>

      <section className="nova-login-panel">
        <div className="nova-login-card">
          <header>
            <p className="nova-eyebrow">CỔNG QUẢN TRỊ NỘI BỘ</p>
            <h2>Chào mừng trở lại.</h2>
            <span>Đăng nhập bằng tài khoản được cấp để tiếp tục.</span>
          </header>

          <form onSubmit={handleSubmit} className="nova-login-form">
            <label>
              <span>Tên đăng nhập</span>
              <div className="nova-field"><UserRound /><input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" required /></div>
            </label>
            <label>
              <span>Mật khẩu</span>
              <div className="nova-field"><LockKeyhole /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </label>
            <div className="nova-login-options"><span>Phiên đăng nhập được tự động làm mới</span><span>Quên mật khẩu? Liên hệ quản trị viên</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
            <button className="nova-login-submit" type="submit" disabled={submitting || status === 'checking'}>
              <span>{submitting ? 'Đang xác thực…' : 'Đăng nhập hệ thống'}</span><ArrowRight />
            </button>
          </form>

          <div className="nova-login-security"><ShieldCheck /><span>Kết nối được bảo vệ bằng JWT, CSRF và refresh token an toàn.</span></div>
        </div>
        <footer>© 2026 CTV ERP · Phát triển độc quyền bởi CTV</footer>
      </section>
    </main>
  );
}
