'use client';

import { FormEvent, useState } from 'react';
import Icon from '@/components/ui/icon';
import type { CreateAccountInput } from '../types/account';

export default function CreateAccountDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: CreateAccountInput) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    const confirmation = String(data.get('confirmation'));
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        username: String(data.get('username')),
        email: String(data.get('email')),
        password,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo tài khoản');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nova-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="nova-dialog" role="dialog" aria-modal="true" aria-labelledby="create-account-title">
        <header><div><p>TÀI KHOẢN MỚI</p><h2 id="create-account-title">Thêm người dùng</h2><span>Tạo danh tính đăng nhập; phân quyền được thực hiện ở bước tiếp theo.</span></div><button onClick={onClose} aria-label="Đóng"><Icon name="x" /></button></header>
        <form onSubmit={submit}>
          <div className="nova-dialog-body">
            <label><span>Tên đăng nhập</span><div className="nova-field"><Icon name="user" /><input name="username" minLength={3} maxLength={64} placeholder="vd. kinhdoanh.miennam" required /></div></label>
            <label><span>Email công việc</span><div className="nova-field"><Icon name="mail" /><input name="email" type="email" placeholder="nhanvien@congty.vn" required /></div></label>
            <div className="nova-form-grid">
              <label><span>Mật khẩu tạm thời</span><div className="nova-field"><Icon name="lock" /><input name="password" type="password" minLength={12} maxLength={128} placeholder="Tối thiểu 12 ký tự" required /></div></label>
              <label><span>Xác nhận mật khẩu</span><div className="nova-field"><Icon name="check" /><input name="confirmation" type="password" minLength={12} maxLength={128} placeholder="Nhập lại mật khẩu" required /></div></label>
            </div>
            <div className="nova-info-note"><Icon name="shield" /><span>Tài khoản được tạo ở trạng thái hoạt động. Hãy gán role ngay sau khi tạo để người dùng nhìn thấy đúng chức năng.</span></div>
            {error && <div className="nova-form-error" role="alert">{error}</div>}
          </div>
          <footer><button type="button" className="nova-button secondary" onClick={onClose}>Hủy</button><button type="submit" className="nova-button primary" disabled={submitting}><Icon name="plus" />{submitting ? 'Đang tạo…' : 'Tạo tài khoản'}</button></footer>
        </form>
      </section>
    </div>
  );
}
