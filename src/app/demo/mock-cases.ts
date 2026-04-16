// ─────────────────────────────────────────────────────────────────────
// DEMO — Mock Case Fixtures
// ---------------------------------------------------------------------
// Self-contained fixtures that mimic the shape produced by the live
// analysis + DTC engines. Consumed ONLY by the /demo page.
// Do NOT import anything from this file into the real diagnostic flow.
// ─────────────────────────────────────────────────────────────────────

import { DtcSource } from '@/models';
import type {
  DtcCode,
  FullAnalysisResult,
  PidSnapshot,
  SystemHealthReport,
  EvaluatedRule,
  ComponentRisk,
  CorrelationResult,
  DiagnosticMatch,
} from '@/models';
import { emptySnapshot } from '@/models';

export type CaseId = 'healthy' | 'monitor' | 'warning' | 'critical';

export interface DemoCase {
  id: CaseId;
  label: string;                   // short pill label
  headline: string;                // headline shown on selector
  vehicle: string;                 // e.g. "2019 Honda Civic"
  scenario: string;                // 1-sentence scenario
  explanation: string;             // 2-3 sentence explanation of what user will see
  riskTier: 'Healthy' | 'Monitor' | 'Warning' | 'Critical';
  accentHex: string;               // visual accent
  liveBase: Partial<PidSnapshot>;  // base values while streaming
  liveJitter: Partial<Record<keyof PidSnapshot, number>>;
  analysis: FullAnalysisResult;
  dtcs: { stored: DtcCode[]; pending: DtcCode[]; permanent: DtcCode[] };
  talkingPoints: string[];         // 3-4 bullet teaching points
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function buildSnapshot(values: Partial<PidSnapshot>): PidSnapshot {
  const snap = emptySnapshot();
  for (const [k, v] of Object.entries(values)) {
    if (k in snap) (snap as unknown as Record<string, number | null>)[k] = v as number;
  }
  return snap;
}

function system(
  key: string,
  name: string,
  score: number,
  findings: string[],
  rules: EvaluatedRule[] = [],
  components: ComponentRisk[] = [],
  dataCoverage = 1,
): SystemHealthReport {
  const riskTier = score >= 85 ? 'Healthy' : score >= 70 ? 'Monitor' : score >= 50 ? 'Warning' : 'Critical';
  return {
    system: key,
    consumerName: name,
    icon: key,
    score,
    riskTier,
    dataCoverage,
    findings,
    evaluatedRules: rules,
    componentRisks: components,
  };
}

function rule(
  id: string,
  name: string,
  strength: number,
  consumerMessage: string,
  possibleDtcs: string[] = [],
  weight = 1,
): EvaluatedRule {
  return { id, name, strength, weight, consumerMessage, possibleDtcs };
}

function component(name: string, probability: number, contributingRules: string[] = []): ComponentRisk {
  return { component: name, probability, contributingRules };
}

function correlation(
  id: string,
  name: string,
  expected: number,
  actual: number,
  status: 'normal' | 'deviated' | 'critical',
  msg: string,
): CorrelationResult {
  return {
    id,
    name,
    expected,
    actual,
    deviation: Math.abs(actual - expected),
    status,
    consumerMessage: msg,
  };
}

function match(
  ruleId: string,
  category: string,
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR',
  confidence: number,
  description: string,
  recommendation: string,
  repairPriority = 5,
  possibleDtcs: string[] = [],
  commonParts: string[] = [],
): DiagnosticMatch {
  return {
    ruleId, category, severity, confidence, description, recommendation,
    repairPriority, possibleDtcs, commonParts,
  };
}

function dtc(
  code: string,
  source: DtcSource,
  description: string,
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'INFO',
  system: string,
  causes: string[],
  advice: string,
  estimatedCost: string,
  priority = 5,
): DtcCode {
  return {
    code, source, system, description, severity,
    consumerAdvice: advice,
    possibleCauses: causes,
    estimatedCost,
    commonParts: [],
    repairPriority: priority,
  };
}

/* ──────────────────────────────────────────────────────────────────
   CASE 1 — HEALTHY
   A well-maintained daily driver, no issues detected.
   ────────────────────────────────────────────────────────────────── */

const healthy: DemoCase = {
  id: 'healthy',
  label: 'Healthy',
  headline: 'Clean bill of health',
  vehicle: '2019 Honda Civic 1.5L',
  scenario: 'A well-maintained daily driver. Everything within spec.',
  explanation: 'All six vehicle systems pass their rule checks. Fuel trims are balanced, coolant and intake temps are in the optimal band, and no trouble codes are stored. This is the baseline for comparison.',
  riskTier: 'Healthy',
  accentHex: '#10b981',
  liveBase: {
    rpm: 820, vehicle_speed: 0, coolant_temp: 88, intake_air_temp: 32,
    throttle_position: 14, engine_load: 22, maf_rate: 3.4, timing_advance: 12,
    stft_b1: 1.2, ltft_b1: -0.8, fuel_pressure: 345, ecu_voltage: 14.2,
    o2_lambda_upstream: 1.00, o2_lambda_downstream: 0.82, fuel_level: 68,
    barometric_pressure: 101, ambient_temp: 30,
  },
  liveJitter: {
    rpm: 35, vehicle_speed: 0, coolant_temp: 0.5, intake_air_temp: 0.3,
    throttle_position: 0.8, engine_load: 1.5, maf_rate: 0.4, timing_advance: 1,
    stft_b1: 0.6, ltft_b1: 0.2, fuel_pressure: 4, ecu_voltage: 0.05,
    o2_lambda_upstream: 0.03, o2_lambda_downstream: 0.02,
  },
  analysis: {
    overallScore: 92,
    overallRiskTier: 'Healthy',
    supportedPidCount: 28,
    scanCycles: 10,
    scanDurationMs: 28400,
    snapshot: buildSnapshot({
      rpm: 820, coolant_temp: 88, stft_b1: 1.2, ltft_b1: -0.8,
      o2_lambda_upstream: 1.00, ecu_voltage: 14.2,
    }),
    derivedMetrics: { fuel_economy_est_mpg: 36.4, combustion_efficiency: 0.94 },
    systems: [
      system('engine', 'Engine', 94,
        ['Idle stability excellent', 'Combustion efficiency high'],
      ),
      system('fuel', 'Fuel', 91,
        ['Fuel trims within ±2%', 'Injectors and pressure stable'],
      ),
      system('emission', 'Emission', 90,
        ['O2 sensors responsive', 'Catalyst efficiency > 95%'],
      ),
      system('electrical', 'Electrical', 95,
        ['Charging voltage nominal (14.2V)', 'No voltage dips detected'],
      ),
      system('thermal', 'Thermal', 93,
        ['Coolant temp in target band', 'Warm-up behaviour normal'],
      ),
      system('air_intake', 'Intake', 90,
        ['MAF trace smooth', 'No vacuum anomalies'],
      ),
    ],
    correlationResults: [
      correlation('maf_vs_load', 'MAF vs Engine Load', 22, 22, 'normal',
        'Airflow matches engine load — intake is clean.'),
      correlation('o2_switching', 'O2 Sensor Switching', 0.45, 0.47, 'normal',
        'Upstream O2 cycling in a healthy rhythm.'),
    ],
    diagnosticMatches: [],
  },
  dtcs: { stored: [], pending: [], permanent: [] },
  talkingPoints: [
    'Overall score of 92 means the vehicle is in great shape.',
    'Every system is green — no rules triggered.',
    'No DTCs of any type (stored, pending, or permanent).',
    'This is what a clean scan looks like — use it as a reference point.',
  ],
};

/* ──────────────────────────────────────────────────────────────────
   CASE 2 — MONITOR
   Fuel trim drift, early lean condition. Still drivable.
   ────────────────────────────────────────────────────────────────── */

const monitor: DemoCase = {
  id: 'monitor',
  label: 'Monitor',
  headline: 'Early fuel trim drift',
  vehicle: '2017 Honda CR-V 1.5L Turbo',
  scenario: 'Mildly lean at cruise. No check-engine light yet, but trends are drifting.',
  explanation: 'Short- and long-term fuel trims have climbed above +5%, suggesting a small vacuum leak or aging MAF sensor. One pending fault code has appeared but has not yet matured into a stored code. Drivable but worth attention.',
  riskTier: 'Monitor',
  accentHex: '#f59e0b',
  liveBase: {
    rpm: 860, vehicle_speed: 0, coolant_temp: 91, intake_air_temp: 34,
    throttle_position: 15, engine_load: 25, maf_rate: 3.1, timing_advance: 14,
    stft_b1: 6.5, ltft_b1: 8.2, fuel_pressure: 338, ecu_voltage: 14.1,
    o2_lambda_upstream: 1.04, o2_lambda_downstream: 0.78, fuel_level: 42,
    barometric_pressure: 100, ambient_temp: 31,
  },
  liveJitter: {
    rpm: 45, coolant_temp: 0.4, intake_air_temp: 0.3,
    throttle_position: 1.0, engine_load: 1.8, maf_rate: 0.3, timing_advance: 1.2,
    stft_b1: 1.8, ltft_b1: 0.5, fuel_pressure: 5, ecu_voltage: 0.04,
    o2_lambda_upstream: 0.05,
  },
  analysis: {
    overallScore: 78,
    overallRiskTier: 'Monitor',
    supportedPidCount: 27,
    scanCycles: 10,
    scanDurationMs: 29100,
    snapshot: buildSnapshot({
      rpm: 855, coolant_temp: 91, stft_b1: 6.5, ltft_b1: 8.2,
      o2_lambda_upstream: 1.04, maf_rate: 3.1,
    }),
    derivedMetrics: { fuel_economy_est_mpg: 31.2, combustion_efficiency: 0.88 },
    systems: [
      system('engine', 'Engine', 83,
        ['Slight lean bias at idle', 'Idle stability acceptable'],
        [rule('r_lean_idle', 'Lean bias at idle', 0.42,
          'Engine running slightly lean at idle — monitor for worsening.',
          ['P0171'])],
        [component('MAF sensor', 0.35, ['r_lean_idle']),
         component('Intake hose / gasket', 0.28, ['r_lean_idle'])],
      ),
      system('fuel', 'Fuel', 72,
        ['LTFT +8.2% (threshold +6%)', 'STFT trending positive'],
        [rule('r_ltft_high', 'LTFT above threshold', 0.62,
          'Long-term fuel trim has drifted beyond +6%. The ECU is compensating for a lean condition.',
          ['P0171'])],
        [component('MAF sensor', 0.45, ['r_ltft_high']),
         component('Vacuum lines / PCV', 0.40, ['r_ltft_high']),
         component('Fuel pressure regulator', 0.15, ['r_ltft_high'])],
      ),
      system('emission', 'Emission', 81,
        ['Downstream O2 slightly active', 'Catalyst still compensating'],
        [rule('r_o2_switch', 'O2 downstream activity elevated', 0.28,
          'Post-catalyst oxygen is more active than expected — may indicate cat beginning to age.',
          [])],
      ),
      system('electrical', 'Electrical', 93,
        ['Charging voltage nominal'],
      ),
      system('thermal', 'Thermal', 89,
        ['Thermostat regulating normally'],
      ),
      system('air_intake', 'Intake', 76,
        ['MAF reading 12% below expected for load'],
        [rule('r_maf_low', 'MAF under-reading vs load', 0.48,
          'Measured airflow is lower than what the engine load implies — check for intake leaks.',
          ['P0101', 'P0171'])],
        [component('MAF sensor', 0.50, ['r_maf_low'])],
      ),
    ],
    correlationResults: [
      correlation('maf_vs_load', 'MAF vs Engine Load', 28, 24.6, 'deviated',
        'Airflow is 12% lower than expected — consistent with an intake leak or dirty MAF.'),
      correlation('stft_ltft_sum', 'Total fuel trim', 0, 14.7, 'deviated',
        'Combined fuel trim is +14.7% — above the monitoring threshold of +10%.'),
    ],
    diagnosticMatches: [
      match('lean_condition_b1', 'Fuel System', 'MODERATE', 0.74,
        'Bank 1 running lean across multiple cycles.',
        'Inspect intake for vacuum leaks and clean / test the MAF sensor before replacing parts.',
        4, ['P0171'], ['MAF sensor', 'PCV valve', 'Vacuum hose']),
    ],
  },
  dtcs: {
    stored: [],
    pending: [
      dtc('P0171', DtcSource.PENDING, 'System Too Lean (Bank 1)', 'MODERATE', 'Powertrain',
        ['Vacuum leak (intake manifold, PCV, hose)', 'Dirty or failing MAF sensor', 'Weak fuel pump or clogged filter', 'Leaking fuel injector'],
        'Drivable — but have it checked in the next week or two. Most commonly caused by a small vacuum leak.',
        'RM 150 – RM 450 depending on cause',
        4),
    ],
    permanent: [],
  },
  talkingPoints: [
    'Score of 78 puts this in the "Monitor" tier — not urgent but trending wrong.',
    'Fuel system dropped first (72) — fuel trims are the leading indicator.',
    'A pending DTC (P0171) has appeared. Pending = detected once but not yet confirmed.',
    'Root cause is narrowed to MAF + vacuum — components are ranked by probability.',
  ],
};

/* ──────────────────────────────────────────────────────────────────
   CASE 3 — WARNING
   Misfire + catalyst stress. Drivable but needs work soon.
   ────────────────────────────────────────────────────────────────── */

const warning: DemoCase = {
  id: 'warning',
  label: 'Warning',
  headline: 'Misfire & catalyst stress',
  vehicle: '2016 Nissan Altima 2.5L',
  scenario: 'Rough idle, intermittent misfires on two cylinders, catalyst running hot.',
  explanation: 'The engine is misfiring on cylinders 2 and 3, which dumps unburnt fuel into the catalyst and drives its temperature up. Two confirmed DTCs plus one permanent P0420 (catalyst efficiency) — the vehicle is drivable but damage compounds the longer this continues.',
  riskTier: 'Warning',
  accentHex: '#f97316',
  liveBase: {
    rpm: 720, vehicle_speed: 0, coolant_temp: 102, intake_air_temp: 38,
    throttle_position: 16, engine_load: 34, maf_rate: 4.2, timing_advance: 8,
    stft_b1: 12.5, ltft_b1: 14.8, fuel_pressure: 320, ecu_voltage: 13.9,
    o2_lambda_upstream: 1.08, o2_lambda_downstream: 0.95, fuel_level: 24,
    catalyst_temp_b1s1: 812, misfire_cyl1: 0, misfire_cyl2: 14,
    misfire_cyl3: 18, misfire_cyl4: 1,
  },
  liveJitter: {
    rpm: 80, coolant_temp: 0.8, intake_air_temp: 0.4,
    throttle_position: 1.5, engine_load: 3.5, maf_rate: 0.5, timing_advance: 2.2,
    stft_b1: 3.2, ltft_b1: 0.8, fuel_pressure: 6, ecu_voltage: 0.08,
    o2_lambda_upstream: 0.08, o2_lambda_downstream: 0.08,
    catalyst_temp_b1s1: 12, misfire_cyl2: 3, misfire_cyl3: 3,
  },
  analysis: {
    overallScore: 61,
    overallRiskTier: 'Warning',
    supportedPidCount: 30,
    scanCycles: 10,
    scanDurationMs: 31200,
    snapshot: buildSnapshot({
      rpm: 720, coolant_temp: 102, stft_b1: 12.5, ltft_b1: 14.8,
      misfire_cyl2: 14, misfire_cyl3: 18, catalyst_temp_b1s1: 812,
    }),
    derivedMetrics: { fuel_economy_est_mpg: 22.8, combustion_efficiency: 0.71 },
    systems: [
      system('engine', 'Engine', 56,
        ['Misfires detected on cyl 2 (14/min) and cyl 3 (18/min)', 'Rough idle — RPM oscillation ±80'],
        [
          rule('r_misfire_2_3', 'Multi-cylinder misfire', 0.82,
            'Cylinders 2 and 3 are misfiring. This unburnt fuel overheats the catalyst and hurts fuel economy.',
            ['P0302', 'P0303']),
          rule('r_idle_rough', 'Idle instability', 0.58,
            'Idle RPM is oscillating beyond normal range, consistent with cylinder imbalance.',
            []),
        ],
        [
          component('Ignition coil (cyl 2)', 0.55, ['r_misfire_2_3']),
          component('Ignition coil (cyl 3)', 0.55, ['r_misfire_2_3']),
          component('Spark plugs', 0.42, ['r_misfire_2_3', 'r_idle_rough']),
          component('Fuel injector (cyl 2/3)', 0.25, ['r_misfire_2_3']),
        ],
      ),
      system('fuel', 'Fuel', 63,
        ['LTFT +14.8% — ECU compensating heavily', 'Rich-lean cycling on bank 1'],
        [rule('r_ltft_very_high', 'LTFT severely elevated', 0.76,
          'Fuel trim is correcting aggressively. Combined with misfires, this points to ignition or injector issues.',
          ['P0171'])],
      ),
      system('emission', 'Emission', 48,
        ['Downstream O2 tracking upstream — catalyst struggling', 'Permanent P0420 present'],
        [
          rule('r_cat_efficiency', 'Catalyst efficiency low', 0.88,
            'The catalytic converter is no longer cleaning exhaust effectively. Unburnt fuel from misfires is accelerating its failure.',
            ['P0420']),
        ],
        [component('Catalytic converter', 0.72, ['r_cat_efficiency'])],
      ),
      system('electrical', 'Electrical', 82,
        ['Ignition system drawing higher current than baseline'],
        [rule('r_ign_load', 'Ignition primary anomaly', 0.38,
          'Coil primary draw is slightly higher — consistent with a weakening ignition coil.',
          [])],
      ),
      system('thermal', 'Thermal', 68,
        ['Coolant at 102°C — upper end of normal', 'Catalyst at 812°C — elevated'],
        [rule('r_cat_hot', 'Catalyst overheat risk', 0.62,
          'Unburnt fuel from misfires is overheating the catalyst. Prolonged operation will destroy it.',
          ['P0420'])],
      ),
      system('air_intake', 'Intake', 79,
        ['MAF trace normal'],
      ),
    ],
    correlationResults: [
      correlation('o2_switching', 'O2 Sensor Switching', 0.45, 0.82, 'deviated',
        'Downstream O2 is mimicking upstream — catalyst oxygen storage is depleted.'),
      correlation('misfire_rate', 'Misfire rate vs baseline', 0, 32, 'critical',
        '32 misfires/min across two cylinders — well above the 5/min threshold.'),
    ],
    diagnosticMatches: [
      match('misfire_ignition_pattern', 'Ignition', 'MAJOR', 0.84,
        'Misfire pattern on adjacent cylinders suggests ignition component failure.',
        'Swap ignition coils between a healthy and misfiring cylinder to confirm. Replace the coil that follows the misfire.',
        8, ['P0302', 'P0303'], ['Ignition coil', 'Spark plug']),
      match('cat_damage_progressing', 'Emission', 'MAJOR', 0.78,
        'Catalyst efficiency has dropped and is being damaged by ongoing misfires.',
        'Fix the misfires first, then re-test. If P0420 persists after 2 drive cycles, catalyst replacement will be needed.',
        7, ['P0420'], ['Catalytic converter']),
    ],
  },
  dtcs: {
    stored: [
      dtc('P0302', DtcSource.STORED, 'Cylinder 2 Misfire Detected', 'MAJOR', 'Powertrain',
        ['Worn or fouled spark plug (cyl 2)', 'Failing ignition coil (cyl 2)', 'Weak / clogged fuel injector (cyl 2)', 'Low cylinder compression'],
        'Drive gently to a workshop. Prolonged misfires will damage the catalytic converter.',
        'RM 180 – RM 900 depending on cause', 8),
      dtc('P0303', DtcSource.STORED, 'Cylinder 3 Misfire Detected', 'MAJOR', 'Powertrain',
        ['Worn or fouled spark plug (cyl 3)', 'Failing ignition coil (cyl 3)', 'Weak / clogged fuel injector (cyl 3)'],
        'Same as P0302 — address both cylinders together. Often a common cause.',
        'RM 180 – RM 900 depending on cause', 8),
    ],
    pending: [
      dtc('P0171', DtcSource.PENDING, 'System Too Lean (Bank 1)', 'MODERATE', 'Powertrain',
        ['Fuel trim compensation from misfires', 'Vacuum leak', 'Weak fuel supply'],
        'Likely a consequence of the misfires. Re-test after fixing P0302/P0303.',
        'Often resolves once misfires are fixed', 3),
    ],
    permanent: [
      dtc('P0420', DtcSource.PERMANENT, 'Catalyst Efficiency Below Threshold (Bank 1)', 'MAJOR', 'Powertrain',
        ['Aged or damaged catalytic converter', 'Oxygen sensor drift', 'Upstream misfires damaging catalyst'],
        'Permanent codes stay until the ECU confirms the fault is gone across drive cycles. Fix misfires first.',
        'RM 900 – RM 3,500 if catalyst replacement needed', 7),
    ],
  },
  talkingPoints: [
    'Score of 61 triggers the "Warning" tier — action needed soon.',
    'Two systems are below 70: Engine (56) and Emission (48).',
    'Component risk ranking points at ignition coils for cyl 2 & 3 first.',
    'Permanent P0420 — misfires are actively damaging the catalyst.',
  ],
};

/* ──────────────────────────────────────────────────────────────────
   CASE 4 — CRITICAL
   Overheating + multiple severe faults. Stop driving.
   ────────────────────────────────────────────────────────────────── */

const critical: DemoCase = {
  id: 'critical',
  label: 'Critical',
  headline: 'Overheating & multiple severe faults',
  vehicle: '2012 Ford Ranger 2.2L TDCi',
  scenario: 'Engine running hot, low battery voltage, heavy misfires across multiple cylinders.',
  explanation: 'Coolant has climbed to 119°C and is still rising. Battery voltage has dropped to 11.4V under load — the alternator is failing to keep up. Multiple misfires suggest the ignition system is being starved. This vehicle should not be driven until the cooling and charging systems are repaired.',
  riskTier: 'Critical',
  accentHex: '#ef4444',
  liveBase: {
    rpm: 680, vehicle_speed: 0, coolant_temp: 119, intake_air_temp: 48,
    throttle_position: 18, engine_load: 48, maf_rate: 3.6, timing_advance: 4,
    stft_b1: 18.5, ltft_b1: 21.2, fuel_pressure: 280, ecu_voltage: 11.4,
    o2_lambda_upstream: 1.12, o2_lambda_downstream: 1.05, fuel_level: 12,
    catalyst_temp_b1s1: 895, misfire_cyl1: 22, misfire_cyl2: 28,
    misfire_cyl3: 19, misfire_cyl4: 24, oil_temp: 125, oil_pressure: 185,
  },
  liveJitter: {
    rpm: 140, coolant_temp: 1.2, intake_air_temp: 0.5,
    throttle_position: 2.0, engine_load: 4.5, maf_rate: 0.5, timing_advance: 3,
    stft_b1: 4.5, ltft_b1: 1.2, fuel_pressure: 10, ecu_voltage: 0.25,
    o2_lambda_upstream: 0.12, o2_lambda_downstream: 0.10,
    catalyst_temp_b1s1: 20, misfire_cyl1: 4, misfire_cyl2: 4,
    misfire_cyl3: 4, misfire_cyl4: 4, oil_temp: 1.0,
  },
  analysis: {
    overallScore: 32,
    overallRiskTier: 'Critical',
    supportedPidCount: 33,
    scanCycles: 10,
    scanDurationMs: 33600,
    snapshot: buildSnapshot({
      rpm: 680, coolant_temp: 119, stft_b1: 18.5, ltft_b1: 21.2,
      ecu_voltage: 11.4, misfire_cyl1: 22, misfire_cyl2: 28,
      misfire_cyl3: 19, misfire_cyl4: 24, catalyst_temp_b1s1: 895,
    }),
    derivedMetrics: { fuel_economy_est_mpg: 14.2, combustion_efficiency: 0.48 },
    systems: [
      system('engine', 'Engine', 28,
        ['Heavy misfires on ALL 4 cylinders', 'RPM oscillation ±140 — severe idle instability', 'Combustion efficiency 48%'],
        [
          rule('r_total_misfire', 'All-cylinder misfire', 0.95,
            'Every cylinder is misfiring. This typically means the entire ignition or fuel supply is compromised — not individual components.',
            ['P0300']),
          rule('r_rough_idle_severe', 'Severe idle instability', 0.88,
            'Engine is barely holding idle. Driving in this state risks sudden stall at intersections.',
            []),
        ],
        [
          component('Ignition system (coils, plugs)', 0.72, ['r_total_misfire']),
          component('Fuel delivery (pump, pressure)', 0.58, ['r_total_misfire']),
          component('Low charging voltage cascade', 0.55, ['r_total_misfire']),
        ],
      ),
      system('fuel', 'Fuel', 41,
        ['LTFT +21% — ECU at correction limit', 'Fuel pressure 280 kPa (expected 320-380)'],
        [rule('r_fuel_starved', 'Fuel starvation', 0.78,
          'Low fuel pressure combined with maxed-out positive fuel trim means the engine is not getting enough fuel.',
          ['P0087', 'P0171'])],
        [component('Fuel pump', 0.60, ['r_fuel_starved']),
         component('Fuel filter (clogged)', 0.45, ['r_fuel_starved'])],
      ),
      system('emission', 'Emission', 22,
        ['Catalyst at 895°C — damage threshold', 'O2 sensors showing rich flood downstream'],
        [rule('r_cat_meltdown', 'Catalyst overheating — damage likely', 0.92,
          'Catalyst temperature is in the destruction zone. Continued operation will melt the substrate.',
          ['P0420', 'P0430'])],
        [component('Catalytic converter', 0.88, ['r_cat_meltdown'])],
      ),
      system('electrical', 'Electrical', 38,
        ['Charging voltage 11.4V under load (should be 13.8-14.4V)', 'Voltage dipping during misfire events'],
        [rule('r_charging_fail', 'Charging system failure', 0.85,
          'The alternator is not maintaining battery voltage under load. Expect electrical gremlins and eventual no-start.',
          ['P0562', 'P0563'])],
        [component('Alternator', 0.65, ['r_charging_fail']),
         component('Battery (aged / failed cell)', 0.50, ['r_charging_fail']),
         component('Serpentine belt / tensioner', 0.20, ['r_charging_fail'])],
      ),
      system('thermal', 'Thermal', 19,
        ['Coolant 119°C — 15°C above normal and rising', 'Oil temp 125°C', 'Cooling fan status suspect'],
        [
          rule('r_overheat', 'Active overheat', 0.96,
            'Coolant has crossed the safety threshold. Head gasket and cylinder liner damage begin at this temperature.',
            ['P0217', 'P0118']),
          rule('r_oil_hot', 'Oil temp elevated', 0.72,
            'Oil is hotter than spec — lubrication film integrity is reduced.',
            []),
        ],
        [
          component('Thermostat (stuck closed)', 0.55, ['r_overheat']),
          component('Cooling fan / relay', 0.50, ['r_overheat']),
          component('Water pump', 0.40, ['r_overheat']),
          component('Coolant level / leak', 0.35, ['r_overheat']),
        ],
      ),
      system('air_intake', 'Intake', 62,
        ['Intake air temp 48°C — underhood heat soak from overheat'],
        [rule('r_iat_hot', 'Intake air overheating', 0.42,
          'Intake air is absorbing underhood heat — secondary symptom of the overheat.',
          [])],
      ),
    ],
    correlationResults: [
      correlation('maf_vs_load', 'MAF vs Engine Load', 48, 38, 'deviated',
        'Airflow is low for the load — combined with fuel starvation.'),
      correlation('voltage_stability', 'Charging stability', 14.2, 11.4, 'critical',
        'Charging voltage is 2.8V below target — alternator failure imminent.'),
      correlation('cooling_response', 'Cooling response time', 90, 119, 'critical',
        'Coolant temperature is not regulating — thermostat or cooling circuit failure.'),
      correlation('misfire_rate', 'Misfire rate vs baseline', 0, 93, 'critical',
        '93 misfires/min across all four cylinders — engine is barely firing.'),
    ],
    diagnosticMatches: [
      match('stop_driving_overheat', 'Thermal', 'CRITICAL', 0.96,
        'Engine is actively overheating. Continued driving risks head gasket failure and engine destruction.',
        'Stop driving. Let the engine cool for 30+ minutes, check coolant level, then tow to a workshop. Do not attempt to drive home.',
        10, ['P0217'], ['Thermostat', 'Coolant', 'Water pump', 'Cooling fan']),
      match('charging_system_fail', 'Electrical', 'CRITICAL', 0.88,
        'Charging system is not maintaining voltage. Vehicle will eventually fail to start.',
        'Alternator output test needed. Likely alternator replacement; check battery condition at the same time.',
        9, ['P0562'], ['Alternator', 'Battery']),
      match('cat_imminent_destruction', 'Emission', 'CRITICAL', 0.92,
        'Catalytic converter is at damage temperature. Each minute of further operation reduces remaining life.',
        'Do not drive. The misfires must be fixed before the engine is run again.',
        9, ['P0420'], ['Catalytic converter']),
      match('widespread_misfire_root_cause', 'Ignition / Fuel', 'MAJOR', 0.80,
        'Misfires on all four cylinders point to a common cause — low voltage or low fuel pressure.',
        'Diagnose the charging voltage and fuel pressure first. Individual coil/plug replacement without fixing the root cause will not help.',
        7, ['P0300'], ['Alternator', 'Fuel pump']),
    ],
  },
  dtcs: {
    stored: [
      dtc('P0217', DtcSource.STORED, 'Engine Overtemperature Condition', 'CRITICAL', 'Powertrain',
        ['Stuck thermostat', 'Failed cooling fan or fan relay', 'Failed water pump', 'Low coolant / leak', 'Blown head gasket (advanced case)'],
        'STOP DRIVING. Let engine cool, check coolant, tow to workshop. Driving further risks catastrophic engine damage.',
        'RM 300 – RM 4,000 (thermostat to head gasket)', 10),
      dtc('P0300', DtcSource.STORED, 'Random / Multiple Cylinder Misfire Detected', 'MAJOR', 'Powertrain',
        ['Low charging voltage starving ignition', 'Low fuel pressure', 'Worn spark plugs (all)', 'Multiple coil failure'],
        'Common root cause is likely — diagnose charging and fuel pressure before replacing individual coils/plugs.',
        'RM 400 – RM 1,800', 8),
      dtc('P0562', DtcSource.STORED, 'System Voltage Low', 'MAJOR', 'Powertrain',
        ['Failing alternator', 'Aged / failed battery', 'Loose or corroded charging cables', 'Broken serpentine belt'],
        'Charging system is not keeping up. Expect eventual no-start. Replace alternator and test battery together.',
        'RM 450 – RM 1,500', 9),
      dtc('P0087', DtcSource.STORED, 'Fuel Rail / System Pressure Too Low', 'MAJOR', 'Powertrain',
        ['Failing fuel pump', 'Clogged fuel filter', 'Stuck-open pressure regulator', 'Fuel leak'],
        'Fuel supply is weak. Start with fuel filter, then test pump pressure.',
        'RM 150 – RM 1,200', 8),
    ],
    pending: [
      dtc('P0128', DtcSource.PENDING, 'Coolant Temperature Below Regulating Temperature', 'MODERATE', 'Powertrain',
        ['Stuck-open thermostat (but current case shows stuck closed — conflicting readings)'],
        'Contradicts the overheat — ECU confused by oscillating sensor data. Prioritize the overheat first.',
        'Usually resolves once thermostat is replaced', 3),
    ],
    permanent: [
      dtc('P0420', DtcSource.PERMANENT, 'Catalyst Efficiency Below Threshold (Bank 1)', 'MAJOR', 'Powertrain',
        ['Heavy misfire damage to catalyst', 'Overheating above 900°C', 'Aged catalyst substrate'],
        'Permanent. The misfires and overheat are actively destroying the cat. Fix root causes first.',
        'RM 900 – RM 3,500', 7),
      dtc('P0118', DtcSource.PERMANENT, 'Engine Coolant Temperature Sensor Circuit High', 'MAJOR', 'Powertrain',
        ['Sensor wiring damaged by heat', 'Failed coolant temp sensor', 'Wiring harness shorted to power'],
        'Sensor may have failed from heat exposure. Replace after confirming actual coolant temperature with IR gun.',
        'RM 120 – RM 350', 6),
    ],
  },
  talkingPoints: [
    'Score of 32 — this is a "stop driving" scenario.',
    'Four systems are below 50: Engine, Emission, Electrical, Thermal.',
    'Cross-system correlation is key: the misfires trace back to low charging voltage + low fuel pressure, not bad coils.',
    '4 stored DTCs, 1 pending, 2 permanent — the analysis engine ranks them by repair priority.',
  ],
};

/* ──────────────────────────────────────────────────────────────────
   EXPORT
   ────────────────────────────────────────────────────────────────── */

export const DEMO_CASES: Record<CaseId, DemoCase> = {
  healthy,
  monitor,
  warning,
  critical,
};

export const DEMO_CASE_ORDER: CaseId[] = ['healthy', 'monitor', 'warning', 'critical'];

/* ── Tick helper — smooth jitter on top of base values ──────────── */

export function tickLiveSnapshot(
  caseData: DemoCase,
  t: number, // seconds since stream started
): PidSnapshot {
  const snap = emptySnapshot();
  const base = caseData.liveBase;
  const jitter = caseData.liveJitter;

  for (const key of Object.keys(base) as (keyof PidSnapshot)[]) {
    const b = base[key];
    if (b == null) continue;
    const j = jitter[key] ?? 0;
    // Deterministic but lively: sum of a couple of sin waves at different rates.
    const wiggle = j === 0 ? 0 :
      j * 0.6 * Math.sin(t * 1.9 + (key.length * 0.3)) +
      j * 0.4 * Math.sin(t * 3.1 + (key.length * 0.7));
    (snap as unknown as Record<string, number>)[key] = +(b + wiggle).toFixed(2);
  }
  return snap;
}
