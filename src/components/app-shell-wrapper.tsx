'use client';

import { AppShell } from './ui';

export default function AppShellWrapper({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
