'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type LogEntry = {
  requestId: string;
  status: string;
  timestamp: string;
  count?: number | null;
  reason?: string | null;
};

type Props = {
  initial?: LogEntry[];
  pollLogs?: boolean;
  maxEntries?: number;
  socketUrl?: string;
};

const STATUS_COLOR: Record<string, string> = {
  allowed: 'bg-green-500',
  queued: 'bg-yellow-500',
  rejected: 'bg-red-500',
  ignored: 'bg-gray-500',
  error: 'bg-red-500',
};

export default function ConsoleLog({
  initial = [],
  pollLogs = true,
  maxEntries = 2000,
  socketUrl,
}: Props) {
  const [entries, setEntries] = useState<LogEntry[]>(initial);
  const seen = useRef<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    initial.forEach((e) => seen.current.add(e.requestId));
  }, [initial]);

  useEffect(() => {
    const url = socketUrl ?? `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT ?? 4001}`;
    const socket = io(url, { transports: ['websocket'], reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on('request:event', (entry: any) => {
      if (!entry || !entry.requestId || seen.current.has(entry.requestId)) return;
      seen.current.add(entry.requestId);
      const e: LogEntry = {
        requestId: entry.requestId,
        status: entry.status ?? 'unknown',
        timestamp: entry.timestamp ?? new Date().toISOString(),
        count: entry.count ?? null,
        reason: entry.reason ?? null,
      };
      setEntries((prev) => [...prev, e].slice(-maxEntries));
    });

    return () => {
      socket.off('request:event');
      socket.disconnect();
    };
  }, [socketUrl, maxEntries]);

  useEffect(() => {
    if (!pollLogs) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (Array.isArray(data)) {
          const toAdd = data.filter(d => d?.requestId && !seen.current.has(d.requestId));
          if (toAdd.length > 0) {
            toAdd.forEach(d => seen.current.add(d.requestId));
            setEntries((prev) => [...prev, ...toAdd].slice(-maxEntries));
          }
        }
      } catch (e) {
        // ignore
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 1000);
    return () => clearInterval(intervalId);
  }, [pollLogs, maxEntries]);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  useEffect(() => {
    (window as any).__appendLog = (entry: LogEntry) => {
      if (seen.current.has(entry.requestId)) return;
      seen.current.add(entry.requestId);
      setEntries((prev) => [...prev, entry].slice(-maxEntries));
    };
    return () => {
      delete (window as any).__appendLog;
    };
  }, [maxEntries]);

  return (
    <div ref={ref} className="h-165 overflow-auto bg-gray-800 text-gray-300 p-3 rounded-lg font-mono text-xs">
      {entries.map((e) => {
        const bgColor = STATUS_COLOR[e.status] ?? 'bg-gray-600';
        return (
          <div key={e.requestId} className="p-2 border-b border-gray-700 flex justify-between items-center gap-3">
            <div className="text-gray-500 min-w-[180px]">{e.timestamp}</div>
            <div className="flex-1">{`id=${e.requestId} | ${e.status}${e.reason ? ` | ${e.reason}` : ''}`}</div>
            <div className={`min-w-[70px] text-right p-1 rounded ${bgColor} text-white font-semibold`}>
              {e.count ?? '-'}
            </div>
          </div>
        );
      })}
    </div>
  );
}