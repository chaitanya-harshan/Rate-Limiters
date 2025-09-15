import { NextResponse } from 'next/server';
import { slidingWindow } from '@/lib/limiters';
import { makeId } from '@/utils/id';
import { pushLog } from '@/lib/logs';

const USE_REDIS = process.env.USE_REDIS === 'true';
let redisAdapter: any | undefined;
if (USE_REDIS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    redisAdapter = require('@/lib/redisAdapter');
  } catch (e) {
    console.error('Failed to load redisAdapter for sliding-window route:', e);
    redisAdapter = undefined;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestId = body.requestId || makeId('req_');

  if (USE_REDIS && redisAdapter) {
    const key = 'ratelimit:sliding_demo';
    const limit = typeof body.limit === 'number' ? body.limit : 10;
    const windowMs = typeof body.windowMs === 'number' ? body.windowMs : 1000;

    try {
      const r = await redisAdapter.redisSlidingWindowAllow(key, limit, windowMs);
      const res = {
        requestId,
        status: r.allowed ? 'allowed' : 'rejected',
        timestamp: new Date().toISOString(),
        count: r.count,
      } as const;
      pushLog(res);
      return NextResponse.json(res);
    } catch (err) {
      console.error('Sliding-window redis error', err);
      // fallback
    }
  }

  // in-memory fallback
  const res = slidingWindow.tryRemove(requestId);
  pushLog(res);
  return NextResponse.json(res);
}

export async function GET() {
  return NextResponse.json(slidingWindow.getState());
}
