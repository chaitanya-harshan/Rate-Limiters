import { RequestResult } from '../types';

type QueuedItem = {
  id: string;
  createdAt: number;
  resolve: (res: RequestResult) => void;
  reject: (err: any) => void;
};

export class RequestQueue {
  private q: QueuedItem[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  size() {
    return this.q.length;
  }

  enqueue(item: QueuedItem) {
    if (this.q.length >= this.maxSize) return false;
    this.q.push(item);
    return true;
  }

  dequeue() {
    return this.q.shift();
  }

  peek() {
    return this.q[0];
  }

  clear() {
    this.q = [];
  }

  setMaxSize(n: number) {
    this.maxSize = n;
    // if queue currently exceeds new max, we keep items but new enqueues will be prevented
  }
}
