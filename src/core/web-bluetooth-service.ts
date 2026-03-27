// Web Bluetooth transport for OBD2 adapter communication.
// REWRITE of ble_service.dart — uses navigator.bluetooth (Web Bluetooth API)
// instead of flutter_blue_plus. Same GATT model, same UUIDs, same 20-byte packets.

import { type AdapterInfo, AdapterChipType, createAdapterInfo } from '../models/adapter-info';
import { AdapterQuirks } from './obd-protocol';

// Known OBD adapter BLE service UUIDs
// Includes standard short UUIDs and full 128-bit UUIDs for common BLE UART chips.
const KNOWN_SERVICE_UUIDS: (number | string)[] = [
  // Common ELM327 / OBD adapter services
  0xFFF0, 0x18F0, 0xFFE0,
  // Microchip/ISSC Transparent UART (very common in cheap "OBD BLE" adapters)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  // Nordic UART Service (NUS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  // Some VGATE / iCar adapters
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  // Misc Chinese adapter UUIDs
  0xABF0,
  'bee5d050-7b8c-11e2-b930-0800200c9a66',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

// Known characteristic UUIDs (TX/RX)
const KNOWN_CHAR_UUIDS: (number | string)[] = [
  // Standard short UUIDs
  0xFFF1, 0xFFF2, 0x18F1, 0x18F2, 0xFFE1,
  // Microchip/ISSC TX (write) and RX (notify)
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '49535343-1e4d-4bd9-ba61-23c647249616',
  // Nordic UART TX (write) and RX (notify)
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  // Misc
  0xABF1, 0xABF2,
];

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
   *
   * Strategy: first try name-prefix filters so the picker shows likely OBD
   * adapters at the top. If the user cancels (no match), fall back to
   * acceptAllDevices so any BLE device can be selected manually.
   *
   * After connecting, discover TX/RX characteristics by:
   *   1. Trying known service + characteristic UUIDs
   *   2. Iterating all characteristics on known services
   *   3. Falling back to getPrimaryServices() (all services) and scanning
   *      every characteristic — handles adapters with non-standard UUIDs.
   */
  async requestAndConnect(): Promise<AdapterInfo> {
    if (!WebBluetoothService.isAvailable()) {
      throw new Error('Web Bluetooth not supported in this browser');
    }

    this.emitState('connecting');

    const optionalServices = KNOWN_SERVICE_UUIDS.map(uuid =>
      typeof uuid === 'number'
        ? BluetoothUUID.getService(uuid)
        : uuid
    );

    const filters: BluetoothLEScanFilter[] = ADAPTER_NAME_PREFIXES.map(prefix => ({
      namePrefix: prefix,
    }));

    try {
      // Try filtered picker first, then acceptAllDevices if user can't see their adapter
      try {
        this.device = await navigator.bluetooth.requestDevice({
          filters,
          optionalServices,
        });
      } catch (filterErr: unknown) {
        // User cancelled the filtered picker — retry with all devices visible
        if (filterErr instanceof DOMException && filterErr.name === 'NotFoundError') {
          this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices,
          });
        } else {
          throw filterErr;
        }
      }

      const server = await this.device.gatt!.connect();

      // Discover OBD service and characteristics
      const { tx, rx } = await this.discoverCharacteristics(server);

      if (!tx || !rx) {
        await this.disconnect();
        throw new Error('OBD characteristics not found on this device');
      }

      this.txChar = tx;
      this.rxChar = rx;

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

  /**
   * Discover TX (write) and RX (notify) characteristics on a GATT server.
   *
   * Pass 1: iterate known service UUIDs → known char UUIDs → all chars on match.
   * Pass 2: getPrimaryServices() (all) and scan every characteristic.
   */
  private async discoverCharacteristics(
    server: BluetoothRemoteGATTServer,
  ): Promise<{ tx: BluetoothRemoteGATTCharacteristic | null; rx: BluetoothRemoteGATTCharacteristic | null }> {
    let tx: BluetoothRemoteGATTCharacteristic | null = null;
    let rx: BluetoothRemoteGATTCharacteristic | null = null;

    // Pass 1: known service UUIDs
    for (const serviceUuid of KNOWN_SERVICE_UUIDS) {
      try {
        const resolvedUuid = typeof serviceUuid === 'number'
          ? BluetoothUUID.getService(serviceUuid)
          : serviceUuid;
        const service = await server.getPrimaryService(resolvedUuid);
        ({ tx, rx } = await this.scanServiceCharacteristics(service, tx, rx));
        if (tx && rx) return { tx, rx };
      } catch { /* service not present — try next */ }
    }

    // Pass 2: discover ALL services (handles non-standard UUIDs)
    try {
      const allServices = await server.getPrimaryServices();
      for (const service of allServices) {
        ({ tx, rx } = await this.scanServiceCharacteristics(service, tx, rx));
        if (tx && rx) return { tx, rx };
      }
    } catch { /* getPrimaryServices may not be supported — already tried known UUIDs */ }

    return { tx, rx };
  }

  /**
   * Scan a single GATT service for writable (TX) and notifiable (RX) characteristics.
   * First checks known char UUIDs, then falls back to iterating all chars.
   */
  private async scanServiceCharacteristics(
    service: BluetoothRemoteGATTService,
    existingTx: BluetoothRemoteGATTCharacteristic | null,
    existingRx: BluetoothRemoteGATTCharacteristic | null,
  ): Promise<{ tx: BluetoothRemoteGATTCharacteristic | null; rx: BluetoothRemoteGATTCharacteristic | null }> {
    let tx = existingTx;
    let rx = existingRx;

    // Try known characteristic UUIDs
    for (const charUuid of KNOWN_CHAR_UUIDS) {
      try {
        const resolvedChar = typeof charUuid === 'number'
          ? BluetoothUUID.getCharacteristic(charUuid)
          : charUuid;
        const char = await service.getCharacteristic(resolvedChar);
        if (!tx && (char.properties.write || char.properties.writeWithoutResponse)) tx = char;
        if (!rx && char.properties.notify) rx = char;
        if (tx && rx) return { tx, rx };
      } catch { /* char not available */ }
    }

    // Fallback: iterate all characteristics on this service
    try {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (!tx && (char.properties.write || char.properties.writeWithoutResponse)) tx = char;
        if (!rx && char.properties.notify) rx = char;
        if (tx && rx) return { tx, rx };
      }
    } catch { /* couldn't enumerate */ }

    return { tx, rx };
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

  /** Initialize ELM327 protocol — same AT sequence as V10. */
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

/** BLE response buffer — ports V10's BleResponseBuffer exactly. */
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
