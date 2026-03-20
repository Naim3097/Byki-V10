// ─── Scan Flow Integration Tests ─────────────────────────────────────
// End-to-end test: mock BLE transport → real OBD protocol → real analysis engine.
// Simulates a full health scan, live data stream, and DTC read/clear.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OBDScanService, type ScanProgressEvent } from '../obd-scan-service';
import { WebBluetoothService } from '../web-bluetooth-service';
import { PidSupportBitmask, AdapterQuirks } from '../obd-protocol';
import { AnalysisEngine } from '../analysis-engine';
import { DtcLookupService } from '../dtc-lookup-service';
import { AdapterChipType } from '../../models/adapter-info';
import type { PidSnapshot, FullAnalysisResult } from '../../models';

// ── Helpers ──────────────────────────────────────────────────────────

function loadAsset(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../public/data', name), 'utf-8');
}

function preloadEngine(): void {
  AnalysisEngine.resetForTest();
  AnalysisEngine.instance.loadFromJsonStrings({
    analyzerRulesJson: loadAsset('analyzer_rules_v2.json'),
    derivedMetricsJson: loadAsset('derived_metrics.json'),
    diagnosticRulesJson: loadAsset('diagnostic_rules_workshop.json'),
    correlationsJson: loadAsset('parameter_correlations.json'),
  });
}

// ── Mock BLE Service ─────────────────────────────────────────────────
// Simulates ELM327 adapter responses for a "healthy Toyota" vehicle.

/** Encode a PID value into the ELM327 hex response. */
function elm(mode: number, pid: number, ...dataBytes: number[]): string {
  const resp = [mode + 0x40, pid, ...dataBytes]
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  return resp + '\r>';
}

/** Map of known single-PID responses (no spaces in key). */
const PID_RESPONSES: Record<string, string> = {
  '0100': '41 00 BE 1F A8 13\r>',
  '0120': '41 20 80 05 B0 11\r>',
  '0140': '41 40 6C 00 00 01\r>',
  '0160': '41 60 00 00 00 00\r>',
  '0104': elm(1, 0x04, 0x3E),
  '0105': elm(1, 0x05, 0x82),
  '0106': elm(1, 0x06, 0x82),
  '0107': elm(1, 0x07, 0x84),
  '010B': elm(1, 0x0B, 0x23),
  '010C': elm(1, 0x0C, 0x0B, 0xB8),
  '010D': elm(1, 0x0D, 0x00),
  '010E': elm(1, 0x0E, 0x9C),
  '010F': elm(1, 0x0F, 0x48),
  '0110': elm(1, 0x10, 0x00, 0xE6),
  '0111': elm(1, 0x11, 0x08),
  '0114': elm(1, 0x14, 0x5A),
  '0115': elm(1, 0x15, 0x57),
  '0142': elm(1, 0x42, 0x37, 0x6C),
  '011F': elm(1, 0x1F, 0x02, 0x58),
  '012F': elm(1, 0x2F, 0xA6),
  '0103': elm(1, 0x03, 0x02),
};

const MOCK_ADAPTER = {
  deviceId: 'test-id', deviceName: 'MockELM', rssi: -55,
  chipType: AdapterChipType.ELM327_CLONE, maxBatchPids: 1, commandDelayMs: 50,
};

function createMockBle(): WebBluetoothService {
  const ble = new WebBluetoothService();

  // Mark as "connected" by stubbing internal state
  Object.defineProperty(ble, 'isConnected', { get: () => true });

  // Mock detectAdapterType
  (ble as any).detectAdapterType = vi.fn(async () => ({ ...MOCK_ADAPTER }));

  // Stub sendCommand to simulate ELM327 adapter
  ble.sendCommand = vi.fn(async (cmd: string, _timeout?: number): Promise<string> => {
    const upper = cmd.toUpperCase().replace(/\s/g, '');

    // AT commands
    if (upper === 'ATZ') return 'ELM327 v1.5\r>';
    if (upper === 'ATDPN') return '6\r>';
    if (upper === 'ATRV') return '14.2V\r>';
    if (upper.startsWith('AT')) return 'OK\r>';

    // Known single-PID responses
    if (PID_RESPONSES[upper]) return PID_RESPONSES[upper];

    // DTC commands (echo prefix prevents cleanAdapterResponse corruption)
    if (upper === '03') return '03\r43 02 01 71 03 00\r>';
    if (upper === '07') return '47 00 00\r>';
    if (upper === '0A') return '4A 00 00\r>';
    if (upper === '04') return '44\r>';

    // VIN
    if (upper === '0902') return '49 02 01 57 42 41 5A 5A 5A 30 30 30 30 30 30 30 30 31\r>';

    return 'NO DATA\r>';
  });

  return ble;
}

/** Create a mock BLE that simulates more DTC codes. */
function createMockBleWithDtcs(): WebBluetoothService {
  const ble = createMockBle();

  // Override sendCommand with additional DTC responses
  const origSend = ble.sendCommand as ReturnType<typeof vi.fn>;
  ble.sendCommand = vi.fn(async (cmd: string, timeout?: number): Promise<string> => {
    const upper = cmd.toUpperCase().replace(/\s/g, '');
    if (upper === '03') return '03\r43 03 01 71 03 00 02 00\r>';  // P0171, P0300, P0200
    if (upper === '07') return '47 04 20\r>';               // P0420 pending
    if (upper === '0A') return '4A 04 01\r>';               // P0401 permanent
    return origSend(cmd, timeout);
  });

  return ble;
}

/** Prepare an OBDScanService with adapter already initialized (for DTC/live tests). */
function createInitializedService(ble: WebBluetoothService): OBDScanService {
  const svc = new OBDScanService(ble);
  (svc as any)._initialized = true;
  (svc as any).adapter = { ...MOCK_ADAPTER };
  (svc as any).quirks = AdapterQuirks.elm327Clone();
  (svc as any).supported = new PidSupportBitmask(0xBE1FA813, 0x8005B011, 0x6C000001, 0);
  return svc;
}

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 1: Health Scan End-to-End
// ╚═══════════════════════════════════════════════════════════════════════

describe('Health Scan E2E', () => {
  let svc: OBDScanService;
  let events: ScanProgressEvent[];

  beforeEach(() => {
    preloadEngine();
    const ble = createMockBle();
    svc = new OBDScanService(ble);
    events = [];
    svc.onProgress(e => events.push(e));
  });

  afterEach(() => {
    AnalysisEngine.resetForTest();
  });

  it('initializes adapter and discovers PIDs', async () => {
    const adapter = await svc.initializeAdapter();

    expect(svc.isInitialized).toBe(true);
    expect(adapter).toBeTruthy();

    // Should have sent AT commands and PID support queries
    const connectEvents = events.filter(e => e.phase === 'connect');
    expect(connectEvents.length).toBeGreaterThan(0);
  });

  it('completes full health scan with valid result', async () => {
    await svc.initializeAdapter();
    const result = await svc.performHealthScan(3); // 3 cycles for speed

    // Validate result shape
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.overallRiskTier).toBeTruthy();
    expect(result.systems.length).toBeGreaterThanOrEqual(6);
    expect(result.scanCycles).toBe(3);
    expect(result.supportedPidCount).toBeGreaterThan(0);

    // Validate system reports
    for (const sys of result.systems) {
      expect(sys.system).toBeTruthy();
      expect(sys.consumerName).toBeTruthy();
      expect(sys.icon).toBeTruthy();
      expect(sys.score).toBeGreaterThanOrEqual(0);
      expect(sys.score).toBeLessThanOrEqual(100);
      expect(['Healthy', 'Monitor', 'Warning', 'Critical', 'Insufficient Data']).toContain(sys.riskTier);
    }

    // Progress events should cover all phases
    const phases = new Set(events.map(e => e.phase));
    expect(phases.has('connect')).toBe(true);
    expect(phases.has('loading')).toBe(true);
    expect(phases.has('sampling')).toBe(true);
  });

  it('emits progress events from 0 to 1', async () => {
    await svc.initializeAdapter();
    await svc.performHealthScan(2);

    expect(events.length).toBeGreaterThan(5);

    // First event should have low progress
    expect(events[0].progress).toBeLessThan(0.2);

    // Last event should reach 1.0
    const last = events[events.length - 1];
    expect(last.progress).toBeCloseTo(1.0, 1);
  });

  it('includes PID data in sampling events', async () => {
    await svc.initializeAdapter();
    await svc.performHealthScan(2);

    const samplingEvents = events.filter(e => e.phase === 'sampling' && e.pidData);
    expect(samplingEvents.length).toBeGreaterThan(0);

    // At least one sampling event should have PID values
    const pidData = samplingEvents[0].pidData!;
    expect(Object.keys(pidData).length).toBeGreaterThan(0);
  });

  it('scoring events include system reports', async () => {
    await svc.initializeAdapter();
    await svc.performHealthScan(3);

    const scoringEvents = events.filter(e => e.phase === 'scoring' && e.systemReport);
    expect(scoringEvents.length).toBeGreaterThan(0);

    const sysReport = scoringEvents[0].systemReport!;
    expect(sysReport.consumerName).toBeTruthy();
    expect(sysReport.score).toBeGreaterThanOrEqual(0);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 2: DTC Read / Clear
// ╚═══════════════════════════════════════════════════════════════════════

describe('DTC Read/Clear', () => {

  beforeEach(() => {
    // Preload DTC lookup service with real data
    DtcLookupService.resetForTest();
    const lookupSvc = DtcLookupService.instance;
    const dtcJson = JSON.parse(loadAsset('dtc.json'));
    const codes = new Map<string, Record<string, any>>();
    for (const c of dtcJson.codes as any[]) {
      codes.set(c.code as string, c);
    }
    (lookupSvc as any).codes = codes;
    (lookupSvc as any)._loaded = true;
  });

  afterEach(() => {
    DtcLookupService.resetForTest();
  });

  it('reads stored, pending, and permanent DTCs', async () => {
    const ble = createMockBleWithDtcs();
    const svc = createInitializedService(ble);

    const result = await svc.readDtcs();

    expect(result.stored.length).toBe(3);     // P0171, P0300, P0200
    expect(result.pending.length).toBe(1);    // P0420
    expect(result.permanent.length).toBe(1);  // P0401
    expect(result.scannedAt).toBeInstanceOf(Date);

    // Check codes are present
    const storedCodes = result.stored.map(d => d.code);
    expect(storedCodes).toContain('P0171');
    expect(storedCodes).toContain('P0300');

    // All stored codes should have system: 'Powertrain' (P-codes)
    for (const dtc of result.stored) {
      expect(dtc.system).toBe('Powertrain');
    }

    // Pending code
    const p0420 = result.pending.find(d => d.code === 'P0420');
    expect(p0420).toBeTruthy();
    expect(p0420!.source).toBe('pending');
  });

  it('clears DTCs successfully', async () => {
    const ble = createMockBle();
    const svc = createInitializedService(ble);

    const cleared = await svc.clearDtcs();
    expect(cleared).toBe(true);
  });

  it('reads DTCs from basic adapter with P0171 and P0300', async () => {
    const ble = createMockBle(); // default: 43 01 71 03 00
    const svc = createInitializedService(ble);

    const result = await svc.readDtcs();

    expect(result.stored.length).toBe(2);
    expect(result.stored.map(d => d.code)).toContain('P0171');
    expect(result.stored.map(d => d.code)).toContain('P0300');
    expect(result.pending.length).toBe(0);
    expect(result.permanent.length).toBe(0);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 3: Live Data Stream
// ╚═══════════════════════════════════════════════════════════════════════

describe('Live Data Stream', () => {
  it('yields PID snapshots from async generator', async () => {
    const ble = createMockBle();
    const svc = createInitializedService(ble);

    const snapshots: PidSnapshot[] = [];
    let count = 0;
    const maxSnapshots = 3;

    for await (const snap of svc.streamLiveData()) {
      snapshots.push(snap);
      count++;
      if (count >= maxSnapshots) break;
    }

    expect(snapshots.length).toBe(maxSnapshots);

    // Each snapshot should have some non-null PID values
    for (const snap of snapshots) {
      const hasData = snap.rpm !== null || snap.coolant_temp !== null || snap.vehicle_speed !== null;
      expect(hasData).toBe(true);
    }
  });

  it('stream includes RPM and coolant for supported vehicle', async () => {
    const ble = createMockBle();
    const svc = createInitializedService(ble);

    let snap: PidSnapshot | null = null;
    let count = 0;
    for await (const s of svc.streamLiveData()) {
      snap = s;
      count++;
      // Collect enough snapshots for accumulated values to include both RPM and coolant
      if (snap.rpm !== null && snap.coolant_temp !== null) break;
      if (count >= 20) break;
    }

    expect(snap).not.toBeNull();
    // RPM (0x0C) and coolant (0x05) are both in the bitmask
    expect(snap!.rpm).toBeCloseTo(750, 0);
    expect(snap!.coolant_temp).toBeCloseTo(90, 0);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 4: Full Unified Scan Flow (Connect → Scan → Report)
// ╚═══════════════════════════════════════════════════════════════════════

describe('Unified Scan Flow', () => {
  afterEach(() => {
    AnalysisEngine.resetForTest();
  });

  it('completes full flow: init → discover → scan → analyze → report', async () => {
    preloadEngine();
    const ble = createMockBle();
    const svc = new OBDScanService(ble);

    const events: ScanProgressEvent[] = [];
    svc.onProgress(e => events.push(e));

    // Step 1: Initialize
    const adapter = await svc.initializeAdapter();
    expect(adapter).toBeTruthy();
    expect(svc.isInitialized).toBe(true);

    // Step 2: Health Scan (2 cycles for speed)
    const result = await svc.performHealthScan(2);

    // Step 3: Validate complete result
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.systems.length).toBeGreaterThanOrEqual(6);

    // Step 4: Check progress phases covered full lifecycle
    const phaseSet = new Set(events.map(e => e.phase));
    expect(phaseSet.has('connect')).toBe(true);
    expect(phaseSet.has('loading')).toBe(true);
    expect(phaseSet.has('sampling')).toBe(true);
    expect(phaseSet.has('scoring')).toBe(true);
    expect(phaseSet.has('complete')).toBe(true);

    // Step 5: Final event is "complete"
    const last = events[events.length - 1];
    expect(last.phase).toBe('complete');
    expect(last.progress).toBeCloseTo(1.0, 1);
  });
});
