'use client';
import React, { useState } from 'react';

export type AlgoKey = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';

type Props = {
  algo: AlgoKey;
  setAlgo: (a: AlgoKey) => void;
  rps: number;
  setRps: (n: number) => void;
  burst: number;
  setBurst: (n: number) => void;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onUpdateConfig?: (algo: AlgoKey, config: Record<string, any>) => Promise<void>;
};

export default function Controls({
  algo,
  setAlgo,
  rps,
  setRps,
  burst,
  setBurst,
  running,
  onStart,
  onStop,
  onUpdateConfig,
}: Props) {
  const [capacity, setCapacity] = useState<number | ''>(5);
  const [windowMs, setWindowMs] = useState<number | ''>(1000);
  const [refillPerSecond, setRefillPerSecond] = useState<number | ''>(5);
  const [leakPerSecond, setLeakPerSecond] = useState<number | ''>(5);
  const [maxQueueSize, setMaxQueueSize] = useState<number | ''>(10);

  const applyConfig = async () => {
    if (!onUpdateConfig) return;
    const cfg: Record<string, any> = {};
    if (capacity !== '') cfg.capacity = Number(capacity);
    if (windowMs !== '') cfg.windowMs = Number(windowMs);
    if (refillPerSecond !== '') cfg.refillPerSecond = Number(refillPerSecond);
    if (leakPerSecond !== '') cfg.leakPerSecond = Number(leakPerSecond);
    if (maxQueueSize !== '') cfg.maxQueueSize = Number(maxQueueSize);

    try {
      await onUpdateConfig(algo, cfg);
      alert('Config applied');
    } catch (e) {
      alert('Failed to apply config: ' + String(e));
    }
  };

  return (
    <div className="p-6 border border-gray-700 rounded-lg bg-gray-800 text-white font-mono">
      <div className="mb-4">
        <label className="block mb-2">Algorithm</label>
        <select
          value={algo}
          onChange={(e) => setAlgo(e.target.value as AlgoKey)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
        >
          <option value="fixed-window">Fixed Window</option>
          <option value="sliding-window">Sliding Window</option>
          <option value="token-bucket">Token Bucket</option>
          <option value="leaky-bucket">Leaky Bucket</option>
        </select>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-2">RPS</label>
          <input
            type="number"
            min={0}
            value={rps}
            onChange={(e) => setRps(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-2">Burst</label>
          <input
            type="number"
            min={0}
            value={burst}
            onChange={(e) => setBurst(Number(e.target.value))}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          />
        </div>
      </div>

      <fieldset className="border border-gray-600 rounded p-4 mb-4">
        <legend className="px-2">Algorithm Config</legend>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'capacity', value: capacity, setter: setCapacity },
            { label: 'windowMs', value: windowMs, setter: setWindowMs },
            { label: 'refill/s', value: refillPerSecond, setter: setRefillPerSecond },
            { label: 'leak/s', value: leakPerSecond, setter: setLeakPerSecond },
            { label: 'maxQueue', value: maxQueueSize, setter: setMaxQueueSize },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block mb-2 capitalize">{label}</label>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setter(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              />
            </div>
          ))}
        </div>
        <button
          onClick={applyConfig}
          disabled={!onUpdateConfig}
          className="w-full p-2 mt-4 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50"
        >
          Apply Config
        </button>
      </fieldset>

      <div className="flex gap-4">
        <button
          onClick={onStart}
          disabled={running}
          className="flex-1 p-3 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={onStop}
          disabled={!running}
          className="flex-1 p-3 bg-red-600 hover:bg-red-500 rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
