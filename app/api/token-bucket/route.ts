import { NextResponse } from 'next/server';
import { tokenBucket } from '@/lib/limiters';
import { makeId } from '@/utils/id';
import { pushLog } from '@/lib/logs';

const USE_REDIS = process.env.USE_REDIS === 'true';
let redisAdapter: any | undefined;
if (USE_REDIS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    redisAdapter = require('@/lib/redisAdapter');
  } catch (e) {
    console.error('Failed to load redisAdapter for token-bucket route:', e);
    redisAdapter = undefined;
  }
}

/**
 * POST body (optional):
 *  - requestId
 *  - capacity
 *  - refillPerSecond
 *  - clientId (optional, for per-client keying)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestId = body.requestId || makeId('req_');

  const capacity = typeof body.capacity === 'number' ? body.capacity : 10;
  const refillPerSecond = typeof body.refillPerSecond === 'number' ? body.refillPerSecond : 5;
  const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : 'demo_client';

  if (USE_REDIS && redisAdapter) {
    try {
      const key = `ratelimit:token:${clientId}`;
      const r = await redisAdapter.redisTokenBucketTryConsume(key, capacity, refillPerSecond, 1);
      const res = {
        requestId,
        status: r.allowed ? 'allowed' : 'rejected',
        timestamp: new Date().toISOString(),
        count: Math.floor(r.tokens),
        reason: r.allowed ? undefined : 'no_tokens',
      } as const;
      pushLog(res);
      return NextResponse.json(res);
    } catch (err) {
      console.error('Token-bucket redis error', err);
      // fallback to in-memory
    }
  }

  // in-memory fallback
  const res = tokenBucket.tryRemove(requestId);
  pushLog(res);
  return NextResponse.json(res);
}

export async function GET() {
  return NextResponse.json(tokenBucket.getState());
}
