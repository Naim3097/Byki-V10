'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

// Routes authenticated users should be bounced off of (login/register).
const AUTH_ONLY_REDIRECTS = ['/login', '/register'];

function safeNext(next: string | null): string {
  // Only allow same-origin relative paths to prevent open-redirect.
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
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

    if (isAuthenticated && AUTH_ONLY_REDIRECTS.includes(pathname)) {
      // Read `next` from window directly to avoid a CSR-bailout on /login.
      const next = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next')
        : null;
      router.replace(safeNext(next));
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

  if (isAuthenticated && AUTH_ONLY_REDIRECTS.includes(pathname)) return null;

  return <>{children}</>;
}
