// ─── Server Analysis Engine ──────────────────────────────────────────
// Loads the proprietary rule data and DTC database. These JSON files are
// bundled into the server functions only — they are never served publicly.

import 'server-only';
import analyzerRules from './data/analyzer_rules_v2.json';
import derivedMetrics from './data/derived_metrics.json';
import diagnosticRules from './data/diagnostic_rules_workshop.json';
import correlations from './data/parameter_correlations.json';
import dtcData from './data/dtc.json';
import { AnalysisEngine } from '@/core/analysis-engine';
import { DtcLookupService } from '@/core/dtc-lookup-service';
import { createLocalBackend } from '@/core/local-analysis-backend';
import type { AnalysisBackend } from '@/core/analysis-backend';

let backend: AnalysisBackend | null = null;

export function getServerBackend(): AnalysisBackend {
  if (!backend) {
    const engine = AnalysisEngine.instance;
    engine.loadFromData({ analyzerRules, derivedMetrics, diagnosticRules, correlations });
    const lookup = DtcLookupService.instance;
    lookup.loadFromData(dtcData);
    backend = createLocalBackend(engine, lookup);
  }
  return backend;
}
