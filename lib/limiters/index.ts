import { FixedWindowLimiter } from './fixedWindow';
import { SlidingWindowLimiter } from './slidingWindow';
import { TokenBucketLimiter } from './tokenBucket';
import { LeakyBucketLimiter } from './leakyBucket';
import { LimiterConfig } from '../types';
import '../socketServer';

export const fixedWindow = new FixedWindowLimiter(10, 1000);
export const slidingWindow = new SlidingWindowLimiter(10, 1000);
export const tokenBucket = new TokenBucketLimiter(10, 5);
export const leakyBucket = new LeakyBucketLimiter(50, 5, 100);

export function updateLimiterConfig(algo: string, cfg: Partial<LimiterConfig>) {
  switch (algo) {
    case 'fixed-window':
      fixedWindow.updateConfig(cfg.limit, cfg.windowMs);
      break;
    case 'sliding-window':
      slidingWindow.updateConfig(cfg.limit, cfg.windowMs);
      break;
    case 'token-bucket':
      tokenBucket.updateConfig(cfg.capacity, cfg.refillPerSecond);
      break;
    case 'leaky-bucket':
      // note: queue size may require the RequestQueue.setMaxSize helper (implemented below)
      leakyBucket.updateConfig(cfg.capacity, cfg.leakPerSecond, cfg.maxQueueSize);
      break;
    default:
      break;
  }
}

export function getAllStates() {
  return {
    fixed: fixedWindow.getState(),
    sliding: slidingWindow.getState(),
    token: tokenBucket.getState(),
    leaky: leakyBucket.getState(),
  };
}
