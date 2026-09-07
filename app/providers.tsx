'use client';

import { AuthProvider } from '@/features/auth/context/auth-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
