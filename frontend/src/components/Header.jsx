import React from 'react';
import { Shield, Settings, Activity, Zap, CheckCircle2 } from 'lucide-react';

export default function Header({
  isMockMode,
  setIsMockMode,
  onOpenSettings,
  provider,
  backendConnected
}) {
  return (
    <header className="bg-cyber-panel border-b border-cyber-border px-4 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                VECNA<span className="text-cyan-400 font-extrabold">-Pulse</span>
              </h1>
              <span className="text-[10px] font-mono tracking-widest uppercase bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 px-1.5 py-0.5 rounded">
                SER v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-Time Speech Emotion Analysis & Cybercrime Triage Console
            </p>
          </div>
        </div>

        {/* Responsible AI Disclaimer Badge */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs text-amber-300 max-w-md">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate font-medium">
            Indicative Triage Signals Only — Not Proof of Guilt or Honesty
          </span>
        </div>

        {/* Controls: Mock Mode & Settings */}
        <div className="flex items-center gap-3">
          {/* Backend Status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-cyber-dark/80 px-2.5 py-1.5 rounded-md border border-cyber-border">
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-mono text-[11px]">
              {backendConnected ? 'API ONLINE' : 'STANDBY'}
            </span>
          </div>

          {/* Mock Mode Toggle */}
          <button
            onClick={() => setIsMockMode(!isMockMode)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-all ${
              isMockMode
                ? 'bg-purple-950/60 border-purple-600 text-purple-200'
                : 'bg-cyber-dark/80 border-cyber-border text-slate-300 hover:border-slate-500'
            }`}
            title="Toggle between live backend and pre-computed forensic scenarios"
          >
            <Zap className={`w-3.5 h-3.5 ${isMockMode ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>Mock Mode {isMockMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* BYOK Settings Modal Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs font-semibold bg-cyber-card hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 hover:border-cyan-500/80 px-3 py-1.5 rounded-md transition-all shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="capitalize">BYOK: {provider || 'Offline'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
