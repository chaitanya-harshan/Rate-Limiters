import { RequestResult } from '../types';

export class TokenBucketLimiter {
  private capacity: number;
  private tokens: number;
  private refillPerMs: number; // tokens per ms
  private lastRefill: number;

  constructor(capacity = 10, refillPerSecond = 5) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerMs = refillPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const delta = now - this.lastRefill;
    if (delta <= 0) return;
    const toAdd = delta * this.refillPerMs;
    this.tokens = Math.min(this.capacity, this.tokens + toAdd);
    this.lastRefill = now;
  }

  tryRemove(requestId: string): RequestResult {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { requestId, status: 'allowed', timestamp: new Date().toISOString(), count: Math.floor(this.tokens) };
    }
    return { requestId, status: 'rejected', timestamp: new Date().toISOString(), count: Math.floor(this.tokens), reason: 'no_tokens' };
  }

  getState() {
    return { capacity: this.capacity, tokens: this.tokens };
  }

  updateConfig(capacity?: number, refillPerSecond?: number) {
    if (capacity !== undefined) this.capacity = capacity;
    if (refillPerSecond !== undefined) this.refillPerMs = refillPerSecond / 1000;
  }
}