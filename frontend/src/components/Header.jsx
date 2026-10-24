import React from 'react';
import { ShieldAlert, Settings, Cpu, HardDrive, ToggleLeft, ToggleRight, Radio } from 'lucide-react';
import { MODEL_TIERS } from '../services/hardwareEngine';

export default function Header({
  isMockMode,
  setIsMockMode,
  onOpenSettings,
  onOpenHardwareWizard,
  provider,
  backendConnected,
  currentTier,
  storageInfo
}) {
  const activeTier = MODEL_TIERS[currentTier] || MODEL_TIERS.MID_RANGE;

  return (
    <header className="bg-[#0b0f17] border-b border-[#1e293b] px-4 sm:px-6 py-2.5 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-100">
                VECNA<span className="text-cyan-400 font-extrabold">-Pulse</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Triage Station
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Emergency Call Analysis & Response Coordination
            </p>
          </div>
        </div>

        {/* Advisory legal notice */}
        <div className="flex items-center gap-2 bg-[#171720] border border-amber-500/25 px-3 py-1 rounded-full text-xs text-amber-300/90 max-w-xl">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] leading-tight font-medium">
            Triage Advisory: Automated vocal cues assist response queueing. Verification required.
          </span>
        </div>

        {/* System & Hardware controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Hardware execution profile */}
          <button
            onClick={onOpenHardwareWizard}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#131b26] border border-[#27354a] text-slate-200 hover:border-cyan-500/60 hover:text-white transition-colors"
            title="Configure system execution profile and local model cache"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium">{activeTier.name}</span>
          </button>

          {/* Local cache size */}
          <button
            onClick={onOpenHardwareWizard}
            className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#131b26] border border-[#27354a] text-slate-300 hover:border-slate-500 transition-colors"
            title="Local browser storage cache"
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{storageInfo?.usageMB || 0} MB</span>
          </button>

          {/* Demo / Mock mode toggle */}
          <button
            onClick={() => setIsMockMode(!isMockMode)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              isMockMode
                ? 'bg-purple-950/40 border-purple-600/70 text-purple-200'
                : 'bg-[#131b26] border-[#27354a] text-slate-300 hover:border-slate-500'
            }`}
            title="Switch between live backend and simulated demo dataset"
          >
            <span className="text-[11px]">Demo Mode</span>
            {isMockMode ? (
              <ToggleRight className="w-4 h-4 text-purple-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Provider / BYOK settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#131b26] border border-[#27354a] text-slate-200 hover:border-slate-500 transition-colors"
            title="Configure inference provider and API credentials"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize text-[11px]">
              {provider === 'offline' ? 'Local engine' : provider}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
