// ─── Analysis Engine ─────────────────────────────────────────────────
// Core analysis engine. Loads all JSON rule files and evaluates PID
// snapshots to produce health reports, diagnostic matches, and correlations.
// Direct port of analysis_engine.dart (~1500 lines).

import type {
  PidSnapshot,
  FullAnalysisResult,
  SystemHealthReport,
  EvaluatedRule,
  ComponentRisk,
  CorrelationResult,
  DiagnosticMatch,
} from '../models';
import { snapshotToMap, snapshotFromMap, emptySnapshot } from '../models/pid-snapshot';
import type { TimeSeriesMetrics } from './time-series-metrics';
import { computeTimeSeriesMetrics, tsmToMetricsMap } from './time-series-metrics';

// ── PID hex → PidSnapshot field name mapping ──

const PID_TO_FIELD: Record<string, string> = {
  '0x0103': 'fuel_system_status',
  '0x0104': 'engine_load', '0x0105': 'coolant_temp',
  '0x0106': 'stft_b1', '0x0107': 'ltft_b1',
  '0x0108': 'stft_b2', '0x0109': 'ltft_b2',
  '0x010A': 'fuel_pressure', '0x0123': 'fuel_rail_pressure',
  '0x0124': 'commanded_equiv_ratio',
  '0x010B': 'map_pressure', '0x010C': 'rpm',
  '0x010D': 'vehicle_speed', '0x010E': 'timing_advance',
  '0x010F': 'intake_air_temp', '0x0110': 'maf_rate',
  '0x0111': 'throttle_position', '0x0114': 'o2_b1s1_voltage',
  '0x0115': 'o2_b1s2_voltage', '0x0116': 'o2_b2s1_voltage',
  '0x0117': 'o2_b2s2_voltage', '0x011F': 'run_time_since_start',
  '0x0121': 'distance_with_mil', '0x0131': 'distance_since_reset',
  '0x0132': 'warmups_since_cleared',
  '0x012C': 'egr_commanded', '0x012D': 'egr_error',
  '0x012E': 'evap_purge', '0x012F': 'fuel_level',
  '0x0133': 'barometric_pressure', '0x013C': 'catalyst_temp_b1s1',
  '0x0142': 'ecu_voltage', '0x0145': 'relative_tps',
  '0x0146': 'ambient_temp', '0x015B': 'oil_pressure',
  '0x015C': 'oil_temp', '0x015E': 'fuel_rate',
  '0x0170': 'boost_pressure',
  '0x0174': 'turbo_rpm', '0x017C': 'dpf_temp',
  '0x017D': 'dpf_diff_pressure', '0x01A3': 'gear_selected',
  '0x01A4': 'trans_fluid_temp',
  '0x0200': 'misfire_cyl1', '0x0201': 'misfire_cyl2',
  '0x0202': 'misfire_cyl3', '0x0203': 'misfire_cyl4',
};

const SYSTEM_WEIGHTS: Record<string, number> = {
  charging: 0.12, combustion: 0.22, fuel: 0.18,
  cooling: 0.16, emission: 0.14, oil: 0.10, transmission: 0.08,
};

const SYSTEM_CONSUMER_NAMES: Record<string, string> = {
  charging: 'Battery & Electrical', combustion: 'Engine Performance',
  fuel: 'Fuel Delivery', cooling: 'Engine Cooling',
  emission: 'Exhaust & Emissions', oil: 'Engine Oil Health',
  transmission: 'Transmission',
};

const SYSTEM_ICONS: Record<string, string> = {
  charging: '⚡', combustion: '🔥', fuel: '⛽',
  cooling: '❄️', emission: '💨', oil: '🛢️', transmission: '⚙️',
};

// ── Internal rule result ──

interface RuleResult {
  triggered: boolean;
  strength: number;
}

const NO_TRIGGER: RuleResult = { triggered: false, strength: 0 };

function triggered(strength: number): RuleResult {
  return { triggered: true, strength };
}

// ── Analysis Engine singleton ──

export class AnalysisEngine {
  private static _instance: AnalysisEngine | null = null;

  private analyzerRules: Record<string, any> = {};
  private derivedMetricsDef: Record<string, any> = {};
  private diagnosticRules: any[] = [];
  private correlationsDef: any[] = [];
  private _loaded = false;

  private constructor() {}

  static get instance(): AnalysisEngine {
    if (!AnalysisEngine._instance) {
      AnalysisEngine._instance = new AnalysisEngine();
    }
    return AnalysisEngine._instance;
  }

  get isLoaded(): boolean { return this._loaded; }

  get systemRuleCount(): number {
    let count = 0;
    const systems = this.analyzerRules.systems as Record<string, any> | undefined;
    if (!systems) return 0;
    for (const sys of Object.values(systems)) {
      count += (sys.rules as any[] | undefined)?.length ?? 0;
    }
    return count;
  }

  get diagnosticRuleCount(): number { return this.diagnosticRules.length; }
  get correlationCount(): number { return this.correlationsDef.length; }
  get derivedMetricCount(): number {
    return (this.derivedMetricsDef.derivedMetricDefinitions as any[] | undefined)?.length ?? 0;
  }

  /** Load all JSON data files from /data/. Safe to call multiple times. */
  async load(): Promise<void> {
    if (this._loaded) return;

    const [rulesText, derivedText, diagText, , corrText] = await Promise.all([
      fetch('/data/analyzer_rules_v2.json').then(r => r.text()),
      fetch('/data/derived_metrics.json').then(r => r.text()),
      fetch('/data/diagnostic_rules_workshop.json').then(r => r.text()),
      fetch('/data/obd2_parameters.json').then(r => r.text()),
      fetch('/data/parameter_correlations.json').then(r => r.text()),
    ]);

    this.analyzerRules = JSON.parse(rulesText);
    this.derivedMetricsDef = JSON.parse(derivedText);
    const diagData = JSON.parse(diagText);
    this.diagnosticRules = diagData.rules as any[];
    const corrData = JSON.parse(corrText);
    this.correlationsDef = corrData.correlations as any[];
    this._loaded = true;
  }

  /** Load from raw JSON strings (for testing without fetch). */
  loadFromJsonStrings(opts: {
    analyzerRulesJson: string;
    derivedMetricsJson: string;
    diagnosticRulesJson: string;
    correlationsJson: string;
  }): void {
    this.analyzerRules = JSON.parse(opts.analyzerRulesJson);
    this.derivedMetricsDef = JSON.parse(opts.derivedMetricsJson);
    const diagData = JSON.parse(opts.diagnosticRulesJson);
    this.diagnosticRules = diagData.rules as any[];
    const corrData = JSON.parse(opts.correlationsJson);
    this.correlationsDef = corrData.correlations as any[];
    this._loaded = true;
  }

  /** Reset singleton for test isolation. */
  static resetForTest(): void {
    AnalysisEngine._instance = null;
  }

  // ── Main analysis pipeline ──

  analyze(snapshots: PidSnapshot[]): FullAnalysisResult {
    const averaged = this.averageSnapshots(snapshots);
    const values = snapshotToMap(averaged);
    const start = performance.now();

    // 0. Time-series metrics BEFORE averaging
    const tsm = computeTimeSeriesMetrics(snapshots);

    // 1. Derived metrics
    const derived = this.computeDerivedMetrics(values);
    const tsmMap = tsmToMetricsMap(tsm);
    for (const [k, v] of Object.entries(tsmMap)) {
      derived[k] = v;
    }

    // 2. System health rules
    const systems = this.evaluateAllSystems(values, snapshots, tsm);

    // 3. Diagnostic rule matching
    const diagnostics = this.matchDiagnosticRules(values, snapshots);

    // 4. Parameter correlations
    const correlations = this.evaluateCorrelations(snapshots);

    // 5. Overall score (weighted, skip insufficient-data systems)
    let weightedSum = 0;
    let totalWeight = 0;
    for (const sys of systems) {
      if (sys.riskTier === 'Insufficient Data') continue;
      const w = SYSTEM_WEIGHTS[sys.system.toLowerCase()] ?? 0.10;
      weightedSum += sys.score * w;
      totalWeight += w;
    }
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 100;
    const riskTier = riskTierFromScore(overallScore);

    const scanDurationMs = Math.round(performance.now() - start);

    return {
      overallScore,
      overallRiskTier: riskTier,
      systems,
      snapshot: averaged,
      derivedMetrics: derived,
      correlationResults: correlations,
      diagnosticMatches: diagnostics,
      supportedPidCount: Object.values(values).filter(v => v != null).length,
      scanCycles: snapshots.length,
      scanDurationMs,
    };
  }

  // ── Averaging ──

  private averageSnapshots(snapshots: PidSnapshot[]): PidSnapshot {
    if (snapshots.length === 0) return emptySnapshot();
    if (snapshots.length === 1) return snapshots[0];

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const snap of snapshots) {
      const json = snapshotToMap(snap);
      for (const [key, val] of Object.entries(json)) {
        if (typeof val === 'number') {
          sums[key] = (sums[key] ?? 0) + val;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }

    const averaged: Record<string, any> = {};
    for (const key of Object.keys(sums)) {
      averaged[key] = sums[key] / counts[key];
    }
    return snapshotFromMap(averaged);
  }

  // ── Derived Metrics ──

  private computeDerivedMetrics(values: Record<string, any>): Record<string, number | null> {
    const metrics: Record<string, number | null> = {};

    const stft = val(values, 'stft_b1');
    const ltft = val(values, 'ltft_b1');
    if (stft != null && ltft != null) {
      metrics.combined_fuel_trim = stft + ltft;
    }

    const ltftB1 = val(values, 'ltft_b1');
    const ltftB2 = val(values, 'ltft_b2');
    if (ltftB1 != null && ltftB2 != null) {
      metrics.bank_differential = Math.abs(ltftB2 - ltftB1);
    }

    const voltage = val(values, 'ecu_voltage');
    if (voltage != null) {
      if (voltage >= 13.5 && voltage <= 14.8) {
        const center = 14.1;
        metrics.charging_health = 1.0 - Math.min(0.3, Math.abs(voltage - center) / 1.3);
      } else if (voltage >= 12.4 && voltage < 13.5) {
        metrics.charging_health = (voltage - 12.4) / (13.5 - 12.4) * 0.5;
      } else if (voltage > 14.8 && voltage <= 15.5) {
        metrics.charging_health = (15.5 - voltage) / (15.5 - 14.8) * 0.5;
      } else {
        metrics.charging_health = 0;
      }
    }

    const coolant = val(values, 'coolant_temp');
    const runTime = val(values, 'run_time_since_start');
    if (coolant != null && runTime != null && runTime > 0) {
      const ambient = val(values, 'intake_air_temp') ?? val(values, 'ambient_temp') ?? 30;
      metrics.warmup_rate = (coolant - ambient) / runTime;
    }

    const ect = val(values, 'coolant_temp');
    const oilT = val(values, 'oil_temp');
    const rpm = val(values, 'rpm');
    let oilStress = 0;
    if (ect != null && ect > 105) oilStress += 0.35;
    if (oilT != null && oilT > 120) oilStress += 0.35;
    if (rpm != null && rpm > 5000) oilStress += 0.20;
    metrics.oil_stress_index = oilStress;

    const map = val(values, 'map_pressure');
    const baro = val(values, 'barometric_pressure');
    if (map != null && baro != null && baro > 0) {
      metrics.map_baro_ratio = map / baro;
    }

    return metrics;
  }

  // ── System Health Evaluation ──

  private evaluateAllSystems(
    values: Record<string, any>,
    snapshots: PidSnapshot[],
    tsm: TimeSeriesMetrics,
  ): SystemHealthReport[] {
    const systemsData = this.analyzerRules.systems as Record<string, any> | undefined;
    if (!systemsData) return [];

    const reports: SystemHealthReport[] = [];
    const systemKeys = ['charging', 'combustion', 'fuel', 'cooling', 'emission', 'oil'];

    for (const sysKey of systemKeys) {
      const sysData = systemsData[sysKey];
      if (!sysData) continue;

      const rules = (sysData.rules as any[]) ?? [];
      const evaluatedRules: EvaluatedRule[] = [];
      const findings: string[] = [];
      let penalty = 0;

      const coverage = this.systemCoverage(sysKey, values);
      const hasMinimalData = coverage >= 0.25;

      if (hasMinimalData) {
        for (const rule of rules) {
          const id = rule.id as string;
          const weight = (rule.weight as number);
          const name = rule.name as string;
          const thresholds = (rule.thresholds as Record<string, any>) ?? {};

          const result = this.evaluateSystemRule(id, values, thresholds, snapshots, tsm);
          if (result.triggered) {
            const adjustedWeight = weight * Math.max(0.5, Math.min(1, coverage));
            penalty += adjustedWeight;
            findings.push(name);
            evaluatedRules.push({
              id,
              name,
              strength: result.strength,
              weight: adjustedWeight,
              consumerMessage: this.consumerMessage(id, rule),
              possibleDtcs: this.dtcsForRule(id, rule),
            });
          }
        }
      }

      const score = hasMinimalData
        ? Math.max(0, Math.min(100, 100 - penalty * 100))
        : 100;
      const effectiveFindings = !hasMinimalData
        ? ['Insufficient sensor data for this system']
        : findings.length === 0
          ? ['System operating normally']
          : findings;

      reports.push({
        system: sysKey[0].toUpperCase() + sysKey.slice(1),
        consumerName: SYSTEM_CONSUMER_NAMES[sysKey] ?? sysKey,
        icon: SYSTEM_ICONS[sysKey] ?? '⚙️',
        score,
        riskTier: hasMinimalData ? riskTierFromScore(score) : 'Insufficient Data',
        dataCoverage: coverage,
        findings: effectiveFindings,
        evaluatedRules,
        componentRisks: this.componentRisks(evaluatedRules, rules),
      });
    }

    return reports;
  }

  // ── Single system rule evaluation (100+ switch cases) ──

  private evaluateSystemRule(
    id: string,
    values: Record<string, any>,
    _thresholds: Record<string, any>,
    snapshots: PidSnapshot[],
    tsm: TimeSeriesMetrics,
  ): RuleResult {
    const rpm = val(values, 'rpm');
    const voltage = val(values, 'ecu_voltage');
    const load = val(values, 'engine_load');
    const coolant = val(values, 'coolant_temp');
    const ltftB1 = val(values, 'ltft_b1');
    const stftB1 = val(values, 'stft_b1');
    const ltftB2 = val(values, 'ltft_b2');
    const o2Up = val(values, 'o2_b1s1_voltage');
    const o2Down = val(values, 'o2_b1s2_voltage');
    const runTime = val(values, 'run_time_since_start');
    const oilTemp = val(values, 'oil_temp');
    const speed = val(values, 'vehicle_speed');
    const throttle = val(values, 'throttle_position');
    const timing = val(values, 'timing_advance');
    const maf = val(values, 'maf_rate');
    const mapPressure = val(values, 'map_pressure');
    const iat = val(values, 'intake_air_temp');
    const baro = val(values, 'barometric_pressure');
    const fuelPressure = val(values, 'fuel_rail_pressure');
    const fuelLevel = val(values, 'fuel_level');
    const egrCommanded = val(values, 'egr_commanded');
    const egrError = val(values, 'egr_error');
    const evapPurge = val(values, 'evap_purge');
    const catTemp = val(values, 'catalyst_temp_b1s1');
    const oilPressure = val(values, 'oil_pressure');
    const transTemp = val(values, 'trans_fluid_temp');
    const ect = coolant;
    const misfires = (val(values, 'misfire_cyl1') ?? 0) +
      (val(values, 'misfire_cyl2') ?? 0) +
      (val(values, 'misfire_cyl3') ?? 0) +
      (val(values, 'misfire_cyl4') ?? 0);

    switch (id) {
      // ── CHARGING ──
      case 'CHG_R1_LOW_RUNNING_VOLTAGE':
        if (rpm != null && voltage != null && rpm > 800 && voltage < 12.9)
          return triggered((12.9 - voltage) / 2.0);
        break;
      case 'CHG_R1_LOW_RESTING_VOLTAGE':
        if (rpm != null && voltage != null && rpm < 800 && voltage < 12.3)
          return triggered((12.3 - voltage) / 1.5);
        break;
      case 'CHG_R2_LOW_CHARGING_VOLTAGE':
        if (rpm != null && voltage != null && rpm > 1500 && voltage < 13.5)
          return triggered((13.5 - voltage) / 2.0);
        break;
      case 'CHG_R3_OVERCHARGING':
        if (voltage != null && rpm != null && voltage > 14.8 && rpm > 1000)
          return triggered((voltage - 14.8) / 1.5);
        break;
      case 'CHG_R4_FLAT_VOLTAGE_VS_RPM':
        if (tsm.rpmVoltageCorrelation !== 0 && Math.abs(tsm.rpmVoltageCorrelation) < 0.15)
          return triggered(0.6);
        if (tsm.voltageStdDev < 0.15 && tsm.voltageStdDev > 0)
          return triggered(0.5);
        break;
      case 'CHG_R5_VOLTAGE_FLUCTUATION':
        if (tsm.voltageStdDev > 0.25)
          return triggered(Math.max(0.3, Math.min(1, (tsm.voltageStdDev - 0.25) / 0.5)));
        break;
      case 'CHG_R6_VOLTAGE_DROP_UNDER_LOAD':
        if (tsm.voltageUnderLoad != null && tsm.voltageUnderLoad < 12.5)
          return triggered(Math.max(0, Math.min(1, (12.5 - tsm.voltageUnderLoad) / 1.5)));
        if (voltage != null && load != null && load > 70 && voltage < 12.5)
          return triggered((12.5 - voltage) / 1.5);
        break;

      // ── COMBUSTION ──
      case 'COMB_R1_LTFT_DEVIATION':
        if (ltftB1 != null && Math.abs(ltftB1) > 10)
          return triggered((Math.abs(ltftB1) - 10) / 15);
        break;
      case 'COMB_R2_STFT_INSTABILITY':
        if (tsm.stftVariance > 64)
          return triggered(Math.max(0, Math.min(1, (tsm.stftVariance - 64) / 100)));
        break;
      case 'COMB_R3_STFT_SPIKE':
        if (stftB1 != null && Math.abs(stftB1) > 15)
          return triggered((Math.abs(stftB1) - 15) / 10);
        break;
      case 'COMB_R4_MISFIRE_COUNT':
        if (misfires > 0) return triggered(Math.min(1, misfires / 10));
        break;
      case 'COMB_R5_IDLE_INSTABILITY':
        if (tsm.idleRpmStdDev > 100)
          return triggered(Math.max(0.5, Math.min(1, tsm.idleRpmStdDev / 200)));
        break;
      case 'COMB_R6_O2_STUCK_LEAN':
        if (tsm.o2PersistentLean) return triggered(0.8);
        if (o2Up != null && o2Up < 0.15) return triggered(0.6);
        break;
      case 'COMB_R7_O2_STUCK_RICH':
        if (tsm.o2PersistentRich) return triggered(0.8);
        if (o2Up != null && o2Up > 0.85) return triggered(0.6);
        break;
      case 'COMB_R8_O2_LOW_VARIANCE':
        if (tsm.o2LazySwitch && tsm.isClosedLoop) return triggered(0.7);
        if (tsm.o2UpstreamVariance < 0.09 && tsm.o2UpstreamVariance > 0)
          return triggered(0.5);
        break;
      case 'COMB_R9_CLOSED_LOOP_FAILURE':
        if (!tsm.isClosedLoop && coolant != null && coolant > 70) return triggered(0.8);
        break;
      case 'COMB_R10_O2_SWITCHING_SLOW':
        if (tsm.isClosedLoop && tsm.o2UpstreamCrossings < 3 && tsm.o2UpstreamVariance > 0)
          return triggered(0.7);
        break;

      // ── FUEL ──
      case 'FUEL_R1_PERSISTENT_LEAN':
        if (tsm.persistentLean) return triggered(0.8);
        if (ltftB1 != null && ltftB1 > 10) return triggered((ltftB1 - 10) / 15);
        break;
      case 'FUEL_R2_PERSISTENT_RICH':
        if (tsm.persistentRich) return triggered(0.8);
        if (ltftB1 != null && ltftB1 < -10) return triggered((-10 - ltftB1) / 15);
        break;
      case 'FUEL_R3_STFT_SPIKES':
        if (stftB1 != null && Math.abs(stftB1) > 20) return triggered(0.8);
        break;
      case 'FUEL_R4_LEAN_UNDER_LOAD':
        if (tsm.loadLtft != null && tsm.loadLtft > 8) return triggered(0.9);
        if (stftB1 != null && load != null && stftB1 > 10 && load > 70) return triggered(0.8);
        break;
      case 'FUEL_R5_LEAN_PERSISTENCE':
        if (ltftB1 != null && ltftB1 > 8) return triggered((ltftB1 - 8) / 12);
        break;
      case 'FUEL_R6_RICH_PERSISTENCE':
        if (ltftB1 != null && ltftB1 < -8) return triggered((-8 - ltftB1) / 12);
        break;
      case 'FUEL_R7_O2_LEAN_CORRELATED':
        if (ltftB1 != null && o2Up != null && ltftB1 > 10 && o2Up < 0.3)
          return triggered(0.85);
        break;
      case 'FUEL_R8_BANK2_LEAN':
        if (ltftB1 != null && ltftB2 != null && (ltftB2 - ltftB1) > 7)
          return triggered(0.7);
        break;
      case 'FUEL_R9_TRIM_ZONE_MISMATCH':
        if (tsm.idleLtft != null && tsm.loadLtft != null) {
          const delta = Math.abs(tsm.idleLtft - tsm.loadLtft);
          if (delta > 5) return triggered(Math.max(0.5, Math.min(1, delta / 10)));
        }
        break;

      // ── COOLING (tropical +5°C offset) ──
      case 'COOL_R1_SLOW_WARMUP':
        if (runTime != null && coolant != null && runTime > 600 && coolant < 80)
          return triggered(0.8);
        break;
      case 'COOL_R2_LOW_WARMUP_RATE':
        if (coolant != null && runTime != null && runTime > 60) {
          const rate = (coolant - tsm.ambientEstimate) / runTime;
          if (rate < 0.1) return triggered(0.6);
        }
        break;
      case 'COOL_R3_OVERHEATING':
        if (coolant != null && coolant > 115) return triggered(1.0);
        break;
      case 'COOL_R4_ELEVATED_TEMP':
        if (coolant != null && coolant > 105 && coolant <= 115)
          return triggered((coolant - 105) / 10);
        break;
      case 'COOL_R5_TEMP_FLUCTUATION':
        if (tsm.coolantTempStdDev > 10)
          return triggered(Math.max(0.5, Math.min(1, tsm.coolantTempStdDev / 15)));
        break;
      case 'COOL_R6_SUBOPTIMAL_TEMP':
        if (coolant != null && runTime != null && runTime > 300 && coolant < 87)
          return triggered(0.5);
        break;
      case 'COOL_R8_CRUISE_TEMP_DROP':
        if (tsm.cruiseTempTrend != null && tsm.cruiseTempTrend < -5 &&
            tsm.maxCoolantTemp != null && tsm.maxCoolantTemp > 85)
          return triggered(0.6);
        break;

      // ── EMISSION ──
      case 'EMIS_R1_DOWNSTREAM_MIRRORS':
        if (tsm.catalystEfficiencyRatio != null && tsm.catalystEfficiencyRatio > 0.7)
          return triggered(0.9);
        break;
      case 'EMIS_R2_O2_STORAGE_REDUCED':
        if (tsm.catalystEfficiencyRatio != null && tsm.catalystEfficiencyRatio > 0.5)
          return triggered(0.7);
        if (tsm.o2DownstreamVariance > 0.04) return triggered(0.5);
        break;
      case 'EMIS_R3_LOW_VOLTAGE_DIFF':
        if (o2Up != null && o2Down != null && Math.abs(o2Up - o2Down) < 0.2)
          return triggered(0.6);
        break;
      case 'EMIS_R4_DOWNSTREAM_UNSTABLE':
        if (tsm.o2DownstreamVariance > 0.04) return triggered(0.7);
        break;
      case 'EMIS_R5_DOWNSTREAM_STUCK_HIGH':
        if (o2Down != null && o2Down > 0.7) return triggered(0.6);
        break;
      case 'EMIS_R6_DOWNSTREAM_STUCK_LOW':
        if (o2Down != null && o2Down < 0.3 && coolant != null && coolant > 70)
          return triggered(0.5);
        break;
      case 'EMIS_R7_LTFT_CATALYST_COMBINED':
        if (ltftB1 != null && ltftB1 > 10 && tsm.o2DownstreamVariance > 0.04)
          return triggered(0.85);
        break;
      case 'EMIS_R8_LAMBDA_DEVIATION':
        if (tsm.o2UpstreamMedian != null) {
          const m = tsm.o2UpstreamMedian;
          if (m < 0.35 || m > 0.65) return triggered(0.5);
        }
        break;
      case 'EMIS_R9_RECENTLY_CLEARED':
        if (tsm.recentlyCleared) return triggered(0.6);
        break;
      case 'EMIS_R10_MIL_DISTANCE':
        if (tsm.distanceWithMil != null && tsm.distanceWithMil > 500)
          return triggered(Math.max(0.5, Math.min(1, tsm.distanceWithMil / 1000)));
        break;

      // ── OIL (behavioral inference) ──
      case 'OIL_R1_HEAT_STRESS':
        if ((ect != null && ect > 105) || (oilTemp != null && oilTemp > 120))
          return triggered(0.7);
        break;
      case 'OIL_R2_HIGH_RPM_STRESS':
        if (rpm != null && rpm > 5000) return triggered(0.6);
        break;
      case 'OIL_R3_IDLE_STRESS': {
        if (snapshots.length >= 3) {
          const withRpm = snapshots.filter(s => s.rpm != null);
          if (withRpm.length >= 3) {
            const idleC = withRpm.filter(s => s.rpm! < 900 && (s.throttle_position ?? 0) < 5).length;
            if (idleC / withRpm.length > 0.4) return triggered(0.5);
          }
        }
        break;
      }
      case 'OIL_R5_SHORT_TRIP':
        if (runTime != null && runTime > 600 && snapshots.length > 0) {
          let maxEct = 0;
          for (const s of snapshots) {
            if (s.coolant_temp != null && s.coolant_temp > maxEct) maxEct = s.coolant_temp;
          }
          if (maxEct < 80) return triggered(0.5);
        }
        break;
      case 'OIL_R6_COMBINED_STRESS': {
        let stressors = 0;
        if (ect != null && ect > 105) stressors++;
        if (rpm != null && rpm > 5000) stressors++;
        if (oilTemp != null && oilTemp > 120) stressors++;
        if (stressors >= 3) return triggered(0.9);
        break;
      }
      case 'OIL_R7_TROPICAL_IDLE':
        if (snapshots.length >= 3) {
          const withRpm = snapshots.filter(s => s.rpm != null);
          if (withRpm.length >= 3) {
            const idleC = withRpm.filter(s => s.rpm! < 900).length;
            if (idleC / withRpm.length > 0.3) return triggered(0.4);
          }
        }
        break;
      case 'OIL_R4_DISTANCE': {
        const dist = val(values, 'distance_since_reset') ?? val(values, 'distance_with_mil');
        if (dist != null && dist > 7000) return triggered((dist - 7000) / 3000);
        break;
      }
      case 'OIL_R8_DIRECT_TEMP_HIGH':
        if (oilTemp != null && oilTemp > 130) return triggered(0.9);
        break;

      // ── NEW CHARGING RULES ──
      case 'CHG_R7_VOLTAGE_RIPPLE_IDLE':
        if (tsm.voltageAtIdle != null && tsm.voltageStdDev > 0.15 && rpm != null && rpm < 900)
          return triggered(Math.max(0.4, Math.min(1, (tsm.voltageStdDev - 0.15) / 0.3)));
        break;
      case 'CHG_R8_OVERCHARGE_SEVERE':
        if (voltage != null && voltage > 16 && rpm != null && rpm > 800) return triggered(1.0);
        break;
      case 'CHG_R9_LOW_VOLTAGE_HIGH_RPM':
        if (voltage != null && rpm != null && rpm > 2500 && voltage < 13)
          return triggered((13 - voltage) / 2);
        break;
      case 'CHG_R10_IDLE_CRUISE_VOLTAGE_FLAT':
        if (tsm.voltageAtIdle != null && tsm.voltageAtCruise != null) {
          const diff = Math.abs(tsm.voltageAtCruise - tsm.voltageAtIdle);
          if (diff < 0.1 && tsm.voltageAtIdle < 14) return triggered(0.5);
        }
        break;
      case 'CHG_R11_VOLTAGE_TEMP_DEGRADATION':
        if (voltage != null && coolant != null && coolant > 100 && voltage < 13.2)
          return triggered(0.6);
        break;
      case 'CHG_R12_CHARGING_RECOVERY_SLOW':
        if (tsm.voltageRange < 0.3 && tsm.voltageAtCruise != null && tsm.voltageAtCruise < 14)
          return triggered(0.5);
        break;

      // ── NEW COMBUSTION RULES ──
      case 'COMB_R11_MISFIRE_UNDER_LOAD': {
        const c1 = val(values, 'misfire_cyl1') ?? 0;
        const c2 = val(values, 'misfire_cyl2') ?? 0;
        const c3 = val(values, 'misfire_cyl3') ?? 0;
        const c4 = val(values, 'misfire_cyl4') ?? 0;
        if ((c1 + c2 + c3 + c4) > 2 && load != null && load > 60) return triggered(0.9);
        break;
      }
      case 'COMB_R12_MISFIRE_AT_IDLE':
        if (misfires > 2 && rpm != null && rpm < 900) return triggered(0.7);
        break;
      case 'COMB_R13_MULTI_CYLINDER_MISFIRE': {
        const m1 = val(values, 'misfire_cyl1') ?? 0;
        const m2 = val(values, 'misfire_cyl2') ?? 0;
        const m3 = val(values, 'misfire_cyl3') ?? 0;
        const m4 = val(values, 'misfire_cyl4') ?? 0;
        let cylsAffected = 0;
        if (m1 > 2) cylsAffected++;
        if (m2 > 2) cylsAffected++;
        if (m3 > 2) cylsAffected++;
        if (m4 > 2) cylsAffected++;
        if (cylsAffected >= 2) return triggered(1.0);
        break;
      }
      case 'COMB_R14_TIMING_RETARD_EXCESSIVE':
        if (timing != null && timing < 5 && rpm != null && rpm > 2000)
          return triggered(Math.max(0.5, Math.min(1, (5 - timing) / 10)));
        break;
      case 'COMB_R15_TIMING_NEGATIVE':
        if (timing != null && timing < 0) return triggered(1.0);
        break;
      case 'COMB_R16_TIMING_EXCESSIVE_IDLE':
        if (timing != null && timing > 25 && rpm != null && rpm < 900) return triggered(0.5);
        break;
      case 'COMB_R17_LOAD_THROTTLE_MISMATCH':
        if (tsm.loadThrottleCorrelation < 0.3 && tsm.loadThrottleCorrelation > 0)
          return triggered(0.6);
        break;
      case 'COMB_R18_RPM_INSTABILITY_DRIVING':
        if (tsm.idleRpmStdDev > 200 && tsm.avgSpeed > 30) return triggered(0.7);
        break;
      case 'COMB_R19_O2_BANK_IMBALANCE':
        if (tsm.o2BankImbalance > 0.2)
          return triggered(Math.max(0.4, Math.min(1, tsm.o2BankImbalance / 0.5)));
        break;
      case 'COMB_R20_CATALYST_RATIO_DEGRADED':
        if (tsm.catalystEfficiencyRatio != null &&
            tsm.catalystEfficiencyRatio > 0.5 && tsm.catalystEfficiencyRatio <= 0.7)
          return triggered(0.6);
        break;

      // ── NEW FUEL RULES ──
      case 'FUEL_R10_TOTAL_TRIM_LEAN':
        if (stftB1 != null && ltftB1 != null && (stftB1 + ltftB1) > 20)
          return triggered(Math.max(0.6, Math.min(1, (stftB1 + ltftB1 - 20) / 10)));
        break;
      case 'FUEL_R11_TOTAL_TRIM_RICH':
        if (stftB1 != null && ltftB1 != null && (stftB1 + ltftB1) < -20)
          return triggered(Math.max(0.6, Math.min(1, (-(stftB1 + ltftB1) - 20) / 10)));
        break;
      case 'FUEL_R12_FUEL_PRESSURE_LOW':
        if (fuelPressure != null && fuelPressure < 250)
          return triggered(Math.max(0.5, Math.min(1, (250 - fuelPressure) / 100)));
        break;
      case 'FUEL_R13_FUEL_PRESSURE_HIGH':
        if (fuelPressure != null && fuelPressure > 380)
          return triggered(Math.max(0.5, Math.min(1, (fuelPressure - 380) / 100)));
        break;
      case 'FUEL_R14_OPEN_LOOP_WARM':
        if (!tsm.isClosedLoop && coolant != null && coolant > 80 && speed != null && speed > 30)
          return triggered(0.8);
        break;
      case 'FUEL_R15_TRIMS_SAME_DIRECTION':
        if (stftB1 != null && ltftB1 != null && stftB1 > 5 && ltftB1 > 5) return triggered(0.7);
        if (stftB1 != null && ltftB1 != null && stftB1 < -5 && ltftB1 < -5) return triggered(0.7);
        break;
      case 'FUEL_R16_BANK_TRIM_ASYMMETRY':
        if (ltftB1 != null && ltftB2 != null) {
          const asymmetry = Math.abs(ltftB1 - ltftB2);
          if (asymmetry > 8) return triggered(Math.max(0.4, Math.min(1, asymmetry / 15)));
        }
        break;
      case 'FUEL_R17_FUEL_LEVEL_CRITICAL':
        if (fuelLevel != null && fuelLevel < 8) return triggered(0.4);
        break;
      case 'FUEL_R18_PRESSURE_TRIM_CORRELATION':
        if (fuelPressure != null && ltftB1 != null && fuelPressure < 270 && ltftB1 > 8)
          return triggered(0.9);
        break;

      // ── NEW COOLING RULES ──
      case 'COOL_R9_ECT_IMPLAUSIBLE_HIGH':
        if (coolant != null && coolant > 130) return triggered(0.7);
        break;
      case 'COOL_R10_ECT_IMPLAUSIBLE_LOW':
        if (coolant != null && runTime != null && coolant < 20 && runTime > 600) return triggered(0.8);
        break;
      case 'COOL_R11_FAN_NOT_ENGAGING':
        if (coolant != null && speed != null && coolant > 100 && speed < 20) return triggered(0.7);
        break;
      case 'COOL_R12_WARMUP_VS_IAT':
        if (tsm.warmupRate < 0.05 && iat != null && iat > 30) return triggered(0.5);
        break;
      case 'COOL_R13_THERMAL_SOAK':
        if (coolant != null && rpm != null && speed != null &&
            coolant > 98 && rpm < 900 && speed < 5) return triggered(0.6);
        break;
      case 'COOL_R14_HEAD_GASKET_SUSPECT':
        if (coolant != null && ltftB1 != null && coolant > 105 && ltftB1 > 15) return triggered(0.9);
        break;
      case 'COOL_R15_IAT_ECT_INVERTED':
        if (iat != null && coolant != null && coolant > 70 && iat > coolant) return triggered(0.5);
        break;

      // ── NEW EMISSION RULES ──
      case 'EMIS_R11_CATALYST_TEMP_HIGH':
        if (catTemp != null && catTemp > 850) return triggered(1.0);
        break;
      case 'EMIS_R12_CATALYST_TEMP_LOW':
        if (catTemp != null && coolant != null && runTime != null &&
            catTemp < 300 && coolant > 80 && runTime > 300) return triggered(0.5);
        break;
      case 'EMIS_R13_EGR_STUCK_OPEN':
        if (egrCommanded != null && rpm != null && egrCommanded > 5 && rpm < 900) return triggered(0.7);
        break;
      case 'EMIS_R14_EGR_ERROR_HIGH':
        if (egrError != null && Math.abs(egrError) > 10)
          return triggered(Math.max(0.5, Math.min(1, Math.abs(egrError) / 15)));
        break;
      case 'EMIS_R15_EVAP_PURGE_STUCK':
        if (evapPurge != null && rpm != null && ltftB1 != null &&
            evapPurge > 50 && rpm < 900 && ltftB1 < -8) return triggered(0.7);
        break;
      case 'EMIS_R16_EVAP_NO_PURGE':
        if (evapPurge != null && load != null && coolant != null &&
            evapPurge < 1 && load > 30 && coolant > 70) return triggered(0.4);
        break;
      case 'EMIS_R17_RICH_CATALYST_OVERLOAD':
        if (ltftB1 != null && catTemp != null && ltftB1 < -10 && catTemp > 650)
          return triggered(0.8);
        break;
      case 'EMIS_R18_OPEN_LOOP_EMISSION':
        if (!tsm.isClosedLoop && speed != null && speed > 40 && coolant != null && coolant > 70)
          return triggered(0.7);
        break;

      // ── NEW OIL RULES ──
      case 'OIL_R9_PRESSURE_LOW_IDLE':
        if (oilPressure != null && rpm != null && coolant != null &&
            oilPressure < 70 && rpm < 900 && coolant > 80) return triggered(1.0);
        break;
      case 'OIL_R10_PRESSURE_NO_RISE':
        if (oilPressure != null && rpm != null && oilPressure < 150 && rpm > 2500)
          return triggered(0.9);
        break;
      case 'OIL_R11_OIL_TEMP_EXTREME':
        if (oilTemp != null && oilTemp > 140) return triggered(1.0);
        break;
      case 'OIL_R12_FUEL_DILUTION':
        if (ltftB1 != null && oilTemp != null && ltftB1 < -10 && oilTemp > 100) return triggered(0.7);
        break;
      case 'OIL_R13_PRESSURE_PER_RPM_LOW':
        if (tsm.oilPressurePerRpm < 0.03 && tsm.oilPressurePerRpm > 0) return triggered(0.8);
        break;
      case 'OIL_R14_THERMAL_COMPOUND':
        if (ect != null && oilTemp != null && ect > 105 && oilTemp > 120) return triggered(0.9);
        break;
      case 'OIL_R15_COLD_RPM_STRESS':
        if (rpm != null && coolant != null && rpm > 4000 && coolant < 60) return triggered(0.6);
        break;

      // ── TRANSMISSION ──
      case 'TRANS_T1_FLUID_OVERHEAT':
        if (transTemp != null && transTemp >= 120) return triggered(1.0);
        break;
      case 'TRANS_T2_FLUID_HOT':
        if (transTemp != null && transTemp >= 100 && transTemp < 120)
          return triggered((transTemp - 100) / 20);
        break;
      case 'TRANS_T3_FLUID_COLD':
        if (transTemp != null && transTemp < 10) return triggered(0.4);
        break;
      case 'TRANS_T4_LIMP_MODE':
        if (rpm != null && speed != null && load != null &&
            rpm > 3000 && speed < 40 && speed > 10 && load > 50) return triggered(1.0);
        break;
      case 'TRANS_T5_HIGH_TC_SLIP':
        if (rpm != null && speed != null && speed > 60) {
          const expectedRpm = speed * 30;
          if (rpm > expectedRpm * 1.15) return triggered(0.7);
        }
        break;
      case 'TRANS_T6_TC_LOCK_FAIL':
        if (rpm != null && speed != null && speed > 80) {
          const expectedRpm = speed * 28;
          if (rpm > expectedRpm * 1.05) return triggered(0.8);
        }
        break;
      case 'TRANS_T7_GEAR_RATIO_DRIFT':
        if (rpm != null && speed != null && speed > 30) {
          const ratio = rpm / speed;
          if (ratio > 80 || ratio < 15) return triggered(0.6);
        }
        break;
      case 'TRANS_T8_CVT_BELT_SLIP':
        if (tsm.idleRpmStdDev > 150 && speed != null && speed > 40 &&
            throttle != null && throttle < 15) return triggered(0.8);
        break;
      case 'TRANS_T9_OVERHEAT_DRIVING':
        if (transTemp != null && speed != null && transTemp > 120 && speed > 40)
          return triggered(0.9);
        break;
      case 'TRANS_T10_NO_WARMUP':
        if (transTemp != null && runTime != null && speed != null &&
            transTemp < 40 && runTime > 600 && speed > 40) return triggered(0.4);
        break;
      case 'TRANS_T11_TEMP_SPIKE':
        if (transTemp != null && transTemp > 130) return triggered(1.0);
        break;
      case 'TRANS_T12_RPM_SPEED_MISMATCH':
        if (rpm != null && speed != null && speed > 50 && rpm > 4000) return triggered(0.8);
        break;
      case 'TRANS_T13_LUGGING':
        if (load != null && rpm != null && speed != null &&
            load > 70 && rpm < 1500 && speed > 30) return triggered(0.4);
        break;

      // ── NEW CHARGING R13-R15 ──
      case 'CHG_R13_MAF_VOLTAGE_DEMAND':
        if (maf != null && voltage != null && maf > 15 && voltage < 13.5)
          return triggered(0.6);
        break;
      case 'CHG_R14_BARO_VOLTAGE_ALTITUDE':
        if (baro != null && voltage != null && baro < 85 && voltage < 13.8) return triggered(0.4);
        break;
      case 'CHG_R15_IDLE_VOLTAGE_SAG':
        if ((tsm.voltageAtIdle ?? 0) < 13 && (tsm.voltageAtIdle ?? 0) > 0 && tsm.idleRpmStdDev > 50)
          return triggered(0.6);
        break;

      // ── NEW COMBUSTION R21-R26 ──
      case 'COMB_R21_MAP_TIMING_CHECK':
        if (mapPressure != null && timing != null && rpm != null &&
            mapPressure > 80 && timing > 25 && rpm > 2000) return triggered(0.7);
        break;
      case 'COMB_R22_MAF_RPM_VE_LOW':
        if (maf != null && rpm != null && throttle != null &&
            rpm > 2000 && throttle > 80 && maf / rpm < 0.003) return triggered(0.6);
        break;
      case 'COMB_R23_MISFIRE_UNDER_LOAD':
        if (misfires > 5 && load != null && load > 60)
          return triggered(Math.max(0.5, Math.min(1, misfires / 20)));
        break;
      case 'COMB_R24_O2_UPSTREAM_FROZEN':
        if (tsm.o2UpstreamCrossings < 3 && tsm.isClosedLoop) return triggered(0.7);
        break;
      case 'COMB_R25_TIMING_COLD_ADVANCE':
        if (timing != null && coolant != null && timing > 20 && coolant < 50) return triggered(0.4);
        break;
      case 'COMB_R26_AVG_TIMING_LOW':
        if ((tsm.avgTimingAdvance ?? 0) < 8 && (tsm.avgTimingAdvance ?? 0) > 0) return triggered(0.5);
        break;

      // ── NEW FUEL R19-R24 ──
      case 'FUEL_R19_MAF_PRESSURE_MISMATCH':
        if (maf != null && fuelPressure != null && maf > 20 && fuelPressure < 280)
          return triggered(0.7);
        break;
      case 'FUEL_R20_STFT_OSCILLATION':
        if (tsm.stftVariance > 15 && tsm.idleFraction > 0.3) return triggered(0.5);
        break;
      case 'FUEL_R21_FUEL_LEVEL_STUCK':
        break; // no-op as in Dart
      case 'FUEL_R22_BARO_FUEL_CORRECTION':
        if (baro != null && ltftB1 != null && baro < 85 && ltftB1 > 12) return triggered(0.5);
        break;
      case 'FUEL_R23_MAP_STFT_VACUUM_LEAK':
        if (mapPressure != null && stftB1 != null && rpm != null &&
            mapPressure > 55 && stftB1 > 8 && rpm < 1000) return triggered(0.8);
        break;
      case 'FUEL_R24_BANK_IMBALANCE_PERSISTENT':
        if (tsm.o2BankImbalance > 0.15)
          return triggered(Math.max(0.4, Math.min(1, tsm.o2BankImbalance / 0.3)));
        break;

      // ── NEW COOLING R16-R20 ──
      case 'COOL_R16_WARMUP_RATE_VERY_SLOW':
        if (tsm.warmupRate < 0.5 && tsm.warmupRate > 0 && tsm.ambientEstimate > 20 &&
            (tsm.maxCoolantTemp == null || tsm.maxCoolantTemp < 80)) return triggered(0.6);
        break;
      case 'COOL_R17_TEMP_OSCILLATION':
        if (tsm.coolantTempStdDev > 4 && coolant != null && coolant > 80) return triggered(0.5);
        break;
      case 'COOL_R18_CRUISE_TEMP_RISING':
        if ((tsm.cruiseTempTrend ?? 0) > 0.5 && speed != null && speed > 60) return triggered(0.7);
        break;
      case 'COOL_R19_MAX_TEMP_DANGER':
        if ((tsm.maxCoolantTemp ?? 0) > 115) return triggered(1.0);
        break;
      case 'COOL_R20_AMBIENT_HOT_MARGIN':
        if (ect != null && ect > 100 && tsm.ambientEstimate > 35 &&
            speed != null && speed < 30) return triggered(0.5);
        break;

      // ── NEW EMISSION R19-R24 ──
      case 'EMIS_R19_EGR_IDLE_CHECK':
        if ((tsm.commandedEgrAtIdle ?? 0) > 3 && rpm != null && rpm < 900) return triggered(0.6);
        break;
      case 'EMIS_R20_EGR_ERROR_PERSISTENT':
        if ((tsm.avgEgrError ?? 0) > 5)
          return triggered(Math.max(0.4, Math.min(1, (tsm.avgEgrError ?? 0) / 10)));
        break;
      case 'EMIS_R21_CAT_TEMP_OVERHEAT':
        if (catTemp != null && catTemp > 800) return triggered(1.0);
        break;
      case 'EMIS_R22_EVAP_PURGE_EXCESSIVE':
        if (evapPurge != null && stftB1 != null && evapPurge > 80 && stftB1 < -10) return triggered(0.6);
        break;
      case 'EMIS_R23_O2_DOWNSTREAM_LEAN':
        if (o2Down != null && o2Down < 0.3 && (tsm.catalystEfficiencyRatio ?? 0) > 0.6)
          return triggered(0.6);
        break;
      case 'EMIS_R24_DISTANCE_MIL_ON':
        if ((tsm.distanceWithMil ?? 0) > 50) return triggered(0.4);
        break;

      // ── NEW OIL R16-R20 ──
      case 'OIL_R16_PRESSURE_DROPPING_TREND':
        if (oilTemp != null && oilPressure != null && oilTemp > 110 && oilPressure < 150)
          return triggered(0.7);
        break;
      case 'OIL_R17_IDLE_PRESSURE_FLUCTUATION':
        if (oilPressure != null && rpm != null && oilPressure < 80 && rpm < 900) return triggered(0.6);
        break;
      case 'OIL_R18_TEMP_PRESSURE_DIVERGE':
        if (oilTemp != null && oilPressure != null && rpm != null &&
            oilTemp > 115 && oilPressure < 100 && rpm > 1500) return triggered(0.9);
        break;
      case 'OIL_R19_EXCESSIVE_RPM_FRACTION':
        if (tsm.highRpmFraction > 0.3) return triggered(0.4);
        break;
      case 'OIL_R20_HEAT_STRESS_PROLONGED':
        if (tsm.heatStressFraction > 0.25 && ect != null && ect > 100) return triggered(0.6);
        break;

      // ── NEW TRANSMISSION T14-T20 ──
      case 'TRANS_T14_TEMP_SHUTDOWN_RISK':
        if (transTemp != null && transTemp > 135) return triggered(1.0);
        break;
      case 'TRANS_T15_COAST_OVERHEAT':
        if (transTemp != null && load != null && speed != null &&
            transTemp > 100 && load < 15 && speed > 50) return triggered(0.6);
        break;
      case 'TRANS_T16_RPM_FLARE_SHIFT':
        if (rpm != null && speed != null && tsm.idleRpmStdDev > 200 &&
            speed > 30 && throttle != null && throttle > 10) return triggered(0.7);
        break;
      case 'TRANS_T17_SPEED_RATIO_UNSTABLE':
        if (rpm != null && speed != null && speed > 50 && speed < 90 &&
            throttle != null && throttle < 20) {
          const ratio = rpm / speed;
          if (ratio > 60 || ratio < 20) return triggered(0.5);
        }
        break;
      case 'TRANS_T18_IDLE_HEAT_SOAK':
        if (transTemp != null && speed != null && runTime != null &&
            transTemp > 95 && speed < 5 && runTime > 600) return triggered(0.4);
        break;
      case 'TRANS_T19_GEAR_HOLD_WRONG':
        if (load != null && rpm != null && speed != null &&
            load > 50 && rpm < 1200 && speed > 40) return triggered(0.5);
        break;
      case 'TRANS_T20_TEMP_SPEED_CORRELATION':
        if (transTemp != null && speed != null && load != null &&
            transTemp > 105 && speed > 80 && load < 40) return triggered(0.6);
        break;
    }

    return NO_TRIGGER;
  }

  // ── Diagnostic Rule Matching ──

  private matchDiagnosticRules(
    values: Record<string, any>,
    snapshots: PidSnapshot[],
  ): DiagnosticMatch[] {
    const matches: DiagnosticMatch[] = [];

    for (const rule of this.diagnosticRules) {
      const conditions = (rule.conditions as any[]) ?? [];
      const logicType = (rule.logicType as string) ?? 'ALL';

      let matched: boolean;
      if (logicType === 'ANY') {
        matched = conditions.some(c => this.evaluateCondition(c, values, snapshots));
      } else {
        matched = conditions.every(c => this.evaluateCondition(c, values, snapshots));
      }

      if (matched && conditions.length > 0) {
        matches.push({
          ruleId: rule.id ?? '',
          category: rule.category ?? '',
          severity: rule.severity ?? 'INFO',
          confidence: ((rule.confidence as number) ?? 75) / 100,
          description: rule.description ?? '',
          recommendation: rule.recommendation ?? '',
          possibleDtcs: [...(rule.possibleDTCs ?? [])],
          repairPriority: rule.repairPriority ?? 3,
          commonParts: [...(rule.commonParts ?? [])],
        });
      }
    }

    // Sort: CRITICAL first, then by priority
    const sevOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    matches.sort((a, b) => {
      const cmp = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
      return cmp !== 0 ? cmp : a.repairPriority - b.repairPriority;
    });

    return matches;
  }

  private evaluateCondition(
    condition: Record<string, any>,
    values: Record<string, any>,
    snapshots?: PidSnapshot[],
  ): boolean {
    const pidHex = (condition.pid as string) ?? (condition.parameter as string);
    if (!pidHex) return false;
    const field = PID_TO_FIELD[pidHex];
    if (!field) return false;
    const actual = val(values, field);
    if (actual == null) return false;

    const op = (condition.operator as string) ?? '>';
    const target = condition.value;

    switch (op) {
      case '>': return actual > (target as number);
      case '<': return actual < (target as number);
      case '>=': return actual >= (target as number);
      case '<=': return actual <= (target as number);
      case '==': return actual === (target as number);
      case '!=': return actual !== (target as number);
      case 'between':
        if (Array.isArray(target) && target.length === 2)
          return actual >= target[0] && actual <= target[1];
        return false;
      case 'outside':
        if (Array.isArray(target) && target.length === 2)
          return actual < target[0] || actual > target[1];
        return false;
      case 'rate_of_change':
        if (snapshots && snapshots.length >= 2) {
          const series: number[] = [];
          for (const snap of snapshots) {
            const v = val(snapshotToMap(snap), field);
            if (v != null) series.push(v);
          }
          if (series.length >= 2) {
            let maxRate = 0;
            for (let i = 1; i < series.length; i++) {
              const delta = Math.abs(series[i] - series[i - 1]);
              if (delta > maxRate) maxRate = delta;
            }
            return maxRate > (target as number);
          }
        }
        return false;
      default:
        return false;
    }
  }

  // ── Parameter Correlations ──

  private evaluateCorrelations(snapshots: PidSnapshot[]): CorrelationResult[] {
    if (snapshots.length < 3) return [];

    const results: CorrelationResult[] = [];
    for (const corr of this.correlationsDef) {
      const p1Hex = corr.param1 as string | undefined;
      const p2Hex = corr.param2 as string | undefined;
      if (!p1Hex || !p2Hex) continue;

      const f1 = PID_TO_FIELD[p1Hex];
      const f2 = PID_TO_FIELD[p2Hex];
      if (!f1 || !f2) continue;

      const v1: number[] = [];
      const v2: number[] = [];
      for (const snap of snapshots) {
        const json = snapshotToMap(snap);
        const a = val(json, f1);
        const b = val(json, f2);
        if (a != null && b != null) {
          v1.push(a);
          v2.push(b);
        }
      }
      if (v1.length < 3) continue;

      // Check valid conditions
      const validConds = (corr.validConditions as any[]) ?? [];
      const avgValues = snapshotToMap(this.averageSnapshots(snapshots));
      let valid = true;
      for (const vc of validConds) {
        if (!this.evaluateCondition(vc, avgValues, snapshots)) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      const actual = pearsonCorr(v1, v2);
      const expected = corr.expectedCoefficient as number;
      const tolerance = (corr.tolerance as number) ?? 0.2;
      const deviation = Math.abs(actual - expected);

      let status: string;
      if (deviation <= tolerance) status = 'Normal';
      else if (deviation <= tolerance * 1.5) status = 'Warning';
      else status = 'Abnormal';

      const name = (corr.name as string) ?? (corr.id as string) ?? '';
      results.push({
        id: corr.id ?? '',
        name,
        expected,
        actual,
        deviation,
        status,
        consumerMessage: status === 'Normal'
          ? (corr.whenHealthy as string) ?? `${name} is within normal range`
          : (corr.whenAbnormal as string) ?? `${name} shows abnormal relationship`,
      });
    }

    return results;
  }

  // ── Data Coverage ──

  private systemCoverage(sysKey: string, values: Record<string, any>): number {
    const groups = this.derivedMetricsDef.pidCoverageGroups as Record<string, any> | undefined;
    if (!groups) return 0;
    const group = groups[sysKey] as Record<string, any> | undefined;
    if (!group) return 0;

    const required = (group.required as any[]) ?? [];
    const supporting = (group.supporting as any[]) ?? [];
    if (required.length === 0 && supporting.length === 0) return 1;

    let reqFound = 0;
    for (const req of required) {
      if (this.pidGroupHasData(req, values)) reqFound++;
    }

    let supFound = 0;
    for (const sup of supporting) {
      if (this.pidGroupHasData(sup, values)) supFound++;
    }

    if (required.length === 0 && supporting.length === 0) return 1;

    const reqCov = required.length > 0 ? reqFound / required.length : 1;
    const supCov = supporting.length > 0 ? supFound / supporting.length : 0;
    return Math.max(0, Math.min(1, reqCov * 0.75 + supCov * 0.25));
  }

  private pidGroupHasData(entry: Record<string, any>, values: Record<string, any>): boolean {
    const singlePid = entry.pid as string | undefined;
    if (singlePid) {
      const field = PID_TO_FIELD[singlePid];
      return field != null && val(values, field) != null;
    }

    const multiPids = entry.pids as string[] | undefined;
    if (multiPids) {
      for (const p of multiPids) {
        const field = PID_TO_FIELD[p];
        if (field != null && val(values, field) != null) return true;
      }
    }

    return false;
  }

  // ── Component Risk Inference ──

  private componentRisks(triggeredRules: EvaluatedRule[], ruleMap: any[]): ComponentRisk[] {
    const risks: Record<string, number> = {};
    const contributors: Record<string, string[]> = {};

    for (const rule of triggeredRules) {
      const ruleData = ruleMap.find((r: any) => r.id === rule.id);
      const causes: string[] = [...(ruleData?.possibleCauses ?? [])];

      for (const cause of causes) {
        const existing = risks[cause] ?? 0;
        risks[cause] = Math.min(0.95, existing + rule.weight * rule.strength * 0.5);
        if (!contributors[cause]) contributors[cause] = [];
        contributors[cause].push(rule.id);
      }
    }

    return Object.entries(risks)
      .map(([component, probability]) => ({
        component,
        probability,
        contributingRules: contributors[component] ?? [],
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  // ── Helpers ──

  private consumerMessage(ruleId: string, rule: Record<string, any>): string {
    const desc = (rule.description as string) ?? '';
    const causes: string[] = [...(rule.possibleCauses ?? [])];
    if (causes.length > 0) return `${desc}. Possible cause: ${causes[0]}`;
    return desc;
  }

  private dtcsForRule(ruleId: string, ruleData?: Record<string, any>): string[] {
    const dtcs = ruleData?.possibleDTCs ?? ruleData?.possibleDtcs;
    if (Array.isArray(dtcs) && dtcs.length > 0) return [...dtcs];

    const prefix = ruleId.split('_')[0];
    const defaults: Record<string, string[]> = {
      CHG: ['P0562', 'P0563'],
      COMB: ['P0300', 'P0301', 'P0302'],
      FUEL: ['P0171', 'P0172', 'P0174'],
      COOL: ['P0128', 'P0217'],
      EMIS: ['P0420', 'P0430'],
      OIL: ['P0520', 'P0524'],
    };
    return defaults[prefix] ?? [];
  }
}

// ── Module-level helpers ──

function val(values: Record<string, any>, key: string): number | null {
  const v = values[key];
  return typeof v === 'number' ? v : null;
}

function riskTierFromScore(score: number): string {
  if (score >= 85) return 'Healthy';
  if (score >= 70) return 'Monitor';
  if (score >= 50) return 'Warning';
  return 'Critical';
}

function pearsonCorr(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}
