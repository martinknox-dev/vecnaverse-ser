import React, { useState } from 'react';
import {
  X,
  Cpu,
  HardDrive,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  Download,
  Trash2,
  Lock,
  Flame,
  Activity
} from 'lucide-react';
import { MODEL_TIERS, downloadModelToCache, clearModelCache, requestPersistentStorage } from '../services/hardwareEngine';

export default function HardwareWizardModal({
  isOpen,
  onClose,
  hardwareInfo,
  currentTier,
  onSelectTier,
  storageInfo,
  onRefreshStorage,
}) {
  if (!isOpen) return null;

  const [selectedTier, setSelectedTier] = useState(currentTier || hardwareInfo?.recommendedTier || 'MID_RANGE');
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isPersisted, setIsPersisted] = useState(storageInfo?.isPersisted || false);

  const handleDownload = async (tierKey) => {
    try {
      setDownloadProgress(5);
      await downloadModelToCache(tierKey, (pct) => setDownloadProgress(pct));
      setTimeout(() => {
        setDownloadProgress(null);
        if (onRefreshStorage) onRefreshStorage();
      }, 600);
    } catch (e) {
      alert('Model caching error: ' + e.message);
      setDownloadProgress(null);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear local on-device model cache?')) {
      await clearModelCache();
      if (onRefreshStorage) onRefreshStorage();
    }
  };

  const handlePersist = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (onRefreshStorage) onRefreshStorage();
  };

  const handleSaveAndApply = () => {
    onSelectTier(selectedTier);
    localStorage.setItem('vecna_model_tier', selectedTier);
    localStorage.setItem('vecna_hardware_setup_done', 'true');
    onClose();
  };

  const recommendedId = hardwareInfo?.recommendedTier || 'MID_RANGE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0e17] border border-cyan-800/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-cyber-border/80 bg-gradient-to-r from-cyan-950/40 via-cyber-panel to-[#0b0e17] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                Hardware Profiler & Adaptive Model Wizard
              </h2>
              <p className="text-[11px] text-slate-400">
                Self-optimizes VECNA-Pulse neural SER engine for your host system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Detected Hardware Grid */}
          <div className="bg-cyber-dark/80 border border-cyber-border p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-cyber-card/60 border border-cyber-border/50">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">CPU Cores</span>
              <strong className="text-white font-mono text-sm">{hardwareInfo?.cores || 4} Threads</strong>
            </div>
            <div className="p-2 rounded bg-cyber-card/60 border border-cyber-border/50">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">System RAM</span>
              <strong className="text-white font-mono text-sm">{hardwareInfo?.memory || 8} GB</strong>
            </div>
            <div className="p-2 rounded bg-cyber-card/60 border border-cyber-border/50">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">WebGPU Support</span>
              <strong className={hardwareInfo?.hasWebGPU ? 'text-emerald-400 font-mono text-xs' : 'text-slate-400 font-mono text-xs'}>
                {hardwareInfo?.hasWebGPU ? 'Available (Accelerated)' : 'WebGL Fallback'}
              </strong>
            </div>
            <div className="p-2 rounded bg-cyber-card/60 border border-cyber-border/50">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">GPU Architecture</span>
              <span className="text-cyan-300 font-mono text-[11px] truncate block" title={hardwareInfo?.gpuRenderer}>
                {hardwareInfo?.gpuRenderer || 'Host GPU'}
              </span>
            </div>
          </div>

          {/* Model Tier Selector Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Select Model Execution Tier</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                Auto-Detected: {recommendedId}
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(MODEL_TIERS).map((tier) => {
                const isSelected = selectedTier === tier.id;
                const isRec = recommendedId === tier.id;

                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? `bg-gradient-to-b from-cyan-950/60 to-cyber-panel border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50`
                        : 'bg-cyber-dark/60 border-cyber-border hover:border-slate-600 hover:bg-cyber-dark'
                    }`}
                  >
                    {isRec && (
                      <span className="absolute -top-2 right-3 text-[9px] font-extrabold uppercase bg-emerald-500 text-black px-2 py-0.5 rounded-full shadow-sm">
                        Recommended
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${tier.color}`}
                          ></span>
                          {tier.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tier.latency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {tier.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-cyber-border/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{tier.memoryReq}</span>
                      <span className="text-cyan-400">{tier.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* On-Device Storage & Model Cache Bar */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>On-Device Storage & Local Model Cache</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePersist}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    isPersisted
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-cyber-dark border-cyber-border text-slate-400 hover:text-white'
                  }`}
                  title="Prevent browser from purging cached model weights under disk pressure"
                >
                  {isPersisted ? 'Storage: Persistent' : 'Make Persistent'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Browser Quota Used: <strong className="text-white">{storageInfo?.usageMB || 0} MB</strong> / {storageInfo?.quotaMB ? `${Math.round(storageInfo.quotaMB / 1024)} GB` : 'Dynamic'}
              </span>
              <span className="font-mono text-cyan-400">{storageInfo?.percentUsed || 0}%</span>
            </div>

            {/* Storage Progress */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-cyber-border">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(2, storageInfo?.percentUsed || 1)}%` }}
              ></div>
            </div>

            {downloadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-amber-300">
                  <span>Downloading Model Weights to Device Storage...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-amber-500/40">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-150"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleDownload(selectedTier)}
                disabled={downloadProgress !== null}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 rounded shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pre-Download Model Weights</span>
              </button>

              <button
                onClick={handleClearCache}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Cache</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-cyber-dark border-t border-cyber-border flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero telemetry uploaded. 100% on-device private.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-4 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black rounded-lg shadow-lg shadow-cyan-500/20 transition-all"
            >
              Apply Tier: {selectedTier}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
