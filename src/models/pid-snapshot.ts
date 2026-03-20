// Port of pid_snapshot.dart — 57 nullable PID fields

export interface PidSnapshot {
  engine_load: number | null;
  coolant_temp: number | null;
  stft_b1: number | null;
  ltft_b1: number | null;
  stft_b2: number | null;
  ltft_b2: number | null;
  fuel_system_status: number | null;
  fuel_pressure: number | null;
  map_pressure: number | null;
  rpm: number | null;
  vehicle_speed: number | null;
  timing_advance: number | null;
  intake_air_temp: number | null;
  maf_rate: number | null;
  throttle_position: number | null;
  o2_b1s1_voltage: number | null;
  o2_b1s2_voltage: number | null;
  o2_b2s1_voltage: number | null;
  o2_b2s2_voltage: number | null;
  o2_lambda_upstream: number | null;
  o2_lambda_downstream: number | null;
  egr_commanded: number | null;
  egr_error: number | null;
  evap_purge: number | null;
  fuel_level: number | null;
  fuel_rail_pressure: number | null;
  distance_with_mil: number | null;
  distance_since_reset: number | null;
  warmups_since_cleared: number | null;
  evap_vapor_pressure: number | null;
  barometric_pressure: number | null;
  catalyst_temp_b1s1: number | null;
  ecu_voltage: number | null;
  absolute_load: number | null;
  commanded_equiv_ratio: number | null;
  relative_tps: number | null;
  ambient_temp: number | null;
  time_with_mil_min: number | null;
  time_since_cleared_min: number | null;
  fuel_type: number | null;
  fuel_rate: number | null;
  oil_pressure: number | null;
  oil_temp: number | null;
  boost_pressure: number | null;
  turbo_rpm: number | null;
  dpf_temp: number | null;
  dpf_diff_pressure: number | null;
  gear_selected: number | null;
  trans_fluid_temp: number | null;
  run_time_since_start: number | null;
  misfire_cyl1: number | null;
  misfire_cyl2: number | null;
  misfire_cyl3: number | null;
  misfire_cyl4: number | null;
  mil_status: number | null;
  dtc_count: number | null;
  engine_ref_torque: number | null;
}

export const PID_SNAPSHOT_KEYS: (keyof PidSnapshot)[] = [
  'engine_load', 'coolant_temp', 'stft_b1', 'ltft_b1', 'stft_b2', 'ltft_b2',
  'fuel_system_status', 'fuel_pressure', 'map_pressure', 'rpm', 'vehicle_speed',
  'timing_advance', 'intake_air_temp', 'maf_rate', 'throttle_position',
  'o2_b1s1_voltage', 'o2_b1s2_voltage', 'o2_b2s1_voltage', 'o2_b2s2_voltage',
  'o2_lambda_upstream', 'o2_lambda_downstream', 'egr_commanded', 'egr_error',
  'evap_purge', 'fuel_level', 'fuel_rail_pressure', 'distance_with_mil',
  'distance_since_reset', 'warmups_since_cleared', 'evap_vapor_pressure',
  'barometric_pressure', 'catalyst_temp_b1s1', 'ecu_voltage', 'absolute_load',
  'commanded_equiv_ratio', 'relative_tps', 'ambient_temp', 'time_with_mil_min',
  'time_since_cleared_min', 'fuel_type', 'fuel_rate', 'oil_pressure', 'oil_temp',
  'boost_pressure', 'turbo_rpm', 'dpf_temp', 'dpf_diff_pressure', 'gear_selected',
  'trans_fluid_temp', 'run_time_since_start', 'misfire_cyl1', 'misfire_cyl2',
  'misfire_cyl3', 'misfire_cyl4', 'mil_status', 'dtc_count', 'engine_ref_torque',
];

export function emptySnapshot(): PidSnapshot {
  const snap: Record<string, null> = {};
  for (const key of PID_SNAPSHOT_KEYS) snap[key] = null;
  return snap as unknown as PidSnapshot;
}

export function snapshotFromMap(values: Record<string, number>): PidSnapshot {
  const snap = emptySnapshot();
  for (const [key, val] of Object.entries(values)) {
    if (key in snap) (snap as unknown as Record<string, number | null>)[key] = val;
  }
  return snap;
}

export function snapshotToMap(snap: PidSnapshot): Record<string, number> {
  const map: Record<string, number> = {};
  for (const key of PID_SNAPSHOT_KEYS) {
    const v = snap[key];
    if (v !== null) map[key] = v;
  }
  return map;
}
