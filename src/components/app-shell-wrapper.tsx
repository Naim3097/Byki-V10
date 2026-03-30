'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './ui';
import { AuthGuard } from './auth-guard';

const AUTH_ROUTES = ['/login', '/register'];

export default function AppShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  return (
    <AuthGuard>
      {isAuthPage ? children : <AppShell>{children}</AppShell>}
    </AuthGuard>
  );
}
