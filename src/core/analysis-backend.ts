// ─── Analysis Backend ────────────────────────────────────────────────
// The rule data and DTC database live on the server (src/server/), so the
// browser never downloads them. The scan service talks to this interface;
// production uses the HTTP implementation below, tests use an in-process one.

import type { PidSnapshot } from '../models/pid-snapshot';
import type { FullAnalysisResult } from '../models/analysis-result';

export interface EngineMeta {
  systemRuleCount: number;
  diagnosticRuleCount: number;
  correlationCount: number;
  derivedMetricCount: number;
}

/** Only the fields the app displays — the rest of the DTC entry stays server-side. */
export interface DtcSummary {
  code: string;
  found: boolean;
  severity: string;
  description: string;
  userExplanation: string;
  commonCauses: string[];
  estimatedCostMin: number;
  estimatedCostMax: number;
}

export interface AnalysisBackend {
  meta(): Promise<EngineMeta>;
  analyze(snapshots: PidSnapshot[]): Promise<FullAnalysisResult>;
  lookupDtcs(codes: string[]): Promise<DtcSummary[]>;
}

export function formatCostRange(min: number, max: number): string {
  if (min <= 0 && max <= 0) return 'Unknown';
  return `RM ${Math.round(min)} - RM ${Math.round(max)}`;
}

// Request caps, enforced by the API routes. A health scan sends ≤10 cycles.
export const MAX_SNAPSHOTS = 30;
export const MAX_DTC_CODES = 50;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const httpAnalysisBackend: AnalysisBackend = {
  meta: () => request<EngineMeta>('/api/engine/meta'),
  analyze: snapshots => post<FullAnalysisResult>('/api/analyze', { snapshots }),
  lookupDtcs: codes => post<DtcSummary[]>('/api/dtc/lookup', { codes }),
};
