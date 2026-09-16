'use client';

import { AuthProvider } from '@/features/auth/context/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>;
}
