// Port of analysis_result.dart
import type { PidSnapshot } from './pid-snapshot';

export interface FullAnalysisResult {
  overallScore: number;
  overallRiskTier: string;
  systems: SystemHealthReport[];
  snapshot: PidSnapshot;
  derivedMetrics: Record<string, number | null>;
  correlationResults: CorrelationResult[];
  diagnosticMatches: DiagnosticMatch[];
  supportedPidCount: number;
  scanCycles: number;
  scanDurationMs: number;
}

export interface SystemHealthReport {
  system: string;
  consumerName: string;
  icon: string;
  score: number;
  riskTier: string;
  dataCoverage: number;
  findings: string[];
  evaluatedRules: EvaluatedRule[];
  componentRisks: ComponentRisk[];
}

export interface EvaluatedRule {
  id: string;
  name: string;
  strength: number;
  weight: number;
  consumerMessage: string;
  possibleDtcs: string[];
}

export interface ComponentRisk {
  component: string;
  probability: number;
  contributingRules: string[];
}

export interface CorrelationResult {
  id: string;
  name: string;
  expected: number;
  actual: number;
  deviation: number;
  status: string;
  consumerMessage: string;
}

export interface DiagnosticMatch {
  ruleId: string;
  category: string;
  severity: string;
  confidence: number;
  description: string;
  recommendation: string;
  possibleDtcs: string[];
  repairPriority: number;
  commonParts: string[];
}

export function riskTierFromScore(score: number): string {
  if (score >= 85) return 'Healthy';
  if (score >= 70) return 'Monitor';
  if (score >= 50) return 'Warning';
  return 'Critical';
}
