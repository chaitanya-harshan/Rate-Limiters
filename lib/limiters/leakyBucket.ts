import { RequestResult } from '../types';
import { RequestQueue } from './queue';
import { pushLog } from '../logs';

export class LeakyBucketLimiter {
  private capacity: number;
  private leakPerSecond: number;
  private queue: RequestQueue;
  private leaking: boolean = false;
  private leakIntervalMs: number;

  constructor(capacity = 20, leakPerSecond = 5, maxQueueSize = 100) {
    this.capacity = capacity;
    this.leakPerSecond = leakPerSecond;
    this.queue = new RequestQueue(maxQueueSize);
    this.leakIntervalMs = 1000 / Math.max(1, this.leakPerSecond);
    this.startLeaking();
  }

  tryEnqueue(requestId: string): RequestResult {
    const ok = this.queue.enqueue({
      id: requestId,
      createdAt: Date.now(),
      resolve: () => {},
      reject: () => {},
    } as any);

    if (!ok) {
      const rejected: RequestResult = { requestId, status: 'rejected', timestamp: new Date().toISOString(), reason: 'queue_full' };
      pushLog(rejected);
      return rejected;
    }

    const queued: RequestResult = { requestId, status: 'queued', timestamp: new Date().toISOString() };
    pushLog(queued);
    return queued;
  }

  private startLeaking() {
    if (this.leaking) return;
    this.leaking = true;
    setInterval(() => {
      const item = this.queue.dequeue();
      if (item) {
        const result: RequestResult = { requestId: item.id, status: 'allowed', timestamp: new Date().toISOString() };
        // add to server log so front-end (polling /api/logs) can observe it later
        pushLog(result);
        try {
          item.resolve(result);
        } catch (e) {
          // ignore resolution errors for demo
        }
      }
    }, this.leakIntervalMs);
  }

  getState() {
    return { capacity: this.capacity, leakPerSecond: this.leakPerSecond, queueSize: this.queue.size() };
  }

  updateConfig(capacity?: number, leakPerSecond?: number, maxQueueSize?: number) {
    if (capacity !== undefined) this.capacity = capacity;
    if (leakPerSecond !== undefined) {
      this.leakPerSecond = leakPerSecond;
      this.leakIntervalMs = 1000 / Math.max(1, this.leakPerSecond);
    }
    if (maxQueueSize !== undefined) {
      this.queue.setMaxSize(maxQueueSize);
    }
  }
}
