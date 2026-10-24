import React from 'react';
import { Shield, Settings, Activity, Cpu, HardDrive, Zap } from 'lucide-react';
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
    <header className="bg-[#07070c]/90 backdrop-blur-md border-b border-cyber-border px-3 sm:px-6 py-2.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-rose-600 shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1 font-sans">
                VECNA<span className="text-cyan-400 font-extrabold">-Pulse</span>
              </h1>
              <span className="text-[9px] font-mono tracking-widest uppercase bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 px-1.5 py-0.5 rounded shadow-sm">
                SER v3.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-Time Speech Emotion Analysis & Cybercrime Command Center
            </p>
          </div>
        </div>

        {/* Responsible AI Disclaimer Statutory Badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-transparent border border-amber-500/40 px-3 py-1 rounded-full text-xs text-amber-300 max-w-md shadow-sm">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate font-semibold tracking-wide text-[11px]">
            Indicative Triage Signal Only — Not Proof of Guilt or Honesty
          </span>
        </div>

        {/* Controls: Hardware Tier, BYOK, Mock Mode */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
          {/* Hardware Model Tier Badge (Clickable) */}
          <button
            onClick={onOpenHardwareWizard}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all shadow-sm ${
              currentTier === 'HIGH_END'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 hover:border-cyan-400'
                : currentTier === 'LOW_END'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 hover:border-emerald-400'
                : currentTier === 'CLOUD_BYOK'
                ? 'bg-purple-950/80 border-purple-500 text-purple-200 hover:border-purple-400'
                : 'bg-amber-950/80 border-amber-500 text-amber-200 hover:border-amber-400'
            }`}
            title="Configure Host Hardware Tier & On-Device AI Models"
          >
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-mono text-[11px]">{activeTier.badge}</span>
          </button>

          {/* On-Device Storage Quota Pill */}
          <div
            onClick={onOpenHardwareWizard}
            className="hidden lg:flex items-center gap-1 text-[11px] font-mono bg-cyber-dark/80 px-2 py-1 rounded-lg border border-cyber-border text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Device Cache & Local IndexedDB Storage"
          >
            <HardDrive className="w-3 h-3 text-cyan-400" />
            <span>{storageInfo?.usageMB || 0} MB Local</span>
          </div>

          {/* Mock Mode Toggle */}
          <button
            onClick={() => setIsMockMode(!isMockMode)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              isMockMode
                ? 'bg-purple-950/80 border-purple-600 text-purple-200 shadow-sm'
                : 'bg-cyber-dark/80 border-cyber-border text-slate-300 hover:border-slate-500'
            }`}
            title="Toggle between live backend and pre-computed forensic scenarios"
          >
            <Zap className={`w-3.5 h-3.5 ${isMockMode ? 'text-purple-400' : 'text-slate-400'}`} />
            <span className="text-[11px]">Mock Mode {isMockMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* BYOK Settings Modal Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs font-bold bg-cyber-card hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 hover:border-cyan-500/80 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="capitalize text-[11px]">BYOK: {provider || 'Offline'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
