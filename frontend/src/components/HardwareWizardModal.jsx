import React, { useState } from 'react';
import { X, Cpu, HardDrive, Download, Trash2, Check } from 'lucide-react';
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
      }, 500);
    } catch (e) {
      alert('Download error: ' + e.message);
      setDownloadProgress(null);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear local model cache?')) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0f141e] border border-[#1e293b] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1e293b] bg-[#0b0f17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              System Profile & Execution Mode
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Detected specs */}
          <div className="bg-[#131b26] border border-[#222f44] p-3 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">CPU cores</span>
              <strong className="text-slate-200">{hardwareInfo?.cores || 4} threads</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Memory</span>
              <strong className="text-slate-200">{hardwareInfo?.memory || 8} GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Acceleration</span>
              <span className="text-slate-200">{hardwareInfo?.hasWebGPU ? 'WebGPU' : 'Standard'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Adapter</span>
              <span className="text-slate-200 truncate block" title={hardwareInfo?.gpuRenderer}>
                {hardwareInfo?.gpuRenderer?.slice(0, 18) || 'Integrated'}
              </span>
            </div>
          </div>

          {/* Tier options */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              Execution profile
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(MODEL_TIERS).map((tier) => {
                const isSelected = selectedTier === tier.id;
                const isRec = recommendedId === tier.id;

                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#182333] border-cyan-500 text-white'
                        : 'bg-[#131b26] border-[#222f44] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        {tier.name}
                      </span>
                      {isRec && (
                        <span className="text-[9px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {tier.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Local cache */}
          <div className="bg-[#131b26] border border-[#222f44] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Local storage cache</span>
              <button
                onClick={handlePersist}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                {isPersisted ? 'Storage persisted' : 'Request persistent storage'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{storageInfo?.usageMB || 0} MB cached</span>
              <span className="font-mono">{storageInfo?.percentUsed || 0}% quota</span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full"
                style={{ width: `${Math.max(2, storageInfo?.percentUsed || 1)}%` }}
              ></div>
            </div>

            {downloadProgress !== null && (
              <div className="text-[10px] text-amber-300 font-mono">
                Caching model files... {downloadProgress}%
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleDownload(selectedTier)}
                disabled={downloadProgress !== null}
                className="text-xs px-2.5 py-1 rounded bg-[#182333] border border-[#2a384d] text-slate-200 hover:text-white transition-colors"
              >
                Pre-download weights
              </button>

              <button
                onClick={handleClearCache}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
              >
                Clear cache
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0b0f17] border-t border-[#1e293b] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndApply}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-white text-slate-950 rounded transition-colors"
          >
            Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
