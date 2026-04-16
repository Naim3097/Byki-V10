'use client';

// ─────────────────────────────────────────────────────────────────────
// DEMO — visual sub-components
// ---------------------------------------------------------------------
// Duplicated (intentionally, not extracted) from /diag/page.tsx so the
// real diagnostic UI stays untouched. Keep these in sync ONLY if the
// demo should visually match a future change to /diag — otherwise
// diverging freely here is fine.
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type {
  PidSnapshot,
  SystemHealthReport,
  EvaluatedRule,
  ComponentRisk,
  DtcCode,
} from '@/models';
import { DtcSource } from '@/models';
import { Badge } from '@/components/ui';

/* ── Color helpers (light theme) ─────────────────────────────────── */

export function scoreColorLight(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#f59e0b';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

export function riskColorLight(tier: string): string {
  switch (tier) {
    case 'Healthy': return 'text-emerald-600';
    case 'Monitor': return 'text-yellow-600';
    case 'Warning': return 'text-orange-500';
    case 'Critical': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function severityColorLight(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'bg-red-50 text-red-600 border-red-200';
    case 'WARNING': case 'MAJOR': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'MODERATE': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
    case 'MINOR': case 'INFO': return 'bg-blue-50 text-blue-600 border-blue-200';
    default: return 'bg-gray-50 text-gray-400 border-gray-200';
  }
}

/* ── Formatting ──────────────────────────────────────────────────── */

export function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/* ── Gauge definitions (matches /diag) ───────────────────────────── */

export interface GaugeDef {
  key: keyof PidSnapshot;
  label: string;
  unit: string;
  min: number;
  max: number;
}

export const HERO_GAUGES: GaugeDef[] = [
  { key: 'rpm', label: 'RPM', unit: 'rpm', min: 0, max: 8000 },
  { key: 'vehicle_speed', label: 'Speed', unit: 'km/h', min: 0, max: 240 },
];

export const COMPACT_GAUGES: GaugeDef[] = [
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

export const SYSTEMS = [
  { key: 'engine', tag: 'ENG', name: 'Engine' },
  { key: 'fuel', tag: 'FUEL', name: 'Fuel' },
  { key: 'emission', tag: 'EMI', name: 'Emission' },
  { key: 'electrical', tag: 'ELEC', name: 'Electrical' },
  { key: 'thermal', tag: 'THM', name: 'Thermal' },
  { key: 'air_intake', tag: 'AIR', name: 'Intake' },
];

/* ── LightScoreRing ──────────────────────────────────────────────── */

export function LightScoreRing({
  score, size = 140, strokeWidth = 5, className = '',
}: { score: number; size?: number; strokeWidth?: number; className?: string }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score));
  const offset = circumference - (filled / 100) * circumference;
  const color = scoreColorLight(score);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out', filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ── ArcGauge ────────────────────────────────────────────────────── */

export function ArcGauge({
  label, value, unit, min, max, size = 180,
}: Omit<GaugeDef, 'key'> & { value: number | null | undefined; size?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const hasValue = value != null;

  const strokeW = 10;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 135;
  const arcSweep = 270;
  const circumference = (arcSweep / 360) * 2 * Math.PI * r;
  const offset = circumference - pct * circumference;

  const gradId = `gauge-grad-${label.replace(/\s/g, '')}-demo`;

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
          <circle
            cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ strokeDasharray: `${circumference} ${2 * Math.PI * r - circumference}` }}
          />
          {hasValue && (
            <circle
              cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${2 * Math.PI * r}`}
              strokeDashoffset={offset}
              className="transition-all duration-500"
              style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,136,0.3))' }}
            />
          )}
        </svg>
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

/* ── MiniGauge ───────────────────────────────────────────────────── */

export function MiniGauge({
  label, value, unit, min, max,
}: Omit<GaugeDef, 'key'> & { value: number | null | undefined }) {
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

/* ── MiniScoreRing ───────────────────────────────────────────────── */

export function MiniScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = scoreColorLight(score);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 4px ${color}30)` }}
        />
      </svg>
      <span className="absolute text-xs font-bold font-mono tabular-nums" style={{ color }}>{Math.round(score)}</span>
    </div>
  );
}

/* ── SystemTag (during scan) ────────────────────────────────────── */

export function SystemTag({ name, score, done }: { name: string; score?: number; done: boolean }) {
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

/* ── System Detail Panel ─────────────────────────────────────────── */

export function SystemDetailPanel({ sys }: { sys: SystemHealthReport }) {
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
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-200 pt-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Health Score</span>
              <span className="text-sm font-bold font-mono tabular-nums" style={{ color }}>{Math.round(sys.score)} / 100</span>
            </div>
            <div className="h-[3px] rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sys.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
          </div>

          {sys.findings.length > 0 && (
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

          {sys.componentRisks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Component Risks</h4>
              <div className="space-y-2">
                {[...sys.componentRisks].sort((a, b) => b.probability - a.probability).map((cr, i) => (
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

/* ── DTC Card ────────────────────────────────────────────────────── */

export function DtcCard({ dtc }: { dtc: DtcCode }) {
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
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-gray-200 pt-3">
          {dtc.system && <p className="text-xs"><span className="text-gray-400">System</span> <span className="text-gray-600 ml-2">{dtc.system}</span></p>}
          {dtc.possibleCauses && dtc.possibleCauses.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Possible causes</p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5 leading-relaxed">
                {dtc.possibleCauses.map((c, i) => <li key={i}>{c}</li>)}
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

export function DtcGroup({ label, color, count, children }: { label: string; color: string; count: number; children: React.ReactNode }) {
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
