'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

// Routes unauthenticated visitors are allowed to see.
const PUBLIC_ROUTES = ['/login', '/register', '/demo'];
// Routes authenticated users should be bounced off of (login/register).
const AUTH_ONLY_REDIRECTS = ['/login', '/register'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, initialize } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isPublicPath(pathname)) {
      router.replace('/login');
    } else if (isAuthenticated && AUTH_ONLY_REDIRECTS.includes(pathname)) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-xs text-white/40 font-mono">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath(pathname)) return null;
  if (isAuthenticated && AUTH_ONLY_REDIRECTS.includes(pathname)) return null;

  return <>{children}</>;
}
