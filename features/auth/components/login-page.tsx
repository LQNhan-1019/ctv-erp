'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/icon';
import { ApiClientError } from '@/lib/api/client';
import { useAuth } from '../context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
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
      <section className="nova-login-story" aria-label="Giới thiệu NOVA ERP">
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
              <div className="nova-field"><Icon name="user" /><input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" required /></div>
            </label>
            <label>
              <span>Mật khẩu</span>
              <div className="nova-field"><Icon name="lock" /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button></div>
            </label>
            <div className="nova-login-options"><span>Phiên đăng nhập được tự động làm mới</span><span>Quên mật khẩu? Liên hệ quản trị viên</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
            <button className="nova-login-submit" type="submit" disabled={submitting || status === 'checking'}>
              <span>{submitting ? 'Đang xác thực…' : 'Đăng nhập hệ thống'}</span><Icon name="arrowRight" />
            </button>
          </form>

          <div className="nova-login-security"><Icon name="shield" /><span>Kết nối được bảo vệ bằng JWT, CSRF và refresh token an toàn.</span></div>
        </div>
        <footer>© 2026 NOVA ERP · Chỉ dành cho người dùng được ủy quyền</footer>
      </section>
    </main>
  );
}
