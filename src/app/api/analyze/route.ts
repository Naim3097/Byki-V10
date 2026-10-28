import { NextResponse } from 'next/server';
import { getServerBackend } from '@/server/engine';
import { badRequest, readJson, rejectBots } from '@/server/guard';
import { MAX_SNAPSHOTS } from '@/core/analysis-backend';
import { PID_SNAPSHOT_KEYS, snapshotFromMap, type PidSnapshot } from '@/models/pid-snapshot';

const KNOWN_KEYS = new Set<string>(PID_SNAPSHOT_KEYS);

/** Rebuild a snapshot from untrusted input, keeping only known finite numeric fields. */
function sanitizeSnapshot(raw: unknown): PidSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const values: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (KNOWN_KEYS.has(key) && typeof val === 'number' && Number.isFinite(val)) values[key] = val;
  }
  return snapshotFromMap(values);
}

export async function POST(request: Request) {
  const denied = await rejectBots();
  if (denied) return denied;

  const body = await readJson(request);
  const raw = body?.snapshots;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SNAPSHOTS) {
    return badRequest(`snapshots must be an array of 1-${MAX_SNAPSHOTS} items`);
  }

  const snapshots: PidSnapshot[] = [];
  for (const item of raw) {
    const snap = sanitizeSnapshot(item);
    if (!snap) return badRequest('each snapshot must be an object');
    snapshots.push(snap);
  }

  const result = await getServerBackend().analyze(snapshots);
  return NextResponse.json(result);
}
