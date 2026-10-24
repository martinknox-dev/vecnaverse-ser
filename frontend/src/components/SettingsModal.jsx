import React, { useState } from 'react';
import { X, Key, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  provider,
  setProvider,
  apiKey,
  setApiKey,
}) {
  if (!isOpen) return null;

  const [tempProvider, setTempProvider] = useState(provider || 'offline');
  const [tempApiKey, setTempApiKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setProvider(tempProvider);
    setApiKey(tempApiKey);
    localStorage.setItem('vecna_provider', tempProvider);
    localStorage.setItem('vecna_api_key', tempApiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cyber-panel border border-cyber-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">BYOK & Engine Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          <div className="bg-cyan-950/30 border border-cyan-800/40 p-3.5 rounded-lg flex items-start gap-3">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-cyan-300 font-semibold block mb-0.5">
                Zero-Cost BYOK Architecture:
              </strong>
              No developer keys are hardcoded. Provide your own free API key for Groq, OpenRouter, or SiliconFlow.
              Leaving it in <span className="text-emerald-400 font-medium">Offline Local</span> mode uses the 100%
              built-in DSP acoustic biomarker and cybercrime rule engine with zero API calls.
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
              Inference Engine Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'offline', name: 'Offline Local', desc: '100% offline rule engine' },
                { id: 'groq', name: 'Groq (Free)', desc: 'Llama 3.3 70B & Whisper' },
                { id: 'openrouter', name: 'OpenRouter (Free)', desc: 'Free Llama/Gemini tier' },
                { id: 'siliconflow', name: 'SiliconFlow (Free)', desc: 'Qwen 2.5 7B Instruct' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTempProvider(p.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    tempProvider === p.id
                      ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-cyber-dark/60 border-cyber-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-100">{p.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input (if not offline) */}
          {tempProvider !== 'offline' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {tempProvider.toUpperCase()} Free API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder={`Paste your ${tempProvider} API key...`}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Key is saved only in your browser localStorage.</span>
              </p>
            </div>
          )}

          {/* Responsible AI Notice */}
          <div className="text-[11px] text-slate-400 border-t border-cyber-border/70 pt-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All acoustic SER telemetry remains strictly client-managed and on-premise.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-cyber-dark border-t border-cyber-border flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-black rounded-lg transition-colors shadow-lg shadow-cyan-600/30"
          >
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
