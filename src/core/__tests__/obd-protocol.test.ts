// ─── OBD Protocol Unit Tests ─────────────────────────────────────────
// Tests for SAE J1979 PID parsing, DTC decoding, and adapter protocol handling.

import { describe, it, expect } from 'vitest';
import {
  parseHexBytes,
  cleanResponse,
  cleanAdapterResponse,
  parsePidResponse,
  parsePidSupportResponse,
  parseDtcResponse,
  parseVinResponse,
  parseVoltageResponse,
  decodeDtcBytes,
  buildInitSequence,
  buildScanCommands,
  PidSupportBitmask,
  AdapterQuirks,
} from '../obd-protocol';
import { AdapterChipType } from '../../models/adapter-info';

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 1: Hex Parsing
// ╚═══════════════════════════════════════════════════════════════════════

describe('parseHexBytes', () => {
  it('parses valid hex string', () => {
    expect(parseHexBytes('41 0C 0B E8')).toEqual([0x41, 0x0C, 0x0B, 0xE8]);
  });

  it('parses hex without spaces', () => {
    expect(parseHexBytes('410C0BE8')).toEqual([0x41, 0x0C, 0x0B, 0xE8]);
  });

  it('handles lowercase', () => {
    expect(parseHexBytes('41 0c 0b e8')).toEqual([0x41, 0x0C, 0x0B, 0xE8]);
  });

  it('returns null for empty string', () => {
    expect(parseHexBytes('')).toBeNull();
  });

  it('returns null for odd nibble count', () => {
    expect(parseHexBytes('41 0C 0')).toBeNull();
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 2: Response Cleaning
// ╚═══════════════════════════════════════════════════════════════════════

describe('cleanResponse', () => {
  it('strips prompt character and uppercases', () => {
    expect(cleanResponse('41 0c 0b e8>')).toBe('41 0C 0B E8');
  });

  it('returns null for NO DATA', () => {
    expect(cleanResponse('NO DATA')).toBeNull();
  });

  it('returns null for SEARCHING', () => {
    expect(cleanResponse('SEARCHING...')).toBeNull();
  });

  it('returns null for empty response', () => {
    expect(cleanResponse('')).toBeNull();
  });

  it('returns null for OK', () => {
    expect(cleanResponse('OK')).toBeNull();
  });

  it('returns null for ?', () => {
    expect(cleanResponse('?')).toBeNull();
  });
});

describe('cleanAdapterResponse', () => {
  it('strips echo command', () => {
    const result = cleanAdapterResponse('01 0C\r41 0C 0B E8\r>', '01 0C');
    expect(result).toContain('41 0C 0B E8');
  });

  it('strips SEARCHING prefix', () => {
    const result = cleanAdapterResponse('SEARCHING...\r41 0C 0B E8\r>', '01 0C');
    expect(result).toBeTruthy();
  });

  it('returns null for NO DATA response', () => {
    expect(cleanAdapterResponse('01 0C\rNO DATA\r>', '01 0C')).toBeNull();
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 3: PID Response Parsing (SAE J1979)
// ╚═══════════════════════════════════════════════════════════════════════

describe('parsePidResponse', () => {
  it('parses RPM (PID 0x0C) — 750 RPM', () => {
    // 750 RPM = 3000 raw → 0x0BB8 → bytes [0x0B, 0xB8]
    const result = parsePidResponse('41 0C 0B B8');
    expect(result['rpm']).toBeCloseTo(750, 0);
  });

  it('parses RPM — 3000 RPM', () => {
    // 3000 RPM = 12000 raw → 0x2EE0
    const result = parsePidResponse('41 0C 2E E0');
    expect(result['rpm']).toBeCloseTo(3000, 0);
  });

  it('parses coolant temp (PID 0x05) — 90°C', () => {
    // 90°C → byte = 90 + 40 = 130 = 0x82
    const result = parsePidResponse('41 05 82');
    expect(result['coolant_temp']).toBeCloseTo(90, 0);
  });

  it('parses coolant temp — -10°C', () => {
    // -10°C → byte = -10 + 40 = 30 = 0x1E
    const result = parsePidResponse('41 05 1E');
    expect(result['coolant_temp']).toBeCloseTo(-10, 0);
  });

  it('parses vehicle speed (PID 0x0D) — 60 km/h', () => {
    const result = parsePidResponse('41 0D 3C');
    expect(result['vehicle_speed']).toBe(60);
  });

  it('parses engine load (PID 0x04) — ~50%', () => {
    // 50% → 127/255*100 ≈ 49.8
    const result = parsePidResponse('41 04 7F');
    expect(result['engine_load']).toBeCloseTo(49.8, 0);
  });

  it('parses throttle position (PID 0x11)', () => {
    const result = parsePidResponse('41 11 80');
    // 0x80 = 128 → 128/255*100 ≈ 50.2%
    expect(result['throttle_position']).toBeCloseTo(50.2, 0);
  });

  it('parses MAF rate (PID 0x10) — 6.55 g/s', () => {
    // 6.55 g/s → 655 raw → 0x028F
    const result = parsePidResponse('41 10 02 8F');
    expect(result['maf_rate']).toBeCloseTo(6.55, 1);
  });

  it('parses O2 voltage (PID 0x14) — 0.5V', () => {
    // 0.5V → byte = 100 = 0x64
    const result = parsePidResponse('41 14 64');
    expect(result['o2_b1s1_voltage']).toBeCloseTo(0.5, 1);
  });

  it('parses timing advance (PID 0x0E) — 14°', () => {
    // 14° → byte = (14 + 64) * 2 = 156 = 0x9C
    const result = parsePidResponse('41 0E 9C');
    expect(result['timing_advance']).toBeCloseTo(14, 0);
  });

  it('parses ECU voltage (PID 0x42) — 14.2V', () => {
    // 14.2V → raw = 14200 → bytes [0x37, 0x78]
    // actually 0x42 → voltage = (A*256+B)/1000
    const raw = Math.round(14.2 * 1000);
    const a = (raw >> 8) & 0xFF;
    const b = raw & 0xFF;
    const result = parsePidResponse(`41 42 ${a.toString(16).padStart(2, '0')} ${b.toString(16).padStart(2, '0')}`);
    expect(result['ecu_voltage']).toBeCloseTo(14.2, 0);
  });

  it('parses fuel level (PID 0x2F) — ~50%', () => {
    const result = parsePidResponse('41 2F 80');
    expect(result['fuel_level']).toBeCloseTo(50.2, 0);
  });

  it('parses MIL status (PID 0x01)', () => {
    // Byte 2: bit7=MIL on, bits0-6=DTC count. 0x83 = MIL on, 3 DTCs
    const result = parsePidResponse('41 01 83 00 00 00');
    expect(result['mil_status']).toBe(1);
    expect(result['dtc_count']).toBe(3);
  });

  it('returns empty for non-mode-01 response', () => {
    const result = parsePidResponse('42 0C 0B E8');
    expect(Object.keys(result).length).toBe(0);
  });

  it('returns empty for short response', () => {
    const result = parsePidResponse('41');
    expect(Object.keys(result).length).toBe(0);
  });

  it('parses short term fuel trim (PID 0x06)', () => {
    // 0% STFT → byte = 128 = 0x80
    const result = parsePidResponse('41 06 80');
    expect(result['stft_b1']).toBeCloseTo(0, 0);
  });

  it('parses STFT +25%', () => {
    // +25% → byte = 128 + (25 * 128 / 100) = 160 = 0xA0
    const result = parsePidResponse('41 06 A0');
    expect(result['stft_b1']).toBeCloseTo(25, 0);
  });

  it('parses STFT -25%', () => {
    // -25% → byte = 128 - (25 * 128 / 100) = 96 = 0x60
    const result = parsePidResponse('41 06 60');
    expect(result['stft_b1']).toBeCloseTo(-25, 0);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 4: DTC Parsing
// ╚═══════════════════════════════════════════════════════════════════════

describe('decodeDtcBytes', () => {
  it('decodes P0300 — Random Misfire', () => {
    // P0300: P=00xx, 0300 = 0x03, 0x00
    expect(decodeDtcBytes(0x03, 0x00)).toBe('P0300');
  });

  it('decodes P0171 — System Too Lean Bank 1', () => {
    expect(decodeDtcBytes(0x01, 0x71)).toBe('P0171');
  });

  it('decodes C-chassis code', () => {
    // C0035: C=01xx → 0x40 prefix on first nibble
    expect(decodeDtcBytes(0x40, 0x35)).toBe('C0035');
  });

  it('decodes B-body code', () => {
    // B0100: B=10xx → 0x80
    expect(decodeDtcBytes(0x80, 0x00)).toBe('B0000');
  });

  it('returns null for 0x0000 (no DTC)', () => {
    expect(decodeDtcBytes(0x00, 0x00)).toBeNull();
  });
});

describe('parseDtcResponse', () => {
  it('parses mode 03 stored DTC response', () => {
    // Response: 43 02 01 71 03 00 → count=2, P0171, P0300
    const result = parseDtcResponse('43 02 01 71 03 00');
    expect(result).toContain('P0171');
    expect(result).toContain('P0300');
    expect(result).toHaveLength(2);
  });

  it('returns empty for no-DTC response', () => {
    const result = parseDtcResponse('43 00 00 00 00');
    expect(result).toHaveLength(0);
  });

  it('returns empty for empty string', () => {
    const result = parseDtcResponse('');
    expect(result).toHaveLength(0);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 5: PID Support Bitmask
// ╚═══════════════════════════════════════════════════════════════════════

describe('PidSupportBitmask', () => {
  it('reports correct supported PIDs', () => {
    // mask0120 = 0xBE1FA813 supports PIDs: 01,03,04,05,06,07,0B,0C,0D,0E,0F,11,1F,20
    const mask = new PidSupportBitmask(0xBE1FA813);
    expect(mask.isSupported(0x04)).toBe(true); // engine load
    expect(mask.isSupported(0x05)).toBe(true); // coolant temp
    expect(mask.isSupported(0x0C)).toBe(true); // RPM
    expect(mask.isSupported(0x0D)).toBe(true); // speed
    expect(mask.supportedPids.length).toBeGreaterThan(0);
  });

  it('empty bitmask has no supported PIDs', () => {
    const mask = new PidSupportBitmask();
    expect(mask.supportedPids.length).toBe(0);
    expect(mask.isSupported(0x0C)).toBe(false);
  });
});

describe('parsePidSupportResponse', () => {
  it('parses mode 01 PID 00 support response', () => {
    // 41 00 BE 1F A8 13 → mask = 0xBE1FA813
    const mask = parsePidSupportResponse('41 00 BE 1F A8 13');
    expect(mask).toBe(0xBE1FA813);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 6: VIN and Voltage Parsing
// ╚═══════════════════════════════════════════════════════════════════════

describe('parseVoltageResponse', () => {
  it('parses ATRV response', () => {
    expect(parseVoltageResponse('14.2V')).toBeCloseTo(14.2, 1);
  });

  it('parses voltage without V suffix', () => {
    expect(parseVoltageResponse('12.6')).toBeCloseTo(12.6, 1);
  });

  it('returns null for non-numeric', () => {
    expect(parseVoltageResponse('NO DATA')).toBeNull();
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 7: Build Commands
// ╚═══════════════════════════════════════════════════════════════════════

describe('buildInitSequence', () => {
  it('includes ATZ and ATE0 for ELM327', () => {
    const cmds = buildInitSequence(AdapterChipType.ELM327_GENUINE);
    expect(cmds).toContain('ATZ');
    expect(cmds).toContain('ATE0');
    expect(cmds).toContain('ATL0');
    expect(cmds).toContain('ATSP0');
  });

  it('generates init commands for Vgate', () => {
    const cmds = buildInitSequence(AdapterChipType.VGATE);
    expect(cmds.length).toBeGreaterThan(0);
    expect(cmds).toContain('ATZ');
  });
});

describe('buildScanCommands', () => {
  it('builds commands for supported PIDs', () => {
    const mask = new PidSupportBitmask(0xBE1FA813);
    const cmds = buildScanCommands(mask, AdapterChipType.ELM327_GENUINE);
    expect(cmds.length).toBeGreaterThan(0);
    // Should include commands like "01 0C" for RPM
    const hasModePid = cmds.some(c => c.startsWith('01'));
    expect(hasModePid).toBe(true);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 8: AdapterQuirks
// ╚═══════════════════════════════════════════════════════════════════════

describe('AdapterQuirks', () => {
  it('ELM327 has reasonable delay', () => {
    const q = AdapterQuirks.forChipType(AdapterChipType.ELM327_GENUINE);
    expect(q.interCommandDelayMs).toBeGreaterThan(0);
    expect(q.interCommandDelayMs).toBeLessThan(500);
  });

  it('generic BLE has default values', () => {
    const q = AdapterQuirks.genericBle();
    expect(q.interCommandDelayMs).toBeGreaterThan(0);
  });
});
