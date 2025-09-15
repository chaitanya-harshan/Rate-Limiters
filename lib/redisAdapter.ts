// /lib/redisAdapter.ts
import Redis from 'ioredis';
import { pushLog } from './logs'; // reuse existing in-memory logs for UI polling
import { RequestResult } from './types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl);

// ---------- Fixed Window ----------
export async function redisFixedWindowAllow(key: string, limit: number, windowMs: number) {
  // increment key; if first increment set expiry
  const val = await redis.incr(key);
  if (val === 1) {
    await redis.pexpire(key, windowMs);
  }
  const allowed = val <= limit;
  return { allowed, count: val };
}

// ---------- Sliding Window (ZSET) ----------
export async function redisSlidingWindowAllow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const minScore = now - windowMs;
  // add current timestamp as member (use a random member to avoid collisions)
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const multi = redis.multi();
  multi.zadd(key, now, member);
  multi.zremrangebyscore(key, 0, minScore - 1);
  multi.zcard(key);
  // keep an expiry to auto-clean
  multi.pexpire(key, windowMs + 1000);
  const res = await multi.exec();
  // exec result: [[OK], [num removed], [count], [OK]]
  const count = Number(res?.[2]?.[1] ?? 0);
  const allowed = count <= limit;
  return { allowed, count };
}

// ---------- Token Bucket (atomic via Lua) ----------
const tokenBucketLua = `
-- ARGV: capacity, refill_per_ms, now_ms, requested
local capacity = tonumber(ARGV[1])
local refill_per_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', KEYS[1], 'tokens', 'last')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if tokens == nil then tokens = capacity end
if last == nil then last = now end

local delta = now - last
local add = delta * refill_per_ms
tokens = math.min(capacity, tokens + add)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'last', now)
-- keep key around for a long time so state persists for demo
redis.call('PEXPIRE', KEYS[1], 86400000)
return {allowed, tokens}
`;

export async function redisTokenBucketTryConsume(key: string, capacity: number, refillPerSecond: number, requested = 1) {
  const refillPerMs = refillPerSecond / 1000;
  const now = Date.now();
  const res = await redis.eval(tokenBucketLua, 1, key, capacity, refillPerMs, now, requested) as any[];
  // res -> [allowed (1/0), tokens]
  const allowed = Number(res[0]) === 1;
  const tokens = Number(res[1]);
  return { allowed, tokens };
}

// ---------- Leaky Bucket using Redis list ----------
/*
  - Enqueue: RPUSH queueKey value
  - Worker: periodically LPOP queueKey and push allowed log into in-memory logs via pushLog()
*/
const leakyWorkers: Map<string, NodeJS.Timeout> = new Map();

export function redisLeakyEnqueue(queueKey: string, requestId: string, maxQueueSize = 100) {
  // Check length, then RPUSH
  return redis.llen(queueKey).then(len => {
    if (len >= maxQueueSize) {
      return { ok: false, reason: 'queue_full' };
    }
    return redis.rpush(queueKey, requestId).then(() => ({ ok: true }));
  });
}

export function startRedisLeakyWorker(queueKey: string, leakPerSecond = 5) {
  if (leakyWorkers.has(queueKey)) return;
  const intervalMs = 1000 / Math.max(1, leakPerSecond);
  const t = setInterval(async () => {
    try {
      // LPOP the oldest item
      const item = await redis.lpop(queueKey);
      if (item) {
        const result: RequestResult = { requestId: item, status: 'allowed', timestamp: new Date().toISOString() };
        // push into in-memory logs so frontend polling sees it
        pushLog(result);
      }
    } catch (e) {
      // ignore errors for demo
      // optionally log: console.error('Leaky worker error', e)
    }
  }, intervalMs);
  leakyWorkers.set(queueKey, t);
}

export function stopRedisLeakyWorker(queueKey: string) {
  const t = leakyWorkers.get(queueKey);
  if (t) {
    clearInterval(t);
    leakyWorkers.delete(queueKey);
  }
}
