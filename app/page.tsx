'use client';
import React, { useCallback, useState } from 'react';
import Controls from '../components/Controls';
import Simulator from '../components/Simulator';
import ConsoleLog from '../components/ConsoleLog';
import type { AlgoKey } from '../components/Controls';

export default function Page() {
  const [algo, setAlgo] = useState<AlgoKey>('fixed-window');
  const [rps, setRps] = useState(5);
  const [burst, setBurst] = useState(20);
  const [running, setRunning] = useState(false);

  const onEvent = useCallback((evt: any) => {
    if (window && (window as any).__appendLog) {
      (window as any).__appendLog({
        requestId: evt.requestId,
        status: evt.status,
        timestamp: evt.timestamp,
        count: evt.count ?? null,
        reason: evt.reason ?? null,
      });
    }
  }, []);

  const onStart = () => setRunning(true);
  const onStop = () => setRunning(false);

  const onUpdateConfig = async (algoKey: AlgoKey, config: Record<string, any>) => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algo: algoKey, config }),
    });
  };

  return (
    <div className="p-5 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-5">Rate Limiter Showcase</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <Controls
            algo={algo}
            setAlgo={setAlgo}
            rps={rps}
            setRps={setRps}
            burst={burst}
            setBurst={setBurst}
            running={running}
            onStart={onStart}
            onStop={onStop}
            onUpdateConfig={onUpdateConfig}
          />
        </div>
        <div className="md:col-span-2">
          <Simulator algo={algo} rps={rps} burst={burst} running={running} onEvent={onEvent} clientId="demo_client" />
          <ConsoleLog pollLogs />
        </div>
      </div>
    </div>
  );
}