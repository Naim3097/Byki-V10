'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

const PUBLIC_ROUTES = ['/login', '/register'];

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

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    } else if (isAuthenticated && isPublicRoute) {
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

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (!isAuthenticated && !isPublicRoute) return null;
  if (isAuthenticated && isPublicRoute) return null;

  return <>{children}</>;
}
