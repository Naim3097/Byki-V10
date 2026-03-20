// ─── Live Data Store (Zustand) ───────────────────────────────────────
// Port of live_data_provider.dart → Zustand store.

import { create } from 'zustand';
import type { PidSnapshot, PidDefinition } from '../models';
import { loadPidDefinitions, statusForValue } from '../models/pid-definition';
import { useBluetoothStore } from './bluetooth-store';

export type LiveDataState = 'idle' | 'starting' | 'streaming' | 'paused' | 'error';

const MAX_BUFFER_SIZE = 300;

interface PidStats {
  min: number;
  max: number;
  sum: number;
  count: number;
}

interface LiveDataStoreState {
  state: LiveDataState;
  buffer: PidSnapshot[];
  sampleCount: number;
  sessionStartMs: number | null;
  latestSnapshot: PidSnapshot | null;
  pidDefs: Map<number, PidDefinition>;

  // Computed
  frequency: number;
  sessionDurationText: string;

  // Actions
  startStream: () => Promise<void>;
  pauseStream: () => void;
  resumeStream: () => void;
  reset: () => void;

  // Internal
  _sessionStats: Record<string, PidStats>;
  _abortController: AbortController | null;
  _uiTimer: ReturnType<typeof setInterval> | null;
  _dirty: boolean;

  // Queries
  statsFor: (key: string) => { min: number; max: number; avg: number } | null;
}

export const useLiveDataStore = create<LiveDataStoreState>((set, get) => ({
  state: 'idle',
  buffer: [],
  sampleCount: 0,
  sessionStartMs: null,
  latestSnapshot: null,
  pidDefs: new Map(),
  frequency: 0,
  sessionDurationText: '00:00',
  _sessionStats: {},
  _abortController: null,
  _uiTimer: null,
  _dirty: false,

  startStream: async () => {
    // Load PID definitions
    let defs = get().pidDefs;
    if (defs.size === 0) {
      try {
        defs = await loadPidDefinitions();
      } catch { /* keep empty */ }
    }

    set({
      state: 'starting',
      buffer: [],
      sampleCount: 0,
      sessionStartMs: Date.now(),
      latestSnapshot: null,
      pidDefs: defs,
      _sessionStats: {},
      _dirty: false,
    });

    try {
      const bt = useBluetoothStore.getState();
      const obdScan = await bt.getOrCreateObdScan();

      const ac = new AbortController();
      set({ state: 'streaming', _abortController: ac });

      // UI throttle timer (~20Hz)
      const timer = setInterval(() => {
        const s = get();
        if (s._dirty) {
          const elapsed = s.sessionStartMs ? Date.now() - s.sessionStartMs : 0;
          const freq = elapsed > 0 ? s.sampleCount / (elapsed / 1000) : 0;
          const min = Math.floor(elapsed / 60000);
          const sec = Math.floor((elapsed / 1000) % 60);
          set({
            _dirty: false,
            frequency: Math.min(99, freq),
            sessionDurationText: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
          });
        }
      }, 50);
      set({ _uiTimer: timer });

      // Stream live data via async generator
      const stream = obdScan.streamLiveData();
      for await (const snapshot of stream) {
        if (ac.signal.aborted) break;

        const s = get();
        const newBuffer = [...s.buffer, snapshot];
        if (newBuffer.length > MAX_BUFFER_SIZE) newBuffer.shift();

        set({
          buffer: newBuffer,
          sampleCount: s.sampleCount + 1,
          latestSnapshot: snapshot,
          _dirty: true,
        });
      }
    } catch {
      const timer = get()._uiTimer;
      if (timer) clearInterval(timer);
      set({ state: 'error', _uiTimer: null });
    }
  },

  pauseStream: () => {
    const { _abortController, _uiTimer } = get();
    _abortController?.abort();
    if (_uiTimer) clearInterval(_uiTimer);
    set({ state: 'paused', _abortController: null, _uiTimer: null });
  },

  resumeStream: () => {
    const s = get();
    if (s.state !== 'paused') return;

    // Restart the stream from scratch, keeping existing buffer/stats
    const bt = useBluetoothStore.getState();
    bt.getOrCreateObdScan().then(obdScan => {
      const ac = new AbortController();
      set({ state: 'streaming', _abortController: ac });

      // UI throttle timer (~20Hz)
      const timer = setInterval(() => {
        const st = get();
        if (st._dirty) {
          const elapsed = st.sessionStartMs ? Date.now() - st.sessionStartMs : 0;
          const freq = elapsed > 0 ? st.sampleCount / (elapsed / 1000) : 0;
          const min = Math.floor(elapsed / 60000);
          const sec = Math.floor((elapsed / 1000) % 60);
          set({
            _dirty: false,
            frequency: Math.min(99, freq),
            sessionDurationText: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
          });
        }
      }, 50);
      set({ _uiTimer: timer });

      // Re-enter streaming loop
      (async () => {
        try {
          const stream = obdScan.streamLiveData();
          for await (const snapshot of stream) {
            if (ac.signal.aborted) break;
            const cur = get();
            const newBuffer = [...cur.buffer, snapshot];
            if (newBuffer.length > MAX_BUFFER_SIZE) newBuffer.shift();
            set({
              buffer: newBuffer,
              sampleCount: cur.sampleCount + 1,
              latestSnapshot: snapshot,
              _dirty: true,
            });
          }
        } catch {
          const t = get()._uiTimer;
          if (t) clearInterval(t);
          set({ state: 'error', _uiTimer: null });
        }
      })();
    }).catch(() => {
      set({ state: 'error' });
    });
  },

  reset: () => {
    const { _abortController, _uiTimer } = get();
    _abortController?.abort();
    if (_uiTimer) clearInterval(_uiTimer);
    set({
      state: 'idle',
      buffer: [],
      sampleCount: 0,
      sessionStartMs: null,
      latestSnapshot: null,
      frequency: 0,
      sessionDurationText: '00:00',
      _sessionStats: {},
      _abortController: null,
      _uiTimer: null,
      _dirty: false,
    });
  },

  statsFor: (key: string) => {
    const s = get()._sessionStats[key];
    if (!s || s.count === 0) return null;
    return { min: s.min, max: s.max, avg: s.sum / s.count };
  },
}));
