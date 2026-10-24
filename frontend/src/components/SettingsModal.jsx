import React, { useState } from 'react';
import { X, Key } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0f141e] border border-[#1e293b] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1e293b] bg-[#0b0f17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Inference Provider</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'offline', name: 'Local offline', desc: 'Runs on this machine' },
                { id: 'siliconflow', name: 'SiliconFlow', desc: 'SenseVoice + Qwen 2.5' },
                { id: 'groq', name: 'Groq', desc: 'Whisper + Llama 3.3' },
                { id: 'openrouter', name: 'OpenRouter', desc: 'Free model tier' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTempProvider(p.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    tempProvider === p.id
                      ? 'bg-[#182333] border-cyan-500 text-white'
                      : 'bg-[#131b26] border-[#222f44] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-semibold">{p.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {tempProvider !== 'offline' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {tempProvider.charAt(0).toUpperCase() + tempProvider.slice(1)} API Key
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
                placeholder="Paste API key..."
                className="w-full bg-[#0b0f17] border border-[#222f44] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">
                Key is kept in browser localStorage.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0b0f17] border-t border-[#1e293b] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-white text-slate-950 rounded transition-colors"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
