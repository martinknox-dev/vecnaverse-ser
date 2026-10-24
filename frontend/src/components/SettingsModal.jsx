import React, { useState } from 'react';
import { X, Key, ShieldCheck, Cpu, ExternalLink, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0e17] border border-cyan-800/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-cyber-border flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-cyber-panel to-[#0b0e17]">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-extrabold text-white">BYOK Cloud & Engine Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          <div className="bg-cyan-950/30 border border-cyan-800/40 p-3 rounded-xl flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-cyan-300 font-semibold block mb-0.5">
                Zero-Cost BYOK Architecture:
              </strong>
              No developer keys are hardcoded. Provide your own free API key for <strong className="text-white">SiliconFlow</strong> (SenseVoiceSmall + Qwen 2.5), <strong className="text-white">Groq</strong>, or <strong className="text-white">OpenRouter</strong>. Or choose <strong className="text-emerald-400 font-medium">Offline Local</strong> to use 100% on-device DSP.
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Inference Engine Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'siliconflow', name: 'SiliconFlow (Free)', desc: 'SenseVoiceSmall + Qwen 2.5 7B', tag: 'Recommended' },
                { id: 'offline', name: 'Offline Local', desc: '100% client DSP / on-device', tag: 'Zero Network' },
                { id: 'groq', name: 'Groq (Free)', desc: 'Llama 3.3 70B & Whisper Turbo', tag: 'Ultra-Fast' },
                { id: 'openrouter', name: 'OpenRouter (Free)', desc: 'Free Llama/Gemini API tier', tag: 'Multi-LLM' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTempProvider(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    tempProvider === p.id
                      ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md shadow-cyan-500/15 ring-1 ring-cyan-400/50'
                      : 'bg-cyber-dark/60 border-cyber-border text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {p.tag && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 float-right">
                      {p.tag}
                    </span>
                  )}
                  <div className="text-xs font-bold text-slate-100">{p.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          {tempProvider !== 'offline' && (
            <div className="space-y-2 bg-cyber-card/60 p-3 rounded-xl border border-cyber-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
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
                placeholder={`Paste your free ${tempProvider} API key...`}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-400">
                Key is stored only in your browser localStorage and never sent to external servers.
              </p>
            </div>
          )}

          {/* Responsible AI Notice */}
          <div className="text-[11px] text-slate-400 border-t border-cyber-border pt-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All acoustic SER telemetry remains strictly client-managed and on-premise.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-cyber-dark border-t border-cyber-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-colors shadow-lg shadow-cyan-500/20"
          >
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
