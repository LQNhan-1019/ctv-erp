'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

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
