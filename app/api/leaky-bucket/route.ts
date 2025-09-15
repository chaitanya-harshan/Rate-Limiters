import { NextResponse } from 'next/server';
import { leakyBucket } from '@/lib/limiters';
import { makeId } from '@/utils/id';
import { pushLog } from '@/lib/logs';
import { RequestStatus } from '@/lib/types';

const USE_REDIS = process.env.USE_REDIS === 'true';
let redisAdapter: any | undefined;
if (USE_REDIS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    redisAdapter = require('@/lib/redisAdapter');
    // Ensure worker for demo queue is started (idempotent in adapter)
    try {
      redisAdapter.startRedisLeakyWorker('leaky_demo', 5); // default leak/sec 5; you can change via body
    } catch (e) {
      // adapter may already have started or not exported; ignore
    }
  } catch (e) {
    console.error('Failed to load redisAdapter for leaky-bucket route:', e);
    redisAdapter = undefined;
  }
}

/**
 * POST body (optional):
 *  - requestId
 *  - maxQueueSize
 *  - leakPerSecond
 *  - clientId
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requestId = body.requestId || makeId('req_');

  const maxQueueSize = typeof body.maxQueueSize === 'number' ? body.maxQueueSize : 100;
  const leakPerSecond = typeof body.leakPerSecond === 'number' ? body.leakPerSecond : 5;
  const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : 'demo';

  if (USE_REDIS && redisAdapter) {
    try {
      const queueKey = `ratelimit:leaky:${clientId}`;
      // ensure worker uses provided leak rate by restarting if needed (adapter start is idempotent)
      try {
        redisAdapter.startRedisLeakyWorker(queueKey, leakPerSecond);
      } catch (e) {
        // ignore
      }
      const r = await redisAdapter.redisLeakyEnqueue(queueKey, requestId, maxQueueSize);
      if (!r.ok) {
        const rejected = { requestId, status: 'rejected' as RequestStatus, timestamp: new Date().toISOString(), reason: r.reason };
        pushLog(rejected);
        return NextResponse.json(rejected);
      }
      // queued: worker will push an 'allowed' log when processed
      const queued = { requestId, status: 'queued' as RequestStatus, timestamp: new Date().toISOString() };
      // optionally push queued as well so UI sees immediate queueing
      pushLog(queued);
      return NextResponse.json(queued);
    } catch (err) {
      console.error('Leaky-bucket redis error', err);
      // fallback to in-memory
    }
  }

  // in-memory fallback
  const res = leakyBucket.tryEnqueue(requestId);
  // leakyBucket.tryEnqueue already pushes queued/rejected logs in updated implementation
  // But ensure we push here in case it doesn't
  try {
    pushLog(res);
  } catch (e) {
    // ignore
  }
  return NextResponse.json(res);
}

export async function GET() {
  return NextResponse.json(leakyBucket.getState());
}
