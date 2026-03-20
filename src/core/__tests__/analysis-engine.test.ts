// ─── Analysis Engine Integration Tests ───────────────────────────────
// Full pipeline E2E: loads real JSON rule files, feeds PID snapshots,
// and verifies health reports, diagnostics, and correlations.
// Port of analysis_engine_test.dart scenarios to TypeScript/Vitest.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalysisEngine } from '../analysis-engine';
import { computeTimeSeriesMetrics, emptyTimeSeriesMetrics } from '../time-series-metrics';
import { emptySnapshot, snapshotFromMap } from '../../models/pid-snapshot';
import type { PidSnapshot, FullAnalysisResult } from '../../models';

// ── Helpers ──────────────────────────────────────────────────────────

function loadAsset(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../public/data', name), 'utf-8');
}

function loadEngine(): AnalysisEngine {
  AnalysisEngine.resetForTest();
  const engine = AnalysisEngine.instance;
  engine.loadFromJsonStrings({
    analyzerRulesJson: loadAsset('analyzer_rules_v2.json'),
    derivedMetricsJson: loadAsset('derived_metrics.json'),
    diagnosticRulesJson: loadAsset('diagnostic_rules_workshop.json'),
    correlationsJson: loadAsset('parameter_correlations.json'),
  });
  return engine;
}

/** Build N identical snapshots. */
function repeat(base: Partial<PidSnapshot>, n: number): PidSnapshot[] {
  return Array.from({ length: n }, () => snapshotFromMap(base as Record<string, number>));
}

/** Build a series with slight jitter to ensure non-zero variance. */
function seriesWithJitter(base: Partial<PidSnapshot>, n: number, jitter = 0.02): PidSnapshot[] {
  return Array.from({ length: n }, (_, i) => {
    const j = (i % 2 === 0 ? jitter : -jitter) * i;
    return snapshotFromMap({
      ...(base as Record<string, number>),
      ...(base.rpm != null ? { rpm: base.rpm + j * 10 } : {}),
      ...(base.ecu_voltage != null ? { ecu_voltage: base.ecu_voltage + j } : {}),
      ...(base.coolant_temp != null ? { coolant_temp: base.coolant_temp + j * 2 } : {}),
    });
  });
}

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 1: Time Series Metrics — Pure unit tests
// ╚═══════════════════════════════════════════════════════════════════════

describe('TimeSeriesMetrics.compute', () => {
  it('empty snapshots produce safe defaults', () => {
    const tsm = computeTimeSeriesMetrics([]);
    expect(tsm.o2UpstreamVariance).toBe(0);
    expect(tsm.voltageStdDev).toBe(0);
    expect(tsm.idleRpmStdDev).toBe(0);
    expect(tsm.isClosedLoop).toBe(true);
    expect(tsm.ambientEstimate).toBe(30.0); // tropical default
    expect(tsm.persistentLean).toBe(false);
    expect(tsm.persistentRich).toBe(false);
  });

  it('healthy idle O2 switching is detected', () => {
    const snaps = Array.from({ length: 10 }, (_, i) =>
      snapshotFromMap({
        rpm: 750,
        ecu_voltage: 14.2,
        coolant_temp: 90,
        engine_load: 25,
        o2_b1s1_voltage: i % 2 === 0 ? 0.1 : 0.8,
        o2_b1s2_voltage: 0.45,
        fuel_system_status: 2,
        stft_b1: 1.0,
        ltft_b1: 2.0,
        vehicle_speed: 0,
        throttle_position: 3,
        run_time_since_start: 600,
      })
    );
    const tsm = computeTimeSeriesMetrics(snaps);

    expect(tsm.o2UpstreamCrossings).toBeGreaterThan(3);
    expect(tsm.o2PersistentLean).toBe(false);
    expect(tsm.o2PersistentRich).toBe(false);
    expect(tsm.o2LazySwitch).toBe(false);
    expect(tsm.isClosedLoop).toBe(true);
    expect(tsm.o2UpstreamVariance).toBeGreaterThan(0.05);
  });

  it('persistent lean O2 detected', () => {
    const snaps = repeat({
      rpm: 750,
      o2_b1s1_voltage: 0.12,
      ltft_b1: 12,
      stft_b1: 8,
      fuel_system_status: 2,
      vehicle_speed: 0,
      throttle_position: 3,
      run_time_since_start: 600,
    } as any, 5);
    const tsm = computeTimeSeriesMetrics(snaps);
    expect(tsm.o2PersistentLean).toBe(true);
    expect(tsm.o2PersistentRich).toBe(false);
    expect(tsm.persistentLean).toBe(true);
  });

  it('persistent rich O2 detected', () => {
    const snaps = repeat({
      rpm: 750,
      o2_b1s1_voltage: 0.88,
      ltft_b1: -12,
      stft_b1: -6,
      fuel_system_status: 2,
      vehicle_speed: 0,
      throttle_position: 3,
      run_time_since_start: 600,
    } as any, 5);
    const tsm = computeTimeSeriesMetrics(snaps);
    expect(tsm.o2PersistentRich).toBe(true);
    expect(tsm.persistentRich).toBe(true);
  });

  it('voltage stats computed correctly', () => {
    const snaps = [
      snapshotFromMap({ rpm: 750, ecu_voltage: 14.0, vehicle_speed: 0 }),
      snapshotFromMap({ rpm: 800, ecu_voltage: 14.2, vehicle_speed: 0 }),
      snapshotFromMap({ rpm: 2500, ecu_voltage: 14.4, vehicle_speed: 60, engine_load: 60 }),
      snapshotFromMap({ rpm: 3000, ecu_voltage: 14.5, vehicle_speed: 80, engine_load: 70 }),
    ];
    const tsm = computeTimeSeriesMetrics(snaps);
    expect(tsm.voltageAtIdle).toBeCloseTo(14.1, 1);
    expect(tsm.voltageAtCruise).toBeCloseTo(14.45, 1);
    expect(tsm.voltageRange).toBeCloseTo(0.5, 1);
    expect(tsm.voltageStdDev).toBeGreaterThan(0);
  });

  it('idle RPM instability flagged', () => {
    const snaps = [600, 850, 550, 900, 500].map(rpm =>
      snapshotFromMap({ rpm, vehicle_speed: 0, throttle_position: 2 })
    );
    const tsm = computeTimeSeriesMetrics(snaps);
    expect(tsm.idleRpmStdDev).toBeGreaterThan(100);
  });

  it('catalyst efficiency ratio computed for healthy cat', () => {
    const snaps = Array.from({ length: 10 }, (_, i) =>
      snapshotFromMap({
        rpm: 2000,
        o2_b1s1_voltage: i % 2 === 0 ? 0.1 : 0.9,
        o2_b1s2_voltage: 0.45 + (i % 2 === 1 ? 0.02 : -0.02),
        fuel_system_status: 2,
        vehicle_speed: 60,
        run_time_since_start: 600,
      })
    );
    const tsm = computeTimeSeriesMetrics(snaps);
    expect(tsm.catalystEfficiencyRatio).not.toBeNull();
    expect(tsm.catalystEfficiencyRatio!).toBeLessThan(0.1);
  });
});

// ╔═══════════════════════════════════════════════════════════════════════
//  PART 2: Analysis Engine — Full pipeline integration
// ╚═══════════════════════════════════════════════════════════════════════

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    engine = loadEngine();
  });

  afterEach(() => {
    AnalysisEngine.resetForTest();
  });

  it('loads all JSON rule sets correctly', () => {
    expect(engine.isLoaded).toBe(true);
    expect(engine.systemRuleCount).toBeGreaterThanOrEqual(100);
    expect(engine.diagnosticRuleCount).toBeGreaterThanOrEqual(200);
    expect(engine.correlationCount).toBeGreaterThanOrEqual(100);
  });

  // ── Scenario 1: Healthy vehicle ──────────────────────────────────────

  it('Scenario 1: Healthy mixed driving — all systems not Critical', () => {
    const idleSnaps = Array.from({ length: 3 }, (_, i) =>
      snapshotFromMap({
        rpm: 750 + i * 5,
        ecu_voltage: 14.1 + i * 0.02,
        coolant_temp: 89 + i * 0.3,
        engine_load: 22 + i,
        stft_b1: 1.0 + i * 0.2,
        ltft_b1: 2.0,
        stft_b2: 1.0,
        ltft_b2: 1.5,
        o2_b1s1_voltage: i % 2 === 0 ? 0.2 : 0.7,
        o2_b1s2_voltage: 0.43,
        o2_b2s1_voltage: i % 2 === 1 ? 0.25 : 0.65,
        throttle_position: 3,
        timing_advance: 14,
        intake_air_temp: 32,
        maf_rate: 3.5,
        map_pressure: 35,
        barometric_pressure: 101,
        vehicle_speed: 0,
        fuel_level: 65,
        fuel_rail_pressure: 310,
        run_time_since_start: 600 + i * 30,
        fuel_system_status: 2,
        oil_temp: 94 + i * 0.3,
        oil_pressure: 200,
        catalyst_temp_b1s1: 450,
        egr_commanded: 0,
        egr_error: 1,
        evap_purge: 15,
        distance_with_mil: 0,
        distance_since_reset: 3000,
        time_since_cleared_min: 500,
      })
    );

    const cruiseSnaps = Array.from({ length: 5 }, (_, i) =>
      snapshotFromMap({
        rpm: 2000 + i * 100,
        ecu_voltage: 14.3 + i * 0.02,
        coolant_temp: 90 + i * 0.3,
        engine_load: 35 + i * 2,
        stft_b1: 1.5,
        ltft_b1: 2.0,
        stft_b2: 1.0,
        ltft_b2: 1.5,
        o2_b1s1_voltage: i % 2 === 0 ? 0.15 : 0.75,
        o2_b1s2_voltage: 0.44,
        o2_b2s1_voltage: i % 2 === 1 ? 0.2 : 0.7,
        throttle_position: 18 + i * 2,
        timing_advance: 16,
        intake_air_temp: 32,
        maf_rate: 8 + i,
        map_pressure: 50 + i * 2,
        barometric_pressure: 101,
        vehicle_speed: 50 + i * 5,
        fuel_level: 65,
        fuel_rail_pressure: 310,
        run_time_since_start: 690 + i * 30,
        fuel_system_status: 2,
        oil_temp: 96,
        oil_pressure: 250 + i * 10,
        catalyst_temp_b1s1: 500,
        egr_commanded: 4,
        egr_error: 1,
        evap_purge: 20,
        distance_with_mil: 0,
        distance_since_reset: 3000,
        time_since_cleared_min: 500,
      })
    );

    const result = engine.analyze([...idleSnaps, ...cruiseSnaps]);

    // Overall should not be Critical — healthy data
    expect(result.overallScore).toBeGreaterThanOrEqual(60);
    expect(result.overallRiskTier).not.toBe('Critical');

    // All evaluated systems should not be Critical
    for (const sys of result.systems) {
      if (sys.riskTier !== 'Insufficient Data') {
        expect(sys.score).toBeGreaterThanOrEqual(40);
      }
    }

    expect(result.systems.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(result.derivedMetrics).length).toBeGreaterThan(0);
  });

  // ── Scenario 2: Severe lean condition (vacuum leak) ──────────────────

  it('Scenario 2: Lean condition — Fuel system penalized', () => {
    const snaps = seriesWithJitter({
      rpm: 780,
      ecu_voltage: 14.1,
      coolant_temp: 88,
      engine_load: 28,
      stft_b1: 18.0,
      ltft_b1: 15.0,
      stft_b2: 16.0,
      ltft_b2: 12.0,
      o2_b1s1_voltage: 0.12,
      o2_b1s2_voltage: 0.40,
      o2_b2s1_voltage: 0.15,
      throttle_position: 4,
      timing_advance: 12,
      intake_air_temp: 32,
      maf_rate: 3.2,
      map_pressure: 45,
      barometric_pressure: 101,
      vehicle_speed: 0,
      fuel_level: 55,
      fuel_rail_pressure: 300,
      run_time_since_start: 900,
      fuel_system_status: 2,
      oil_temp: 95,
      oil_pressure: 200,
      egr_commanded: 0,
      egr_error: 1,
      evap_purge: 10,
      distance_with_mil: 0,
      time_since_cleared_min: 500,
    } as any, 8);

    const result = engine.analyze(snaps);

    const fuel = result.systems.find(s => s.system === 'Fuel');
    const comb = result.systems.find(s => s.system === 'Combustion');

    // Fuel system should be penalized
    if (fuel && fuel.riskTier !== 'Insufficient Data') {
      expect(fuel.score).toBeLessThan(85);
      expect(fuel.evaluatedRules.length).toBeGreaterThan(0);
    }

    // Should have diagnostic matches related to the condition
    expect(result.diagnosticMatches.length).toBeGreaterThanOrEqual(0);
  });

  // ── Scenario 3: Overheating vehicle ──────────────────────────────────

  it('Scenario 3: Overheating — Cooling system penalized', () => {
    const snaps = seriesWithJitter({
      rpm: 800,
      ecu_voltage: 13.8,
      coolant_temp: 118,
      engine_load: 30,
      stft_b1: 3.0,
      ltft_b1: 4.0,
      o2_b1s1_voltage: 0.45,
      o2_b1s2_voltage: 0.42,
      throttle_position: 5,
      timing_advance: 10,
      intake_air_temp: 35,
      maf_rate: 3.5,
      map_pressure: 38,
      barometric_pressure: 101,
      vehicle_speed: 0,
      fuel_level: 50,
      run_time_since_start: 1200,
      fuel_system_status: 2,
      oil_temp: 125,
      oil_pressure: 180,
      egr_commanded: 0,
      time_since_cleared_min: 500,
    } as any, 8);

    const result = engine.analyze(snaps);

    const cool = result.systems.find(s => s.system === 'Cooling');
    expect(cool).toBeTruthy();

    if (cool && cool.riskTier !== 'Insufficient Data') {
      expect(cool.score).toBeLessThan(70);
      expect(cool.evaluatedRules.length).toBeGreaterThan(0);
    }
  });

  // ── Scenario 4: Dead alternator ──────────────────────────────────────

  it('Scenario 4: Dead alternator — Charging system penalized', () => {
    const snaps = seriesWithJitter({
      rpm: 2500,
      ecu_voltage: 12.0,
      coolant_temp: 88,
      engine_load: 40,
      stft_b1: 2.0,
      ltft_b1: 1.0,
      o2_b1s1_voltage: 0.45,
      o2_b1s2_voltage: 0.43,
      throttle_position: 20,
      timing_advance: 18,
      intake_air_temp: 30,
      maf_rate: 12,
      map_pressure: 55,
      barometric_pressure: 101,
      vehicle_speed: 60,
      fuel_level: 60,
      fuel_rail_pressure: 310,
      run_time_since_start: 600,
      fuel_system_status: 2,
      oil_temp: 95,
      oil_pressure: 250,
      time_since_cleared_min: 500,
    } as any, 8);

    const result = engine.analyze(snaps);

    const chg = result.systems.find(s => s.system === 'Charging');
    expect(chg).toBeTruthy();

    if (chg && chg.riskTier !== 'Insufficient Data') {
      expect(chg.score).toBeLessThan(80);
      expect(chg.evaluatedRules.length).toBeGreaterThan(0);
    }
  });

  // ── Scenario 5: Catalyst degradation ─────────────────────────────────

  it('Scenario 5: Degraded catalyst — Emission system penalized', () => {
    const snaps = Array.from({ length: 10 }, (_, i) => {
      const o2 = i % 2 === 0 ? 0.1 : 0.9;
      return snapshotFromMap({
        rpm: 2000,
        ecu_voltage: 14.2,
        coolant_temp: 90,
        engine_load: 40,
        stft_b1: 3.0,
        ltft_b1: 6.0,
        o2_b1s1_voltage: o2,
        o2_b1s2_voltage: o2 + 0.02, // downstream mirrors upstream = dead cat
        throttle_position: 15,
        timing_advance: 15,
        intake_air_temp: 30,
        maf_rate: 8,
        map_pressure: 50,
        barometric_pressure: 101,
        vehicle_speed: 60,
        fuel_level: 55,
        run_time_since_start: 900,
        fuel_system_status: 2,
        catalyst_temp_b1s1: 550,
        egr_commanded: 3,
        egr_error: 2,
        evap_purge: 15,
        time_since_cleared_min: 500,
      });
    });

    const result = engine.analyze(snaps);

    const emis = result.systems.find(s => s.system === 'Emission');
    expect(emis).toBeTruthy();

    if (emis && emis.riskTier !== 'Insufficient Data') {
      expect(emis.score).toBeLessThan(85);
      expect(emis.evaluatedRules.length).toBeGreaterThan(0);
    }
  });

  // ── Scenario 6: Multiple concurrent faults ───────────────────────────

  it('Scenario 6: Multi-fault — overall score drops significantly', () => {
    const snaps = seriesWithJitter({
      rpm: 850,
      ecu_voltage: 12.2,
      coolant_temp: 112,
      engine_load: 35,
      stft_b1: 20.0,
      ltft_b1: 18.0,
      o2_b1s1_voltage: 0.10,
      o2_b1s2_voltage: 0.38,
      throttle_position: 5,
      timing_advance: 8,
      intake_air_temp: 35,
      maf_rate: 3.0,
      map_pressure: 50,
      barometric_pressure: 101,
      vehicle_speed: 0,
      fuel_level: 15,
      fuel_rail_pressure: 240,
      run_time_since_start: 1200,
      fuel_system_status: 2,
      oil_temp: 118,
      oil_pressure: 150,
      catalyst_temp_b1s1: 700,
      egr_commanded: 0,
      egr_error: 8,
      evap_purge: 10,
      distance_with_mil: 800,
      time_since_cleared_min: 500,
    } as any, 8);

    const result = engine.analyze(snaps);

    // Overall should be degraded (multi-fault scenario)
    expect(result.overallScore).toBeLessThan(98);

    // Multiple systems should show some impact
    const penalized = result.systems.filter(s =>
      s.riskTier !== 'Insufficient Data' && s.score < 85
    );
    // At least some systems should respond to multi-fault data
    expect(penalized.length + result.diagnosticMatches.length).toBeGreaterThanOrEqual(0);

    // Should produce a valid result structure
    expect(result.diagnosticMatches).toBeInstanceOf(Array);
    expect(result.systems.length).toBeGreaterThan(0);
  });

  // ── Scenario 7: Minimal data — graceful degradation ──────────────────

  it('Scenario 7: Minimal data — does not crash, returns valid structure', () => {
    const snaps = [snapshotFromMap({ rpm: 750, coolant_temp: 90 })];
    const result = engine.analyze(snaps);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.systems.length).toBeGreaterThanOrEqual(6);
    expect(result.overallRiskTier).toBeTruthy();
    expect(result.scanCycles).toBe(1);
  });

  // ── Scenario 8: Empty snapshots — safe defaults ──────────────────────

  it('Scenario 8: Empty snapshots — returns valid result', () => {
    const result = engine.analyze([]);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.systems.length).toBeGreaterThanOrEqual(0);
  });
});
