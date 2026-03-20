// Port of dtc_result.dart

export enum DtcSource {
  STORED = 'stored',
  PENDING = 'pending',
  PERMANENT = 'permanent',
}

export interface DtcCode {
  code: string;
  source: DtcSource;
  system: string;
  description: string;
  severity: string;
  consumerAdvice: string | null;
  possibleCauses: string[];
  estimatedCost: string | null;
  commonParts: string[];
  repairPriority: number;
}

export interface DtcScanResult {
  stored: DtcCode[];
  pending: DtcCode[];
  permanent: DtcCode[];
  scannedAt: Date;
}

export function systemFromCode(code: string): string {
  if (!code.length) return 'Unknown';
  switch (code[0]) {
    case 'P': return 'Powertrain';
    case 'C': return 'Chassis';
    case 'B': return 'Body';
    case 'U': return 'Network';
    default: return 'Unknown';
  }
}

export function dtcTotalCount(result: DtcScanResult): number {
  return result.stored.length + result.pending.length + result.permanent.length;
}
