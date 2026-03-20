// ─── DTC Lookup Service ──────────────────────────────────────────────
// Loads and queries the 4565-code DTC database from /data/dtc.json.
// Direct port of dtc_lookup_service.dart.

export interface DtcLookupResult {
  code: string;
  found: boolean;
  category: string;
  system: string;
  severity: string;
  description: string;
  userExplanation: string;
  workshopDiagnosis: string;
  commonCauses: string[];
  relatedCodes: string[];
  repairDifficulty: string;
  laborHours: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
}

export function estimatedCostRange(r: DtcLookupResult): string {
  if (r.estimatedCostMin <= 0 && r.estimatedCostMax <= 0) return 'Unknown';
  return `RM ${Math.round(r.estimatedCostMin)} - RM ${Math.round(r.estimatedCostMax)}`;
}

function categoryFromPrefix(code: string): string {
  if (!code) return 'unknown';
  switch (code[0].toUpperCase()) {
    case 'P': return 'powertrain';
    case 'B': return 'body';
    case 'C': return 'chassis';
    case 'U': return 'network';
    default: return 'unknown';
  }
}

export class DtcLookupService {
  private static _instance: DtcLookupService | null = null;
  private codes: Map<string, Record<string, any>> = new Map();
  private _loaded = false;

  private constructor() {}

  static get instance(): DtcLookupService {
    if (!DtcLookupService._instance) {
      DtcLookupService._instance = new DtcLookupService();
    }
    return DtcLookupService._instance;
  }

  get isLoaded(): boolean { return this._loaded; }
  get codeCount(): number { return this.codes.size; }

  /** Load the DTC database from /data/dtc.json. Safe to call multiple times. */
  async load(): Promise<void> {
    if (this._loaded) return;
    const resp = await fetch('/data/dtc.json');
    const data = await resp.json();
    const codeList = data.codes as any[];
    this.codes = new Map();
    for (const c of codeList) {
      this.codes.set(c.code as string, c);
    }
    this._loaded = true;
  }

  /** Look up a single DTC code. Returns null if not found. */
  lookup(code: string): Record<string, any> | null {
    return this.codes.get(code.toUpperCase()) ?? null;
  }

  /** Look up multiple codes at once. */
  lookupMany(codes: string[]): DtcLookupResult[] {
    return codes.map(code => {
      const entry = this.codes.get(code.toUpperCase());
      if (!entry) {
        return {
          code,
          found: false,
          category: categoryFromPrefix(code),
          system: 'Unknown',
          severity: 'warning',
          description: 'Unknown fault code',
          userExplanation: 'This code is not in our database yet.',
          workshopDiagnosis: '',
          commonCauses: [],
          relatedCodes: [],
          repairDifficulty: 'unknown',
          laborHours: 0,
          estimatedCostMin: 0,
          estimatedCostMax: 0,
        };
      }
      const cost = entry.estimated_cost as Record<string, any> | undefined;
      return {
        code,
        found: true,
        category: (entry.category as string) ?? categoryFromPrefix(code),
        system: (entry.system as string) ?? 'Unknown',
        severity: (entry.severity as string) ?? 'warning',
        description: (entry.official_description as string) ?? '',
        userExplanation: (entry.user_explanation as string) ?? '',
        workshopDiagnosis: (entry.workshop_diagnosis as string) ?? '',
        commonCauses: [...(entry.common_causes ?? [])],
        relatedCodes: [...(entry.related_codes ?? [])],
        repairDifficulty: (entry.repair_difficulty as string) ?? 'unknown',
        laborHours: (entry.labor_hours as number) ?? 0,
        estimatedCostMin: (cost?.min as number) ?? 0,
        estimatedCostMax: (cost?.max as number) ?? 0,
      };
    });
  }

  /** Search codes by keyword in description. */
  search(query: string, limit = 20): string[] {
    const q = query.toLowerCase();
    const results: string[] = [];
    for (const [key, entry] of this.codes) {
      const desc = ((entry.official_description as string) ?? '').toLowerCase();
      const userExp = ((entry.user_explanation as string) ?? '').toLowerCase();
      if (key.toLowerCase().includes(q) || desc.includes(q) || userExp.includes(q)) {
        results.push(key);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /** Reset singleton for test isolation. */
  static resetForTest(): void {
    DtcLookupService._instance = null;
  }
}
