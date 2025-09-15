// /lib/logs.ts
import { RequestResult } from './types';
import { emitLog } from './socketServer';

const MAX_LOGS = 2000;
const logs: RequestResult[] = [];

export function pushLog(entry: RequestResult) {
  try {
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
  } catch (e) {
    // ignore
  }
  try {
    emitLog(entry);
  } catch (e) {
    // ignore emit errors (socket server may not be up)
  }
}

export function getLogs(): RequestResult[] {
  return logs.slice();
}
