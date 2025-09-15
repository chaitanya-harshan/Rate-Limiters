import { RequestResult } from '../types';

export class FixedWindowLimiter {
  private limit: number;
  private windowMs: number;
  private count: number = 0;
  private windowStart: number = Date.now();

  constructor(limit = 10, windowMs = 1000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  tryRemove(requestId: string): RequestResult {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.windowStart = now;
      this.count = 0;
    }
    if (this.count < this.limit) {
      this.count += 1;
      return { requestId, status: 'allowed', timestamp: new Date().toISOString(), count: this.count };
    }
    return { requestId, status: 'rejected', timestamp: new Date().toISOString(), count: this.count, reason: 'limit_exceeded' };
  }

  getState() {
    return { limit: this.limit, windowMs: this.windowMs, count: this.count, windowStart: this.windowStart };
  }

  updateConfig(limit?: number, windowMs?: number) {
    if (limit !== undefined) this.limit = limit;
    if (windowMs !== undefined) this.windowMs = windowMs;
  }
}