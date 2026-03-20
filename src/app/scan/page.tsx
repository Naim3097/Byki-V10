'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { useScanStore } from '@/stores/scan-store';
import type { ScanFeedCard } from '@/stores/scan-store';
import type { SystemHealthReport, EvaluatedRule, ComponentRisk } from '@/models';
import { ScoreRing, Button, Card, Badge, ProgressBar, scoreColor, riskColor, riskBg, severityColor } from '@/components/ui';

// ── Feed card renderer ──────────────────────────────────────────────

function FeedLine({ card }: { card: ScanFeedCard }) {
  switch (card.type) {
    case 'phase':
      return (
        <div className="flex items-center gap-2 py-1.5">
          <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
          <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">{card.title}</span>
          {card.subtitle && <span className="text-[11px] text-white/25">{card.subtitle}</span>}
        </div>
      );
    case 'pulse':
      return (
        <div className="flex items-center gap-2 py-0.5 pl-3">
          <span className="text-[11px] font-mono text-white/20">{card.title}</span>
          {card.subtitle && <span className="text-[11px] text-white/15">{card.subtitle}</span>}
        </div>
      );
    case 'analysis':
      return (
        <div className="pl-3 py-1">
          <span className="text-[11px] font-mono text-[var(--accent)]/70">{card.title}</span>
          {card.subtitle && <span className="text-[11px] text-white/30 ml-2">{card.subtitle}</span>}
        </div>
      );
    case 'systemScore': {
      const sys = card.systemReport;
      if (!sys) return null;
      return (
        <div className="flex items-center justify-between pl-3 py-1">
          <span className="text-[11px] text-white/40">{sys.icon} {sys.consumerName}</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: scoreColor(sys.score) }}>
            {Math.round(sys.score)}
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}

// ── System pill (during scan animation) ─────────────────────────────

function SystemPill({ name, icon, score, done }: { name: string; icon: string; score?: number; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-500 ${
      done && score != null
        ? `border ${riskBg(score >= 85 ? 'Healthy' : score >= 70 ? 'Monitor' : score >= 50 ? 'Warning' : 'Critical')}`
        : 'bg-white/3 border border-white/5 text-white/20'
    }`}>
      <span>{icon}</span>
      <span>{name}</span>
      {done && score != null && (
        <span className="font-bold font-mono ml-0.5" style={{ color: scoreColor(score) }}>
          {Math.round(score)}
        </span>
      )}
    </div>
  );
}

// ── Mini score ring for system cards ────────────────────────────────

function MiniScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="score-ring-animate" style={{ '--circumference': `${circ}`, '--offset': `${offset}`, filter: `drop-shadow(0 0 4px ${color}30)` } as React.CSSProperties} />
      </svg>
      <span className="absolute text-xs font-bold font-mono" style={{ color }}>{Math.round(score)}</span>
    </div>
  );
}

// ── Per-system detail panel ─────────────────────────────────────────

function SystemDetailPanel({ sys }: { sys: SystemHealthReport }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(sys.score);
  const hasIssues = sys.evaluatedRules.length > 0;
  const riskBorder = sys.riskTier === 'Critical' ? 'border-red-500/15' : sys.riskTier === 'Warning' ? 'border-orange-500/15' : sys.riskTier === 'Monitor' ? 'border-yellow-500/15' : 'border-white/[0.04]';

  return (
    <div className={`rounded-2xl border bg-white/[0.02] overflow-hidden transition-all ${riskBorder}`}>
      {/* ── Header (always visible) ──────── */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left">
        <MiniScoreRing score={sys.score} size={48} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{sys.icon} {sys.consumerName}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${riskColor(sys.riskTier)}`}>{sys.riskTier}</span>
          </div>
          {/* Quick findings preview */}
          <p className="text-xs text-white/30 mt-0.5 truncate">
            {sys.findings[0] ?? 'System operating normally'}
          </p>
        </div>

        {/* Coverage + expand */}
        <div className="flex items-center gap-3">
          {sys.dataCoverage < 1 && (
            <span className="text-[10px] font-mono text-white/15">{Math.round(sys.dataCoverage * 100)}% data</span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" className={`text-white/15 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <polyline points="2,4 6,8 10,4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Expanded detail ──────────────── */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4 animate-fade-up" style={{ animationDuration: '0.2s' }}>

          {/* Score bar visualization */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/30">Health Score</span>
              <span className="text-sm font-bold font-mono" style={{ color }}>{Math.round(sys.score)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${sys.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
          </div>

          {/* Findings */}
          {sys.findings.length > 0 && sys.findings[0] !== 'System operating normally' && sys.findings[0] !== 'Insufficient sensor data for this system' && (
            <div>
              <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">Findings</h4>
              <div className="space-y-1.5">
                {sys.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-white/50">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluated rules — the actual analysis */}
          {sys.evaluatedRules.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">
                Analysis Rules
                <span className="ml-1.5 text-white/10">({sys.evaluatedRules.length})</span>
              </h4>
              <div className="space-y-2">
                {sys.evaluatedRules.map((rule, i) => (
                  <RuleCard key={i} rule={rule} />
                ))}
              </div>
            </div>
          )}

          {/* Component risks */}
          {sys.componentRisks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">Component Risk Assessment</h4>
              <div className="space-y-2">
                {sys.componentRisks
                  .sort((a, b) => b.probability - a.probability)
                  .map((cr, i) => (
                    <ComponentRiskBar key={i} risk={cr} />
                  ))}
              </div>
            </div>
          )}

          {/* Healthy state */}
          {!hasIssues && (
            <div className="flex items-center gap-2 py-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5.5 4,7.5 8,3" stroke="#00ff88" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="text-xs text-emerald-400/60">All parameters within normal range</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single evaluated rule card ──────────────────────────────────────

function RuleCard({ rule }: { rule: EvaluatedRule }) {
  const strengthPct = Math.round(rule.strength * 100);
  const strengthColor = strengthPct >= 70 ? '#ef4444' : strengthPct >= 40 ? '#f97316' : '#fbbf24';

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/70">{rule.name}</p>
          <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{rule.consumerMessage}</p>
        </div>
        {/* Strength indicator */}
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[10px] font-mono font-bold" style={{ color: strengthColor }}>{strengthPct}%</span>
          <div className="w-10 h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${strengthPct}%`, backgroundColor: strengthColor }} />
          </div>
        </div>
      </div>
      {/* Possible DTCs */}
      {rule.possibleDtcs.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-white/15 uppercase">DTCs:</span>
          {rule.possibleDtcs.map(dtc => (
            <span key={dtc} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">{dtc}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component risk probability bar ──────────────────────────────────

function ComponentRiskBar({ risk }: { risk: ComponentRisk }) {
  const pct = Math.round(risk.probability * 100);
  const color = pct >= 60 ? '#ef4444' : pct >= 30 ? '#f97316' : '#fbbf24';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-32 truncate flex-shrink-0">{risk.component}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}30` }} />
      </div>
      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Scan Page ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function ScanPage() {
  const bt = useBluetoothStore();
  const scan = useScanStore();
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scan.feedCards.length]);

  const isScanning = ['startingAgent', 'discoveringPids', 'scanning', 'analyzing'].includes(scan.state);
  const isComplete = scan.state === 'complete';
  const isError = scan.state === 'error';

  // ── Phase A: Connect adapter ────────────────────────────────────
  if (!bt.isConnected && scan.state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center">
        <div className="animate-fade-up">
          <div className="glass max-w-sm mx-auto flex flex-col items-center gap-5 p-8 rounded-3xl border border-white/[0.06]">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/3 flex items-center justify-center border border-[var(--accent)]/10">
              <svg width="32" height="32" viewBox="0 0 28 28" fill="none" className="text-[var(--accent)]">
                <rect x="4" y="8" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="12" x2="10" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="14" y1="12" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="18" y1="12" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold">Connect OBD2 Adapter</h2>
              <p className="text-xs text-white/30 mt-2 leading-relaxed max-w-xs">
                Pair your ELM327 or Vgate Bluetooth adapter to begin vehicle diagnostics
              </p>
            </div>

            {bt.errorMessage && (
              <div className="w-full bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 text-xs text-red-400 text-left">
                {bt.errorMessage}
              </div>
            )}

            <Button
              onClick={() => bt.connect()}
              disabled={bt.state === 'connecting'}
              className="w-full"
              size="lg"
            >
              {bt.state === 'connecting' ? 'Connecting…' : 'Select Adapter'}
            </Button>

            <p className="text-[10px] text-white/12 leading-relaxed max-w-xs">
              Your browser will open a Bluetooth device picker. Select your OBD2 adapter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase B: Scanning in progress ───────────────────────────────
  if (isScanning || (scan.state === 'idle' && bt.isConnected && !isComplete)) {
    const systemScores: Record<string, { icon: string; name: string; score: number }> = {};
    for (const fc of scan.feedCards) {
      if (fc.type === 'systemScore' && fc.systemReport) {
        systemScores[fc.systemReport.system] = {
          icon: fc.systemReport.icon,
          name: fc.systemReport.consumerName,
          score: fc.systemReport.score,
        };
      }
    }

    const SYSTEMS = [
      { key: 'engine', icon: '⚙️', name: 'Engine' },
      { key: 'fuel', icon: '⛽', name: 'Fuel' },
      { key: 'emission', icon: '🌿', name: 'Emission' },
      { key: 'electrical', icon: '🔋', name: 'Electrical' },
      { key: 'thermal', icon: '🌡️', name: 'Thermal' },
      { key: 'air_intake', icon: '💨', name: 'Intake' },
    ];

    return (
      <div className="flex flex-col items-center px-6 pt-8 pb-20">
        {/* ── Idle: Start button ────────────── */}
        {scan.state === 'idle' && (
          <div className="flex flex-col items-center gap-8 mt-12 animate-fade-up">
            <div className="w-48 h-48 rounded-full border border-white/[0.04] flex items-center justify-center bg-gradient-to-b from-white/[0.01] to-transparent">
              <div className="w-36 h-36 rounded-full border border-white/[0.04] flex items-center justify-center bg-gradient-to-b from-white/[0.02] to-transparent">
                <Button onClick={() => scan.startHealthScan()} size="lg" className="rounded-full !px-8">
                  Start Scan
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/15 font-mono">10 scan cycles · ~2 min</p>

            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {SYSTEMS.map(s => (
                <SystemPill key={s.key} name={s.name} icon={s.icon} done={false} />
              ))}
            </div>
          </div>
        )}

        {/* ── Scanning: Animated ring + live data ── */}
        {isScanning && (
          <div className="flex flex-col items-center gap-6 animate-fade-up w-full max-w-md">
            <div className="relative">
              <ScoreRing score={scan.progress * 100} size={200} strokeWidth={5} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--accent)] animate-count">
                  {Math.round(scan.progress * 100)}
                </span>
                <span className="text-[10px] text-white/20 font-mono mt-0.5">SCANNING</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-white/60">{scan.progressMessage}</p>
              {scan.progressDetail && (
                <p className="text-xs text-white/20 mt-1">{scan.progressDetail}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {SYSTEMS.map(s => {
                const found = systemScores[s.key];
                return (
                  <SystemPill key={s.key} name={s.name} icon={found?.icon ?? s.icon} score={found?.score} done={!!found} />
                );
              })}
            </div>

            {scan.feedCards.length > 0 && (
              <div className="w-full mt-4 glass rounded-2xl p-3 max-h-40 overflow-y-auto border border-white/[0.04]">
                <div className="text-[10px] font-mono text-white/12 uppercase tracking-wider mb-2">Scan Log</div>
                {scan.feedCards.slice(-12).map((card, i) => (
                  <FeedLine key={i} card={card} />
                ))}
                <div ref={feedEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="glass max-w-sm w-full flex flex-col items-center gap-4 p-8 rounded-3xl border border-red-500/10">
          <div className="w-14 h-14 rounded-full bg-red-500/8 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" className="text-red-400">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <line x1="10" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="10" cy="14" r="0.8" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-red-400">Scan Failed</h2>
          <p className="text-xs text-white/30 text-center">{scan.errorMessage}</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => scan.reset()} className="flex-1">Try Again</Button>
            <Button variant="ghost" onClick={() => { bt.disconnect(); scan.reset(); }}>Disconnect</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase C: Results dashboard ──────────────────────────────────
  if (isComplete && scan.result) {
    const r = scan.result;
    const healthySystems = r.systems.filter(s => s.riskTier === 'Healthy').length;
    const issueCount = r.systems.reduce((n, s) => n + s.evaluatedRules.length, 0);

    return (
      <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-8 animate-fade-up">

        {/* ── Hero score card ────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-transparent p-6 sm:p-8">
          {/* Subtle glow behind score */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ backgroundColor: scoreColor(r.overallScore) }} />

          <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <ScoreRing score={r.overallScore} size={180} strokeWidth={6} />

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Vehicle Health</h2>
              <p className={`text-sm font-bold mt-1.5 ${riskColor(r.overallRiskTier)}`}>{r.overallRiskTier}</p>

              {/* Quick stats row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] font-mono text-white/20">
                <span>{r.supportedPidCount} PIDs sampled</span>
                <span>{r.scanCycles} scan cycles</span>
                <span>{(r.scanDurationMs / 1000).toFixed(1)}s duration</span>
              </div>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/8 text-emerald-400/70 border border-emerald-500/10">
                  {healthySystems}/{r.systems.length} systems healthy
                </span>
                {issueCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-500/8 text-orange-400/70 border border-orange-500/10">
                    {issueCount} rules triggered
                  </span>
                )}
                {r.diagnosticMatches.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/8 text-red-400/70 border border-red-500/10">
                    {r.diagnosticMatches.length} diagnostics
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── System analysis (per-system drill-down) ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono text-white/20 uppercase tracking-wider">System Analysis</h3>
            <span className="text-[10px] font-mono text-white/10">{r.systems.length} systems evaluated</span>
          </div>
          <div className="space-y-3">
            {r.systems
              .sort((a, b) => a.score - b.score)
              .map(sys => (
                <SystemDetailPanel key={sys.system} sys={sys} />
              ))}
          </div>
        </section>

        {/* ── Diagnostics ────────────────────── */}
        {r.diagnosticMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-mono text-white/20 uppercase tracking-wider">Diagnostics</h3>
              <Badge color="red">{r.diagnosticMatches.length}</Badge>
            </div>
            <div className="space-y-2">
              {r.diagnosticMatches
                .sort((a, b) => b.repairPriority - a.repairPriority)
                .map((d, i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={severityColor(d.severity)}>{d.severity}</Badge>
                      <span className="text-[11px] text-white/20">{d.category}</span>
                      {d.confidence < 1 && (
                        <span className="text-[10px] font-mono text-white/12 ml-auto">{Math.round(d.confidence * 100)}% confidence</span>
                      )}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{d.description}</p>
                    {d.recommendation && (
                      <p className="text-xs text-white/30 leading-relaxed">{d.recommendation}</p>
                    )}
                    {(d.possibleDtcs.length > 0 || d.commonParts.length > 0) && (
                      <div className="flex items-center gap-3 flex-wrap pt-1">
                        {d.possibleDtcs.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-white/12 uppercase">DTCs:</span>
                            {d.possibleDtcs.map(c => (
                              <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-white/25">{c}</span>
                            ))}
                          </div>
                        )}
                        {d.commonParts.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-white/12 uppercase">Parts:</span>
                            {d.commonParts.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/25">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── Correlations ───────────────────── */}
        {r.correlationResults && r.correlationResults.length > 0 && (
          <section>
            <h3 className="text-xs font-mono text-white/20 uppercase tracking-wider mb-4">Parameter Correlations</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {r.correlationResults.map((c, i) => (
                <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/50">{c.name}</span>
                    <span className={`text-[10px] font-mono font-bold ${c.status === 'normal' ? 'text-emerald-400/60' : 'text-yellow-400/70'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/25 leading-relaxed">{c.consumerMessage}</p>
                  {c.deviation > 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-white/15">
                      <span>Expected: {c.expected.toFixed(2)}</span>
                      <span>·</span>
                      <span>Actual: {c.actual.toFixed(2)}</span>
                      <span>·</span>
                      <span className={c.deviation > 0.3 ? 'text-yellow-400/50' : ''}>Δ {c.deviation.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Scan log (collapsed) ───────────── */}
        {scan.feedCards.length > 0 && (
          <details className="group">
            <summary className="text-xs font-mono text-white/12 cursor-pointer hover:text-white/25 transition-colors">
              Scan Log ({scan.feedCards.length} entries)
            </summary>
            <div className="mt-2 glass rounded-2xl p-3 max-h-48 overflow-y-auto border border-white/[0.04]">
              {scan.feedCards.map((card, i) => (
                <FeedLine key={i} card={card} />
              ))}
            </div>
          </details>
        )}

        {/* ── Action bar ─────────────────────── */}
        <div className="sticky bottom-20 md:bottom-4 z-30">
          <div className="flex items-center gap-3 glass rounded-2xl p-3 max-w-md mx-auto border border-white/[0.06]">
            <Link href="/live" className="flex-1">
              <Button variant="secondary" className="w-full" size="sm">Live Data</Button>
            </Link>
            <Link href="/dtc" className="flex-1">
              <Button variant="secondary" className="w-full" size="sm">Read DTCs</Button>
            </Link>
            <Button variant="ghost" onClick={() => scan.reset()} size="sm">New Scan</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
