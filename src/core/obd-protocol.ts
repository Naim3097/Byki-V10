// OBD-II protocol service — SAE J1979 PID parsing, J2012 DTC decoding,
// ELM327 AT command building, and adapter quirk profiles.
// Direct port of obd_protocol.dart (900 lines).

import { AdapterChipType } from '../models/adapter-info';

// ─── PID Support Bitmask ─────────────────────────────────────────────────────

export class PidSupportBitmask {
  readonly mask0120: number; // PIDs 01–20
  readonly mask2140: number; // PIDs 21–40
  readonly mask4160: number; // PIDs 41–60
  readonly mask6180: number; // PIDs 61–80

  constructor(
    mask0120 = 0,
    mask2140 = 0,
    mask4160 = 0,
    mask6180 = 0,
  ) {
    this.mask0120 = mask0120;
    this.mask2140 = mask2140;
    this.mask4160 = mask4160;
    this.mask6180 = mask6180;
  }

  isSupported(pid: number): boolean {
    if (pid <= 0 || pid > 0x80) return false;
    let mask: number;
    let offset: number;
    if (pid <= 0x20) {
      mask = this.mask0120;
      offset = pid - 1;
    } else if (pid <= 0x40) {
      mask = this.mask2140;
      offset = pid - 0x21;
    } else if (pid <= 0x60) {
      mask = this.mask4160;
      offset = pid - 0x41;
    } else {
      mask = this.mask6180;
      offset = pid - 0x61;
    }
    return ((mask >>> (31 - offset)) & 1) === 1;
  }

  static parseBitmask(bytes: number[]): number {
    if (bytes.length < 4) return 0;
    return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  }

  get supportedPids(): number[] {
    const pids: number[] = [];
    for (let pid = 1; pid <= 0x80; pid++) {
      if (this.isSupported(pid)) pids.push(pid);
    }
    return pids;
  }
}

// ─── Adapter Quirk Profiles ──────────────────────────────────────────────────

export class AdapterQuirks {
  readonly interCommandDelayMs: number;
  readonly maxPidsPerRequest: number;
  readonly supportsAdaptiveTiming: boolean;
  readonly reliableCanFlowControl: boolean;
  readonly mode06Reliable: boolean;
  readonly responseHasSpaces: boolean;
  readonly supportsHeaders: boolean;

  constructor(opts: Partial<AdapterQuirks> = {}) {
    this.interCommandDelayMs = opts.interCommandDelayMs ?? 80;
    this.maxPidsPerRequest = opts.maxPidsPerRequest ?? 1;
    this.supportsAdaptiveTiming = opts.supportsAdaptiveTiming ?? false;
    this.reliableCanFlowControl = opts.reliableCanFlowControl ?? false;
    this.mode06Reliable = opts.mode06Reliable ?? false;
    this.responseHasSpaces = opts.responseHasSpaces ?? true;
    this.supportsHeaders = opts.supportsHeaders ?? false;
  }

  static genuineElm327(): AdapterQuirks {
    return new AdapterQuirks({
      interCommandDelayMs: 30,
      maxPidsPerRequest: 6,
      supportsAdaptiveTiming: true,
      reliableCanFlowControl: true,
      mode06Reliable: true,
      responseHasSpaces: false,
      supportsHeaders: true,
    });
  }

  static elm327Clone(): AdapterQuirks {
    return new AdapterQuirks({
      interCommandDelayMs: 60,
      maxPidsPerRequest: 1,
      responseHasSpaces: true,
    });
  }

  static stn(): AdapterQuirks {
    return new AdapterQuirks({
      interCommandDelayMs: 10,
      maxPidsPerRequest: 6,
      supportsAdaptiveTiming: true,
      reliableCanFlowControl: true,
      mode06Reliable: true,
      responseHasSpaces: false,
      supportsHeaders: true,
    });
  }

  static vgate(): AdapterQuirks {
    return new AdapterQuirks({
      interCommandDelayMs: 60,
      maxPidsPerRequest: 4,
      supportsAdaptiveTiming: true,
      reliableCanFlowControl: true,
      mode06Reliable: true,
      responseHasSpaces: true,
      supportsHeaders: true,
    });
  }

  static genericBle(): AdapterQuirks {
    return new AdapterQuirks({
      interCommandDelayMs: 80,
      maxPidsPerRequest: 1,
      responseHasSpaces: true,
    });
  }

  static forChipType(type: AdapterChipType): AdapterQuirks {
    switch (type) {
      case AdapterChipType.ELM327_GENUINE: return AdapterQuirks.genuineElm327();
      case AdapterChipType.ELM327_CLONE: return AdapterQuirks.elm327Clone();
      case AdapterChipType.STN_OBDLINK: return AdapterQuirks.stn();
      case AdapterChipType.VGATE: return AdapterQuirks.vgate();
      case AdapterChipType.UNKNOWN: return AdapterQuirks.genericBle();
    }
  }
}

// ─── SAE Normalization Ranges ────────────────────────────────────────────────

const SAE_RANGES: Record<string, [number, number]> = {
  engine_load: [0, 100],
  coolant_temp: [-40, 215],
  stft_b1: [-100, 99.2],
  ltft_b1: [-100, 99.2],
  stft_b2: [-100, 99.2],
  ltft_b2: [-100, 99.2],
  fuel_pressure: [0, 765],
  map_pressure: [0, 255],
  rpm: [0, 16383.75],
  vehicle_speed: [0, 255],
  timing_advance: [-64, 63.5],
  intake_air_temp: [-40, 215],
  maf_rate: [0, 655.35],
  throttle_position: [0, 100],
  o2_b1s1_voltage: [0, 1.275],
  o2_b1s2_voltage: [0, 1.275],
  o2_b2s1_voltage: [0, 1.275],
  o2_b2s2_voltage: [0, 1.275],
  egr_commanded: [0, 100],
  egr_error: [-100, 99.2],
  evap_purge: [0, 100],
  fuel_level: [0, 100],
  fuel_rail_pressure: [0, 655350],
  barometric_pressure: [0, 255],
  ecu_voltage: [0, 65.535],
  absolute_load: [0, 25700],
  commanded_equiv_ratio: [0, 2.0],
  relative_tps: [0, 100],
  ambient_temp: [-40, 215],
  oil_temp: [-40, 215],
  catalyst_temp_b1s1: [-40, 6513.5],
  o2_lambda_upstream: [0, 2.0],
  o2_lambda_downstream: [0, 2.0],
  fuel_rate: [0, 3276.75],
  boost_pressure: [0, 1024.0],
  turbo_rpm: [0, 655350.0],
  dpf_temp: [-40, 6513.5],
  dpf_diff_pressure: [0, 655.35],
  oil_pressure: [0, 65535.0],
  engine_ref_torque: [0, 65535.0],
  mil_status: [0, 1],
  dtc_count: [0, 127],
};

function normalize(key: string, value: number): number | null {
  const range = SAE_RANGES[key];
  if (!range) return value;
  const [lo, hi] = range;
  const span = hi - lo;
  if (value < lo - span || value > hi + span) return null;
  return Math.min(hi, Math.max(lo, value));
}

// ─── Hex Parsing ─────────────────────────────────────────────────────────────

export function parseHexBytes(hex: string): number[] | null {
  const bytes: number[] = [];
  let nibbleCount = 0;
  let current = 0;
  for (let i = 0; i < hex.length; i++) {
    const c = hex.charCodeAt(i);
    let nibble: number;
    if (c >= 0x30 && c <= 0x39) {
      nibble = c - 0x30;
    } else if (c >= 0x41 && c <= 0x46) {
      nibble = c - 0x41 + 10;
    } else if (c >= 0x61 && c <= 0x66) {
      nibble = c - 0x61 + 10;
    } else {
      continue;
    }
    if (nibbleCount % 2 === 0) {
      current = nibble << 4;
    } else {
      bytes.push(current | nibble);
    }
    nibbleCount++;
  }
  if (bytes.length === 0 || nibbleCount % 2 !== 0) return null;
  return bytes;
}

export function cleanResponse(raw: string): string | null {
  let buf = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === 0x3E || c === 0x0D) continue; // '>' or '\r'
    if (c === 0x0A) { buf += ' '; continue; }
    buf += String.fromCharCode(c >= 0x61 && c <= 0x7A ? c - 32 : c);
  }
  const trimmed = buf.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('SEARCHING') ||
      trimmed.startsWith('NO DATA') ||
      trimmed.startsWith('UNABLE') ||
      trimmed.startsWith('CAN ERROR') ||
      trimmed.startsWith('BUS INIT') ||
      trimmed.startsWith('ERROR') ||
      trimmed.startsWith('STOPPED') ||
      trimmed === 'OK' ||
      trimmed === '?') {
    return null;
  }
  return trimmed;
}

export function cleanAdapterResponse(raw: string, echoCommand?: string): string | null {
  let cleaned = raw;
  if (echoCommand) {
    const upperCleaned = cleaned.toUpperCase();
    const upperCmd = echoCommand.toUpperCase();
    const pos = upperCleaned.indexOf(upperCmd);
    if (pos >= 0) {
      cleaned = cleaned.substring(pos + echoCommand.length);
    }
  }
  cleaned = cleaned.toUpperCase();
  if (cleaned.includes('SEARCHING')) cleaned = cleaned.replaceAll('SEARCHING...', '');
  if (cleaned.includes('STOPPED')) cleaned = cleaned.replaceAll('STOPPED', '');
  if (cleaned.includes('>')) cleaned = cleaned.replaceAll('>', '');
  cleaned = cleaned.trim();
  if (!cleaned) return null;

  let lineEnd = cleaned.length;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned.charCodeAt(i);
    if (c === 0x0D || c === 0x0A) { lineEnd = i; break; }
  }
  const firstLine = cleaned.substring(0, lineEnd).trim();
  if (!firstLine ||
      firstLine.startsWith('NO DATA') ||
      firstLine.startsWith('UNABLE') ||
      firstLine.startsWith('CAN ERROR') ||
      firstLine.startsWith('BUS INIT') ||
      firstLine.startsWith('ERROR') ||
      firstLine === 'OK' ||
      firstLine === '?') {
    return null;
  }
  return cleaned;
}

// ─── PID Response Parser (SAE J1979) ─────────────────────────────────────────

export function parsePidResponse(response: string): Record<string, number> {
  const bytes = parseHexBytes(response);
  if (!bytes || bytes.length < 3) return {};

  if (bytes[0] !== 0x41) {
    if (bytes[0] === 0x46) return parseMode06Response(bytes);
    return {};
  }

  const pid = bytes[1];
  const result: Record<string, number> = {};

  switch (pid) {
    case 0x01:
      if (bytes.length >= 6) {
        result['mil_status'] = (bytes[2] >> 7) & 1;
        result['dtc_count'] = bytes[2] & 0x7F;
      }
      break;
    case 0x03:
      if (bytes.length >= 3) result['fuel_system_status'] = bytes[2];
      break;
    case 0x04:
      if (bytes.length >= 3) result['engine_load'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x05:
      if (bytes.length >= 3) result['coolant_temp'] = bytes[2] - 40.0;
      break;
    case 0x06:
      if (bytes.length >= 3) result['stft_b1'] = (bytes[2] - 128.0) * 100.0 / 128.0;
      break;
    case 0x07:
      if (bytes.length >= 3) result['ltft_b1'] = (bytes[2] - 128.0) * 100.0 / 128.0;
      break;
    case 0x08:
      if (bytes.length >= 3) result['stft_b2'] = (bytes[2] - 128.0) * 100.0 / 128.0;
      break;
    case 0x09:
      if (bytes.length >= 3) result['ltft_b2'] = (bytes[2] - 128.0) * 100.0 / 128.0;
      break;
    case 0x0A:
      if (bytes.length >= 3) result['fuel_pressure'] = bytes[2] * 3.0;
      break;
    case 0x0B:
      if (bytes.length >= 3) result['map_pressure'] = bytes[2];
      break;
    case 0x0C:
      if (bytes.length >= 4) result['rpm'] = (bytes[2] * 256.0 + bytes[3]) / 4.0;
      break;
    case 0x0D:
      if (bytes.length >= 3) result['vehicle_speed'] = bytes[2];
      break;
    case 0x0E:
      if (bytes.length >= 3) result['timing_advance'] = bytes[2] / 2.0 - 64.0;
      break;
    case 0x0F:
      if (bytes.length >= 3) result['intake_air_temp'] = bytes[2] - 40.0;
      break;
    case 0x10:
      if (bytes.length >= 4) result['maf_rate'] = (bytes[2] * 256.0 + bytes[3]) / 100.0;
      break;
    case 0x11:
      if (bytes.length >= 3) result['throttle_position'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x14:
      if (bytes.length >= 3) result['o2_b1s1_voltage'] = bytes[2] / 200.0;
      break;
    case 0x15:
      if (bytes.length >= 3) result['o2_b1s2_voltage'] = bytes[2] / 200.0;
      break;
    case 0x16:
      if (bytes.length >= 3) result['o2_b2s1_voltage'] = bytes[2] / 200.0;
      break;
    case 0x17:
      if (bytes.length >= 3) result['o2_b2s2_voltage'] = bytes[2] / 200.0;
      break;
    case 0x1F:
      if (bytes.length >= 4) result['run_time_since_start'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x21:
      if (bytes.length >= 4) result['distance_with_mil'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x23:
      if (bytes.length >= 4) result['fuel_rail_pressure'] = (bytes[2] * 256.0 + bytes[3]) * 10.0;
      break;
    case 0x24:
      if (bytes.length >= 6) result['o2_lambda_upstream'] = (bytes[2] * 256.0 + bytes[3]) * 2.0 / 65536.0;
      break;
    case 0x28:
      if (bytes.length >= 6) result['o2_lambda_downstream'] = (bytes[2] * 256.0 + bytes[3]) * 2.0 / 65536.0;
      break;
    case 0x2C:
      if (bytes.length >= 3) result['egr_commanded'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x2D:
      if (bytes.length >= 3) result['egr_error'] = (bytes[2] - 128.0) * 100.0 / 128.0;
      break;
    case 0x2E:
      if (bytes.length >= 3) result['evap_purge'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x2F:
      if (bytes.length >= 3) result['fuel_level'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x30:
      if (bytes.length >= 3) result['warmups_since_cleared'] = bytes[2];
      break;
    case 0x31:
      if (bytes.length >= 4) result['distance_since_reset'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x32:
      if (bytes.length >= 4) {
        // Signed byte for high byte
        const highByte = bytes[2] > 127 ? bytes[2] - 256 : bytes[2];
        result['evap_vapor_pressure'] = (highByte * 256 + bytes[3]) / 4.0;
      }
      break;
    case 0x33:
      if (bytes.length >= 3) result['barometric_pressure'] = bytes[2];
      break;
    case 0x3C:
      if (bytes.length >= 4) result['catalyst_temp_b1s1'] = (bytes[2] * 256.0 + bytes[3]) / 10.0 - 40.0;
      break;
    case 0x42:
      if (bytes.length >= 4) result['ecu_voltage'] = (bytes[2] * 256.0 + bytes[3]) / 1000.0;
      break;
    case 0x43:
      if (bytes.length >= 4) result['absolute_load'] = (bytes[2] * 256.0 + bytes[3]) * 100.0 / 255.0;
      break;
    case 0x44:
      if (bytes.length >= 4) result['commanded_equiv_ratio'] = 2.0 / 65536.0 * (bytes[2] * 256.0 + bytes[3]);
      break;
    case 0x45:
      if (bytes.length >= 3) result['relative_tps'] = bytes[2] * 100.0 / 255.0;
      break;
    case 0x46:
      if (bytes.length >= 3) result['ambient_temp'] = bytes[2] - 40.0;
      break;
    case 0x4D:
      if (bytes.length >= 4) result['time_with_mil_min'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x4E:
      if (bytes.length >= 4) result['time_since_cleared_min'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x51:
      if (bytes.length >= 3) result['fuel_type'] = bytes[2];
      break;
    case 0x5B:
      if (bytes.length >= 4) result['oil_pressure'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x5C:
      if (bytes.length >= 3) result['oil_temp'] = bytes[2] - 40.0;
      break;
    case 0x5E:
      if (bytes.length >= 4) result['fuel_rate'] = (bytes[2] * 256.0 + bytes[3]) * 0.05;
      break;
    case 0x63:
      if (bytes.length >= 4) result['engine_ref_torque'] = bytes[2] * 256.0 + bytes[3];
      break;
    case 0x67:
      if (bytes.length >= 4) result['coolant_temp'] = bytes[3] - 40.0;
      break;
    case 0x6B:
      if (bytes.length >= 4) result['egr_commanded'] = bytes[3] * 100.0 / 255.0;
      break;
    case 0x70:
      if (bytes.length >= 6) result['boost_pressure'] = (bytes[3] * 256.0 + bytes[4]) * 0.03125;
      break;
    case 0x74:
      if (bytes.length >= 6) result['turbo_rpm'] = (bytes[3] * 256.0 + bytes[4]) * 10.0;
      break;
    case 0x7C:
      if (bytes.length >= 5) result['dpf_temp'] = (bytes[3] * 256.0 + bytes[4]) / 10.0 - 40.0;
      break;
    case 0x7D:
      if (bytes.length >= 4) result['dpf_diff_pressure'] = (bytes[2] * 256.0 + bytes[3]) / 100.0;
      break;
    case 0x7F:
      if (bytes.length >= 6) {
        result['run_time_since_start'] = bytes[2] * 16777216.0 +
          bytes[3] * 65536.0 + bytes[4] * 256.0 + bytes[5];
      }
      break;
  }

  // Normalize all values to SAE ranges
  for (const key of Object.keys(result)) {
    const norm = normalize(key, result[key]);
    if (norm === null) {
      delete result[key];
    } else {
      result[key] = norm;
    }
  }

  return result;
}

function parseMode06Response(bytes: number[]): Record<string, number> {
  if (bytes.length < 6) return {};
  const compId = bytes[2];
  const value = (bytes[3] << 8 | bytes[4]);
  const result: Record<string, number> = {};
  switch (compId) {
    case 0x01: result['misfire_cyl1'] = value; break;
    case 0x02: result['misfire_cyl2'] = value; break;
    case 0x03: result['misfire_cyl3'] = value; break;
    case 0x04: result['misfire_cyl4'] = value; break;
  }
  return result;
}

// ─── DTC Parser (SAE J2012) ──────────────────────────────────────────────────

export function decodeDtcBytes(b1: number, b2: number): string | null {
  if (b1 === 0 && b2 === 0) return null;

  const prefixes = ['P', 'C', 'B', 'U'];
  const prefix = prefixes[(b1 >> 6) & 0x03];
  const d2 = (b1 >> 4) & 0x03;
  const d3 = b1 & 0x0F;
  const d4 = (b2 >> 4) & 0x0F;
  const d5 = b2 & 0x0F;

  return `${prefix}${d2}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}${d5.toString(16).toUpperCase()}`;
}

export function parseDtcResponse(response: string): string[] {
  const lines = response.split(/[\r\n]+/);
  const allCodes = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bytes = parseHexBytes(trimmed);
    if (!bytes || bytes.length < 2) continue;

    const header = bytes[0];
    if (header !== 0x43 && header !== 0x47 && header !== 0x4A) continue;

    const remaining = bytes.length - 1;
    let startIdx: number;
    if (remaining >= 2) {
      const maybeCount = bytes[1];
      const pairCount = Math.floor((remaining - 1) / 2);
      if (maybeCount > 0 && maybeCount <= 6 && maybeCount === pairCount) {
        startIdx = 2;
      } else {
        startIdx = 1;
      }
    } else {
      continue;
    }

    for (let i = startIdx; i + 1 < bytes.length; i += 2) {
      const code = decodeDtcBytes(bytes[i], bytes[i + 1]);
      if (code) allCodes.add(code);
    }
  }
  return [...allCodes];
}

// ─── VIN Parser (Mode 09) ────────────────────────────────────────────────────

export function parseVinResponse(response: string): string | null {
  const bytes = parseHexBytes(response);
  if (!bytes || bytes.length < 5) return null;

  if (bytes[0] !== 0x49 || bytes[1] !== 0x02) return null;

  const vinBytes = bytes.slice(3);
  const vin = vinBytes
    .filter(b => b >= 0x20 && b <= 0x7E)
    .map(b => String.fromCharCode(b))
    .join('');
  return vin.length >= 17 ? vin.substring(0, 17) : (vin || null);
}

// ─── PID Support Response Parser ─────────────────────────────────────────────

export function parsePidSupportResponse(response: string): number {
  const cleaned = cleanResponse(response);
  if (!cleaned) return 0;

  const bytes = parseHexBytes(cleaned);
  if (!bytes || bytes.length < 6) return 0;

  return PidSupportBitmask.parseBitmask(bytes.slice(2, 6));
}

export function parseVoltageResponse(response: string): number | null {
  const cleaned = response.trim().toUpperCase();
  const match = cleaned.match(/^(\d+\.?\d*)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) ? null : val;
}

// ─── AT Command Building ─────────────────────────────────────────────────────

export function buildInitSequence(chipType: AdapterChipType): string[] {
  const quirks = AdapterQuirks.forChipType(chipType);
  const cmds: string[] = ['ATZ'];

  cmds.push('ATE0', 'ATL0');
  cmds.push('ATS0', 'ATS1');
  cmds.push('ATSP0');

  if (quirks.supportsAdaptiveTiming) {
    cmds.push('ATAT1');
    cmds.push('ATST 96');
  }

  if (quirks.reliableCanFlowControl) {
    cmds.push('ATCAF1', 'ATCFC1');
  }

  if (quirks.mode06Reliable) {
    cmds.push('ATAL');
  }

  if (quirks.supportsHeaders) {
    cmds.push('ATH0');
  }

  return cmds;
}

export function buildScanCommands(supported: PidSupportBitmask, chipType: AdapterChipType): string[] {
  const quirks = AdapterQuirks.forChipType(chipType);
  const pids = buildPidRequestList(supported);
  const batchSize = quirks.maxPidsPerRequest;
  const commands: string[] = [];

  if (batchSize <= 1) {
    for (const pid of pids) {
      commands.push(`01 ${pid.toString(16).padStart(2, '0').toUpperCase()}`);
    }
  } else {
    for (let i = 0; i < pids.length; i += batchSize) {
      const chunk = pids.slice(i, Math.min(i + batchSize, pids.length));
      const pidStr = chunk
        .map(p => p.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      commands.push(`01 ${pidStr}`);
    }
  }

  if (quirks.mode06Reliable) {
    commands.push('06 01');
  }

  return commands;
}

function buildPidRequestList(supported: PidSupportBitmask): number[] {
  const ordered = [
    // Core engine
    0x0C, 0x04, 0x05, 0x0D, 0x06, 0x07,
    // O2 sensors
    0x14, 0x15, 0x16, 0x17,
    // Bank 2 fuel trim
    0x08, 0x09,
    // Fuel system status + monitor status
    0x01, 0x03,
    // Throttle & MAF
    0x11, 0x10,
    // High priority
    0x0A, 0x0E, 0x23, 0x2C, 0x2D, 0x44, 0x46,
    // Secondary
    0x0F, 0x0B, 0x1F, 0x42, 0x31, 0x33,
    // Medium priority
    0x21, 0x2E, 0x2F, 0x30, 0x32, 0x43, 0x4D, 0x4E, 0x51,
    // Wideband O2/ lambda
    0x24, 0x28,
    // Extended
    0x3C, 0x45, 0x5C, 0x5E,
    // 0x61-0x80 extended range
    0x63, 0x67, 0x6B, 0x70, 0x74, 0x7C, 0x7F,
  ];

  return ordered.filter(pid => supported.isSupported(pid));
}

export function shouldRetry(response: string, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;
  const upper = response.toUpperCase();
  return upper.includes('NO DATA') ||
    upper.includes('BUS BUSY') ||
    upper.includes('CAN ERROR') ||
    upper.includes('UNABLE TO CONNECT') ||
    upper.length === 0;
}

export function maxRetriesFor(chipType: AdapterChipType): number {
  switch (chipType) {
    case AdapterChipType.STN_OBDLINK: return 1;
    case AdapterChipType.ELM327_GENUINE:
    case AdapterChipType.VGATE: return 2;
    case AdapterChipType.ELM327_CLONE:
    case AdapterChipType.UNKNOWN: return 2;
  }
}
