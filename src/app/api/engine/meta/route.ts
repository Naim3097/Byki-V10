import { NextResponse } from 'next/server';
import { getServerBackend } from '@/server/engine';

// Rule counts shown in the scan progress log. Counts only — no rule content.
export async function GET() {
  const meta = await getServerBackend().meta();
  return NextResponse.json(meta, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
