// OBD scan orchestration service — direct port of obd_scan_service.dart
// Replaces BleService with WebBluetoothService; all OBD logic identical.

import type { AdapterInfo } from '../models/adapter-info';
import { AdapterChipType } from '../models/adapter-info';
import type { PidSnapshot } from '../models/pid-snapshot';
import { snapshotFromMap } from '../models/pid-snapshot';
import type { FullAnalysisResult, SystemHealthReport, DiagnosticMatch, CorrelationResult } from '../models/analysis-result';
import type { DtcScanResult } from '../models/dtc-result';
import { DtcSource, systemFromCode } from '../models/dtc-result';
import type { DtcCode } from '../models/dtc-result';
import { WebBluetoothService } from './web-bluetooth-service';
import {
  PidSupportBitmask, AdapterQuirks,
  buildInitSequence, buildScanCommands,
  parsePidResponse, parsePidSupportResponse, parseDtcResponse,
  parseVinResponse, parseVoltageResponse,
  cleanResponse, cleanAdapterResponse,
  shouldRetry, maxRetriesFor,
} from './obd-protocol';
import { AnalysisEngine } from './analysis-engine';
import { DtcLookupService } from './dtc-lookup-service';

// ─── Progress Event ──────────────────────────────────────────────────────────

export interface ScanProgressEvent {
  progress: number;
  phase: string;
  message: string;
  detail?: string;
  count?: number;
  total?: number;
  pidData?: Record<string, number>;
  analysisResult?: FullAnalysisResult;
  systemReport?: SystemHealthReport;
  diagnosticMatch?: DiagnosticMatch;
  correlationHighlight?: CorrelationResult;
}

export type ProgressCallback = (event: ScanProgressEvent) => void;

// ─── OBD Scan Service ────────────────────────────────────────────────────────

export class OBDScanService {
  private ble: WebBluetoothService;
  private progressListeners: ProgressCallback[] = [];
  private adapter: AdapterInfo | null = null;
  private supported = new PidSupportBitmask();
  private quirks = AdapterQuirks.genericBle();
  private _initialized = false;

  get isInitialized(): boolean { return this._initialized; }

  constructor(ble: WebBluetoothService) {
    this.ble = ble;
  }

  onProgress(cb: ProgressCallback): () => void {
    this.progressListeners.push(cb);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== cb);
    };
  }

  private emit(progress: number, phase: string, message: string, extra?: Partial<ScanProgressEvent>): void {
    const event: ScanProgressEvent = { progress, phase, message, ...extra };
    for (const l of this.progressListeners) l(event);
  }

  // ─── Adapter Initialization ────────────────────────────────────────────

  async initializeAdapter(knownAdapter?: AdapterInfo): Promise<AdapterInfo> {
    if (this._initialized) return this.adapter!;
    if (!this.ble.isConnected) {
      throw new Error('BLE not connected to adapter');
    }

    if (knownAdapter && knownAdapter.chipType !== AdapterChipType.UNKNOWN) {
      this.emit(0.02, 'connect', `Adapter: ${knownAdapter.chipType}`);
      this.adapter = knownAdapter;
    } else {
      this.emit(0.02, 'connect', 'Detecting adapter type...');
      this.adapter = await this.ble.detectAdapterType({
        deviceId: '', deviceName: '', rssi: 0,
        chipType: AdapterChipType.UNKNOWN, maxBatchPids: 1, commandDelayMs: 150,
      });
    }
    this.quirks = AdapterQuirks.forChipType(this.adapter.chipType);

    this.emit(0.04, 'connect', 'Initializing ELM327 protocol...');
    const initCmds = buildInitSequence(this.adapter.chipType);
    for (const cmd of initCmds) {
      try {
        await this.ble.sendCommand(cmd, cmd === 'ATZ' ? 4000 : 2000);
      } catch {
        // ATZ may timeout on some adapters
      }
      await delay(this.quirks.interCommandDelayMs);
    }

    this.emit(0.06, 'connect', 'Discovering vehicle PIDs...');
    this.supported = await this.discoverPids();

    const protocol = await this.sendSafe('ATDPN');
    this.emit(0.08, 'connect',
      `Protocol: ${cleanProtocolName(protocol ?? 'Auto')}`,
      { detail: `${this.supported.supportedPids.length} PIDs supported` });

    this._initialized = true;
    return this.adapter;
  }

  private async discoverPids(): Promise<PidSupportBitmask> {
    let mask0120 = 0, mask2140 = 0, mask4160 = 0, mask6180 = 0;

    // First request uses 8s timeout — ELM327 protocol search can take 3-7s
    const resp00 = await this.sendSafe('01 00', 8000);
    if (resp00 !== null) {
      mask0120 = parsePidSupportResponse(resp00);
    } else {
      return new PidSupportBitmask();
    }
    await delay(this.quirks.interCommandDelayMs);

    if ((mask0120 & 1) !== 0) {
      const resp20 = await this.sendSafe('01 20');
      if (resp20 !== null) mask2140 = parsePidSupportResponse(resp20);
      await delay(this.quirks.interCommandDelayMs);
    }

    if ((mask2140 & 1) !== 0) {
      const resp40 = await this.sendSafe('01 40');
      if (resp40 !== null) mask4160 = parsePidSupportResponse(resp40);
      await delay(this.quirks.interCommandDelayMs);
    }

    if ((mask4160 & 1) !== 0) {
      const resp60 = await this.sendSafe('01 60');
      if (resp60 !== null) mask6180 = parsePidSupportResponse(resp60);
    }

    return new PidSupportBitmask(mask0120, mask2140, mask4160, mask6180);
  }

  // ─── Health Scan ───────────────────────────────────────────────────────

  async performHealthScan(cycles = 10): Promise<FullAnalysisResult> {
    this.emit(0.08, 'connect', 'ECU protocol connected',
      { detail: `${this.supported.supportedPids.length} PIDs supported` });

    const engine = AnalysisEngine.instance;
    await engine.load();

    const ruleCount = engine.systemRuleCount;
    const diagCount = engine.diagnosticRuleCount;
    const corrCount = engine.correlationCount;
    const derivedCount = engine.derivedMetricCount;

    this.emit(0.10, 'loading', `Loaded ${ruleCount} system health rules`);
    this.emit(0.12, 'loading', `Loaded ${diagCount} diagnostic patterns`);
    this.emit(0.14, 'loading', `Loaded ${corrCount} parameter correlations`);
    this.emit(0.16, 'loading', `Loaded ${derivedCount} derived metric formulas`);

    this.emit(0.18, 'sampling', `Starting ${cycles}-cycle PID sampling...`, { total: cycles });

    const commands = buildScanCommands(this.supported, this.adapter!.chipType);
    const snapshots: PidSnapshot[] = [];

    for (let i = 0; i < cycles; i++) {
      const pct = 0.18 + (0.32 * (i + 1) / cycles);
      this.emit(pct, 'sampling', `Sampling sensor data — cycle ${i + 1}/${cycles}`,
        { detail: `${commands.length} commands per cycle`, count: i + 1, total: cycles });

      const snapshot = await this.executeScanCycle(commands);
      snapshots.push(snapshot);

      const pidValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(snapshot)) {
        if (v !== null && typeof v === 'number') pidValues[k] = v;
      }

      // Progressive analysis at checkpoints
      const analysisCheckpoints = new Set([3, 6]);
      const cycleNum = i + 1;
      if (analysisCheckpoints.has(cycleNum)) {
        const interim = engine.analyze([...snapshots]);
        this.emit(pct, 'sampling',
          `Interim analysis — ${cycleNum} cycles analyzed`,
          {
            detail: `Score: ${Math.round(interim.overallScore)}/100 · ${interim.overallRiskTier}`,
            count: cycleNum, total: cycles, pidData: pidValues, analysisResult: interim,
          });
      } else {
        this.emit(pct, 'sampling', `Cycle ${cycleNum}/${cycles} complete`,
          { detail: `${Object.keys(pidValues).length} values captured`, count: cycleNum, total: cycles, pidData: pidValues });
      }
    }

    // Post-sampling analysis phases
    this.emit(0.52, 'systems', `Evaluating system health — ${ruleCount} rules across 6 systems`);
    await delay(350);

    const systemNames = [
      'Battery & Electrical', 'Engine Performance', 'Fuel Delivery',
      'Engine Cooling', 'Exhaust & Emissions', 'Engine Oil Health',
    ];
    for (let i = 0; i < systemNames.length; i++) {
      const pct = 0.52 + (0.16 * (i + 1) / systemNames.length);
      this.emit(pct, 'systems', `Evaluating ${systemNames[i]}...`,
        { count: i + 1, total: systemNames.length });
      await delay(250);
    }

    this.emit(0.70, 'metrics', `Computing ${derivedCount} derived metrics...`,
      { detail: 'Fuel trim balance, warmup rate, voltage stability...' });
    await delay(500);

    this.emit(0.75, 'diagnostics', `Matching against ${diagCount} diagnostic patterns...`,
      { detail: 'Lean condition, catalyst efficiency, coolant anomalies...' });
    await delay(500);

    this.emit(0.82, 'correlations', `Running ${corrCount} parameter correlation checks...`,
      { detail: 'Pearson coefficient analysis across multi-cycle data' });
    await delay(500);

    this.emit(0.88, 'scoring', 'Computing weighted system scores...');
    await delay(300);
    const result = engine.analyze(snapshots);

    for (let i = 0; i < result.systems.length; i++) {
      const sys = result.systems[i];
      const pct = 0.88 + (0.06 * (i + 1) / result.systems.length);
      this.emit(pct, 'scoring', `${sys.consumerName}: ${Math.round(sys.score)}/100`,
        { detail: sys.riskTier, count: i + 1, total: result.systems.length, systemReport: sys });
      await delay(300);
    }

    const topFindings = result.diagnosticMatches.slice(0, 3);
    if (topFindings.length > 0) {
      this.emit(0.95, 'findings',
        `Detected ${result.diagnosticMatches.length} diagnostic finding${result.diagnosticMatches.length === 1 ? '' : 's'}`);
      await delay(350);
      for (let i = 0; i < topFindings.length; i++) {
        this.emit(0.95, 'findings', topFindings[i].description,
          { detail: topFindings[i].recommendation, count: i + 1, total: topFindings.length, diagnosticMatch: topFindings[i] });
        await delay(350);
      }
    }

    const sigCorrs = result.correlationResults
      .filter(c => c.status !== 'Normal')
      .slice(0, 2);
    for (const corr of sigCorrs) {
      this.emit(0.97, 'findings',
        corr.consumerMessage || corr.name,
        { detail: `Deviation: ${Math.abs(corr.deviation).toFixed(1)}%`, correlationHighlight: corr });
      await delay(300);
    }

    this.emit(0.98, 'scoring', 'Determining overall health status...');
    await delay(400);
    this.emit(1.0, 'complete', 'Analysis complete',
      { detail: `${result.overallRiskTier} · tap below for full report` });

    return result;
  }

  private async executeScanCycle(commands: string[]): Promise<PidSnapshot> {
    const fieldValues: Record<string, number> = {};

    for (const cmd of commands) {
      const raw = await this.sendSafe(cmd);
      if (raw === null) continue;

      // Split response lines
      let start = 0;
      for (let j = 0; j <= raw.length; j++) {
        const atEnd = j === raw.length;
        const isSep = !atEnd && (raw.charCodeAt(j) === 0x0D || raw.charCodeAt(j) === 0x0A);
        if (atEnd || isSep) {
          if (j > start) {
            const line = raw.substring(start, j).trim();
            if (line) {
              const cleaned = cleanResponse(line);
              if (cleaned) {
                Object.assign(fieldValues, parsePidResponse(cleaned));
              }
            }
          }
          start = j + 1;
        }
      }

      await delay(this.quirks.interCommandDelayMs);
    }

    // Fallback: voltage via ATRV
    if (!('ecu_voltage' in fieldValues)) {
      const atrvRaw = await this.sendSafe('ATRV');
      if (atrvRaw !== null) {
        const v = parseVoltageResponse(atrvRaw);
        if (v !== null) fieldValues['ecu_voltage'] = v;
      }
    }

    return snapshotFromMap(fieldValues);
  }

  // ─── DTC Read/Clear ────────────────────────────────────────────────────

  async readDtcs(): Promise<DtcScanResult> {
    const lookup = DtcLookupService.instance;
    await lookup.load();

    const storedRaw = await this.sendSafe('03', 5000);
    const storedCodes = storedRaw ? parseDtcResponse(storedRaw) : [];
    await delay(this.quirks.interCommandDelayMs);

    const pendingRaw = await this.sendSafe('07', 5000);
    const pendingCodes = pendingRaw ? parseDtcResponse(pendingRaw) : [];
    await delay(this.quirks.interCommandDelayMs);

    const permanentRaw = await this.sendSafe('0A', 5000);
    const permanentCodes = permanentRaw ? parseDtcResponse(permanentRaw) : [];

    return {
      stored: this.enrichDtcCodes(storedCodes, DtcSource.STORED, lookup),
      pending: this.enrichDtcCodes(pendingCodes, DtcSource.PENDING, lookup),
      permanent: this.enrichDtcCodes(permanentCodes, DtcSource.PERMANENT, lookup),
      scannedAt: new Date(),
    };
  }

  private enrichDtcCodes(codes: string[], source: DtcSource, lookup: DtcLookupService): DtcCode[] {
    if (!codes.length) return [];
    return codes.map(code => {
      const r = lookup.lookup(code);
      return {
        code,
        source,
        system: systemFromCode(code),
        description: r?.description || 'Unknown fault code',
        severity: r?.severity || 'Unknown',
        consumerAdvice: r?.userExplanation || null,
        possibleCauses: r?.commonCauses || [],
        estimatedCost: r?.estimatedCostRange !== 'Unknown' ? (r?.estimatedCostRange ?? null) : null,
        commonParts: [],
        repairPriority: severityToPriority(r?.severity || ''),
      };
    });
  }

  async clearDtcs(): Promise<boolean> {
    const response = await this.sendSafe('04', 5000);
    return response !== null && response.includes('44');
  }

  // ─── VIN Read ──────────────────────────────────────────────────────────

  async readVin(): Promise<string | null> {
    const response = await this.sendSafe('0902', 5000);
    if (response === null) return null;
    return parseVinResponse(response);
  }

  // ─── Live Data Stream ──────────────────────────────────────────────────

  async *streamLiveData(): AsyncGenerator<PidSnapshot> {
    const corePidNumbers = [0x0C, 0x0D, 0x05, 0x04, 0x11, 0x06, 0x07, 0x10, 0x42];
    const extendedPidNumbers = [
      0x03, 0x08, 0x09, 0x0A, 0x0B, 0x0E, 0x0F, 0x14, 0x15, 0x16, 0x17,
      0x1F, 0x21, 0x23, 0x24, 0x28, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31,
      0x32, 0x33, 0x3C, 0x43, 0x44, 0x45, 0x46, 0x4D, 0x4E, 0x51,
      0x5B, 0x5C, 0x5E, 0x70, 0x74, 0x7C, 0x7D, 0x7F,
    ];

    const hasDiscovery = this.supported.supportedPids.length > 0;
    const livePids = hasDiscovery
      ? corePidNumbers.filter(pid => this.supported.isSupported(pid))
      : corePidNumbers;
    const extPids = hasDiscovery
      ? extendedPidNumbers.filter(pid => this.supported.isSupported(pid))
      : [];

    const coreCommands = this.buildPidCommands(livePids);

    const extRotationSize = 4;
    const extGroups: string[][] = [];
    for (let i = 0; i < extPids.length; i += extRotationSize) {
      const chunk = extPids.slice(i, Math.min(i + extRotationSize, extPids.length));
      extGroups.push(this.buildPidCommands(chunk));
    }

    let rotationIdx = 0;
    const running: Record<string, number> = {};
    let voltageProbed = false;

    const liveDelayMs = Math.min(40, Math.max(8, Math.round(this.quirks.interCommandDelayMs * 0.2)));

    while (true) {
      const cycleCmds = [...coreCommands];
      if (extGroups.length > 0) {
        cycleCmds.push(...extGroups[rotationIdx % extGroups.length]);
        rotationIdx++;
      }

      let cmdsSinceYield = 0;
      let hadNewData = false;

      for (const cmd of cycleCmds) {
        try {
          const response = await this.ble.sendCommand(cmd, 400);
          const cleaned = cleanAdapterResponse(response, cmd);
          if (cleaned) {
            let start = 0;
            for (let i = 0; i <= cleaned.length; i++) {
              const atEnd = i === cleaned.length;
              const isSep = !atEnd && (cleaned.charCodeAt(i) === 0x0D || cleaned.charCodeAt(i) === 0x0A);
              if (atEnd || isSep) {
                if (i > start) {
                  const line = cleaned.substring(start, i).trim();
                  if (line) {
                    const lineClean = cleanResponse(line);
                    if (lineClean) {
                      Object.assign(running, parsePidResponse(lineClean));
                      hadNewData = true;
                    }
                  }
                }
                start = i + 1;
              }
            }
          }
        } catch {
          // Skip errors during live streaming
        }

        cmdsSinceYield++;

        if (hadNewData) {
          yield snapshotFromMap(running);
          cmdsSinceYield = 0;
          hadNewData = false;
        }

        await delay(liveDelayMs);
      }

      // ATRV voltage fallback — probe once
      if (!voltageProbed && !('ecu_voltage' in running)) {
        try {
          const atrvRaw = await this.ble.sendCommand('ATRV', 400);
          const v = parseVoltageResponse(atrvRaw);
          if (v !== null) running['ecu_voltage'] = v;
        } catch { /* ignore */ }
        voltageProbed = true;
      }

      if (cmdsSinceYield > 0 && hadNewData) {
        yield snapshotFromMap(running);
      }
    }
  }

  private buildPidCommands(pids: number[]): string[] {
    const batchSize = this.quirks.maxPidsPerRequest;
    const commands: string[] = [];
    if (batchSize <= 1) {
      for (const pid of pids) {
        commands.push(`01 ${pid.toString(16).padStart(2, '0').toUpperCase()}`);
      }
    } else {
      for (let i = 0; i < pids.length; i += batchSize) {
        const chunk = pids.slice(i, Math.min(i + batchSize, pids.length));
        const pidStr = chunk.map(p => p.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        commands.push(`01 ${pidStr}`);
      }
    }
    return commands;
  }

  // ─── Transport Helpers ─────────────────────────────────────────────────

  private async sendSafe(command: string, timeoutMs = 3000): Promise<string | null> {
    const retries = maxRetriesFor(this.adapter?.chipType ?? AdapterChipType.UNKNOWN);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.ble.sendCommand(command, timeoutMs);
        const cleaned = cleanAdapterResponse(response, command);
        if (cleaned !== null) return cleaned;
        if (!shouldRetry(response, attempt, retries)) return null;
      } catch {
        if (attempt >= retries) return null;
      }
      await delay(this.quirks.interCommandDelayMs);
    }
    return null;
  }

  dispose(): void {
    this.progressListeners = [];
  }
}

function severityToPriority(severity: string): number {
  switch (severity.toLowerCase()) {
    case 'critical': return 1;
    case 'high': return 2;
    case 'warning': case 'medium': return 3;
    case 'low': case 'info': return 4;
    default: return 3;
  }
}

function cleanProtocolName(raw: string): string {
  return raw.replace(/>/g, '').replace(/\r/g, '').replace(/\n/g, '').trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
