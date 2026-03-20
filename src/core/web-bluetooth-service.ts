// Web Bluetooth transport for OBD2 adapter communication.
// REWRITE of ble_service.dart — uses navigator.bluetooth (Web Bluetooth API)
// instead of flutter_blue_plus. Same GATT model, same UUIDs, same 20-byte packets.

import { type AdapterInfo, AdapterChipType, createAdapterInfo } from '../models/adapter-info';
import { AdapterQuirks } from './obd-protocol';

// Known OBD adapter BLE service UUIDs (same as V8)
const KNOWN_SERVICE_UUIDS: (number | string)[] = [
  0xFFF0, 0x18F0, 0xFFE0,
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

// Known characteristic UUIDs (TX/RX often share the same UUID)
const KNOWN_CHAR_UUIDS: number[] = [0xFFF1, 0xFFF2, 0x18F1, 0x18F2, 0xFFE1];

// Adapter name filters for browser device picker
const ADAPTER_NAME_PREFIXES = [
  'OBD', 'ELM', 'VGATE', 'ICAR', 'VEEPEAK', 'OBDLINK', 'STN', 'KONNWEI', 'CARISTA', 'BYKI',
];

export type BleConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type ConnectionStateListener = (state: BleConnectionState) => void;

export class WebBluetoothService {
  private device: BluetoothDevice | null = null;
  private txChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private responseBuffer = new BleResponseBuffer();
  private responseResolve: ((value: string) => void) | null = null;
  private connectionListeners: ConnectionStateListener[] = [];

  get isConnected(): boolean {
    return this.device?.gatt?.connected === true && this.txChar !== null;
  }

  static isAvailable(): boolean {
    return typeof navigator !== 'undefined' &&
           'bluetooth' in navigator &&
           typeof (navigator as Navigator & { bluetooth?: { requestDevice?: unknown } }).bluetooth?.requestDevice === 'function';
  }

  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private emitState(state: BleConnectionState): void {
    for (const l of this.connectionListeners) l(state);
  }

  /**
   * Request and connect to an OBD2 adapter via browser device picker.
   * Chrome shows a native Bluetooth dialog — the user selects the adapter.
   */
  async requestAndConnect(): Promise<AdapterInfo> {
    if (!WebBluetoothService.isAvailable()) {
      throw new Error('Web Bluetooth not supported in this browser');
    }

    this.emitState('connecting');

    const filters: BluetoothLEScanFilter[] = ADAPTER_NAME_PREFIXES.map(prefix => ({
      namePrefix: prefix,
    }));

    const optionalServices = KNOWN_SERVICE_UUIDS.map(uuid =>
      typeof uuid === 'number'
        ? BluetoothUUID.getService(uuid)
        : uuid
    );

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices,
      });

      const server = await this.device.gatt!.connect();

      // Discover OBD service and characteristics
      let foundTx = false;
      let foundRx = false;

      for (const serviceUuid of KNOWN_SERVICE_UUIDS) {
        try {
          const resolvedUuid = typeof serviceUuid === 'number'
            ? BluetoothUUID.getService(serviceUuid)
            : serviceUuid;
          const service = await server.getPrimaryService(resolvedUuid);

          // Try known characteristic UUIDs first
          for (const charUuid of KNOWN_CHAR_UUIDS) {
            try {
              const resolvedChar = BluetoothUUID.getCharacteristic(charUuid);
              const char = await service.getCharacteristic(resolvedChar);
              if (!foundTx && (char.properties.write || char.properties.writeWithoutResponse)) {
                this.txChar = char;
                foundTx = true;
              }
              if (!foundRx && char.properties.notify) {
                this.rxChar = char;
                foundRx = true;
              }
              if (foundTx && foundRx) break;
            } catch { /* try next UUID */ }
          }

          if (foundTx && foundRx) break;

          // Fallback: iterate all characteristics on this service
          if (!foundTx || !foundRx) {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (!foundTx && (char.properties.write || char.properties.writeWithoutResponse)) {
                this.txChar = char;
                foundTx = true;
              }
              if (!foundRx && char.properties.notify) {
                this.rxChar = char;
                foundRx = true;
              }
            }
          }

          if (foundTx && foundRx) break;
        } catch { /* try next service UUID */ }
      }

      if (!this.txChar || !this.rxChar) {
        await this.disconnect();
        throw new Error('OBD characteristics not found on this device');
      }

      // Subscribe to RX notifications
      await this.rxChar.startNotifications();
      this.rxChar.addEventListener('characteristicvaluechanged', this.handleNotification);

      // Handle disconnection events
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      this.emitState('connected');

      return createAdapterInfo({
        deviceId: this.device.id,
        deviceName: this.device.name || 'OBD Adapter',
        device: this.device,
      });
    } catch (e: unknown) {
      this.emitState('error');
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        throw new Error('No adapter selected');
      }
      throw e;
    }
  }

  private handleNotification = (event: Event): void => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const chunk = new TextDecoder().decode(value);
    const response = this.responseBuffer.addChunk(chunk);
    if (response !== null && this.responseResolve) {
      this.responseResolve(response);
      this.responseResolve = null;
    }
  };

  private handleDisconnect = (): void => {
    this.txChar = null;
    this.rxChar = null;
    this.emitState('disconnected');
  };

  /** Send AT/OBD command and wait for complete response (terminated by '>'). */
  async sendCommand(command: string, timeoutMs = 3000): Promise<string> {
    if (!this.txChar) throw new Error('Not connected to adapter');

    this.responseBuffer.clear();

    const bytes = new TextEncoder().encode(`${command}\r`);
    if (this.txChar.properties.writeWithoutResponse) {
      await this.txChar.writeValueWithoutResponse(bytes);
    } else {
      await this.txChar.writeValueWithResponse(bytes);
    }

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.responseResolve = null;
        reject(new Error(`Timeout: no response for "${command}"`));
      }, timeoutMs);

      this.responseResolve = (value: string) => {
        clearTimeout(timer);
        resolve(value);
      };
    });
  }

  /** Detect adapter chip type via ATI and AT@1 commands. */
  async detectAdapterType(adapter: AdapterInfo): Promise<AdapterInfo> {
    const atiResponse = await this.sendCommand('ATI');
    let at1Response: string;
    try {
      at1Response = await this.sendCommand('AT@1');
    } catch {
      at1Response = '?';
    }

    const ati = atiResponse.toUpperCase().trim();
    const atat = at1Response.toUpperCase().trim();
    const name = adapter.deviceName.toUpperCase();

    let chipType: AdapterChipType;

    if (ati.includes('STN') || atat.includes('STN') || atat.includes('OBDLINK')) {
      chipType = AdapterChipType.STN_OBDLINK;
    } else if (ati.includes('VGATE') || atat.includes('VGATE') ||
               name.includes('VGATE') || name.includes('ICAR')) {
      chipType = AdapterChipType.VGATE;
    } else if (ati.includes('ELM327') || ati.includes('ELM 327')) {
      const isClone = !ati.includes('V2.2') && !ati.includes('V2.3');
      chipType = isClone ? AdapterChipType.ELM327_CLONE : AdapterChipType.ELM327_GENUINE;
    } else {
      chipType = AdapterChipType.UNKNOWN;
    }

    const quirks = AdapterQuirks.forChipType(chipType);
    return {
      ...adapter,
      chipType,
      maxBatchPids: quirks.maxPidsPerRequest,
      commandDelayMs: quirks.interCommandDelayMs,
    };
  }

  /** Initialize ELM327 protocol — same AT sequence as V8. */
  async initializeAdapter(): Promise<string> {
    await this.sendCommand('AT Z', 4000);
    await delay(1500);
    await this.sendCommand('AT E0');
    await this.sendCommand('AT L0');
    await this.sendCommand('AT S0');
    await this.sendCommand('AT S1');
    await this.sendCommand('AT SP 0');
    const protocol = await this.sendCommand('AT DPN');
    return protocol;
  }

  async disconnect(): Promise<void> {
    if (this.rxChar) {
      try {
        this.rxChar.removeEventListener('characteristicvaluechanged', this.handleNotification);
        await this.rxChar.stopNotifications();
      } catch { /* ignore */ }
    }
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
      try { this.device.gatt?.disconnect(); } catch { /* ignore */ }
    }
    this.device = null;
    this.txChar = null;
    this.rxChar = null;
    this.emitState('disconnected');
  }

  dispose(): void {
    this.disconnect();
    this.connectionListeners = [];
  }
}

/** BLE response buffer — ports V8's BleResponseBuffer exactly. */
class BleResponseBuffer {
  private buffer = '';

  addChunk(chunk: string): string | null {
    this.buffer += chunk;
    const promptIdx = this.buffer.indexOf('>');
    if (promptIdx >= 0) {
      const response = this.buffer.substring(0, promptIdx).trim();
      const after = this.buffer.substring(promptIdx + 1);
      this.buffer = after.trim().length > 0 ? after : '';
      return response;
    }
    return null;
  }

  clear(): void {
    this.buffer = '';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
