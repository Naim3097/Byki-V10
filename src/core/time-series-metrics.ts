// ─── Time-Series Metrics ─────────────────────────────────────────────
// Pre-computed time-series statistics from raw scan snapshots.
// Mirrors the Dart TimeSeriesMetrics — computes variance, persistence,
// switching frequency, contextual stats BEFORE averaging.
//
// Physics references:
//   SAE J1979: O2 sensor switching behavior, fuel trim interpretation
//   Bosch Automotive Handbook: alternator curves, thermal models
//   Heywood – ICE Fundamentals: volumetric efficiency, combustion analysis
//   GM Oil Life Monitor: multi-factor oil stress algorithm

import type { PidSnapshot } from '../models/pid-snapshot';

export interface TimeSeriesMetrics {
  // ── O2 Sensor ──
  o2UpstreamVariance: number;
  o2DownstreamVariance: number;
  catalystEfficiencyRatio: number | null;
  o2UpstreamCrossings: number;
  o2PersistentLean: boolean;
  o2PersistentRich: boolean;
  o2LazySwitch: boolean;
  o2UpstreamMedian: number | null;

  // ── Fuel Trim ──
  persistentLean: boolean;
  persistentRich: boolean;
  stftVariance: number;
  maxAbsStft: number;
  idleLtft: number | null;
  loadLtft: number | null;
  idleStft: number | null;
  loadStft: number | null;
  fuelTrimSeverity: number;

  // ── Combustion ──
  idleRpmStdDev: number;
  highRpmFraction: number;
  idleFraction: number;

  // ── Charging ──
  voltageStdDev: number;
  voltageAtIdle: number | null;
  voltageUnderLoad: number | null;
  voltageAtCruise: number | null;
  voltageRange: number;
  rpmVoltageCorrelation: number;

  // ── Cooling ──
  coolantTempStdDev: number;
  cruiseTempTrend: number | null;
  maxCoolantTemp: number | null;
  warmupRate: number;
  slowWarmup: boolean;

  // ── Thermal / Ambient ──
  ambientEstimate: number;
  isClosedLoop: boolean;

  // ── Oil Stress ──
  heatStressFraction: number;
  oilPressurePerRpm: number;
  distanceKm: number | null;

  // ── Intake / Efficiency ──
  idleVacuumKpa: number | null;
  mafAtIdle: number | null;
  idleThrottlePosition: number | null;
  throttleLoadDelta: number | null;
  loadThrottleCorrelation: number;
  avgSpeed: number;
  o2BankImbalance: number;

  // ── Timing ──
  avgTimingAdvance: number | null;
  timingAtLoad: number | null;

  // ── EGR ──
  commandedEgrAtIdle: number | null;
  avgEgrError: number | null;

  // ── Phase 3 Context ──
  distanceWithMil: number | null;
  timeSinceClearedMin: number | null;
  recentlyCleared: boolean;
  fuelTankLevel: number | null;
  commandedEvapPurge: number | null;
}

// ── Statistical helpers ──

function collect(snaps: PidSnapshot[], f: (s: PidSnapshot) => number | null | undefined): number[] {
  const out: number[] = [];
  for (const s of snaps) {
    const v = f(s);
    if (v != null) out.push(v);
  }
  return out;
}

function mean(v: number[]): number {
  if (v.length === 0) return 0;
  let s = 0;
  for (const x of v) s += x;
  return s / v.length;
}

function variance(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v);
  let s = 0;
  for (const x of v) s += (x - m) * (x - m);
  return s / v.length;
}

function stdDev(v: number[]): number {
  return Math.sqrt(variance(v));
}

function median(v: number[]): number | null {
  if (v.length === 0) return null;
  const sorted = [...v].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function countCrossings(v: number[], midpoint: number): number {
  let crossings = 0;
  for (let i = 1; i < v.length; i++) {
    const prev = v[i - 1] > midpoint;
    const curr = v[i] > midpoint;
    if (prev !== curr) crossings++;
  }
  return crossings;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom < 1e-10) return 0;
  return Math.max(-1, Math.min(1, num / denom));
}

// ── Empty / default metrics ──

export function emptyTimeSeriesMetrics(): TimeSeriesMetrics {
  return {
    o2UpstreamVariance: 0, o2DownstreamVariance: 0,
    catalystEfficiencyRatio: null, o2UpstreamCrossings: 0,
    o2PersistentLean: false, o2PersistentRich: false,
    o2LazySwitch: false, o2UpstreamMedian: null,
    persistentLean: false, persistentRich: false,
    stftVariance: 0, maxAbsStft: 0,
    idleLtft: null, loadLtft: null, idleStft: null, loadStft: null,
    fuelTrimSeverity: 0,
    idleRpmStdDev: 0, highRpmFraction: 0, idleFraction: 0,
    voltageStdDev: 0, voltageAtIdle: null, voltageUnderLoad: null,
    voltageAtCruise: null, voltageRange: 0, rpmVoltageCorrelation: 0,
    coolantTempStdDev: 0, cruiseTempTrend: null, maxCoolantTemp: null,
    warmupRate: 0, slowWarmup: false,
    ambientEstimate: 30, isClosedLoop: true,
    heatStressFraction: 0, oilPressurePerRpm: 0, distanceKm: null,
    idleVacuumKpa: null, mafAtIdle: null, idleThrottlePosition: null,
    throttleLoadDelta: null, loadThrottleCorrelation: 0,
    avgSpeed: 0, o2BankImbalance: 0,
    avgTimingAdvance: null, timingAtLoad: null,
    commandedEgrAtIdle: null, avgEgrError: null,
    distanceWithMil: null, timeSinceClearedMin: null,
    recentlyCleared: false, fuelTankLevel: null, commandedEvapPurge: null,
  };
}

// ── Compute all time-series metrics from raw PID snapshot list ──

export function computeTimeSeriesMetrics(snapshots: PidSnapshot[]): TimeSeriesMetrics {
  if (snapshots.length === 0) return emptyTimeSeriesMetrics();

  // ── Collect series ──
  const o2Ups = collect(snapshots, s => s.o2_b1s1_voltage);
  const o2Downs = collect(snapshots, s => s.o2_b1s2_voltage);
  const stfts = collect(snapshots, s => s.stft_b1);
  const ltfts = collect(snapshots, s => s.ltft_b1);
  const rpms = collect(snapshots, s => s.rpm);
  const voltages = collect(snapshots, s => s.ecu_voltage);
  const coolants = collect(snapshots, s => s.coolant_temp);
  const timings = collect(snapshots, s => s.timing_advance);

  // ── O2 sensor analysis ──
  const o2UpVar = variance(o2Ups);
  const o2DownVar = variance(o2Downs);
  const catRatio = o2UpVar > 0.005 ? o2DownVar / o2UpVar : null;
  const o2Crossings = countCrossings(o2Ups, 0.45);
  const o2LeanCount = o2Ups.filter(v => v < 0.2).length;
  const o2RichCount = o2Ups.filter(v => v > 0.8).length;
  const o2PersLean = o2Ups.length >= 3 && o2LeanCount > o2Ups.length * 0.6;
  const o2PersRich = o2Ups.length >= 3 && o2RichCount > o2Ups.length * 0.6;
  const o2Lazy = o2Ups.length >= 3 && o2UpVar < 0.01;
  const o2UpMedian = median(o2Ups);

  // ── Fuel trim analysis ──
  const leanCount = ltfts.filter(v => v > 8).length;
  const richCount = ltfts.filter(v => v < -8).length;
  const persLean = ltfts.length >= 3 && leanCount > ltfts.length * 0.6;
  const persRich = ltfts.length >= 3 && richCount > ltfts.length * 0.6;
  const stftVar = stdDev(stfts);
  const maxStft = stfts.length === 0 ? 0 : Math.max(...stfts.map(v => Math.abs(v)));

  // Context-separated fuel trims
  const idleLtfts: number[] = [];
  const loadLtfts: number[] = [];
  const idleStfts: number[] = [];
  const loadStfts: number[] = [];
  for (const snap of snapshots) {
    const r = snap.rpm;
    const l = snap.engine_load;
    const lt = snap.ltft_b1;
    const st = snap.stft_b1;
    if (r != null && lt != null) {
      if (r < 1000) {
        idleLtfts.push(lt);
        if (st != null) idleStfts.push(st);
      }
      if (l != null && l > 50) {
        loadLtfts.push(lt);
        if (st != null) loadStfts.push(st);
      }
    }
  }

  // Fuel trim severity: weighted |STFT + LTFT| across samples
  let trimSeverity = 0;
  let trimCount = 0;
  for (const snap of snapshots) {
    const st = snap.stft_b1;
    const lt = snap.ltft_b1;
    if (st != null && lt != null) {
      trimSeverity += Math.abs(st + lt);
      trimCount++;
    }
  }
  trimSeverity = trimCount > 0 ? trimSeverity / trimCount : 0;

  // ── RPM / combustion analysis ──
  const idleRpms: number[] = [];
  for (const snap of snapshots) {
    const r = snap.rpm;
    const sp = snap.vehicle_speed ?? 0;
    if (r != null && r > 400 && r < 1200 && sp < 5) idleRpms.push(r);
  }
  const idleRpmSd = stdDev(idleRpms);
  const highRpmCount = rpms.filter(r => r > 3500).length;
  const highRpmFrac = rpms.length === 0 ? 0 : highRpmCount / rpms.length;
  const idleCount = snapshots.filter(s =>
    (s.rpm ?? 0) > 0 && (s.rpm ?? 0) < 900 &&
    (s.throttle_position ?? 0) < 5
  ).length;
  const runningCount = snapshots.filter(s => (s.rpm ?? 0) > 400).length;
  const idleFrac = runningCount > 0 ? idleCount / runningCount : 0;

  // ── Voltage analysis ──
  const voltSd = stdDev(voltages);
  const idleVolts: number[] = [];
  const loadVolts: number[] = [];
  for (const snap of snapshots) {
    const v = snap.ecu_voltage;
    const r = snap.rpm;
    const l = snap.engine_load;
    if (v != null && r != null) {
      if (r > 400 && r < 1000) idleVolts.push(v);
      if (l != null && l > 50) loadVolts.push(v);
    }
  }
  const rpmVoltCorr = (rpms.length >= 3 && voltages.length >= 3 &&
    rpms.length === voltages.length && stdDev(rpms) > 50)
    ? pearson(rpms, voltages)
    : 0;

  // Voltage at cruise (speed > 40 km/h)
  const cruiseVolts: number[] = [];
  for (const snap of snapshots) {
    const v = snap.ecu_voltage;
    const sp = snap.vehicle_speed;
    if (v != null && sp != null && sp > 40) cruiseVolts.push(v);
  }

  // Voltage range
  const voltRange = voltages.length >= 2
    ? Math.max(...voltages) - Math.min(...voltages)
    : 0;

  // ── Cooling analysis ──
  const coolantSd = stdDev(coolants);
  const maxCoolant = coolants.length === 0 ? null : Math.max(...coolants);
  const cruiseTemps: number[] = [];
  for (const snap of snapshots) {
    const sp = snap.vehicle_speed;
    const ct = snap.coolant_temp;
    if (sp != null && sp > 60 && ct != null) cruiseTemps.push(ct);
  }
  let cruiseTrend: number | null = null;
  if (cruiseTemps.length >= 2) {
    cruiseTrend = (cruiseTemps[cruiseTemps.length - 1] - cruiseTemps[0]) / (cruiseTemps.length - 1);
  }
  const lastRuntime = snapshots[snapshots.length - 1].run_time_since_start;
  const lastEct = snapshots[snapshots.length - 1].coolant_temp;
  const slowWarm = lastRuntime != null && lastRuntime > 720 &&
    lastEct != null && lastEct < 85;

  // Warmup rate
  const firstEct = snapshots[0].coolant_temp;
  let warmRate = 0;
  if (firstEct != null && lastEct != null && lastRuntime != null && lastRuntime > 0) {
    warmRate = (lastEct - firstEct) / lastRuntime;
  }

  // ── Ambient estimate ──
  const firstIat = snapshots[0].intake_air_temp;
  const firstAmbient = snapshots[0].ambient_temp;
  let ambientEst: number;
  if (firstIat != null && firstIat > -10 && firstIat < 50) {
    ambientEst = firstIat;
  } else if (firstAmbient != null && firstAmbient > -10 && firstAmbient < 50) {
    ambientEst = firstAmbient;
  } else {
    ambientEst = 30.0;
  }

  // ── Closed-loop detection ──
  const fuelStatusSamples = collect(snapshots, s => s.fuel_system_status);
  const closedLoopCount = fuelStatusSamples.filter(v => v === 2).length;
  const isClosedLoop = fuelStatusSamples.length === 0 ||
    closedLoopCount > fuelStatusSamples.length * 0.5;

  // ── Heat stress ──
  const hotCount = coolants.filter(t => t > 100).length;
  const heatStress = coolants.length === 0 ? 0 : hotCount / coolants.length;

  // Distance from last snapshot
  const distKm = snapshots[snapshots.length - 1].distance_since_reset ?? null;

  // ── Intake / Throttle ──
  let idleVacuum: number | null = null;
  const lastBaro = snapshots[snapshots.length - 1].barometric_pressure;
  if (lastBaro != null) {
    const idleMaps: number[] = [];
    for (const snap of snapshots) {
      const m = snap.map_pressure;
      const r = snap.rpm;
      if (m != null && r != null && r > 400 && r < 1000) idleMaps.push(m);
    }
    if (idleMaps.length > 0) {
      idleVacuum = lastBaro - mean(idleMaps);
    }
  }

  const idleMafs: number[] = [];
  const idleThrottles: number[] = [];
  for (const snap of snapshots) {
    const r = snap.rpm;
    if (r != null && r > 400 && r < 1000) {
      if (snap.maf_rate != null) idleMafs.push(snap.maf_rate);
      if (snap.throttle_position != null) idleThrottles.push(snap.throttle_position);
    }
  }

  // Throttle-load delta
  const tlDeltas: number[] = [];
  const throttles: number[] = [];
  const loads: number[] = [];
  for (const snap of snapshots) {
    const tp = snap.throttle_position;
    const ld = snap.engine_load;
    if (tp != null && ld != null) {
      tlDeltas.push(Math.abs(tp - ld));
      throttles.push(tp);
      loads.push(ld);
    }
  }

  const ltCorr = (throttles.length >= 3 && stdDev(throttles) > 1)
    ? pearson(loads, throttles)
    : 0;

  // Average speed
  const speeds = collect(snapshots, s => s.vehicle_speed);
  const avgSpd = speeds.length === 0 ? 0 : mean(speeds);

  // O2 bank imbalance
  const o2B2s1s = collect(snapshots, s => s.o2_b2s1_voltage);
  const bankImbalance = (o2Ups.length > 0 && o2B2s1s.length > 0)
    ? Math.abs(mean(o2Ups) - mean(o2B2s1s))
    : 0;

  // Oil pressure per RPM
  const oilPressures = collect(snapshots, s => s.oil_pressure);
  const oilPerRpm = (oilPressures.length > 0 && rpms.length > 0 && mean(rpms) > 0)
    ? mean(oilPressures) / mean(rpms)
    : 0;

  // ── Timing analysis ──
  const avgTiming = timings.length === 0 ? null : mean(timings);
  const loadTimings: number[] = [];
  for (const snap of snapshots) {
    const ta = snap.timing_advance;
    const r = snap.rpm;
    const l = snap.engine_load;
    if (ta != null && r != null && r > 2000 && l != null && l > 50) {
      loadTimings.push(ta);
    }
  }

  // ── EGR analysis ──
  const idleEgrs: number[] = [];
  const egrErrors: number[] = [];
  for (const snap of snapshots) {
    const r = snap.rpm;
    const egr = snap.egr_commanded;
    if (egr != null && r != null && r > 400 && r < 1000) idleEgrs.push(egr);
    const err = snap.egr_error;
    if (err != null) egrErrors.push(err);
  }

  // ── Phase 3 context ──
  const last = snapshots[snapshots.length - 1];
  const distWithMil = last.distance_with_mil ?? null;
  const tSinceCleared = last.time_since_cleared_min ?? null;
  const recentClear = tSinceCleared != null && tSinceCleared < 30;
  const fuelLevel = last.fuel_level ?? null;
  const evapPurge = last.evap_purge ?? null;

  return {
    o2UpstreamVariance: o2UpVar,
    o2DownstreamVariance: o2DownVar,
    catalystEfficiencyRatio: catRatio,
    o2UpstreamCrossings: o2Crossings,
    o2PersistentLean: o2PersLean,
    o2PersistentRich: o2PersRich,
    o2LazySwitch: o2Lazy,
    o2UpstreamMedian: o2UpMedian,
    persistentLean: persLean,
    persistentRich: persRich,
    stftVariance: stftVar,
    maxAbsStft: maxStft,
    idleLtft: idleLtfts.length === 0 ? null : mean(idleLtfts),
    loadLtft: loadLtfts.length === 0 ? null : mean(loadLtfts),
    idleStft: idleStfts.length === 0 ? null : mean(idleStfts),
    loadStft: loadStfts.length === 0 ? null : mean(loadStfts),
    fuelTrimSeverity: trimSeverity,
    idleRpmStdDev: idleRpmSd,
    highRpmFraction: highRpmFrac,
    idleFraction: idleFrac,
    voltageStdDev: voltSd,
    voltageAtIdle: idleVolts.length === 0 ? null : mean(idleVolts),
    voltageUnderLoad: loadVolts.length === 0 ? null : mean(loadVolts),
    voltageAtCruise: cruiseVolts.length === 0 ? null : mean(cruiseVolts),
    voltageRange: voltRange,
    rpmVoltageCorrelation: rpmVoltCorr,
    coolantTempStdDev: coolantSd,
    cruiseTempTrend: cruiseTrend,
    maxCoolantTemp: maxCoolant,
    warmupRate: warmRate,
    slowWarmup: slowWarm,
    ambientEstimate: ambientEst,
    isClosedLoop,
    heatStressFraction: heatStress,
    oilPressurePerRpm: oilPerRpm,
    distanceKm: distKm ?? null,
    idleVacuumKpa: idleVacuum,
    mafAtIdle: idleMafs.length === 0 ? null : mean(idleMafs),
    idleThrottlePosition: idleThrottles.length === 0 ? null : mean(idleThrottles),
    throttleLoadDelta: tlDeltas.length === 0 ? null : mean(tlDeltas),
    loadThrottleCorrelation: ltCorr,
    avgSpeed: avgSpd,
    o2BankImbalance: bankImbalance,
    avgTimingAdvance: avgTiming,
    timingAtLoad: loadTimings.length === 0 ? null : mean(loadTimings),
    commandedEgrAtIdle: idleEgrs.length === 0 ? null : mean(idleEgrs),
    avgEgrError: egrErrors.length === 0 ? null : mean(egrErrors),
    distanceWithMil: distWithMil,
    timeSinceClearedMin: tSinceCleared,
    recentlyCleared: recentClear,
    fuelTankLevel: fuelLevel,
    commandedEvapPurge: evapPurge,
  };
}

/** Export as flat map for inclusion in FullAnalysisResult.derivedMetrics. */
export function tsmToMetricsMap(tsm: TimeSeriesMetrics): Record<string, number | null> {
  return {
    o2_upstream_variance: tsm.o2UpstreamVariance,
    o2_downstream_variance: tsm.o2DownstreamVariance,
    catalyst_efficiency_ratio: tsm.catalystEfficiencyRatio,
    o2_upstream_crossings: tsm.o2UpstreamCrossings,
    o2_upstream_median: tsm.o2UpstreamMedian,
    o2_persistent_lean: tsm.o2PersistentLean ? 1 : 0,
    o2_persistent_rich: tsm.o2PersistentRich ? 1 : 0,
    o2_lazy_switch: tsm.o2LazySwitch ? 1 : 0,
    stft_variance: tsm.stftVariance,
    max_abs_stft: tsm.maxAbsStft,
    idle_ltft: tsm.idleLtft,
    load_ltft: tsm.loadLtft,
    idle_stft: tsm.idleStft,
    load_stft: tsm.loadStft,
    fuel_trim_severity: tsm.fuelTrimSeverity,
    persistent_lean: tsm.persistentLean ? 1 : 0,
    persistent_rich: tsm.persistentRich ? 1 : 0,
    idle_rpm_std_dev: tsm.idleRpmStdDev,
    high_rpm_fraction: tsm.highRpmFraction,
    idle_fraction: tsm.idleFraction,
    voltage_std_dev: tsm.voltageStdDev,
    voltage_at_idle: tsm.voltageAtIdle,
    voltage_under_load: tsm.voltageUnderLoad,
    voltage_at_cruise: tsm.voltageAtCruise,
    voltage_range: tsm.voltageRange,
    rpm_voltage_correlation: tsm.rpmVoltageCorrelation,
    coolant_temp_std_dev: tsm.coolantTempStdDev,
    cruise_temp_trend: tsm.cruiseTempTrend,
    max_coolant_temp: tsm.maxCoolantTemp,
    slow_warmup: tsm.slowWarmup ? 1 : 0,
    warmup_rate: tsm.warmupRate,
    ambient_estimate: tsm.ambientEstimate,
    is_closed_loop: tsm.isClosedLoop ? 1 : 0,
    heat_stress_fraction: tsm.heatStressFraction,
    distance_km: tsm.distanceKm,
    idle_vacuum_kpa: tsm.idleVacuumKpa,
    maf_at_idle: tsm.mafAtIdle,
    idle_throttle_position: tsm.idleThrottlePosition,
    throttle_load_delta: tsm.throttleLoadDelta,
    load_throttle_correlation: tsm.loadThrottleCorrelation,
    avg_speed: tsm.avgSpeed,
    o2_bank_imbalance: tsm.o2BankImbalance,
    oil_pressure_per_rpm: tsm.oilPressurePerRpm,
    avg_timing_advance: tsm.avgTimingAdvance,
    timing_at_load: tsm.timingAtLoad,
    commanded_egr_at_idle: tsm.commandedEgrAtIdle,
    avg_egr_error: tsm.avgEgrError,
    distance_with_mil: tsm.distanceWithMil,
    time_since_cleared_min: tsm.timeSinceClearedMin,
    recently_cleared: tsm.recentlyCleared ? 1 : 0,
    fuel_tank_level: tsm.fuelTankLevel,
    commanded_evap_purge: tsm.commandedEvapPurge,
  };
}
