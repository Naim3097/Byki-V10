// ─── API Guard ───────────────────────────────────────────────────────
// Shared checks for the analysis API: BotID verification and JSON parsing.

import 'server-only';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/** Returns a 403 response if the caller is a bot, otherwise null. */
export async function rejectBots(): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  return null;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
