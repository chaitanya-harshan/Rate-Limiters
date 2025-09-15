import { RequestResult } from '../types';

export class SlidingWindowLimiter {
  private limit: number;
  private windowMs: number;
  private timestamps: number[] = [];

  constructor(limit = 10, windowMs = 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  tryRemove(requestId: string): RequestResult {
    const now = Date.now();
    // evict old
    while (this.timestamps.length && now - this.timestamps[0] > this.windowMs) {
      this.timestamps.shift();
    }
    if (this.timestamps.length < this.limit) {
      this.timestamps.push(now);
      return { requestId, status: 'allowed', timestamp: new Date().toISOString(), count: this.timestamps.length };
    }
    return { requestId, status: 'rejected', timestamp: new Date().toISOString(), count: this.timestamps.length, reason: 'limit_exceeded' };
  }

  getState() {
    return { limit: this.limit, windowMs: this.windowMs, current: this.timestamps.length };
  }

  updateConfig(limit?: number, windowMs?: number) {
    if (limit !== undefined) this.limit = limit;
    if (windowMs !== undefined) this.windowMs = windowMs;
  }
}