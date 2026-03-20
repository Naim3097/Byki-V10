// ─── DTC Store (Zustand) ─────────────────────────────────────────────
// Port of dtc_provider.dart → Zustand store.

import { create } from 'zustand';
import type { DtcCode, DtcScanResult } from '../models';
import { useBluetoothStore } from './bluetooth-store';

export type DtcState = 'idle' | 'reading' | 'clearing' | 'complete' | 'error';

interface DtcStoreState {
  state: DtcState;
  scanResult: DtcScanResult | null;
  errorMessage: string;

  // Computed
  storedDtcs: DtcCode[];
  pendingDtcs: DtcCode[];
  permanentDtcs: DtcCode[];
  totalCount: number;
  hasDtcs: boolean;

  // Actions
  readDtcs: () => Promise<void>;
  clearDtcs: () => Promise<void>;
  reset: () => void;
}

export const useDtcStore = create<DtcStoreState>((set, get) => ({
  state: 'idle',
  scanResult: null,
  errorMessage: '',
  storedDtcs: [],
  pendingDtcs: [],
  permanentDtcs: [],
  totalCount: 0,
  hasDtcs: false,

  readDtcs: async () => {
    set({ state: 'reading', errorMessage: '' });
    try {
      const bt = useBluetoothStore.getState();
      const obdScan = await bt.getOrCreateObdScan();
      const result = await obdScan.readDtcs();

      set({
        state: 'complete',
        scanResult: result,
        storedDtcs: result.stored,
        pendingDtcs: result.pending,
        permanentDtcs: result.permanent,
        totalCount: result.stored.length + result.pending.length + result.permanent.length,
        hasDtcs: result.stored.length + result.pending.length + result.permanent.length > 0,
      });
    } catch (e: any) {
      set({
        state: 'error',
        errorMessage: `Failed to read fault codes: ${String(e).replace('Error: ', '')}`,
      });
    }
  },

  clearDtcs: async () => {
    set({ state: 'clearing' });
    try {
      const bt = useBluetoothStore.getState();
      const obdScan = await bt.getOrCreateObdScan();
      const success = await obdScan.clearDtcs();

      if (success) {
        const prev = get().scanResult;
        const result: DtcScanResult = {
          stored: [],
          pending: [],
          permanent: prev?.permanent ?? [],
          scannedAt: new Date(),
        };
        set({
          state: 'complete',
          scanResult: result,
          storedDtcs: [],
          pendingDtcs: [],
          permanentDtcs: result.permanent,
          totalCount: result.permanent.length,
          hasDtcs: result.permanent.length > 0,
        });
      } else {
        set({ state: 'error', errorMessage: 'Failed to clear codes. Try again.' });
      }
    } catch (e: any) {
      set({
        state: 'error',
        errorMessage: `Failed to clear fault codes: ${String(e).replace('Error: ', '')}`,
      });
    }
  },

  reset: () => {
    set({
      state: 'idle',
      scanResult: null,
      errorMessage: '',
      storedDtcs: [],
      pendingDtcs: [],
      permanentDtcs: [],
      totalCount: 0,
      hasDtcs: false,
    });
  },
}));
