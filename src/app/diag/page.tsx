'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { useLiveDataStore } from '@/stores/live-data-store';
import { useScanStore } from '@/stores/scan-store';
import { useDtcStore } from '@/stores/dtc-store';
import type { ScanFeedCard } from '@/stores/scan-store';
import type { PidSnapshot } from '@/models';
import { PID_SNAPSHOT_KEYS } from '@/models';
import type { SystemHealthReport, EvaluatedRule, ComponentRisk, DtcCode } from '@/models';
import { DtcSource } from '@/models';
import { ScoreRing, Button, Card, Badge, ProgressBar, scoreColor, riskColor, riskBg, severityColor } from '@/components/ui';

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
  { key: 'engine', icon: '⚙️', name: 'Engine' },
  { key: 'fuel', icon: '⛽', name: 'Fuel' },
  { key: 'emission', icon: '🌿', name: 'Emission' },
  { key: 'electrical', icon: '🔋', name: 'Electrical' },
  { key: 'thermal', icon: '🌡️', name: 'Thermal' },
  { key: 'air_intake', icon: '💨', name: 'Intake' },
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

/* ── ArcGauge (hero) ───────────────────────────────────────────── */

function ArcGauge({ label, value, unit, min, max, size = 150 }: Omit<GaugeDef, 'key'> & { value: number | null | undefined; size?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const hasValue = value != null;
  const r = (size - 16) / 2;
  const arc = Math.PI * 1.5;
  const circumference = r * arc;
  const offset = circumference - pct * circumference;
  const color = pct < 0.7 ? '#00ff88' : pct < 0.9 ? '#fbbf24' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.75 }}>
        {/* Ambient glow */}
        {hasValue && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-3/4 h-3/4 rounded-full opacity-15 blur-2xl pointer-events-none transition-opacity duration-700"
            style={{ backgroundColor: color }}
          />
        )}
        <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`} className="overflow-visible relative z-[1]">
          <path d={describeArc(size / 2, size * 0.7, r, 225, -45)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" strokeLinecap="round" />
          {hasValue && (
            <path d={describeArc(size / 2, size * 0.7, r, 225, -45)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-500" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 z-[2]">
          <span className={`text-2xl font-bold font-mono tabular-nums ${hasValue ? 'text-white' : 'text-white/8'} transition-colors`}>
            {hasValue ? formatValue(v) : '—'}
          </span>
          <span className="text-[9px] text-white/20 mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/30 mt-1 font-medium">{label}</span>
    </div>
  );
}

/* ── MiniGauge (compact grid) ──────────────────────────────────── */

function MiniGauge({ label, value, unit, min, max }: Omit<GaugeDef, 'key'> & { value: number | null | undefined }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const hasValue = value != null;
  const color = pct < 70 ? 'var(--accent)' : pct < 90 ? '#fbbf24' : '#ef4444';

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:border-white/[0.08] transition-all">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] text-white/25 font-medium">{label}</span>
        <span className="text-[9px] text-white/10 font-mono">{unit}</span>
      </div>
      <span className={`block text-lg font-bold font-mono tabular-nums leading-none ${hasValue ? 'text-white/90' : 'text-white/8'} transition-colors`}>
        {hasValue ? formatValue(v) : '—'}
      </span>
      <div className="mt-2 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
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
        <div className="flex items-center gap-2 py-1">
          <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
          <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">{card.title}</span>
          {card.subtitle && <span className="text-[11px] text-white/25">{card.subtitle}</span>}
        </div>
      );
    case 'pulse':
      return (
        <div className="flex items-center gap-2 py-0.5 pl-3">
          <span className="text-[11px] font-mono text-white/20">{card.title}</span>
        </div>
      );
    case 'systemScore': {
      const sys = card.systemReport;
      if (!sys) return null;
      return (
        <div className="flex items-center justify-between pl-3 py-0.5">
          <span className="text-[11px] text-white/40">{sys.icon} {sys.consumerName}</span>
          <span className="text-[11px] font-bold font-mono tabular-nums" style={{ color: scoreColor(sys.score) }}>{Math.round(sys.score)}</span>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ── System pill (during scan) ─────────────────────────────────── */

function SystemPill({ name, icon, score, done }: { name: string; icon: string; score?: number; done: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-500 ${
      done && score != null
        ? `border ${riskBg(score >= 85 ? 'Healthy' : score >= 70 ? 'Monitor' : score >= 50 ? 'Warning' : 'Critical')}`
        : 'bg-white/[0.03] border border-white/[0.05] text-white/20'
    }`}>
      <span>{icon}</span>
      <span>{name}</span>
      {done && score != null && (
        <span className="font-bold font-mono tabular-nums ml-0.5" style={{ color: scoreColor(score) }}>{Math.round(score)}</span>
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
  const color = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 4px ${color}30)` }} />
      </svg>
      <span className="absolute text-[11px] font-bold font-mono tabular-nums" style={{ color }}>{Math.round(score)}</span>
    </div>
  );
}

/* ── System Detail Panel (expandable) ──────────────────────────── */

function SystemDetailPanel({ sys }: { sys: SystemHealthReport }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(sys.score);
  const hasIssues = sys.evaluatedRules.length > 0;
  const riskBorder = sys.riskTier === 'Critical' ? 'border-red-500/15' : sys.riskTier === 'Warning' ? 'border-orange-500/15' : sys.riskTier === 'Monitor' ? 'border-yellow-500/15' : 'border-white/[0.04]';

  return (
    <div className={`rounded-2xl border bg-white/[0.02] overflow-hidden transition-all ${riskBorder}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors text-left">
        <MiniScoreRing score={sys.score} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{sys.icon} {sys.consumerName}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${riskColor(sys.riskTier)}`}>{sys.riskTier}</span>
          </div>
          <p className="text-[11px] text-white/25 mt-0.5 truncate">{sys.findings[0] ?? 'System operating normally'}</p>
        </div>
        <div className="flex items-center gap-2">
          {sys.dataCoverage < 1 && <span className="text-[9px] font-mono text-white/12 tabular-nums">{Math.round(sys.dataCoverage * 100)}%</span>}
          <svg width="10" height="10" viewBox="0 0 10 10" className={`text-white/15 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <polyline points="2,3.5 5,6.5 8,3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/[0.04] pt-3 animate-fade-up" style={{ animationDuration: '0.2s' }}>
          {/* Score bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/25">Health Score</span>
              <span className="text-xs font-bold font-mono tabular-nums" style={{ color }}>{Math.round(sys.score)} / 100</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sys.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
          </div>

          {/* Findings */}
          {sys.findings.length > 0 && sys.findings[0] !== 'System operating normally' && sys.findings[0] !== 'Insufficient sensor data for this system' && (
            <div>
              <h4 className="text-[9px] font-mono text-white/15 uppercase tracking-wider mb-1.5">Findings</h4>
              <div className="space-y-1">
                {sys.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-white/45">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluated rules */}
          {sys.evaluatedRules.length > 0 && (
            <div>
              <h4 className="text-[9px] font-mono text-white/15 uppercase tracking-wider mb-1.5">
                Analysis Rules <span className="text-white/8">({sys.evaluatedRules.length})</span>
              </h4>
              <div className="space-y-1.5">
                {sys.evaluatedRules.map((rule, i) => <RuleCard key={i} rule={rule} />)}
              </div>
            </div>
          )}

          {/* Component risks */}
          {sys.componentRisks.length > 0 && (
            <div>
              <h4 className="text-[9px] font-mono text-white/15 uppercase tracking-wider mb-1.5">Component Risks</h4>
              <div className="space-y-1.5">
                {sys.componentRisks.sort((a, b) => b.probability - a.probability).map((cr, i) => (
                  <ComponentRiskBar key={i} risk={cr} />
                ))}
              </div>
            </div>
          )}

          {!hasIssues && (
            <div className="flex items-center gap-2 py-1">
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8"><polyline points="1.5,4.5 3,6 6.5,2" stroke="#00ff88" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="text-[11px] text-emerald-400/50">All parameters normal</span>
            </div>
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
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.03] p-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/60">{rule.name}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{rule.consumerMessage}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color }}>{pct}%</span>
          <div className="w-8 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
      {rule.possibleDtcs.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[8px] text-white/12 uppercase">DTCs:</span>
          {rule.possibleDtcs.map(dtc => (
            <span key={dtc} className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/[0.03] text-white/25">{dtc}</span>
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
      <span className="text-[11px] text-white/40 w-28 truncate flex-shrink-0">{risk.component}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-mono font-bold tabular-nums w-6 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ── DTC Card ──────────────────────────────────────────────────── */

function DtcCard({ dtc }: { dtc: DtcCode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center gap-2.5 text-left hover:bg-white/[0.02] transition-colors">
        <div className={`w-0.5 self-stretch rounded-full -my-3 -ml-3 mr-1 ${
          dtc.severity === 'CRITICAL' ? 'bg-red-500' : dtc.severity === 'MAJOR' ? 'bg-orange-500' :
          dtc.severity === 'MODERATE' ? 'bg-yellow-500' : dtc.severity === 'MINOR' ? 'bg-blue-500' : 'bg-white/10'
        }`} />
        <span className="text-xs font-mono font-bold text-[var(--accent)]">{dtc.code}</span>
        <span className="flex-1 text-xs text-white/50 truncate">{dtc.description || 'Unknown code'}</span>
        {dtc.severity && <Badge className={severityColor(dtc.severity)}>{dtc.severity}</Badge>}
        {dtc.source === DtcSource.PERMANENT && <Badge color="red">PERM</Badge>}
        <svg width="10" height="10" viewBox="0 0 10 10" className={`text-white/15 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="2,3.5 5,6.5 8,3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.03] pt-2.5 animate-fade-up" style={{ animationDuration: '0.15s' }}>
          {dtc.system && <p className="text-[11px]"><span className="text-white/20">System:</span> <span className="text-white/45">{dtc.system}</span></p>}
          {dtc.possibleCauses && dtc.possibleCauses.length > 0 && (
            <div>
              <p className="text-[11px] text-white/20 mb-0.5">Possible causes</p>
              <ul className="text-[11px] text-white/45 list-disc list-inside space-y-0.5">
                {dtc.possibleCauses.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {dtc.consumerAdvice && <p className="text-[11px]"><span className="text-white/20">Advice:</span> <span className="text-white/45">{dtc.consumerAdvice}</span></p>}
          {dtc.estimatedCost && <p className="text-[11px]"><span className="text-white/20">Est. cost:</span> <span className="text-white/45">{dtc.estimatedCost}</span></p>}
        </div>
      )}
    </div>
  );
}

function DtcGroup({ label, color, count, children }: { label: string; color: string; count: number; children: React.ReactNode }) {
  const dots: Record<string, string> = { red: 'bg-red-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400' };
  return (
    <div>
      <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dots[color] ?? 'bg-white/20'}`} />
        {label} ({count})
      </h4>
      <div className="space-y-1.5">{children}</div>
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
        <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color: scoreColor(scanScore) }}>{Math.round(scanScore)}</span>
      ) : null,
    },
    {
      id: 'dtc',
      label: 'Fault Codes',
      badge: dtcCount > 0 ? (
        <span className="min-w-[16px] h-4 rounded-full bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center justify-center px-1">{dtcCount}</span>
      ) : null,
    },
  ];

  return (
    <div className="sticky top-0 md:top-[53px] z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center py-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center">
              {i > 0 && <div className="w-5 h-px bg-white/[0.06] mx-1" />}
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSection === item.id
                    ? 'text-[var(--accent)] bg-[var(--accent)]/8'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                }`}
              >
                {item.label}
                {item.badge}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Flow Guide (contextual section divider) ───────────────────── */

function FlowGuide({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="py-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/[0.04]" />
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/15 select-none">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white/10">
            <path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {text}
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.04]" />
      </div>
    </div>
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

  // ── Auto-scroll scan feed ────────────────────────────────────
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const scores: Record<string, { icon: string; name: string; score: number }> = {};
    for (const fc of scan.feedCards) {
      if (fc.type === 'systemScore' && fc.systemReport) {
        scores[fc.systemReport.system] = {
          icon: fc.systemReport.icon,
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
        <div className="animate-fade-up max-w-sm w-full">
          {/* Flow steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['Connect', 'Monitor', 'Diagnose'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${i === 0 ? 'text-[var(--accent)]' : 'text-white/15'}`}>
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    i === 0 ? 'bg-[var(--accent)] text-black' : 'bg-white/[0.05]'
                  }`}>{i + 1}</span>
                  <span className="text-[10px] font-medium">{step}</span>
                </div>
                {i < 2 && <div className="w-6 h-px bg-white/[0.06]" />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="glass rounded-3xl p-8 border border-white/[0.06]">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-transparent flex items-center justify-center border border-[var(--accent)]/10 breathe">
              <svg width="32" height="32" viewBox="0 0 28 28" fill="none" className="text-[var(--accent)]">
                <rect x="4" y="8" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="12" x2="10" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="14" y1="12" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="18" y1="12" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mt-5">Connect Adapter</h2>
            <p className="text-xs text-white/30 mt-2 leading-relaxed">
              Pair your ELM327 Bluetooth adapter to begin live monitoring and diagnostics
            </p>

            {bt.errorMessage && (
              <div className="mt-4 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 text-xs text-red-400 text-left">
                {bt.errorMessage}
              </div>
            )}

            <Button onClick={() => bt.connect()} disabled={bt.state === 'connecting'} className="w-full mt-6" size="lg">
              {bt.state === 'connecting' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Connecting…
                </span>
              ) : (
                'Select Adapter'
              )}
            </Button>

            <p className="text-[10px] text-white/12 mt-3 leading-relaxed">
              Uses Web Bluetooth — select your OBD2 adapter from the browser picker
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-8">

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: LIVE DATA
            ═══════════════════════════════════════════════════════ */}
        <section id="live" className="scroll-mt-14 md:scroll-mt-[70px] py-4">

          {/* Idle — not streaming, not scanning */}
          {live.state === 'idle' && !isScanning && (
            <div className="flex flex-col items-center py-14 text-center animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/15">
                  <polyline points="2,12 6,6 10,16 14,8 18,14 22,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white/50">Start Live Monitoring</h3>
              <p className="text-[11px] text-white/20 mt-1.5 max-w-xs leading-relaxed">
                Stream real-time sensor data from your vehicle&apos;s ECU
              </p>
              <Button onClick={() => live.startStream()} className="mt-5">
                Start Stream
              </Button>
            </div>
          )}

          {/* Starting */}
          {live.state === 'starting' && (
            <div className="flex flex-col items-center py-14 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-xs text-white/30">Initializing stream…</p>
            </div>
          )}

          {/* Error */}
          {live.state === 'error' && (
            <Card className="border-red-500/15 text-center animate-fade-up">
              <p className="text-xs text-red-400 mb-3">Stream error — try reconnecting</p>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => live.startStream()}>Retry</Button>
                <Button size="sm" variant="ghost" onClick={() => live.reset()}>Dismiss</Button>
              </div>
            </Card>
          )}

          {/* Paused during scan */}
          {live.state === 'paused' && isScanning && (
            <div className="text-center py-8 animate-fade-up">
              <p className="text-[11px] text-white/20 font-mono">Live data paused during scan</p>
            </div>
          )}

          {/* Active: streaming or paused (not during scan) */}
          {(live.state === 'streaming' || (live.state === 'paused' && !isScanning)) && (
            <div className="space-y-4 animate-fade-up">
              {/* Controls bar */}
              <div className="flex items-center gap-2">
                {live.state === 'streaming' && (
                  <Button onClick={() => live.pauseStream()} size="sm" variant="secondary">Pause</Button>
                )}
                {live.state === 'paused' && (
                  <Button onClick={() => live.resumeStream()} size="sm">Resume</Button>
                )}
                <Button onClick={() => live.reset()} size="sm" variant="ghost">Stop</Button>

                <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-white/15">
                  {live.sampleCount > 0 && <span className="tabular-nums">{live.sampleCount} samples</span>}
                  {activeKeys.length > 0 && <span>{activeKeys.length} PIDs</span>}
                  {live.state === 'streaming' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
                      LIVE
                    </span>
                  )}
                  {live.state === 'paused' && <span className="text-yellow-400">PAUSED</span>}
                </div>
              </div>

              {/* Hero gauges: RPM + Speed */}
              <div className="flex justify-center gap-8 sm:gap-14 py-2">
                {HERO_GAUGES.map(g => (
                  <ArcGauge key={g.key} label={g.label} value={latest?.[g.key] as number | null | undefined} unit={g.unit} min={g.min} max={g.max} size={150} />
                ))}
              </div>

              {/* Compact gauge grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COMPACT_GAUGES.map(g => (
                  <MiniGauge key={g.key} label={g.label} value={latest?.[g.key] as number | null | undefined} unit={g.unit} min={g.min} max={g.max} />
                ))}
              </div>

              {/* All PIDs expandable */}
              {activeKeys.length > 0 && (
                <details className="group">
                  <summary className="text-[10px] font-mono text-white/12 cursor-pointer hover:text-white/25 transition-colors select-none">
                    All Active PIDs ({activeKeys.length})
                  </summary>
                  <div className="mt-1.5 glass rounded-xl p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] font-mono">
                      {activeKeys.map(k => {
                        const val = latest![k as keyof PidSnapshot];
                        return (
                          <div key={k} className="flex justify-between py-0.5 border-b border-white/[0.03]">
                            <span className="text-white/25">{k}</span>
                            <span className="text-white/50 tabular-nums">{typeof val === 'number' ? val.toFixed(2) : String(val)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        <FlowGuide text={liveToScanGuide} />

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: HEALTH SCAN
            ═══════════════════════════════════════════════════════ */}
        <section id="scan" className="scroll-mt-14 md:scroll-mt-[70px] py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/50">Health Scan</h2>
            {isScanComplete && (
              <button onClick={() => scan.reset()} className="text-[10px] font-mono text-white/15 hover:text-white/40 transition-colors">
                New Scan
              </button>
            )}
          </div>

          {/* Idle */}
          {scan.state === 'idle' && (
            <div className="flex flex-col items-center py-10 text-center animate-fade-up">
              <Button onClick={handleStartScan} size="lg" className="rounded-2xl !px-8">
                Scan Vehicle
              </Button>
              <p className="text-[10px] text-white/12 mt-3 font-mono">10 cycles · 6 systems · ~30 seconds</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {SYSTEMS.map(s => (
                  <span key={s.key} className="text-[10px] text-white/15 flex items-center gap-0.5">
                    <span>{s.icon}</span>{s.name}
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
                  <p className="text-xs font-semibold text-white/50">{scan.progressMessage}</p>
                  {scan.progressDetail && <p className="text-[10px] text-white/15 mt-0.5 truncate">{scan.progressDetail}</p>}
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-2">
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
                  return <SystemPill key={s.key} name={s.name} icon={found?.icon ?? s.icon} score={found?.score} done={!!found} />;
                })}
              </div>

              {/* Feed log */}
              {scan.feedCards.length > 0 && (
                <div className="glass rounded-xl p-2.5 max-h-32 overflow-y-auto border border-white/[0.04]">
                  <div className="text-[9px] font-mono text-white/8 uppercase tracking-wider mb-1">Scan Feed</div>
                  {scan.feedCards.slice(-8).map((card, i) => <FeedLine key={i} card={card} />)}
                  <div ref={feedEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {scan.state === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8 animate-fade-up">
              <div className="w-12 h-12 rounded-full bg-red-500/8 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" className="text-red-400">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <line x1="9" y1="5.5" x2="9" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="9" cy="12" r="0.7" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm font-bold text-red-400">Scan Failed</p>
              <p className="text-xs text-white/25 text-center max-w-xs">{scan.errorMessage}</p>
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
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-transparent p-5 sm:p-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ backgroundColor: scoreColor(scan.result.overallScore) }} />
                <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
                  <ScoreRing score={scan.result.overallScore} size={140} strokeWidth={5} />
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">Vehicle Health</h3>
                    <p className={`text-xs font-bold mt-1 ${riskColor(scan.result.overallRiskTier)}`}>{scan.result.overallRiskTier}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px] font-mono text-white/15 tabular-nums">
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
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/8 text-emerald-400/70 border border-emerald-500/10">
                              {healthy}/{r.systems.length} healthy
                            </span>
                            {issues > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange-500/8 text-orange-400/70 border border-orange-500/10">
                                {issues} rules triggered
                              </span>
                            )}
                            {r.diagnosticMatches.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/8 text-red-400/70 border border-red-500/10">
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
                  <h3 className="text-[10px] font-mono text-white/15 uppercase tracking-wider">System Analysis</h3>
                  <span className="text-[9px] font-mono text-white/8">{scan.result.systems.length} systems</span>
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
                    <h3 className="text-[10px] font-mono text-white/15 uppercase tracking-wider">Diagnostics</h3>
                    <Badge color="red">{scan.result.diagnosticMatches.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {scan.result.diagnosticMatches.sort((a, b) => b.repairPriority - a.repairPriority).map((d, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={severityColor(d.severity)}>{d.severity}</Badge>
                          <span className="text-[10px] text-white/15">{d.category}</span>
                          {d.confidence < 1 && <span className="text-[9px] font-mono text-white/10 ml-auto tabular-nums">{Math.round(d.confidence * 100)}%</span>}
                        </div>
                        <p className="text-xs text-white/60">{d.description}</p>
                        {d.recommendation && <p className="text-[11px] text-white/25">{d.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlations */}
              {scan.result.correlationResults && scan.result.correlationResults.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-mono text-white/15 uppercase tracking-wider mb-2.5">Correlations</h3>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {scan.result.correlationResults.map((c, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-white/45">{c.name}</span>
                          <span className={`text-[9px] font-mono font-bold ${c.status === 'normal' ? 'text-emerald-400/50' : 'text-yellow-400/60'}`}>{c.status}</span>
                        </div>
                        <p className="text-[10px] text-white/20">{c.consumerMessage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scan log */}
              {scan.feedCards.length > 0 && (
                <details className="group">
                  <summary className="text-[10px] font-mono text-white/10 cursor-pointer hover:text-white/20 transition-colors select-none">
                    Scan Log ({scan.feedCards.length})
                  </summary>
                  <div className="mt-1.5 glass rounded-xl p-2.5 max-h-40 overflow-y-auto border border-white/[0.04]">
                    {scan.feedCards.map((card, i) => <FeedLine key={i} card={card} />)}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        <FlowGuide text={scanToDtcGuide} />

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: FAULT CODES
            ═══════════════════════════════════════════════════════ */}
        <section id="dtc" className="scroll-mt-14 md:scroll-mt-[70px] py-4">
          <h2 className="text-sm font-semibold text-white/50 mb-4">Fault Codes</h2>

          {/* Controls */}
          <div className="flex items-center gap-2.5 mb-4">
            <Button onClick={() => dtcStore.readDtcs()} disabled={dtcStore.state === 'reading'} size="sm">
              {dtcStore.state === 'reading' ? 'Reading…' : 'Read DTCs'}
            </Button>
            {dtcStore.totalCount > 0 && (
              !confirmClear ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)} disabled={dtcStore.state === 'clearing'}>
                  Clear
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-red-400">Sure?</span>
                  <Button variant="danger" size="sm" onClick={() => { dtcStore.clearDtcs(); setConfirmClear(false); }}>Yes</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>No</Button>
                </div>
              )
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {dtcStore.storedDtcs.length > 0 && <Badge color="red">{dtcStore.storedDtcs.length} stored</Badge>}
              {dtcStore.pendingDtcs.length > 0 && <Badge color="yellow">{dtcStore.pendingDtcs.length} pending</Badge>}
              {dtcStore.permanentDtcs.length > 0 && <Badge color="orange">{dtcStore.permanentDtcs.length} perm</Badge>}
            </div>
          </div>

          {/* Error */}
          {dtcStore.errorMessage && (
            <Card className="border-red-500/15 mb-3">
              <p className="text-xs text-red-400">{dtcStore.errorMessage}</p>
            </Card>
          )}

          {/* Search */}
          {dtcStore.totalCount > 0 && (
            <div className="relative mb-3">
              <svg width="12" height="12" viewBox="0 0 12 12" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/12">
                <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search codes…"
                value={dtcSearch}
                onChange={e => setDtcSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 glass rounded-xl text-xs text-white placeholder-white/12 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
          )}

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

            {/* Empty: no DTCs found */}
            {dtcStore.state === 'complete' && dtcStore.totalCount === 0 && (
              <div className="flex flex-col items-center py-10 text-center animate-fade-up">
                <div className="w-12 h-12 rounded-full bg-emerald-500/8 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" />
                    <polyline points="6,10 9,13 14,7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-emerald-400">No Trouble Codes</p>
                <p className="text-xs text-white/25 mt-0.5">Your vehicle has no stored DTCs</p>
              </div>
            )}

            {/* Empty: haven't scanned yet */}
            {dtcStore.state === 'idle' && dtcStore.totalCount === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-xs text-white/15">Press &quot;Read DTCs&quot; to scan for fault codes</p>
              </div>
            )}
          </div>
        </section>

        {/* Bottom spacer for mobile nav */}
        <div className="h-6" />
      </div>
    </>
  );
}
