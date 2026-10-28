// ─── Local Analysis Backend ──────────────────────────────────────────
// Runs the engine in-process. Used by the API routes (src/server/engine.ts)
// and by tests. Holds no data itself — callers pass already-loaded instances.

import type { AnalysisBackend, DtcSummary, EngineMeta } from './analysis-backend';
import type { AnalysisEngine } from './analysis-engine';
import type { DtcLookupService } from './dtc-lookup-service';

export function createLocalBackend(engine: AnalysisEngine, lookup: DtcLookupService): AnalysisBackend {
  const meta: EngineMeta = {
    systemRuleCount: engine.systemRuleCount,
    diagnosticRuleCount: engine.diagnosticRuleCount,
    correlationCount: engine.correlationCount,
    derivedMetricCount: engine.derivedMetricCount,
  };

  return {
    meta: async () => meta,
    analyze: async snapshots => engine.analyze(snapshots),
    lookupDtcs: async codes => lookup.lookupMany(codes).map((r): DtcSummary => ({
      code: r.code,
      found: r.found,
      severity: r.found ? r.severity : 'Unknown',
      description: r.found ? r.description : 'Unknown fault code',
      userExplanation: r.found ? r.userExplanation : '',
      commonCauses: r.commonCauses,
      estimatedCostMin: r.estimatedCostMin,
      estimatedCostMax: r.estimatedCostMax,
    })),
  };
}
