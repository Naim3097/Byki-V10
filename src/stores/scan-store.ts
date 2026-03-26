// ─── Scan Store (Zustand) ────────────────────────────────────────────
// Port of scan_provider.dart → Zustand store.

import { create } from 'zustand';
import type { FullAnalysisResult, SystemHealthReport, DiagnosticMatch, CorrelationResult } from '../models';
import type { ScanProgressEvent } from '../core/obd-scan-service';
import { useBluetoothStore } from './bluetooth-store';

export type ScanState =
  | 'idle'
  | 'startingAgent'
  | 'discoveringPids'
  | 'scanning'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface ScanLogEntry {
  text: string;
  phase: string;
  timestamp: number;
  pidData?: Record<string, number>;
}

export type FeedCardType = 'phase' | 'pulse' | 'analysis' | 'sparkline' | 'systemScore' | 'finding' | 'correlation';

export interface ScanFeedCard {
  type: FeedCardType;
  title: string;
  subtitle?: string;
  phase: string;
  timestamp: number;
  pidData?: Record<string, number>;
  cycleNumber?: number;
  totalCycles?: number;
  pidCount?: number;
  analysis?: FullAnalysisResult;
  systemReport?: SystemHealthReport;
  diagnosticMatch?: DiagnosticMatch;
  correlationHighlight?: CorrelationResult;
  trendData?: Record<string, number[]>;
}

const PHASE_INFO: Record<string, [string, string]> = {
  connect: ['CONNECTED', 'Adapter link established — reading ECU protocol'],
  loading: ['ENGINE LOADED', 'Diagnostic rules and PID definitions loaded'],
  sampling: ['SAMPLING', 'Capturing live sensor data from ECU'],
  systems: ['SYSTEM EVAL', 'Evaluating 6 vehicle systems against rule sets'],
  metrics: ['METRICS', 'Computing derived metrics from multi-cycle data'],
  diagnostics: ['DIAGNOSTICS', 'Pattern-matching against known failure signatures'],
  correlations: ['CORRELATIONS', 'Analyzing parameter relationships for anomalies'],
  scoring: ['SCORING', 'Calculating weighted health scores'],
  findings: ['FINDINGS', 'Compiling diagnostic results'],
};

interface ScanStoreState {
  state: ScanState;
  result: FullAnalysisResult | null;
  progress: number;
  progressMessage: string;
  progressDetail: string;
  progressPhase: string;
  progressCount: number;
  progressTotal: number;
  errorMessage: string;
  supportedPids: number[];
  completedPhases: string[];
  scanLog: ScanLogEntry[];
  feedCards: ScanFeedCard[];
  latestPidData: Record<string, number>;

  // Internal
  _lastFeedPhase: string;
  _pidHistory: Record<string, number[]>;

  // Actions
  startHealthScan: (cycles?: number) => Promise<void>;
  reset: () => void;
}

export const useScanStore = create<ScanStoreState>((set, get) => ({
  state: 'idle',
  result: null,
  progress: 0,
  progressMessage: '',
  progressDetail: '',
  progressPhase: '',
  progressCount: 0,
  progressTotal: 0,
  errorMessage: '',
  supportedPids: [],
  completedPhases: [],
  scanLog: [],
  feedCards: [],
  latestPidData: {},
  _lastFeedPhase: '',
  _pidHistory: {},

  startHealthScan: async (cycles = 10) => {
    set({
      state: 'startingAgent',
      result: null,
      progress: 0,
      progressMessage: 'Initializing adapter...',
      errorMessage: '',
      completedPhases: [],
      scanLog: [{ text: 'BYKI Health Scan v9.0 Web', phase: 'init', timestamp: Date.now() }],
      feedCards: [],
      _lastFeedPhase: '',
      latestPidData: {},
      _pidHistory: {},
    });

    try {
      const bt = useBluetoothStore.getState();
      const obdScan = bt.getOrCreateRaw();

      // Listen to progress
      const onProgress = (evt: ScanProgressEvent) => {
        const s = get();
        const newPhase = evt.phase ?? '';
        const completedPhases = [...s.completedPhases];
        if (newPhase && newPhase !== s.progressPhase && s.progressPhase) {
          completedPhases.push(s.progressPhase);
        }

        const pidData = evt.pidData;
        const latestPidData = pidData && Object.keys(pidData).length > 0 ? pidData : s.latestPidData;

        // Build log
        const newLog = [...s.scanLog];
        newLog.push({
          text: evt.message ?? evt.phase ?? '',
          phase: newPhase,
          timestamp: Date.now(),
          pidData,
        });
        if (newLog.length > 200) newLog.shift();

        // Build feed cards
        const feedCards = [...s.feedCards];
        const pidHistory = { ...s._pidHistory };
        let lastFeedPhase = s._lastFeedPhase;

        // Accumulate PID history
        if (pidData) {
          for (const [k, v] of Object.entries(pidData)) {
            if (!pidHistory[k]) pidHistory[k] = [];
            pidHistory[k].push(v);
          }
        }

        // Phase card
        if (newPhase && newPhase !== lastFeedPhase) {
          lastFeedPhase = newPhase;
          const info = PHASE_INFO[newPhase];
          feedCards.push({
            type: 'phase',
            title: info?.[0] ?? newPhase.toUpperCase(),
            subtitle: info?.[1] ?? (evt.detail ?? evt.message ?? ''),
            phase: newPhase,
            timestamp: Date.now(),
          });
        }

        // Pulse card (per-cycle PID snapshot)
        if (pidData && Object.keys(pidData).length > 0 && evt.count != null) {
          feedCards.push({
            type: 'pulse',
            title: `C${evt.count}${evt.total != null ? `/${evt.total}` : ''}`,
            subtitle: `${Object.keys(pidData).length} values`,
            phase: newPhase,
            timestamp: Date.now(),
            cycleNumber: evt.count,
            totalCycles: evt.total,
            pidData,
            pidCount: Object.keys(pidData).length,
          });
        }

        set({
          progress: evt.progress ?? s.progress,
          progressMessage: evt.message ?? evt.phase ?? s.progressMessage,
          progressDetail: evt.detail ?? '',
          progressPhase: newPhase,
          progressCount: evt.count ?? 0,
          progressTotal: evt.total ?? 0,
          completedPhases,
          scanLog: newLog,
          feedCards,
          latestPidData,
          _lastFeedPhase: lastFeedPhase,
          _pidHistory: pidHistory,
        });
      };

      const unsubProgress = obdScan.onProgress(onProgress);

      await obdScan.initializeAdapter(bt.connectedAdapter ?? undefined);

      set({ state: 'discoveringPids' });
      set({ state: 'scanning' });

      const result = await obdScan.performHealthScan(cycles);
      unsubProgress();

      set({
        state: 'complete',
        result,
        progress: 1,
        progressMessage: 'Scan complete',
      });
    } catch (e: any) {
      set({
        state: 'error',
        errorMessage: `Scan failed: ${String(e).replace('Error: ', '')}`,
      });
    }
  },

  reset: () => {
    set({
      state: 'idle',
      result: null,
      progress: 0,
      progressMessage: '',
      progressDetail: '',
      progressPhase: '',
      progressCount: 0,
      progressTotal: 0,
      errorMessage: '',
      supportedPids: [],
      completedPhases: [],
      scanLog: [],
      feedCards: [],
      _lastFeedPhase: '',
      latestPidData: {},
      _pidHistory: {},
    });
  },
}));
