'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { useLiveDataStore } from '@/stores/live-data-store';
import { PID_SNAPSHOT_KEYS, type PidSnapshot } from '@/models';
import { Card, Button, ProgressBar } from '@/components/ui';

// ── Gauge config ────────────────────────────────────────────────────

const HERO_GAUGES: GaugeDef[] = [
  { key: 'rpm', label: 'RPM', unit: 'rpm', min: 0, max: 8000 },
  { key: 'vehicle_speed', label: 'Speed', unit: 'km/h', min: 0, max: 240 },
];

const GRID_GAUGES: GaugeDef[] = [
  { key: 'coolant_temp', label: 'Coolant', unit: '°C', min: -40, max: 215 },
  { key: 'intake_air_temp', label: 'Intake', unit: '°C', min: -40, max: 215 },
  { key: 'throttle_position', label: 'Throttle', unit: '%', min: 0, max: 100 },
  { key: 'engine_load', label: 'Load', unit: '%', min: 0, max: 100 },
  { key: 'maf_rate', label: 'MAF', unit: 'g/s', min: 0, max: 655 },
  { key: 'timing_advance', label: 'Timing', unit: '°', min: -64, max: 64 },
  { key: 'stft_b1', label: 'STFT B1', unit: '%', min: -100, max: 100 },
  { key: 'ltft_b1', label: 'LTFT B1', unit: '%', min: -100, max: 100 },
  { key: 'fuel_pressure', label: 'Fuel PSI', unit: 'kPa', min: 0, max: 765 },
  { key: 'ecu_voltage', label: 'Voltage', unit: 'V', min: 0, max: 65 },
];

interface GaugeDef {
  key: keyof PidSnapshot;
  label: string;
  unit: string;
  min: number;
  max: number;
}

// ── Arc gauge (SVG) ─────────────────────────────────────────────────

function ArcGauge({ label, value, unit, min, max, size = 140 }: Omit<GaugeDef, 'key'> & { value: number | null | undefined; size?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const hasValue = value != null;
  const r = (size - 16) / 2;
  const arc = Math.PI * 1.5; // 270°
  const circumference = r * arc;
  const offset = circumference - pct * circumference;

  // Color: green in normal range, yellow high, red extreme
  const color = pct < 0.7 ? '#00ff88' : pct < 0.9 ? '#fbbf24' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.75 }}>
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} className="overflow-visible">
          {/* Track */}
          <path
            d={describeArc(size / 2, size * 0.7, r, 225, -45)}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" strokeLinecap="round"
          />
          {/* Filled arc */}
          {hasValue && (
            <path
              d={describeArc(size / 2, size * 0.7, r, 225, -45)}
              fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-200"
              style={{ filter: `drop-shadow(0 0 4px ${color}30)` }}
            />
          )}
        </svg>
        {/* Value text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-2xl font-bold font-mono ${hasValue ? 'text-white' : 'text-white/10'}`}>
            {hasValue ? formatValue(v) : '—'}
          </span>
          <span className="text-[10px] text-white/25">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-white/40 mt-1">{label}</span>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

// ── Compact gauge card ──────────────────────────────────────────────

function CompactGauge({ label, value, unit, min, max }: Omit<GaugeDef, 'key'> & { value: number | null | undefined }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const hasValue = value != null;
  const color = pct < 70 ? 'var(--accent)' : pct < 90 ? '#fbbf24' : '#ef4444';

  return (
    <Card className="flex flex-col gap-2 !p-3">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-white/35">{label}</span>
        <span className="text-[10px] text-white/15 font-mono">{unit}</span>
      </div>
      <span className={`text-xl font-bold font-mono ${hasValue ? 'text-white' : 'text-white/10'}`}>
        {hasValue ? formatValue(v) : '—'}
      </span>
      <ProgressBar value={hasValue ? pct : 0} color={color} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Live Data Page ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function LiveDataPage() {
  const bt = useBluetoothStore();
  const live = useLiveDataStore();

  const isStreaming = live.state === 'streaming' || live.state === 'paused';
  const isPaused = live.state === 'paused';

  useEffect(() => {
    if (!bt.isConnected && isStreaming) {
      live.reset();
    }
  }, [bt.isConnected, isStreaming, live]);

  const latest = live.latestSnapshot;
  const activeKeys = latest
    ? PID_SNAPSHOT_KEYS.filter(k => latest[k as keyof PidSnapshot] != null)
    : [];

  // ── No adapter connected ───────────────────────────────────────
  if (!bt.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <p className="text-sm text-white/30">Connect an adapter to stream live data</p>
        <Link href="/scan">
          <Button variant="secondary">Go to Scan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6 animate-fade-up">

      {/* ── Floating control bar ──────────────── */}
      <div className="flex items-center gap-3 glass rounded-2xl p-3">
        {!isStreaming && (
          <Button onClick={() => live.startStream()} size="sm">
            Start Stream
          </Button>
        )}
        {isStreaming && !isPaused && (
          <Button onClick={() => live.pauseStream()} size="sm" variant="secondary">
            Pause
          </Button>
        )}
        {isStreaming && isPaused && (
          <Button onClick={() => live.resumeStream()} size="sm">
            Resume
          </Button>
        )}
        {isStreaming && (
          <Button onClick={() => live.reset()} size="sm" variant="ghost">
            Stop
          </Button>
        )}

        {/* Stats ribbon */}
        <div className="ml-auto flex items-center gap-4 text-[11px] font-mono text-white/25">
          <span>{live.sampleCount} samples</span>
          <span>{activeKeys.length} PIDs</span>
          {isStreaming && !isPaused && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
              LIVE
            </span>
          )}
          {isPaused && <span className="text-yellow-400">PAUSED</span>}
        </div>
      </div>

      {/* ── Error ─────────────────────────────── */}
      {live.state === 'error' && (
        <Card className="border-red-500/15 text-center">
          <p className="text-sm text-red-400">Stream error — try reconnecting</p>
        </Card>
      )}

      {/* ── Hero gauges (RPM + Speed) ─────────── */}
      <div className="flex justify-center gap-8 sm:gap-16">
        {HERO_GAUGES.map(g => {
          const { key, ...rest } = g;
          return (
            <ArcGauge
              key={key}
              {...rest}
              value={latest?.[key] as number | null | undefined}
              size={170}
            />
          );
        })}
      </div>

      {/* ── Compact gauge grid ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {GRID_GAUGES.map(g => {
          const { key, ...rest } = g;
          return (
            <CompactGauge
              key={key}
              {...rest}
              value={latest?.[key] as number | null | undefined}
            />
          );
        })}
      </div>

      {/* ── All PIDs table ────────────────────── */}
      {activeKeys.length > 0 && (
        <details className="group">
          <summary className="text-xs font-mono text-white/15 cursor-pointer hover:text-white/30 transition-colors">
            All Active PIDs ({activeKeys.length})
          </summary>
          <Card className="mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-[11px] font-mono">
              {activeKeys.map(k => {
                const val = latest![k as keyof PidSnapshot];
                return (
                  <div key={k} className="flex justify-between py-0.5 border-b border-white/3">
                    <span className="text-white/30">{k}</span>
                    <span className="text-white/60">{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </details>
      )}
    </div>
  );
}
