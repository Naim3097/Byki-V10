// Models — TypeScript interfaces ported from lib/models/*.dart

export { AdapterChipType, type AdapterInfo, createAdapterInfo, chipLabel } from './adapter-info';
export { type PidSnapshot, PID_SNAPSHOT_KEYS, emptySnapshot, snapshotFromMap, snapshotToMap } from './pid-snapshot';
export {
  type FullAnalysisResult, type SystemHealthReport, type EvaluatedRule,
  type ComponentRisk, type CorrelationResult, type DiagnosticMatch,
  riskTierFromScore,
} from './analysis-result';
export { DtcSource, type DtcCode, type DtcScanResult, systemFromCode, dtcTotalCount } from './dtc-result';
export { type PidDefinition, statusForValue, loadPidDefinitions } from './pid-definition';
