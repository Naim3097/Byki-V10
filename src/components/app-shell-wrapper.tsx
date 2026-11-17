'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './ui';
import { AuthGuard } from './auth-guard';

const AUTH_ROUTES = ['/login', '/register'];

export default function AppShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  // Partner landing pages are public marketing pages: no app nav, no adapter
  // status, and no wait on auth before the content renders.
  if (pathname.startsWith('/partner/')) return <>{children}</>;

  return (
    <AuthGuard>
      {isAuthPage ? children : <AppShell>{children}</AppShell>}
    </AuthGuard>
  );
}
