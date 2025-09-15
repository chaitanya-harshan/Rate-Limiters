export type RequestStatus = 'allowed' | 'rejected' | 'queued' | 'ignored';

export interface RequestResult {
  requestId: string;
  status: RequestStatus;
  timestamp: string; // ISO
  count?: number; // algorithm-specific counter / current count
  reason?: string;
}

export interface LimiterConfig {
  limit?: number; // requests per window or capacity
  windowMs?: number; // for fixed/sliding
  capacity?: number; // token bucket / leaky bucket capacity
  refillPerSecond?: number; // token bucket refill rate
  leakPerSecond?: number; // leaky bucket
  maxQueueSize?: number;
}