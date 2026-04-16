'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { useLiveDataStore } from '@/stores/live-data-store';
import { useScanStore } from '@/stores/scan-store';
import { useDtcStore } from '@/stores/dtc-store';
import type { ScanFeedCard } from '@/stores/scan-store';
import type { PidSnapshot } from '@/models';
import { PID_SNAPSHOT_KEYS } from '@/models';
import type { SystemHealthReport, EvaluatedRule, ComponentRisk, DtcCode, FullAnalysisResult } from '@/models';
import { DtcSource } from '@/models';
import { Button, Card, Badge, scoreColor } from '@/components/ui';

const WHATSAPP_NUMBER = '60111505284';

/* ── Light-theme color helpers (segment-card context) ────────── */

function scoreColorLight(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

function riskColorLight(tier: string): string {
  switch (tier) {
    case 'Healthy': return 'text-emerald-600';
    case 'Monitor': return 'text-yellow-600';
    case 'Warning': return 'text-orange-500';
    case 'Critical': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

function severityColorLight(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'bg-red-50 text-red-600 border-red-200';
    case 'WARNING': case 'MAJOR': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'MODERATE': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    case 'MINOR': case 'INFO': return 'bg-blue-50 text-blue-600 border-blue-200';
    default: return 'bg-gray-50 text-gray-400 border-gray-200';
  }
}

function LightScoreRing({ score, size = 180, strokeWidth = 6, className = '' }: { score: number; size?: number; strokeWidth?: number; className?: string }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score));
  const offset = circumference - (filled / 100) * circumference;
  const color = scoreColorLight(score);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ '--circumference': `${circumference}`, '--offset': `${offset}`, filter: `drop-shadow(0 0 6px ${color}40)` } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BYKI — Unified Diagnostics
// Flow: Connect → Live Data → Health Scan → DTC
// ═══════════════════════════════════════════════════════════════════

/* ── Gauge definitions ─────────────────────────────────────────── */

interface GaugeDef {
  key: keyof PidSnapshot;
  label: string;
  unit: string;
  min: number;
  max: number;
}

const HERO_GAUGES: GaugeDef[] = [
  { key: 'rpm', label: 'RPM', unit: 'rpm', min: 0, max: 8000 },
  { key: 'vehicle_speed', label: 'Speed', unit: 'km/h', min: 0, max: 240 },
];

const COMPACT_GAUGES: GaugeDef[] = [
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

const SYSTEMS = [
  { key: 'engine', tag: 'ENG', name: 'Engine' },
  { key: 'fuel', tag: 'FUEL', name: 'Fuel' },
  { key: 'emission', tag: 'EMI', name: 'Emission' },
  { key: 'electrical', tag: 'ELEC', name: 'Electrical' },
  { key: 'thermal', tag: 'THM', name: 'Thermal' },
  { key: 'air_intake', tag: 'AIR', name: 'Intake' },
];

/* ── SVG Arc helpers ───────────────────────────────────────────── */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/* ── ArcGauge (hero — large circular gauge) ────────────────────── */

function ArcGauge({ label, value, unit, min, max, size = 200 }: Omit<GaugeDef, 'key'> & { value: number | null | undefined; size?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const hasValue = value != null;

  const strokeW = 10;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Full-circle arc (270°) from bottom-left to bottom-right
  const startAngle = 135;      // 7 o'clock
  const endAngle = 405;        // 5 o'clock (135 + 270)
  const arcSweep = 270;
  const circumference = (arcSweep / 360) * 2 * Math.PI * r;
  const offset = circumference - pct * circumference;

  // Gradient ID unique per instance
  const gradId = `gauge-grad-${label.replace(/\s/g, '')}`;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full aspect-square" style={{ maxWidth: size }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible" style={{ transform: `rotate(${startAngle + 90}deg)` }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeW}
            strokeDasharray={circumference} strokeDashoffset={0}
            strokeLinecap="round"
            style={{ strokeDasharray: `${circumference} ${2 * Math.PI * r - circumference}` }} />
          {/* Active arc with gradient */}
          {hasValue && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${2 * Math.PI * r}`}
              strokeDashoffset={offset}
              className="transition-all duration-500"
              style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,136,0.3))' }} />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[2]">
          <span className={`text-3xl sm:text-5xl font-bold tabular-nums tracking-tight ${hasValue ? 'text-gray-900' : 'text-gray-300'} transition-colors`}>
            {hasValue ? formatValue(v) : '—'}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">{unit}</span>
          <span className="text-xs text-gray-500 font-bold tracking-widest uppercase mt-0.5">{label}</span>
        </div>
      </div>
    </div>
  );
}

/* ── MiniGauge (compact grid) ──────────────────────────────────── */

function MiniGauge({ label, value, unit, min, max }: Omit<GaugeDef, 'key'> & { value: number | null | undefined }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const hasValue = value != null;
  const color = pct < 70 ? '#10b981' : pct < 90 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 hover:border-gray-300 transition-all">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] text-gray-500 font-medium tracking-wide">{label}</span>
        <span className="text-[10px] text-gray-400">{unit}</span>
      </div>
      <span className={`block text-lg font-bold tabular-nums leading-none ${hasValue ? 'text-gray-900' : 'text-gray-300'} transition-colors`}>
        {hasValue ? formatValue(v) : '—'}
      </span>
      <div className="mt-2 h-[3px] rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${hasValue ? pct : 0}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── Scan Feed Line ────────────────────────────────────────────── */

function FeedLine({ card }: { card: ScanFeedCard }) {
  switch (card.type) {
    case 'phase':
      return (
        <div className="flex items-center gap-2.5 py-1">
          <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-mono font-semibold text-emerald-600">{card.title}</span>
          {card.subtitle && <span className="text-xs text-gray-400">{card.subtitle}</span>}
        </div>
      );
    case 'pulse':
      return (
        <div className="flex items-center gap-2 py-0.5 pl-3.5">
          <span className="text-xs font-mono text-gray-400">{card.title}</span>
        </div>
      );
    case 'systemScore': {
      const sys = card.systemReport;
      if (!sys) return null;
      return (
        <div className="flex items-center justify-between pl-3.5 py-0.5">
          <span className="text-xs text-gray-500">{sys.consumerName}</span>
          <span className="text-xs font-bold font-mono tabular-nums" style={{ color: scoreColorLight(sys.score) }}>{Math.round(sys.score)}</span>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ── System pill (during scan) ─────────────────────────────────── */

function SystemTag({ name, score, done }: { name: string; score?: number; done: boolean }) {
  const tier = score != null ? (score >= 85 ? 'Healthy' : score >= 70 ? 'Monitor' : score >= 50 ? 'Warning' : 'Critical') : null;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-500 ${
      done && tier
        ? `border ${tier === 'Healthy' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : tier === 'Monitor' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : tier === 'Warning' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-red-50 border-red-200 text-red-700'}`
        : 'bg-gray-50 border border-gray-200 text-gray-400'
    }`}>
      <span>{name}</span>
      {done && score != null && (
        <span className="font-bold font-mono tabular-nums" style={{ color: scoreColorLight(score) }}>{Math.round(score)}</span>
      )}
    </div>
  );
}

/* ── Mini Score Ring ───────────────────────────────────────────── */

function MiniScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = scoreColorLight(score);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 4px ${color}30)` }} />
      </svg>
      <span className="absolute text-xs font-bold font-mono tabular-nums" style={{ color }}>{Math.round(score)}</span>
    </div>
  );
}

/* ── System Detail Panel (expandable) ──────────────────────────── */

function SystemDetailPanel({ sys }: { sys: SystemHealthReport }) {
  const [open, setOpen] = useState(false);
  const color = scoreColorLight(sys.score);
  const hasIssues = sys.evaluatedRules.length > 0;
  const riskBorder = sys.riskTier === 'Critical' ? 'border-red-200' : sys.riskTier === 'Warning' ? 'border-orange-200' : sys.riskTier === 'Monitor' ? 'border-yellow-200' : 'border-gray-200';

  return (
    <div className={`rounded-2xl border bg-gray-50 overflow-hidden transition-all ${riskBorder}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-100 transition-colors text-left">
        <MiniScoreRing score={sys.score} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{sys.consumerName}</span>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${riskColorLight(sys.riskTier)}`}>{sys.riskTier}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sys.findings[0] ?? 'System operating normally'}</p>
        </div>
        <div className="flex items-center gap-2">
          {sys.dataCoverage < 1 && <span className="text-[9px] font-mono text-gray-300 tabular-nums">{Math.round(sys.dataCoverage * 100)}%</span>}
          <svg width="10" height="10" viewBox="0 0 10 10" className={`text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <polyline points="2,3.5 5,6.5 8,3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-200 pt-3 animate-fade-up" style={{ animationDuration: '0.2s' }}>
          {/* Score bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Health Score</span>
              <span className="text-sm font-bold font-mono tabular-nums" style={{ color }}>{Math.round(sys.score)} / 100</span>
            </div>
            <div className="h-[3px] rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sys.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
          </div>

          {/* Findings */}
          {sys.findings.length > 0 && sys.findings[0] !== 'System operating normally' && sys.findings[0] !== 'Insufficient sensor data for this system' && (
            <div>
              <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Findings</h4>
              <div className="space-y-1.5">
                {sys.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600 leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluated rules */}
          {sys.evaluatedRules.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                Analysis Rules <span className="text-gray-300">({sys.evaluatedRules.length})</span>
              </h4>
              <div className="space-y-2">
                {sys.evaluatedRules.map((rule, i) => <RuleCard key={i} rule={rule} />)}
              </div>
            </div>
          )}

          {/* Component risks */}
          {sys.componentRisks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Component Risks</h4>
              <div className="space-y-2">
                {sys.componentRisks.sort((a, b) => b.probability - a.probability).map((cr, i) => (
                  <ComponentRiskBar key={i} risk={cr} />
                ))}
              </div>
            </div>
          )}

          {!hasIssues && (
            <p className="text-xs text-emerald-600 py-1">All parameters within normal range</p>
          )}
        </div>
      )}
    </div>
  );
}

function RuleCard({ rule }: { rule: EvaluatedRule }) {
  const pct = Math.round(rule.strength * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f97316' : '#fbbf24';
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700">{rule.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{rule.consumerMessage}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>{pct}%</span>
          <div className="w-10 h-[3px] rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
      {rule.possibleDtcs.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-gray-300 uppercase font-mono">DTCs:</span>
          {rule.possibleDtcs.map(dtc => (
            <span key={dtc} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{dtc}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentRiskBar({ risk }: { risk: ComponentRisk }) {
  const pct = Math.round(risk.probability * 100);
  const color = pct >= 60 ? '#ef4444' : pct >= 30 ? '#f97316' : '#fbbf24';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0">{risk.component}</span>
      <div className="flex-1 h-[3px] rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-mono font-bold tabular-nums w-7 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ── DTC Card ──────────────────────────────────────────────────── */

function DtcCard({ dtc }: { dtc: DtcCode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-gray-100 transition-colors">
        <div className={`w-[3px] self-stretch rounded-full -my-3.5 -ml-3.5 mr-0.5 ${
          dtc.severity === 'CRITICAL' ? 'bg-red-500' : dtc.severity === 'MAJOR' ? 'bg-orange-500' :
          dtc.severity === 'MODERATE' ? 'bg-yellow-500' : dtc.severity === 'MINOR' ? 'bg-blue-500' : 'bg-gray-200'
        }`} />
        <span className="text-sm font-mono font-bold text-emerald-600">{dtc.code}</span>
        <span className="flex-1 text-xs text-gray-500 truncate">{dtc.description || 'Unknown code'}</span>
        {dtc.severity && <Badge className={severityColorLight(dtc.severity)}>{dtc.severity}</Badge>}
        {dtc.source === DtcSource.PERMANENT && <Badge color="red">PERM</Badge>}
        <svg width="12" height="12" viewBox="0 0 12 12" className={`text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="2.5,4.5 6,7.5 9.5,4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-gray-200 pt-3 animate-fade-up" style={{ animationDuration: '0.15s' }}>
          {dtc.system && <p className="text-xs"><span className="text-gray-400">System</span> <span className="text-gray-600 ml-2">{dtc.system}</span></p>}
          {dtc.possibleCauses && dtc.possibleCauses.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Possible causes</p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5 leading-relaxed">
                {dtc.possibleCauses.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {dtc.consumerAdvice && <p className="text-xs"><span className="text-gray-400">Advice</span> <span className="text-gray-600 ml-2">{dtc.consumerAdvice}</span></p>}
          {dtc.estimatedCost && <p className="text-xs"><span className="text-gray-400">Est. cost</span> <span className="text-gray-600 ml-2">{dtc.estimatedCost}</span></p>}
        </div>
      )}
    </div>
  );
}

function DtcGroup({ label, color, count, children }: { label: string; color: string; count: number; children: React.ReactNode }) {
  const dots: Record<string, string> = { red: 'bg-red-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400' };
  return (
    <div>
      <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dots[color] ?? 'bg-gray-300'}`} />
        {label} ({count})
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ── All PIDs Panel (prominent toggle) ─────────────────────────── */

function AllPidsPanel({ activeKeys, latest }: { activeKeys: string[]; latest: PidSnapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          View All {activeKeys.length} PIDs
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3.5 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] font-mono pt-3">
            {activeKeys.map(k => {
              const val = latest[k as keyof PidSnapshot];
              return (
                <div key={k} className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-gray-600 tabular-nums">{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scroll reveal hook ─────────────────────────────────────────── */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ── Section Card (elevated card wrapper matching design) ──────── */

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06] p-6 sm:p-8 ${visible ? 'scroll-reveal' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Section Navigation (sticky scroll-spy) ────────────────────── */

function SectionNav({
  activeSection,
  onNavigate,
  isStreaming,
  scanScore,
  dtcCount,
}: {
  activeSection: string;
  onNavigate: (id: string) => void;
  isStreaming: boolean;
  scanScore: number | null;
  dtcCount: number;
}) {
  const items = [
    {
      id: 'live',
      label: 'Live Data',
      badge: isStreaming ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" /> : null,
    },
    {
      id: 'scan',
      label: 'Health Scan',
      badge: scanScore != null ? (
        <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: scoreColor(scanScore) }}>{Math.round(scanScore)}</span>
      ) : null,
    },
    {
      id: 'dtc',
      label: 'Fault Codes',
      badge: dtcCount > 0 ? (
        <span className="min-w-[18px] h-[18px] rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold flex items-center justify-center px-1">{dtcCount}</span>
      ) : null,
    },
  ];

  return (
    <div className="sticky top-0 md:top-[53px] z-40 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-center py-2.5">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                activeSection === item.id
                  ? 'text-black bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {item.label}
              {item.badge}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Flow Guide (contextual section divider) ───────────────────── */

function SectionDivider({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="py-8">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <span className="text-[11px] font-mono text-white/20 tracking-wider uppercase select-none">{text}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── WHATSAPP REPORT BUILDER ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function buildWhatsAppReport(
  scanResult: FullAnalysisResult | null,
  dtcs: { stored: DtcCode[]; pending: DtcCode[]; permanent: DtcCode[] },
): string {
  const lines: string[] = [];
  const now = new Date();

  lines.push('🔧 *BYKI Vehicle Health Report*');
  lines.push(`📅 ${now.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');

  if (scanResult) {
    lines.push(`🏥 *Overall Health: ${Math.round(scanResult.overallScore)}/100 (${scanResult.overallRiskTier})*`);
    lines.push('');

    // System summary
    lines.push('📊 *Systems:*');
    for (const sys of scanResult.systems.sort((a, b) => a.score - b.score)) {
      const emoji = sys.score >= 85 ? '✅' : sys.score >= 70 ? '⚠️' : sys.score >= 50 ? '🟠' : '🔴';
      lines.push(`${emoji} ${sys.consumerName}: ${Math.round(sys.score)}/100 (${sys.riskTier})`);
      if (sys.findings.length > 0 && sys.findings[0] !== 'System operating normally' && sys.findings[0] !== 'Insufficient sensor data for this system') {
        for (const f of sys.findings.slice(0, 2)) {
          lines.push(`   → ${f}`);
        }
      }
    }
    lines.push('');

    // Diagnostics
    if (scanResult.diagnosticMatches.length > 0) {
      lines.push('⚙️ *Issues Detected:*');
      for (const d of scanResult.diagnosticMatches.slice(0, 5)) {
        lines.push(`• [${d.severity}] ${d.description}`);
        if (d.recommendation) lines.push(`  💡 ${d.recommendation}`);
      }
      lines.push('');
    }
  }

  // DTCs
  const allDtcs = [...dtcs.stored, ...dtcs.pending, ...dtcs.permanent];
  if (allDtcs.length > 0) {
    lines.push('🚨 *Fault Codes:*');
    for (const dtc of allDtcs.slice(0, 8)) {
      lines.push(`• ${dtc.code} — ${dtc.description || 'Unknown'} (${dtc.source})`);
    }
    if (allDtcs.length > 8) lines.push(`  ...and ${allDtcs.length - 8} more`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Hi, I just ran a BYKI scan on my vehicle. Could you help me understand the results and book a check-up? 🙏');

  return lines.join('\n');
}

function openWhatsApp(message: string) {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

/* ── WhatsApp CTA Card ─────────────────────────────────────────── */

function WhatsAppBookingCTA({
  scanResult,
  dtcs,
  variant = 'full',
}: {
  scanResult: FullAnalysisResult | null;
  dtcs: { stored: DtcCode[]; pending: DtcCode[]; permanent: DtcCode[] };
  variant?: 'full' | 'compact' | 'inline';
}) {
  const hasIssues = (scanResult && (scanResult.overallScore < 85 || scanResult.diagnosticMatches.length > 0))
    || dtcs.stored.length > 0 || dtcs.pending.length > 0 || dtcs.permanent.length > 0;

  const handleClick = useCallback(() => {
    const msg = buildWhatsAppReport(scanResult, dtcs);
    openWhatsApp(msg);
  }, [scanResult, dtcs]);

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/15 transition-all active:scale-[0.97]"
      >
        <WhatsAppIcon size={16} />
        Send Report via WhatsApp
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-[#25D366]/20 bg-[#25D366]/[0.05] p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {hasIssues ? 'Need help with these results?' : 'Want a professional opinion?'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {hasIssues ? 'Send your report to our team — we\'ll advise you' : 'Share your clean scan for peace of mind'}
          </p>
        </div>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.97] flex-shrink-0 shadow-[0_0_15px_rgba(37,211,102,0.2)]"
        >
          <WhatsAppIcon size={18} className="text-white" />
          <span className="hidden sm:inline">WhatsApp Us</span>
          <span className="sm:hidden">Chat</span>
        </button>
      </div>
    );
  }

  // Full variant — end of flow
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#25D366]/20 bg-gradient-to-br from-[#25D366]/[0.06] to-transparent p-6 sm:p-8 text-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-10 blur-[80px] pointer-events-none bg-[#25D366]" />
      <div className="relative space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center">
            <WhatsAppIcon size={28} />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {hasIssues ? 'Let us help you fix this' : 'Everything looks good!'}
          </h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
            {hasIssues
              ? 'Your scan found some things that need attention. Tap below to send your full report to our team — we\'ll review it and guide you on next steps.'
              : 'Your vehicle is in good shape. Want a professional to confirm? Send your scan report and we\'ll give you a quick review.'}
          </p>
        </div>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#25D366] text-white text-base font-semibold hover:brightness-110 transition-all active:scale-[0.97] shadow-[0_0_25px_rgba(37,211,102,0.25)]"
        >
          <WhatsAppIcon size={20} className="text-white" />
          Send Report &amp; Book Service
        </button>
        <p className="text-xs text-gray-400">Your scan data is included automatically · Free consultation</p>
      </div>
    </div>
  );
}

function WhatsAppIcon({ size = 20, className = 'text-[#25D366]' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── MAIN PAGE COMPONENT ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function DiagPage() {
  const bt = useBluetoothStore();
  const live = useLiveDataStore();
  const scan = useScanStore();
  const dtcStore = useDtcStore();

  const feedEndRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('live');
  const [confirmClear, setConfirmClear] = useState(false);
  const [dtcSearch, setDtcSearch] = useState('');

  // ── Derived state ─────────────────────────────────────────────
  const isStreaming = live.state === 'streaming' || live.state === 'paused';
  const isPaused = live.state === 'paused';
  const isScanning = ['startingAgent', 'discoveringPids', 'scanning', 'analyzing'].includes(scan.state);
  const isScanComplete = scan.state === 'complete';
  const latest = live.latestSnapshot;

  // ── Intersection observer for section nav ─────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    const ids = ['live', 'scan', 'dtc'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [bt.isConnected]);

  // ── Scroll navigation ────────────────────────────────────────
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Auto-scroll scan feed (within container, not page) ─────
  useEffect(() => {
    const el = feedEndRef.current;
    if (el) {
      const container = el.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [scan.feedCards.length]);

  // ── Reset live data if disconnected ──────────────────────────
  useEffect(() => {
    if (!bt.isConnected && isStreaming) live.reset();
  }, [bt.isConnected, isStreaming, live]);

  // ── Auto-scroll to results when scan completes ───────────────
  useEffect(() => {
    if (scan.state === 'complete') {
      const t = setTimeout(() => scrollTo('scan'), 400);
      return () => clearTimeout(t);
    }
  }, [scan.state, scrollTo]);

  // ── Memoized computations ────────────────────────────────────
  const systemScores = useMemo(() => {
    const scores: Record<string, { name: string; score: number }> = {};
    for (const fc of scan.feedCards) {
      if (fc.type === 'systemScore' && fc.systemReport) {
        scores[fc.systemReport.system] = {
          name: fc.systemReport.consumerName,
          score: fc.systemReport.score,
        };
      }
    }
    return scores;
  }, [scan.feedCards]);

  const activeKeys = useMemo(() => {
    return latest ? PID_SNAPSHOT_KEYS.filter(k => latest[k as keyof PidSnapshot] != null) : [];
  }, [latest]);

  const filteredDtcs = useMemo(() => {
    const match = (dtc: DtcCode) => {
      if (!dtcSearch) return true;
      const q = dtcSearch.toLowerCase();
      return dtc.code.toLowerCase().includes(q) || (dtc.description ?? '').toLowerCase().includes(q);
    };
    return {
      stored: dtcStore.storedDtcs.filter(match),
      pending: dtcStore.pendingDtcs.filter(match),
      permanent: dtcStore.permanentDtcs.filter(match),
    };
  }, [dtcStore.storedDtcs, dtcStore.pendingDtcs, dtcStore.permanentDtcs, dtcSearch]);

  // ── Contextual flow guide text ───────────────────────────────
  const liveToScanGuide = useMemo(() => {
    if (isScanning) return 'Scan in progress…';
    if (live.state === 'streaming') return 'Data flowing — ready to analyze';
    if (isScanComplete) return '';
    return 'Start monitoring, then run a diagnostic scan';
  }, [live.state, isScanning, isScanComplete]);

  const scanToDtcGuide = useMemo(() => {
    if (isScanComplete && scan.result) {
      const issues = scan.result.systems.reduce((n, s) => n + s.evaluatedRules.length, 0);
      if (issues > 0) return `${issues} issue${issues > 1 ? 's' : ''} detected — check fault codes`;
      return 'Systems healthy — verify with a fault code scan';
    }
    return 'Read and clear diagnostic trouble codes';
  }, [isScanComplete, scan.result]);

  // ── WhatsApp report data ─────────────────────────────────────
  const dtcsForReport = useMemo(() => ({
    stored: dtcStore.storedDtcs,
    pending: dtcStore.pendingDtcs,
    permanent: dtcStore.permanentDtcs,
  }), [dtcStore.storedDtcs, dtcStore.pendingDtcs, dtcStore.permanentDtcs]);

  const showEndOfFlowCTA = isScanComplete || dtcStore.state === 'complete';

  // ── Handlers ─────────────────────────────────────────────────
  const handleStartScan = useCallback(() => {
    // Auto-pause live data so scan can use the OBD connection
    if (live.state === 'streaming') live.pauseStream();
    scan.startHealthScan();
  }, [live, scan]);

  // ═════════════════════════════════════════════════════════════
  // CONNECT SCREEN
  // ═════════════════════════════════════════════════════════════

  if (!bt.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="animate-fade-up max-w-sm w-full space-y-8">
          {/* OBD2 Adapter Hero Image */}
          <div className="w-full flex justify-center">
            <Image
              src="/obdii-connect.png"
              alt="OBD2 Bluetooth Adapter"
              width={800}
              height={600}
              priority
              className="w-full max-w-[320px] md:max-w-[400px] h-auto object-contain"
            />
          </div>

          <div>
            <p className="text-[11px] font-mono text-[var(--fg-dim)] tracking-widest uppercase mb-3">Diagnostics</p>
            <h2 className="text-2xl font-bold tracking-tight">Connect Your Adapter</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-3 leading-relaxed">
              Plug the ELM327 adapter into your car&apos;s OBD2 port (usually under the dashboard, near the steering column), then tap below to pair.
            </p>
          </div>

          {bt.errorMessage && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 text-sm text-red-400 text-left">
              {bt.errorMessage}
            </div>
          )}

          <Button onClick={() => bt.connect()} disabled={bt.state === 'connecting'} className="w-full" size="lg">
            {bt.state === 'connecting' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Connecting…
              </span>
            ) : (
              'Select Adapter'
            )}
          </Button>

          <div className="space-y-2">
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Your browser will show a device picker — select your ELM327 adapter
            </p>
            <p className="text-xs text-[var(--fg-dim)] leading-relaxed">
              Don&apos;t have an adapter? You can get one online for around $15
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // CONNECTED — Unified Flow
  // ═════════════════════════════════════════════════════════════

  return (
    <>
      <SectionNav
        activeSection={activeSection}
        onNavigate={scrollTo}
        isStreaming={live.state === 'streaming'}
        scanScore={isScanComplete && scan.result ? scan.result.overallScore : null}
        dtcCount={dtcStore.totalCount}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-8 flex flex-col gap-6">

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: LIVE DATA
            ═══════════════════════════════════════════════════════ */}
        <section id="live" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">

          {/* Idle — not streaming, not scanning */}
          {live.state === 'idle' && !isScanning && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">1</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Live Monitoring</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Watch your engine&apos;s vital signs in real-time — RPM, temperature, speed, and more
              </p>
              <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-[4/3] mt-6 rounded-2xl overflow-hidden">
                <Image src="/brand/live-data.jpg" alt="Vehicle diagnostics" fill className="object-contain" sizes="(max-width: 640px) 300px, 340px" priority />
              </div>
              <Button onClick={() => live.startStream()} size="lg" className="rounded-2xl !px-10 mt-6">
                Start Stream
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">updates every second · visual gauges</p>
            </div>
          )}

          {/* Starting */}
          {live.state === 'starting' && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Initializing stream…</p>
            </div>
          )}

          {/* Error */}
          {live.state === 'error' && (
            <Card className="border-red-200 text-center animate-fade-up">
              <p className="text-xs text-red-400 mb-3">Stream error — try reconnecting</p>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => live.startStream()}>Retry</Button>
                <Button size="sm" variant="ghost" onClick={() => live.reset()}>Dismiss</Button>
              </div>
            </Card>
          )}

          {/* Paused during scan */}
          {live.state === 'paused' && isScanning && (
            <div className="text-center py-10 animate-fade-up">
              <p className="text-xs text-gray-400 font-mono">Live data paused during scan</p>
            </div>
          )}

          {/* Active: streaming or paused (not during scan) */}
          {(live.state === 'streaming' || (live.state === 'paused' && !isScanning)) && (
            <div className="space-y-5 animate-fade-up">
              {/* Controls bar */}
              <div className="flex items-center">
                {/* Pause / Stop toggle pill */}
                <div className="relative flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200">
                  {/* Sliding indicator */}
                  <div
                    className="absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-full bg-gray-900 transition-all duration-300 ease-in-out"
                    style={{ left: live.state === 'streaming' ? '2px' : 'calc(50%)' }}
                  />
                  <button
                    onClick={() => live.state === 'streaming' ? live.pauseStream() : live.resumeStream()}
                    className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-300 ${
                      live.state === 'streaming' ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => live.reset()}
                    className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-300 ${
                      live.state === 'paused' ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    Stop
                  </button>
                </div>

                {/* Status info */}
                <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
                  {live.sampleCount > 0 && <span className="tabular-nums">{live.sampleCount} samples</span>}
                  {activeKeys.length > 0 && <span>{activeKeys.length} PIDs</span>}
                  {live.state === 'streaming' && (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot" />
                      LIVE
                    </span>
                  )}
                  {live.state === 'paused' && <span className="text-yellow-600">PAUSED</span>}
                </div>
              </div>

              {/* Hero gauges: RPM + Speed — larger circular */}
              <div className="flex justify-center items-center gap-1 sm:gap-10 py-2 max-w-full">
                {HERO_GAUGES.map(g => (
                  <ArcGauge key={g.key} label={g.label} value={latest?.[g.key] as number | null | undefined} unit={g.unit} min={g.min} max={g.max} size={180} />
                ))}
              </div>

              {/* Compact gauge grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COMPACT_GAUGES.map(g => (
                  <MiniGauge key={g.key} label={g.label} value={latest?.[g.key] as number | null | undefined} unit={g.unit} min={g.min} max={g.max} />
                ))}
              </div>

              {/* All PIDs — visible card toggle */}
              {activeKeys.length > 0 && (
                <AllPidsPanel activeKeys={activeKeys} latest={latest!} />
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: HEALTH SCAN
            ═══════════════════════════════════════════════════════ */}
        <section id="scan" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">
          {scan.state !== 'idle' && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Health Scan</h2>
              {isScanComplete && (
                <button onClick={() => scan.reset()} className="text-xs font-mono text-gray-400 hover:text-gray-600 transition-colors">
                  New Scan
                </button>
              )}
            </div>
          )}

          {/* Idle */}
          {scan.state === 'idle' && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">2</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Health Scan</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Run a full check-up across 6 systems — engine, fuel, emissions, and more
              </p>
              <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-[4/3] mt-6 rounded-2xl overflow-hidden">
                <Image src="/brand/health-scan.jpg" alt="Vehicle health scan" fill className="object-contain" sizes="(max-width: 640px) 300px, 340px" />
              </div>
              <Button onClick={handleStartScan} size="lg" className="rounded-2xl !px-10 mt-6">
                Scan Vehicle
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">10 cycles · 6 systems · ~30 seconds</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {SYSTEMS.map(s => (
                  <span key={s.key} className="text-[11px] font-mono text-gray-400 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                    {s.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scanning */}
          {isScanning && (
            <div className="space-y-4 animate-fade-up">
              {/* Progress header */}
              <div className="flex items-center gap-4">
                <MiniScoreRing score={scan.progress * 100} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{scan.progressMessage}</p>
                  {scan.progressDetail && <p className="text-xs text-gray-400 mt-0.5 truncate">{scan.progressDetail}</p>}
                  <div className="h-1 rounded-full bg-gray-200 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${scan.progress * 100}%`, boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  </div>
                </div>
              </div>

              {/* System pills */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {SYSTEMS.map(s => {
                  const found = systemScores[s.key];
                  return <SystemTag key={s.key} name={s.name} score={found?.score} done={!!found} />;
                })}
              </div>

              {/* Feed log */}
              {scan.feedCards.length > 0 && (
                <div className="glass rounded-xl p-2.5 max-h-32 overflow-y-auto border border-gray-200">
                  <div className="text-[11px] font-mono text-gray-300 uppercase tracking-wider mb-1.5">Scan Feed</div>
                  {scan.feedCards.slice(-8).map((card, i) => <FeedLine key={i} card={card} />)}
                  <div ref={feedEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {scan.state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-10 animate-fade-up">
              <p className="text-lg font-bold text-red-400">Scan Failed</p>
              <p className="text-sm text-gray-400 text-center max-w-xs">{scan.errorMessage}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => scan.reset()} size="sm">Retry</Button>
                <Button variant="ghost" onClick={() => { bt.disconnect(); scan.reset(); }} size="sm">Disconnect</Button>
              </div>
            </div>
          )}

          {/* Results */}
          {isScanComplete && scan.result && (
            <div className="space-y-5 animate-fade-up">
              {/* Hero score */}
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ backgroundColor: scoreColorLight(scan.result.overallScore) }} />
                <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
                  <LightScoreRing score={scan.result.overallScore} size={140} strokeWidth={5} />
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Vehicle Health</h3>
                    <p className={`text-sm font-bold mt-1.5 ${riskColorLight(scan.result.overallRiskTier)}`}>{scan.result.overallRiskTier}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs font-mono text-gray-400 tabular-nums">
                      <span>{scan.result.supportedPidCount} PIDs</span>
                      <span>{scan.result.scanCycles} cycles</span>
                      <span>{(scan.result.scanDurationMs / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(() => {
                        const r = scan.result!;
                        const healthy = r.systems.filter(s => s.riskTier === 'Healthy').length;
                        const issues = r.systems.reduce((n, s) => n + s.evaluatedRules.length, 0);
                        return (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              {healthy}/{r.systems.length} healthy
                            </span>
                            {issues > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                                {issues} rules triggered
                              </span>
                            )}
                            {r.diagnosticMatches.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                                {r.diagnosticMatches.length} diagnostics
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* System analysis */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">System Analysis</h3>
                  <span className="text-[11px] font-mono text-gray-300">{scan.result.systems.length} systems</span>
                </div>
                <div className="space-y-2">
                  {scan.result.systems.sort((a, b) => a.score - b.score).map(sys => (
                    <SystemDetailPanel key={sys.system} sys={sys} />
                  ))}
                </div>
              </div>

              {/* Diagnostics */}
              {scan.result.diagnosticMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Diagnostics</h3>
                    <Badge color="red">{scan.result.diagnosticMatches.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {scan.result.diagnosticMatches.sort((a, b) => b.repairPriority - a.repairPriority).map((d, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={severityColorLight(d.severity)}>{d.severity}</Badge>
                          <span className="text-xs text-gray-400">{d.category}</span>
                          {d.confidence < 1 && <span className="text-[11px] font-mono text-gray-300 ml-auto tabular-nums">{Math.round(d.confidence * 100)}%</span>}
                        </div>
                        <p className="text-sm text-gray-700">{d.description}</p>
                        {d.recommendation && <p className="text-xs text-gray-400 leading-relaxed">{d.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlations */}
              {scan.result.correlationResults && scan.result.correlationResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Correlations</h3>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {scan.result.correlationResults.map((c, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">{c.name}</span>
                          <span className={`text-[11px] font-mono font-bold ${c.status === 'normal' ? 'text-emerald-600' : 'text-yellow-600'}`}>{c.status}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{c.consumerMessage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scan log */}
              {scan.feedCards.length > 0 && (
                <details className="group">
                  <summary className="text-[11px] font-mono text-gray-300 cursor-pointer hover:text-gray-500 transition-colors select-none">
                    Scan Log ({scan.feedCards.length})
                  </summary>
                  <div className="mt-1.5 glass rounded-xl p-2.5 max-h-40 overflow-y-auto border border-gray-200">
                    {scan.feedCards.map((card, i) => <FeedLine key={i} card={card} />)}
                  </div>
                </details>
              )}

              {/* WhatsApp CTA — after scan results */}
              <WhatsAppBookingCTA scanResult={scan.result} dtcs={dtcsForReport} variant="compact" />
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: FAULT CODES
            ═══════════════════════════════════════════════════════ */}
        <section id="dtc" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">
          {!(dtcStore.state === 'idle' && dtcStore.totalCount === 0) && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Fault Codes</h2>
              {dtcStore.totalCount > 0 && (
                <div className="flex items-center gap-1.5">
                  {dtcStore.storedDtcs.length > 0 && <Badge color="red">{dtcStore.storedDtcs.length} stored</Badge>}
                  {dtcStore.pendingDtcs.length > 0 && <Badge color="yellow">{dtcStore.pendingDtcs.length} pending</Badge>}
                  {dtcStore.permanentDtcs.length > 0 && <Badge color="orange">{dtcStore.permanentDtcs.length} perm</Badge>}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {dtcStore.errorMessage && (
            <Card className="border-red-200 mb-3">
              <p className="text-xs text-red-400">{dtcStore.errorMessage}</p>
            </Card>
          )}

          {/* Idle — haven't scanned yet */}
          {dtcStore.state === 'idle' && dtcStore.totalCount === 0 && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">3</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Fault Code Check</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Read diagnostic trouble codes stored in your vehicle&apos;s computer
              </p>
              <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-[4/3] mt-6 rounded-2xl overflow-hidden">
                <Image src="/brand/fault-codes.jpg" alt="Fault code check" fill className="object-contain" sizes="(max-width: 640px) 300px, 340px" />
              </div>
              <Button onClick={() => dtcStore.readDtcs()} size="lg" className="rounded-2xl !px-10 mt-6">
                Read Fault Codes
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">stored · pending · permanent codes</p>
            </div>
          )}

          {/* Reading */}
          {dtcStore.state === 'reading' && (
            <div className="flex flex-col items-center py-12 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Reading fault codes…</p>
            </div>
          )}

          {/* Clearing */}
          {dtcStore.state === 'clearing' && (
            <div className="flex flex-col items-center py-12 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Clearing fault codes…</p>
            </div>
          )}

          {/* Results: no DTCs found */}
          {dtcStore.state === 'complete' && dtcStore.totalCount === 0 && (
            <div className="flex flex-col items-center py-12 text-center animate-fade-up">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-lg font-bold text-emerald-600">No Trouble Codes</p>
              <p className="text-sm text-gray-400 mt-1">Your vehicle has no stored fault codes</p>
              <Button onClick={() => dtcStore.readDtcs()} variant="secondary" size="sm" className="mt-4 !bg-[var(--accent)] !text-white !border-[var(--accent)] hover:!brightness-110">
                Scan Again
              </Button>
            </div>
          )}

          {/* Results: has DTCs */}
          {dtcStore.totalCount > 0 && dtcStore.state !== 'reading' && dtcStore.state !== 'clearing' && (
            <div className="space-y-4 animate-fade-up">
              {/* Controls bar */}
              <div className="flex items-center gap-2.5">
                <Button onClick={() => dtcStore.readDtcs()} size="sm" variant="secondary">
                  Re-scan
                </Button>
                {!confirmClear ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
                    Clear Codes
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-400">Sure?</span>
                    <Button variant="danger" size="sm" onClick={() => { dtcStore.clearDtcs(); setConfirmClear(false); }}>Yes</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>No</Button>
                  </div>
                )}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search codes…"
                value={dtcSearch}
                onChange={e => setDtcSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 transition-colors"
              />

              {/* DTC lists */}
              <div className="space-y-3">
                {filteredDtcs.stored.length > 0 && (
                  <DtcGroup label="Confirmed" color="red" count={filteredDtcs.stored.length}>
                    {filteredDtcs.stored.map(dtc => <DtcCard key={`s-${dtc.code}`} dtc={dtc} />)}
                  </DtcGroup>
                )}
                {filteredDtcs.pending.length > 0 && (
                  <DtcGroup label="Pending" color="yellow" count={filteredDtcs.pending.length}>
                    {filteredDtcs.pending.map(dtc => <DtcCard key={`p-${dtc.code}`} dtc={dtc} />)}
                  </DtcGroup>
                )}
                {filteredDtcs.permanent.length > 0 && (
                  <DtcGroup label="Permanent" color="orange" count={filteredDtcs.permanent.length}>
                    {filteredDtcs.permanent.map(dtc => <DtcCard key={`pm-${dtc.code}`} dtc={dtc} />)}
                  </DtcGroup>
                )}
              </div>

              {/* WhatsApp CTA — after DTC results */}
              <WhatsAppBookingCTA scanResult={scan.result ?? null} dtcs={dtcsForReport} variant="compact" />
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
            END OF FLOW — BOOKING CTA
            ═══════════════════════════════════════════════════════ */}
        {showEndOfFlowCTA && (
          <section className="py-6 animate-fade-up">
            <WhatsAppBookingCTA scanResult={scan.result ?? null} dtcs={dtcsForReport} variant="full" />
          </section>
        )}

        {/* Bottom spacer for mobile nav */}
        <div className="h-6" />
      </div>
    </>
  );
}
