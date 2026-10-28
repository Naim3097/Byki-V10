import { NextResponse } from 'next/server';
import { getServerBackend } from '@/server/engine';
import { badRequest, readJson, rejectBots } from '@/server/guard';
import { MAX_DTC_CODES } from '@/core/analysis-backend';

const DTC_PATTERN = /^[PBCU][0-9A-F]{4}$/;

export async function POST(request: Request) {
  const denied = await rejectBots();
  if (denied) return denied;

  const body = await readJson(request);
  const raw = body?.codes;
  if (!Array.isArray(raw) || raw.length > MAX_DTC_CODES) {
    return badRequest(`codes must be an array of at most ${MAX_DTC_CODES} items`);
  }

  const codes: string[] = [];
  for (const item of raw) {
    const code = typeof item === 'string' ? item.trim().toUpperCase() : '';
    if (!DTC_PATTERN.test(code)) return badRequest(`invalid DTC code: ${String(item).slice(0, 10)}`);
    codes.push(code);
  }

  const results = await getServerBackend().lookupDtcs(codes);
  return NextResponse.json(results);
}
