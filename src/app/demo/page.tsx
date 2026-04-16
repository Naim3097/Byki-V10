'use client';

// ─────────────────────────────────────────────────────────────────────
// /demo — Diagnostic Flow Demo (mock data)
// ---------------------------------------------------------------------
// Self-contained demonstration of the full diagnostic flow:
//   Case picker → Live Data → Health Scan → Fault Codes → Results
//
// Uses ONLY mock fixtures (mock-cases.ts) and local visual components
// (demo-components.tsx). Does NOT import or mutate any store, the OBD
// scan service, the analysis engine, or the real /diag page. It is
// completely isolated from the production flow.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import type { PidSnapshot, FullAnalysisResult } from '@/models';
import { PID_SNAPSHOT_KEYS } from '@/models';
import {
  DEMO_CASES, DEMO_CASE_ORDER, tickLiveSnapshot,
  type CaseId, type DemoCase,
} from './mock-cases';
import {
  ArcGauge, MiniGauge, MiniScoreRing, LightScoreRing,
  SystemTag, SystemDetailPanel, DtcCard, DtcGroup,
  HERO_GAUGES, COMPACT_GAUGES, SYSTEMS,
  scoreColorLight, riskColorLight, severityColorLight,
} from './demo-components';

/* ── Flow state machine ──────────────────────────────────────────── */

type LivePhase = 'idle' | 'starting' | 'streaming' | 'paused';
type ScanPhase = 'idle' | 'scanning' | 'analyzing' | 'complete';
type DtcPhase = 'idle' | 'reading' | 'complete';

/* ── Timing config ───────────────────────────────────────────────── */

const LIVE_TICK_MS = 250;            // 4Hz
const SCAN_TOTAL_MS = 8000;          // ~8s for full scan
const SCAN_TICK_MS = 80;
const DTC_READ_MS = 1800;

/* ── Scan feed scripted timeline ─────────────────────────────────── */

interface FeedLine { kind: 'phase' | 'pulse' | 'system'; title: string; subtitle?: string; score?: number; color?: string; }

function buildFeedTimeline(caseData: DemoCase): FeedLine[] {
  const lines: FeedLine[] = [
    { kind: 'phase', title: 'CONNECTED', subtitle: 'Adapter link established — reading ECU protocol' },
    { kind: 'phase', title: 'ENGINE LOADED', subtitle: 'Diagnostic rules & PID definitions ready' },
    { kind: 'pulse', title: 'Cycle 1/10 — capturing 28 PIDs' },
    { kind: 'pulse', title: 'Cycle 3/10 — sampling live sensor data' },
    { kind: 'pulse', title: 'Cycle 6/10 — building trend data' },
    { kind: 'pulse', title: 'Cycle 10/10 — samples complete' },
    { kind: 'phase', title: 'SYSTEM EVAL', subtitle: 'Evaluating 6 vehicle systems against rule sets' },
  ];
  // Inject per-system scores — shows each subsystem lighting up in turn.
  for (const sys of caseData.analysis.systems) {
    lines.push({
      kind: 'system',
      title: sys.consumerName,
      score: sys.score,
      color: scoreColorLight(sys.score),
    });
  }
  lines.push({ kind: 'phase', title: 'CORRELATIONS', subtitle: 'Analyzing parameter relationships' });
  lines.push({ kind: 'phase', title: 'DIAGNOSTICS', subtitle: 'Pattern-matching against failure signatures' });
  lines.push({ kind: 'phase', title: 'SCORING', subtitle: 'Calculating weighted health scores' });
  lines.push({ kind: 'phase', title: 'FINDINGS', subtitle: 'Report ready' });
  return lines;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function DemoPage() {
  const [caseId, setCaseId] = useState<CaseId | null>(null);
  const caseData = caseId ? DEMO_CASES[caseId] : null;

  if (!caseData) {
    return <CasePicker onPick={setCaseId} />;
  }

  return <DemoFlow key={caseData.id} caseData={caseData} onExit={() => setCaseId(null)} />;
}

/* ═══════════════════════════════════════════════════════════════════
   CASE PICKER
   ═══════════════════════════════════════════════════════════════════ */

function CasePicker({ onPick }: { onPick: (id: CaseId) => void }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[11px] font-mono text-[var(--accent)] tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] status-dot" />
          Demo Mode
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Pick a scenario to explore
        </h1>
        <p className="text-sm text-white/50 mt-3 max-w-xl mx-auto leading-relaxed">
          Four simulated vehicles across the full severity spectrum. Each runs the complete diagnostic flow —
          live data, health scan, and fault codes — with real analysis output shape.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 animate-fade-up">
        {DEMO_CASE_ORDER.map(id => {
          const c = DEMO_CASES[id];
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.accentHex, boxShadow: `0 0 10px ${c.accentHex}80` }}
                />
                <span
                  className="text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: c.accentHex }}
                >
                  {c.riskTier}
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  {c.label}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{c.headline}</h3>
              <p className="text-xs text-white/40 font-mono mt-0.5">{c.vehicle}</p>
              <p className="text-sm text-white/60 mt-3 leading-relaxed">{c.scenario}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-white/30 uppercase">Score</span>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ color: c.accentHex }}
                  >
                    {Math.round(c.analysis.overallScore)}
                  </span>
                  <span className="text-xs text-white/30">/ 100</span>
                </div>
                <span className="text-xs text-white/40 group-hover:text-[var(--accent)] transition-colors">
                  Run demo →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-center text-white/30 mt-8 font-mono">
        no OBD adapter required · all data simulated
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN DEMO FLOW
   ═══════════════════════════════════════════════════════════════════ */

function DemoFlow({ caseData, onExit }: { caseData: DemoCase; onExit: () => void }) {
  const [livePhase, setLivePhase] = useState<LivePhase>('idle');
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [dtcPhase, setDtcPhase] = useState<DtcPhase>('idle');
  const [liveSnap, setLiveSnap] = useState<PidSnapshot | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [feedLines, setFeedLines] = useState<FeedLine[]>([]);
  const [activeSection, setActiveSection] = useState<'live' | 'scan' | 'dtc'>('live');

  const streamStartRef = useRef<number>(0);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => buildFeedTimeline(caseData), [caseData]);

  /* ── Section scroll-spy ───────────────────────────────────────── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id as 'live' | 'scan' | 'dtc');
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    for (const id of ['live', 'scan', 'dtc']) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* ── Live data ticker ─────────────────────────────────────────── */
  useEffect(() => {
    if (livePhase === 'streaming') {
      streamStartRef.current = performance.now();
      liveTimerRef.current = setInterval(() => {
        const t = (performance.now() - streamStartRef.current) / 1000;
        setLiveSnap(tickLiveSnapshot(caseData, t));
        setSampleCount(c => c + 1);
      }, LIVE_TICK_MS);
      return () => {
        if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      };
    }
  }, [livePhase, caseData]);

  const startStream = useCallback(() => {
    setLivePhase('starting');
    setSampleCount(0);
    setTimeout(() => {
      setLiveSnap(tickLiveSnapshot(caseData, 0));
      setLivePhase('streaming');
    }, 400);
  }, [caseData]);

  const pauseStream = useCallback(() => setLivePhase('paused'), []);
  const resumeStream = useCallback(() => setLivePhase('streaming'), []);
  const stopStream = useCallback(() => {
    setLivePhase('idle');
    setLiveSnap(null);
    setSampleCount(0);
  }, []);

  /* ── Scan simulation ──────────────────────────────────────────── */
  const startScan = useCallback(() => {
    // Auto-pause live stream, like /diag does.
    if (livePhase === 'streaming') setLivePhase('paused');
    setScanPhase('scanning');
    setScanProgress(0);
    setFeedLines([]);

    const start = performance.now();
    const totalSteps = timeline.length;
    let revealedCount = 0;

    scanTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - start;
      const frac = Math.min(1, elapsed / SCAN_TOTAL_MS);
      setScanProgress(frac);

      const targetRevealed = Math.min(totalSteps, Math.floor(frac * totalSteps));
      if (targetRevealed > revealedCount) {
        const newLines = timeline.slice(0, targetRevealed);
        revealedCount = targetRevealed;
        setFeedLines(newLines);
      }

      if (frac >= 1) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        setScanPhase('analyzing');
        setFeedLines(timeline);
        setTimeout(() => {
          setScanPhase('complete');
          setTimeout(() => scrollTo('scan'), 300);
        }, 600);
      }
    }, SCAN_TICK_MS);
  }, [livePhase, timeline, scrollTo]);

  const resetScan = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    setScanPhase('idle');
    setScanProgress(0);
    setFeedLines([]);
  }, []);

  /* ── DTC simulation ───────────────────────────────────────────── */
  const startDtcRead = useCallback(() => {
    setDtcPhase('reading');
    setTimeout(() => {
      setDtcPhase('complete');
      setTimeout(() => scrollTo('dtc'), 300);
    }, DTC_READ_MS);
  }, [scrollTo]);

  const resetDtc = useCallback(() => {
    setDtcPhase('idle');
  }, []);

  /* ── Auto-scroll scan feed ────────────────────────────────────── */
  useEffect(() => {
    const el = feedEndRef.current;
    if (el?.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight;
  }, [feedLines.length]);

  /* ── Cleanup on unmount ───────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  /* ── Derived ──────────────────────────────────────────────────── */
  const isStreaming = livePhase === 'streaming' || livePhase === 'paused';
  const isScanning = scanPhase === 'scanning' || scanPhase === 'analyzing';
  const isScanComplete = scanPhase === 'complete';
  const showDtcResult = dtcPhase === 'complete';

  const systemScoresSoFar = useMemo(() => {
    const out: Record<string, number> = {};
    for (const line of feedLines) {
      if (line.kind === 'system' && line.score != null) {
        const sys = caseData.analysis.systems.find(s => s.consumerName === line.title);
        if (sys) out[sys.system] = line.score;
      }
    }
    return out;
  }, [feedLines, caseData]);

  const activeKeys = useMemo(
    () => liveSnap ? PID_SNAPSHOT_KEYS.filter(k => liveSnap[k] != null) : [],
    [liveSnap]
  );

  const totalDtcCount =
    caseData.dtcs.stored.length + caseData.dtcs.pending.length + caseData.dtcs.permanent.length;

  return (
    <>
      {/* ── Demo banner + section nav ─────────────────────────── */}
      <DemoHeader
        caseData={caseData}
        onExit={onExit}
        activeSection={activeSection}
        onNavigate={scrollTo}
        isStreaming={livePhase === 'streaming'}
        scanScore={isScanComplete ? caseData.analysis.overallScore : null}
        dtcCount={showDtcResult ? totalDtcCount : 0}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-8 flex flex-col gap-6">

        {/* ═══ Scenario briefing ═══ */}
        <section className="segment-card animate-fade-up">
          <ScenarioBriefing caseData={caseData} />
        </section>

        {/* ═══ LIVE DATA ═══ */}
        <section id="live" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">
          {livePhase === 'idle' && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">1</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Live Monitoring</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Simulated sensor stream based on this vehicle&apos;s condition. Watch the values respond to the scenario.
              </p>
              <Button onClick={startStream} size="lg" className="rounded-2xl !px-10 mt-6">
                Start Stream
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">demo · 4 Hz · jittered values</p>
            </div>
          )}

          {livePhase === 'starting' && (
            <div className="flex flex-col items-center py-16 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Initializing stream…</p>
            </div>
          )}

          {livePhase === 'paused' && isScanning && (
            <div className="text-center py-10 animate-fade-up">
              <p className="text-xs text-gray-400 font-mono">Live data paused during scan</p>
            </div>
          )}

          {(livePhase === 'streaming' || (livePhase === 'paused' && !isScanning)) && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center">
                <div className="relative flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200">
                  <div
                    className="absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-full bg-gray-900 transition-all duration-300 ease-in-out"
                    style={{ left: livePhase === 'streaming' ? '2px' : 'calc(50%)' }}
                  />
                  <button
                    onClick={() => livePhase === 'streaming' ? pauseStream() : resumeStream()}
                    className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-300 ${
                      livePhase === 'streaming' ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    Pause
                  </button>
                  <button
                    onClick={stopStream}
                    className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-300 ${
                      livePhase === 'paused' ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    Stop
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
                  {sampleCount > 0 && <span className="tabular-nums">{sampleCount} samples</span>}
                  {activeKeys.length > 0 && <span>{activeKeys.length} PIDs</span>}
                  {livePhase === 'streaming' && (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot" />
                      LIVE (DEMO)
                    </span>
                  )}
                  {livePhase === 'paused' && <span className="text-yellow-600">PAUSED</span>}
                </div>
              </div>

              <div className="flex justify-center items-center gap-1 sm:gap-10 py-2 max-w-full">
                {HERO_GAUGES.map(g => (
                  <ArcGauge
                    key={g.key} label={g.label}
                    value={liveSnap?.[g.key] as number | null | undefined}
                    unit={g.unit} min={g.min} max={g.max} size={180}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COMPACT_GAUGES.map(g => (
                  <MiniGauge
                    key={g.key} label={g.label}
                    value={liveSnap?.[g.key] as number | null | undefined}
                    unit={g.unit} min={g.min} max={g.max}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ═══ HEALTH SCAN ═══ */}
        <section id="scan" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">
          {scanPhase !== 'idle' && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Health Scan</h2>
              {isScanComplete && (
                <button onClick={resetScan} className="text-xs font-mono text-gray-400 hover:text-gray-600 transition-colors">
                  Run Again
                </button>
              )}
            </div>
          )}

          {scanPhase === 'idle' && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">2</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Health Scan</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Run a full check-up across 6 systems — engine, fuel, emissions, electrical, thermal, intake.
              </p>
              <Button onClick={startScan} size="lg" className="rounded-2xl !px-10 mt-6">
                Scan Vehicle
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">10 cycles · 6 systems · ~8 seconds (demo speed)</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {SYSTEMS.map(s => (
                  <span key={s.key} className="text-[11px] font-mono text-gray-400 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                    {s.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex items-center gap-4">
                <MiniScoreRing score={scanProgress * 100} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">
                    {scanPhase === 'analyzing' ? 'Finalizing analysis…' : 'Scanning…'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {feedLines.length > 0 ? feedLines[feedLines.length - 1].title : 'Initializing'}
                  </p>
                  <div className="h-1 rounded-full bg-gray-200 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
                      style={{ width: `${scanProgress * 100}%`, boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {SYSTEMS.map(s => {
                  const score = systemScoresSoFar[s.key];
                  return (
                    <SystemTag
                      key={s.key}
                      name={s.name}
                      score={score}
                      done={score != null}
                    />
                  );
                })}
              </div>

              <div className="glass rounded-xl p-2.5 max-h-40 overflow-y-auto border border-gray-200">
                <div className="text-[11px] font-mono text-gray-300 uppercase tracking-wider mb-1.5">Scan Feed</div>
                {feedLines.slice(-10).map((line, i) => <FeedLineRow key={i} line={line} />)}
                <div ref={feedEndRef} />
              </div>
            </div>
          )}

          {isScanComplete && (
            <ScanResults result={caseData.analysis} caseData={caseData} />
          )}
        </section>

        {/* ═══ FAULT CODES ═══ */}
        <section id="dtc" className="scroll-mt-14 md:scroll-mt-[70px] segment-card">
          {!(dtcPhase === 'idle') && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Fault Codes</h2>
              {showDtcResult && totalDtcCount > 0 && (
                <div className="flex items-center gap-1.5">
                  {caseData.dtcs.stored.length > 0 && <Badge color="red">{caseData.dtcs.stored.length} stored</Badge>}
                  {caseData.dtcs.pending.length > 0 && <Badge color="yellow">{caseData.dtcs.pending.length} pending</Badge>}
                  {caseData.dtcs.permanent.length > 0 && <Badge color="orange">{caseData.dtcs.permanent.length} perm</Badge>}
                </div>
              )}
            </div>
          )}

          {dtcPhase === 'idle' && (
            <div className="flex flex-col items-center text-center animate-fade-up">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-emerald-500 text-white text-sm sm:text-base font-bold">3</span>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Fault Code Check</h3>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
                Read diagnostic trouble codes stored in the vehicle&apos;s computer.
              </p>
              <Button onClick={startDtcRead} size="lg" className="rounded-2xl !px-10 mt-6">
                Read Fault Codes
              </Button>
              <p className="text-xs text-gray-400 mt-4 font-mono">stored · pending · permanent codes</p>
            </div>
          )}

          {dtcPhase === 'reading' && (
            <div className="flex flex-col items-center py-12 text-center animate-fade-up">
              <div className="w-10 h-10 border-2 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Reading fault codes…</p>
            </div>
          )}

          {showDtcResult && totalDtcCount === 0 && (
            <div className="flex flex-col items-center py-12 text-center animate-fade-up">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-lg font-bold text-emerald-600">No Trouble Codes</p>
              <p className="text-sm text-gray-400 mt-1">This vehicle has no stored fault codes</p>
              <Button onClick={resetDtc} variant="secondary" size="sm" className="mt-4">
                Reset
              </Button>
            </div>
          )}

          {showDtcResult && totalDtcCount > 0 && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex items-center gap-2.5">
                <Button onClick={resetDtc} size="sm" variant="secondary">
                  Re-scan
                </Button>
                <span className="text-[11px] font-mono text-gray-300">
                  DEMO — codes will not be cleared
                </span>
              </div>

              <div className="space-y-3">
                {caseData.dtcs.stored.length > 0 && (
                  <DtcGroup label="Confirmed" color="red" count={caseData.dtcs.stored.length}>
                    {caseData.dtcs.stored.map(d => <DtcCard key={`s-${d.code}`} dtc={d} />)}
                  </DtcGroup>
                )}
                {caseData.dtcs.pending.length > 0 && (
                  <DtcGroup label="Pending" color="yellow" count={caseData.dtcs.pending.length}>
                    {caseData.dtcs.pending.map(d => <DtcCard key={`p-${d.code}`} dtc={d} />)}
                  </DtcGroup>
                )}
                {caseData.dtcs.permanent.length > 0 && (
                  <DtcGroup label="Permanent" color="orange" count={caseData.dtcs.permanent.length}>
                    {caseData.dtcs.permanent.map(d => <DtcCard key={`pm-${d.code}`} dtc={d} />)}
                  </DtcGroup>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ═══ TALKING POINTS (demo-only teaching panel) ═══ */}
        {(isScanComplete || showDtcResult) && (
          <section className="segment-card animate-fade-up">
            <TalkingPointsPanel caseData={caseData} />
          </section>
        )}

        {/* Bottom spacer for mobile nav */}
        <div className="h-6" />
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function DemoHeader({
  caseData, onExit, activeSection, onNavigate, isStreaming, scanScore, dtcCount,
}: {
  caseData: DemoCase;
  onExit: () => void;
  activeSection: string;
  onNavigate: (id: string) => void;
  isStreaming: boolean;
  scanScore: number | null;
  dtcCount: number;
}) {
  const items = [
    { id: 'live', label: 'Live Data', badge: isStreaming ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" /> : null },
    { id: 'scan', label: 'Health Scan', badge: scanScore != null ? (
      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: caseData.accentHex }}>{Math.round(scanScore)}</span>
    ) : null },
    { id: 'dtc', label: 'Fault Codes', badge: dtcCount > 0 ? (
      <span className="min-w-[18px] h-[18px] rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold flex items-center justify-center px-1">{dtcCount}</span>
    ) : null },
  ];

  return (
    <div className="sticky top-0 md:top-[53px] z-40 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
      {/* demo indicator strip */}
      <div className="bg-[var(--accent)]/10 border-b border-[var(--accent)]/15 px-4 sm:px-6 py-1.5 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] status-dot" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)]">Demo Mode</span>
        </div>
        <span className="text-[11px] text-white/60 font-mono hidden sm:inline truncate">
          {caseData.vehicle} · {caseData.headline}
        </span>
        <button
          onClick={onExit}
          className="ml-auto text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          ← Change scenario
        </button>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-center py-2.5">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          {items.map(item => (
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

function ScenarioBriefing({ caseData }: { caseData: DemoCase }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${caseData.accentHex}18`, border: `1px solid ${caseData.accentHex}35` }}
      >
        <span
          className="text-lg font-bold uppercase tracking-widest"
          style={{ color: caseData.accentHex }}
        >
          {caseData.riskTier.slice(0, 3)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: caseData.accentHex }}
          >
            {caseData.riskTier}
          </span>
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">·</span>
          <span className="text-[10px] font-mono text-gray-400">{caseData.vehicle}</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{caseData.headline}</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">{caseData.explanation}</p>
      </div>
    </div>
  );
}

function FeedLineRow({ line }: { line: FeedLine }) {
  if (line.kind === 'phase') {
    return (
      <div className="flex items-center gap-2.5 py-1">
        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
        <span className="text-xs font-mono font-semibold text-emerald-600">{line.title}</span>
        {line.subtitle && <span className="text-xs text-gray-400">{line.subtitle}</span>}
      </div>
    );
  }
  if (line.kind === 'pulse') {
    return (
      <div className="flex items-center gap-2 py-0.5 pl-3.5">
        <span className="text-xs font-mono text-gray-400">{line.title}</span>
      </div>
    );
  }
  // system
  return (
    <div className="flex items-center justify-between pl-3.5 py-0.5">
      <span className="text-xs text-gray-500">{line.title}</span>
      <span
        className="text-xs font-bold font-mono tabular-nums"
        style={{ color: line.color ?? '#666' }}
      >
        {line.score != null ? Math.round(line.score) : '—'}
      </span>
    </div>
  );
}

function ScanResults({ result, caseData }: { result: FullAnalysisResult; caseData: DemoCase }) {
  return (
    <div className="space-y-5 animate-fade-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-6">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-15 blur-[80px] pointer-events-none"
          style={{ backgroundColor: scoreColorLight(result.overallScore) }}
        />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
          <LightScoreRing score={result.overallScore} size={140} strokeWidth={5} />
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Vehicle Health</h3>
            <p className={`text-sm font-bold mt-1.5 ${riskColorLight(result.overallRiskTier)}`}>
              {result.overallRiskTier}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs font-mono text-gray-400 tabular-nums">
              <span>{result.supportedPidCount} PIDs</span>
              <span>{result.scanCycles} cycles</span>
              <span>{(result.scanDurationMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(() => {
                const healthy = result.systems.filter(s => s.riskTier === 'Healthy').length;
                const issues = result.systems.reduce((n, s) => n + s.evaluatedRules.length, 0);
                return (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {healthy}/{result.systems.length} healthy
                    </span>
                    {issues > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
                        {issues} rules triggered
                      </span>
                    )}
                    {result.diagnosticMatches.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                        {result.diagnosticMatches.length} diagnostics
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Systems */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">System Analysis</h3>
          <span className="text-[11px] font-mono text-gray-300">{result.systems.length} systems</span>
        </div>
        <div className="space-y-2">
          {[...result.systems].sort((a, b) => a.score - b.score).map(sys => (
            <SystemDetailPanel key={sys.system} sys={sys} />
          ))}
        </div>
      </div>

      {/* Diagnostics */}
      {result.diagnosticMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Diagnostics</h3>
            <Badge color="red">{result.diagnosticMatches.length}</Badge>
          </div>
          <div className="space-y-1.5">
            {[...result.diagnosticMatches].sort((a, b) => b.repairPriority - a.repairPriority).map((d, i) => (
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
      {result.correlationResults.length > 0 && (
        <div>
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Correlations</h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {result.correlationResults.map((c, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">{c.name}</span>
                  <span className={`text-[11px] font-mono font-bold ${
                    c.status === 'normal' ? 'text-emerald-600' :
                    c.status === 'critical' ? 'text-red-500' : 'text-yellow-600'
                  }`}>{c.status}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{c.consumerMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TalkingPointsPanel({ caseData }: { caseData: DemoCase }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--accent)]">
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4M8 5a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">What to notice</h3>
        <span
          className="text-[10px] font-mono uppercase tracking-widest ml-auto"
          style={{ color: caseData.accentHex }}
        >
          {caseData.riskTier}
        </span>
      </div>
      <div className="space-y-2">
        {caseData.talkingPoints.map((pt, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span
              className="flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
              style={{ backgroundColor: caseData.accentHex }}
            >
              {i + 1}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{pt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
