import { NextResponse } from 'next/server';
import { updateLimiterConfig, getAllStates } from '@/lib/limiters';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { algo, config } = body as { algo?: string; config?: any };
  if (!algo || !config) {
    return NextResponse.json({ error: 'algo and config required' }, { status: 400 });
  }
  updateLimiterConfig(algo, config);
  return NextResponse.json({ ok: true, states: getAllStates() });
}

export async function GET() {
  return NextResponse.json(getAllStates());
}
