'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, sessionError, retrySession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  if (status === 'unavailable') {
    return (
      <main className="nova-session-screen nova-session-unavailable" aria-live="polite">
        <p>{sessionError}</p>
        <button className="nova-button primary" onClick={() => void retrySession()}>Thử kết nối lại</button>
      </main>
    );
  }
  if (status !== 'authenticated') {
    return (
      <main className="nova-session-screen" aria-live="polite">
        <span className="nova-session-spinner" />
        <p>Đang xác thực phiên làm việc…</p>
      </main>
    );
  }
  return children;
}
