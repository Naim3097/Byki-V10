// Port of pid_definition.dart

export interface PidDefinition {
  pid: number;
  name: string;
  shortName: string;
  unit: string;
  minValue: number;
  maxValue: number;
  normalLow: number;
  normalHigh: number;
  warningHigh: number | null;
  warningLow: number | null;
  criticalHigh: number | null;
  criticalLow: number | null;
  snapshotKey: string;
  showAsGauge: boolean;
}

export function statusForValue(def: PidDefinition, value: number): string {
  if (def.criticalLow !== null && value < def.criticalLow) return 'critical';
  if (def.criticalHigh !== null && value > def.criticalHigh) return 'critical';
  if (def.warningLow !== null && value < def.warningLow) return 'warning';
  if (def.warningHigh !== null && value > def.warningHigh) return 'warning';
  if (value >= def.normalLow && value <= def.normalHigh) return 'ok';
  return 'warning';
}

const PID_HEX_TO_SNAPSHOT_KEY: Record<string, string> = {
  '0x0104': 'engine_load', '0x0105': 'coolant_temp',
  '0x0106': 'stft_b1', '0x0107': 'ltft_b1',
  '0x0108': 'stft_b2', '0x0109': 'ltft_b2',
  '0x010B': 'map_pressure', '0x010C': 'rpm',
  '0x010D': 'vehicle_speed', '0x010E': 'timing_advance',
  '0x010F': 'intake_air_temp', '0x0110': 'maf_rate',
  '0x0111': 'throttle_position', '0x0114': 'o2_b1s1_voltage',
  '0x0115': 'o2_b1s2_voltage', '0x0116': 'o2_b2s1_voltage',
  '0x0117': 'o2_b2s2_voltage', '0x011F': 'run_time_since_start',
  '0x012C': 'egr_commanded', '0x012D': 'egr_error',
  '0x012E': 'evap_purge', '0x012F': 'fuel_level',
  '0x0133': 'barometric_pressure', '0x013C': 'catalyst_temp_b1s1',
  '0x0142': 'ecu_voltage', '0x0145': 'relative_tps',
  '0x0146': 'ambient_temp', '0x015B': 'oil_pressure',
  '0x015C': 'oil_temp', '0x0170': 'boost_pressure',
  '0x0174': 'turbo_rpm', '0x017C': 'dpf_temp',
  '0x017D': 'dpf_diff_pressure',
};

const GAUGE_PIDS = new Set([
  0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
  0x10, 0x11, 0x14, 0x15, 0x16, 0x17, 0x1F, 0x2C, 0x2D, 0x2E, 0x2F,
  0x33, 0x3C, 0x42, 0x45, 0x46, 0x5B, 0x5C, 0x70, 0x74, 0x7C, 0x7D,
]);

export async function loadPidDefinitions(): Promise<Map<number, PidDefinition>> {
  const res = await fetch('/data/obd2_parameters.json');
  const data = await res.json();
  const params = data.parameters as Record<string, Record<string, unknown>>;
  const result = new Map<number, PidDefinition>();

  for (const [hexKey, p] of Object.entries(params)) {
    const pidHex = parseInt(hexKey.replace('0x', ''), 16);
    if (isNaN(pidHex)) continue;
    const pidByte = pidHex & 0xFF;
    const snapshotKey = PID_HEX_TO_SNAPSHOT_KEY[hexKey];
    if (!snapshotKey) continue;

    const normalRange = p.normalRange as Record<string, Record<string, number>> | undefined;
    const idle = normalRange?.idle;
    const thresholds = p.warningThresholds as Record<string, number> | undefined;

    result.set(pidByte, {
      pid: pidByte,
      name: (p.name as string) ?? '',
      shortName: (p.shortName as string) ?? '',
      unit: (p.unit as string) ?? '',
      minValue: (p.minValue as number) ?? 0,
      maxValue: (p.maxValue as number) ?? 100,
      normalLow: idle?.min ?? 0,
      normalHigh: idle?.max ?? 100,
      warningLow: thresholds?.low ?? null,
      warningHigh: thresholds?.high ?? null,
      criticalLow: thresholds?.criticalLow ?? null,
      criticalHigh: thresholds?.criticalHigh ?? null,
      snapshotKey,
      showAsGauge: GAUGE_PIDS.has(pidByte),
    });
  }

  return result;
}
