import React from 'react';
import { ShieldAlert, Settings, Cpu, HardDrive, Radio, Sun, Moon, ToggleLeft, ToggleRight } from 'lucide-react';
import { MODEL_TIERS } from '../services/hardwareEngine';

export default function Header({
  isMockMode,
  setIsMockMode,
  onOpenSettings,
  onOpenHardwareWizard,
  provider,
  backendConnected,
  currentTier,
  storageInfo,
  theme,
  setTheme
}) {
  const activeTier = MODEL_TIERS[currentTier] || MODEL_TIERS.MID_RANGE;

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <header className="bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur border-b border-slate-200 dark:border-[#1e293b] px-3 sm:px-6 py-2.5 sticky top-0 z-40 transition-colors select-none">
      <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Brand identity */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-[#131d2e] border border-slate-700 dark:border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                VECNA<span className="text-cyan-600 dark:text-cyan-400 font-bold">-Pulse</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Triage Station
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Emergency Call Analysis & Response Coordination
            </p>
          </div>
        </div>

        {/* Advisory legal notice */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-[#151d2c] border border-amber-500/25 px-3 py-1 rounded-full text-xs text-amber-800 dark:text-amber-300 max-w-xl">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] leading-tight font-medium">
            Triage Advisory: Automated vocal cues assist response queueing. Verification required.
          </span>
        </div>

        {/* System & Hardware controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#27354a] text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Hardware execution profile */}
          <button
            onClick={onOpenHardwareWizard}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#27354a] text-slate-700 dark:text-slate-200 hover:border-cyan-500/60 transition-colors"
            title="Configure system execution profile and local model cache"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-[11px] font-medium">{activeTier.name}</span>
          </button>

          {/* Local cache size */}
          <button
            onClick={onOpenHardwareWizard}
            className="hidden xl:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#27354a] text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-colors"
            title="Local browser storage cache"
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{storageInfo?.usageMB || 0} MB</span>
          </button>

          {/* Demo Mode Toggle */}
          <button
            onClick={() => setIsMockMode(!isMockMode)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              isMockMode
                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-600/70 text-purple-800 dark:text-purple-200'
                : 'bg-slate-100 dark:bg-[#131b26] border-slate-200 dark:border-[#27354a] text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
            title="Toggle pre-loaded demo calls on or off"
          >
            <span className="text-[11px] font-medium">Demo Mode</span>
            {isMockMode ? (
              <ToggleRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Provider / BYOK settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-[#131b26] border border-slate-200 dark:border-[#27354a] text-slate-700 dark:text-slate-200 hover:border-slate-400 transition-colors"
            title="Configure inference provider and API credentials"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize text-[11px]">
              {provider === 'offline' ? 'Local' : provider}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
