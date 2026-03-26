'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBluetoothStore } from '../stores/bluetooth-store';

// ── Score / Risk color helpers ──────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 85) return '#00ff88';
  if (score >= 70) return '#fbbf24';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

export function riskColor(tier: string): string {
  switch (tier) {
    case 'Healthy': return 'text-emerald-400';
    case 'Monitor': return 'text-yellow-400';
    case 'Warning': return 'text-orange-400';
    case 'Critical': return 'text-red-400';
    default: return 'text-white/40';
  }
}

export function riskBg(tier: string): string {
  switch (tier) {
    case 'Healthy': return 'bg-emerald-500/10 border-emerald-500/20';
    case 'Monitor': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'Warning': return 'bg-orange-500/10 border-orange-500/20';
    case 'Critical': return 'bg-red-500/10 border-red-500/20';
    default: return 'bg-white/5 border-white/10';
  }
}

export function severityColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'bg-red-500/15 text-red-400 border-red-500/20';
    case 'WARNING': case 'MAJOR': return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
    case 'MODERATE': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
    case 'MINOR': case 'INFO': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    default: return 'bg-white/5 text-white/40 border-white/10';
  }
}

// ── Score Ring (SVG) ────────────────────────────────────────────────

export function ScoreRing({
  score,
  size = 180,
  strokeWidth = 6,
  className = '',
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score));
  const offset = circumference - (filled / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-animate"
          style={{
            '--circumference': `${circumference}`,
            '--offset': `${offset}`,
            filter: `drop-shadow(0 0 6px ${color}40)`,
          } as React.CSSProperties}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tracking-tight animate-count"
          style={{ color }}
        >
          {Math.round(score)}
        </span>
        <span className="text-xs text-white/40 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── Navigation Shell ────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/diag', label: 'Diagnostics', icon: ScanIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bt = useBluetoothStore();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top bar (desktop) ─────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-[var(--accent)]">BYKI</span>
            <span className="text-[10px] font-mono text-white/25 tracking-widest uppercase">v9 web</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'text-[var(--accent)] bg-[var(--accent)]/8'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <item.icon active={active} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ConnectionPill />
      </header>

      {/* ── Main content ──────────────────────────── */}
      <main className="flex-1 animate-fade-up">
        {children}
      </main>

      {/* ── Bottom tab bar (mobile) ───────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-xl border-t border-white/5">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all ${
                active ? 'text-[var(--accent)]' : 'text-white/30'
              }`}
            >
              <item.icon active={active} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* bottom spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}

// ── Connection status pill ──────────────────────────────────────────

function ConnectionPill() {
  const bt = useBluetoothStore();
  if (!bt.isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-xs text-white/30">
        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        No adapter
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
      {bt.connectedAdapter?.deviceName ?? 'Connected'}
    </div>
  );
}

// ── Mini nav icons (16×16) ──────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[var(--accent)]' : 'text-current'}>
      <path d="M2 8.5L8 3l6 5.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function ScanIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[var(--accent)]' : 'text-current'}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

function LiveIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[var(--accent)]' : 'text-current'}>
      <polyline points="1,8 4,4 7,10 10,6 13,9 15,5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function DtcIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'text-[var(--accent)]' : 'text-current'}>
      <path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <line x1="8" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.6" fill="currentColor" />
    </svg>
  );
}

// ── Reusable Button ─────────────────────────────────────────────────

export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled = false, className = '', ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { sm: 'px-4 py-2 text-xs gap-1.5', md: 'px-6 py-2.5 text-sm gap-2', lg: 'px-8 py-3.5 text-base gap-2' };
  const variants = {
    primary: 'bg-[var(--accent)] text-black hover:brightness-110 shadow-[0_0_20px_var(--accent-glow)]',
    secondary: 'glass glass-hover text-white/70 hover:text-white',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
    ghost: 'text-white/40 hover:text-white/70 hover:bg-white/5',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Card surface ────────────────────────────────────────────────────

export function Card({
  children, className = '', hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-4 ${hover ? 'glass-hover cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────

export function Badge({
  children, color = 'default', className = '',
}: {
  children: React.ReactNode;
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'default';
  className?: string;
}) {
  const colors = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    default: 'bg-white/5 text-white/50 border-white/10',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

// ── Progress bar ────────────────────────────────────────────────────

export function ProgressBar({
  value, color, className = '',
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const fill = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 rounded-full bg-white/5 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${fill}%`,
          backgroundColor: color ?? 'var(--accent)',
        }}
      />
    </div>
  );
}
