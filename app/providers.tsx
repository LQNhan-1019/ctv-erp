'use client';

import { AuthProvider } from '@/features/auth/context/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import AppDialogHost from '@/components/ui/app-dialog-host';
import LegacyDialogA11y from '@/components/ui/legacy-dialog-a11y';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><AuthProvider>{children}<AppDialogHost /><LegacyDialogA11y /></AuthProvider></ThemeProvider>;
}
