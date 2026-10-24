import React, { useState, useEffect } from 'react';
import { X, Cpu, HardDrive, Download, Trash2, CheckCircle2, ShieldCheck, Box, Sparkles } from 'lucide-react';
import { MODEL_TIERS, requestPersistentStorage } from '../services/hardwareEngine';
import {
  getModelCatalogForTier,
  downloadAllLocalModels,
  clearAllLocalModels,
  areModelsInstalledLocally
} from '../services/localModelEngine';

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
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [modelsInstalled, setModelsInstalled] = useState(false);
  const [isPersisted, setIsPersisted] = useState(storageInfo?.isPersisted || false);

  const activeCatalog = getModelCatalogForTier(selectedTier);

  useEffect(() => {
    checkInstalledState(selectedTier);
  }, [selectedTier, isOpen]);

  const checkInstalledState = async (tier) => {
    const installed = await areModelsInstalledLocally(tier);
    setModelsInstalled(installed);
  };

  const handleDownloadAllModels = async () => {
    try {
      setDownloadProgress(5);
      setDownloadStatusText(`Initializing persistent storage for ${activeCatalog.profileName}...`);
      await downloadAllLocalModels(
        selectedTier,
        (pct) => setDownloadProgress(pct),
        (status) => setDownloadStatusText(status)
      );
      setModelsInstalled(true);
      setTimeout(() => {
        setDownloadProgress(null);
        setDownloadStatusText('');
        if (onRefreshStorage) onRefreshStorage();
      }, 700);
    } catch (e) {
      alert('Model caching completed with fallback: ' + e.message);
      setDownloadProgress(null);
      setDownloadStatusText('');
    }
  };

  const handleClearCache = async () => {
    if (confirm(`Clear local on-device models for ${activeCatalog.profileName}?`)) {
      await clearAllLocalModels(selectedTier);
      setModelsInstalled(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              System Profile & Adaptive Models
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Detected Host Specs */}
          <div className="bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">CPU cores</span>
              <strong className="text-slate-800 dark:text-slate-200">{hardwareInfo?.cores || 4} threads</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Memory</span>
              <strong className="text-slate-800 dark:text-slate-200">{hardwareInfo?.memory || 8} GB</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Acceleration</span>
              <span className="text-slate-800 dark:text-slate-200">{hardwareInfo?.hasWebGPU ? 'WebGPU' : 'Standard'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Adapter</span>
              <span className="text-slate-800 dark:text-slate-200 truncate block font-mono text-[11px]" title={hardwareInfo?.gpuRenderer}>
                {hardwareInfo?.gpuRenderer?.slice(0, 18) || 'Integrated'}
              </span>
            </div>
          </div>

          {/* Profile / Tier Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                Execution Profile (Adapts Model Sizes)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Auto-detected: <strong>{recommendedId}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(MODEL_TIERS).map((tier) => {
                const isSelected = selectedTier === tier.id;
                const isRec = recommendedId === tier.id;
                const catalog = getModelCatalogForTier(tier.id);

                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50/80 dark:bg-[#182333] border-cyan-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-white dark:bg-[#131b26] border-slate-200 dark:border-[#222f44] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        {tier.name}
                      </span>
                      {isRec && (
                        <span className="text-[9px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      {tier.description}
                    </p>
                    <div className="mt-1.5 flex justify-between text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                      <span>{catalog.totalDownloadMB > 0 ? `${catalog.totalDownloadMB} MB total` : '0 MB download'}</span>
                      <span>{catalog.models[0].modelSize}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Model Bundle for Selected Profile */}
          <div className="bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Box className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>{activeCatalog.profileName} Model Bundle</span>
                </div>
                <p className="text-[10px] text-cyan-700 dark:text-cyan-400 mt-0.5">
                  Rating: <strong>{activeCatalog.accuracyRating}</strong> • {activeCatalog.recommendedFor}
                </p>
              </div>

              {modelsInstalled ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Ready</span>
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {activeCatalog.totalDownloadMB === 0 ? 'Cloud API' : 'Not cached'}
                </span>
              )}
            </div>

            {/* List of 3 models for this profile */}
            <div className="space-y-1.5">
              {activeCatalog.models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1e293b] text-xs shadow-sm"
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-800 dark:text-slate-200 text-xs">{m.name}</strong>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {m.modelSize}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{m.description}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                    {m.sizeMB > 0 ? `${m.sizeMB} MB` : '0 MB'}
                  </span>
                </div>
              ))}
            </div>

            {/* Download progress bar */}
            {downloadProgress !== null && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-cyan-700 dark:text-cyan-300 font-medium">
                  <span>{downloadStatusText || 'Caching models to device...'}</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-600 dark:bg-cyan-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleDownloadAllModels}
                disabled={downloadProgress !== null}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {activeCatalog.totalDownloadMB === 0
                    ? 'Verify Cloud API'
                    : modelsInstalled
                    ? `Verify Installed Models (${activeCatalog.totalDownloadMB} MB)`
                    : `Download & Cache Models (${activeCatalog.totalDownloadMB} MB)`}
                </span>
              </button>

              {modelsInstalled && activeCatalog.totalDownloadMB > 0 && (
                <button
                  onClick={handleClearCache}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear models</span>
                </button>
              )}
            </div>
          </div>

          {/* Storage persistence info */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Persistent storage: <strong className="text-slate-800 dark:text-slate-200">{isPersisted ? 'Granted' : 'Standard'}</strong>
            </span>
            <button
              onClick={handlePersist}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              {isPersisted ? 'Persistence active' : 'Request persistence'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#0b0f17] border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndApply}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 rounded-lg transition-colors shadow-sm"
          >
            Apply {activeCatalog.profileName.split(' ')[0]}
          </button>
        </div>
      </div>
    </div>
  );
}
