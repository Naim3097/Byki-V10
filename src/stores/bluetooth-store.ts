// ─── Bluetooth Store (Zustand) ───────────────────────────────────────
// Port of bluetooth_provider.dart → Zustand store.

import { create } from 'zustand';
import type { AdapterInfo } from '../models';
import { WebBluetoothService } from '../core/web-bluetooth-service';
import { OBDScanService } from '../core/obd-scan-service';

export type BleConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

interface BluetoothState {
  state: BleConnectionState;
  connectedAdapter: AdapterInfo | null;
  errorMessage: string | null;
  obdScanService: OBDScanService | null;

  // Computed
  isConnected: boolean;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  getOrCreateObdScan: () => Promise<OBDScanService>;
  getOrCreateRaw: () => OBDScanService;
  clearError: () => void;
}

function friendlyError(error: string): string {
  if (error.includes('not supported')) return 'Web Bluetooth not supported in this browser';
  if (error.includes('permission') || error.includes('cancelled')) return 'Bluetooth permission required — select a device';
  if (error.includes('timeout') || error.includes('Timeout')) return 'Connection timed out — try again';
  if (error.includes('characteristics not found')) return 'Not a compatible OBD2 adapter';
  return 'Connection failed — check adapter and try again';
}

// Lazy singleton — only instantiated when first accessed in the browser
let _bleService: WebBluetoothService | null = null;
function getBleService(): WebBluetoothService {
  if (!_bleService) _bleService = new WebBluetoothService();
  return _bleService;
}

export const useBluetoothStore = create<BluetoothState>((set, get) => ({
  state: 'disconnected',
  connectedAdapter: null,
  errorMessage: null,
  obdScanService: null,
  isConnected: false,

  connect: async () => {
    set({ state: 'connecting', errorMessage: null, obdScanService: null });
    try {
      const ble = getBleService();
      let info = await ble.requestAndConnect();
      info = await ble.detectAdapterType(info);
      set({ connectedAdapter: info, state: 'connected', isConnected: true });
      return true;
    } catch (e: any) {
      set({ state: 'error', errorMessage: friendlyError(String(e)), isConnected: false });
      return false;
    }
  },

  disconnect: async () => {
    const { obdScanService } = get();
    obdScanService?.dispose();
    getBleService().disconnect();
    set({
      connectedAdapter: null,
      obdScanService: null,
      state: 'disconnected',
      isConnected: false,
    });
  },

  getOrCreateObdScan: async () => {
    const existing = get().obdScanService;
    if (existing) return existing;
    const svc = new OBDScanService(getBleService());
    await svc.initializeAdapter(get().connectedAdapter ?? undefined);
    set({ obdScanService: svc });
    return svc;
  },

  getOrCreateRaw: () => {
    const existing = get().obdScanService;
    if (existing) return existing;
    const svc = new OBDScanService(getBleService());
    set({ obdScanService: svc });
    return svc;
  },

  clearError: () => {
    set({ errorMessage: null, state: 'disconnected' });
  },
}));
