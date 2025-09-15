import { NextResponse } from 'next/server';
import { fixedWindow } from '@/lib/limiters';
import { makeId } from '@/utils/id';
import { pushLog } from '@/lib/logs';

const USE_REDIS = process.env.USE_REDIS === 'true';
let redisAdapter: any | undefined;
if (USE_REDIS) {
  try {
    // lazy require so dev works when ioredis isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    redisAdapter = require('@/lib/redisAdapter');
  } catch (e) {
    console.error('Failed to load redisAdapter for fixed-window route:', e);
    redisAdapter = undefined;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestId = body.requestId || makeId('req_');

  if (USE_REDIS && redisAdapter) {
    // Use a demo key (use clientId for per-client limits)
    const key = 'ratelimit:fixed_demo';
    // Choose demo params or accept from body
    const limit = typeof body.limit === 'number' ? body.limit : 10;
    const windowMs = typeof body.windowMs === 'number' ? body.windowMs : 1000;

    try {
      const r = await redisAdapter.redisFixedWindowAllow(key, limit, windowMs);
      const res = {
        requestId,
        status: r.allowed ? 'allowed' : 'rejected',
        timestamp: new Date().toISOString(),
        count: r.count,
      } as const;
      pushLog(res);
      return NextResponse.json(res);
    } catch (err) {
      console.error('Fixed-window redis error', err);
      // fallback to in-memory
    }
  }

  // In-memory fallback
  const res = fixedWindow.tryRemove(requestId);
  pushLog(res);
  return NextResponse.json(res);
}

export async function GET() {
  // return limiter state for debugging
  return NextResponse.json(fixedWindow.getState());
}
