'use client';
import React, { useEffect, useRef } from 'react';
import type { AlgoKey } from './Controls';

type EventPayload = {
  requestId: string;
  status: string;
  timestamp: string;
  count?: number;
  reason?: string;
};

type Props = {
  algo: AlgoKey;
  rps: number;
  burst: number;
  running: boolean;
  onEvent: (evt: EventPayload) => void; // called with server response
  clientId?: string; // optional client id used to namespace redis keys if you want
};

export default function Simulator({ algo, rps, burst, running, onEvent, clientId }: Props) {
  const intervalRef = useRef<number | null>(null);
  const isSendingRef = useRef(false);

  const route = (() => {
    switch (algo) {
      case 'fixed-window':
        return '/api/fixed-window';
      case 'sliding-window':
        return '/api/sliding-window';
      case 'token-bucket':
        return '/api/token-bucket';
      case 'leaky-bucket':
      default:
        return '/api/leaky-bucket';
    }
  })();

  // helper to send single request
  const sendOne = async () => {
    const requestId = Math.random().toString(36).slice(2, 9);
    const body: any = { requestId };
    if (clientId) body.clientId = clientId;
    try {
      const resp = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      onEvent({
        requestId: data.requestId ?? requestId,
        status: data.status ?? 'error',
        timestamp: data.timestamp ?? new Date().toISOString(),
        count: data.count,
        reason: data.reason,
      });
    } catch (e) {
      onEvent({
        requestId,
        status: 'error',
        timestamp: new Date().toISOString(),
        reason: String(e),
      });
    }
  };

  // send burst once when running flips from false->true
  useEffect(() => {
    if (running && !isSendingRef.current) {
      isSendingRef.current = true;
      // initial burst
      for (let i = 0; i < Math.max(0, burst); i++) {
        // fire-and-forget
        void sendOne();
      }
      // start continuous sender
      const intervalMs = Math.max(1, Math.round(1000 / Math.max(1, rps)));
      intervalRef.current = window.setInterval(() => {
        if (!running) return;
        void sendOne();
      }, intervalMs);
    }
    if (!running && isSendingRef.current) {
      // stop interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isSendingRef.current = false;
    }
    // cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, rps, burst, route, clientId]);

  return null; // no visible UI (the parent shows console)
}
