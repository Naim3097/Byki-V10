'use client';

import Link from 'next/link';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { Card, Button } from '@/components/ui';

const FEATURES = [
  {
    href: '/diag',
    title: 'Health Scan',
    desc: 'Full vehicle diagnostic with health score, system analysis, and actionable insights.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="4" fill="currentColor" fillOpacity="0.4" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      </svg>
    ),
    primary: true,
  },
  {
    href: '/diag',
    title: 'Live Data',
    desc: 'Real-time OBD2 parameter monitoring with visual gauges and trend tracking.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <polyline points="2,14 7,7 12,18 17,10 22,16 26,8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/diag',
    title: 'Trouble Codes',
    desc: 'Read and clear diagnostic trouble codes with severity ratings and descriptions.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4L25 23H3L14 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="14" y1="11" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: '01', title: 'Connect', desc: 'Pair your ELM327 adapter via Bluetooth' },
  { num: '02', title: 'Scan', desc: 'Automated multi-system diagnostic sweep' },
  { num: '03', title: 'Understand', desc: 'Actionable health score and insights' },
];

export default function HomePage() {
  const bt = useBluetoothStore();

  return (
    <div className="relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 pt-12 pb-16 text-center">
        <div className="animate-fade-up">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            <span className="text-[var(--accent)]" style={{ textShadow: '0 0 40px var(--accent-glow)' }}>BYKI</span>
          </h1>
          <p className="text-white/35 text-sm font-mono tracking-widest uppercase mt-2">Vehicle diagnostics — reimagined</p>
        </div>

        {/* Connection quick-status */}
        <div className="mt-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {bt.isConnected ? (
            <Card className="flex items-center gap-3 !px-5 !py-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 status-dot" />
              <span className="text-sm text-emerald-400 font-medium">{bt.connectedAdapter?.deviceName ?? 'Adapter Connected'}</span>
            </Card>
          ) : (
            <Card className="flex items-center gap-3 !px-5 !py-3">
              <span className="w-2 h-2 rounded-full bg-white/15" />
              <span className="text-sm text-white/35">No adapter connected</span>
            </Card>
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <Link href="/diag">
            <Button size="lg" className="text-base">
              Start Diagnostics
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8m0 0L8 4m3 3L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link key={f.title} href={f.href} className="group">
              <Card hover className={`h-full flex flex-col gap-3 animate-fade-up ${f.primary ? 'border-[var(--accent)]/15' : ''}`} >
                <div className={`${f.primary ? 'text-[var(--accent)]' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-white/90">{f.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-xs font-mono text-white/20 tracking-widest uppercase text-center mb-8">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map(s => (
            <div key={s.num} className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl font-bold text-[var(--accent)]/30 font-mono">{s.num}</span>
              <span className="text-sm font-semibold text-white/80">{s.title}</span>
              <span className="text-xs text-white/30">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
