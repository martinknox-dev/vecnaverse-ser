import React, { useState } from 'react';
import {
  Phone,
  AlertCircle,
  Clock,
  Volume2,
  ShieldAlert,
  Flame,
  Archive,
  Trash2,
  Layers
} from 'lucide-react';

export default function CallQueue({
  calls,
  selectedCallId,
  onSelectCall,
  onRefreshQueue,
  onSimulateSurge,
  isLoading,
  isSurgeActive,
  savedCases = [],
  onDeleteSavedCase
}) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'saved'

  const getUrgencyBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50 shadow-sm shadow-red-500/20';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  const getUrgencyBarColor = (score) => {
    if (score >= 80) return 'bg-red-500 shadow-red-500/50';
    if (score >= 60) return 'bg-amber-500 shadow-amber-500/50';
    if (score >= 40) return 'bg-yellow-500 shadow-yellow-500/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  return (
    <div className="bg-[#0b0e17] border border-cyber-border rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Panel Top Tabs: Live Queue vs Saved Cases */}
      <div className="px-3 py-2.5 border-b border-cyber-border bg-[#07070c] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-cyber-dark p-0.5 rounded-lg border border-cyber-border text-xs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'queue'
                ? 'bg-cyan-600 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Priority Queue ({calls.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'saved'
                ? 'bg-cyan-600 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Saved ({savedCases.length})</span>
          </button>
        </div>

        {isSurgeActive && (
          <span className="text-[10px] font-mono text-rose-300 bg-rose-950/90 border border-rose-700 px-2 py-0.5 rounded animate-pulse">
            SURGE ACTIVE
          </span>
        )}
      </div>

      {/* Multi-Call Surge Banner */}
      {activeTab === 'queue' && (
        <div className="p-2.5 bg-gradient-to-r from-red-950/40 via-amber-950/20 to-cyber-dark border-b border-cyber-border/70">
          <button
            onClick={onSimulateSurge}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black tracking-wide bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md shadow-rose-600/30 transition-all active:scale-[0.98]"
            title="Simulate 4 concurrent cybercrime emergency calls with dynamic urgency re-ranking"
          >
            <Flame className="w-4 h-4 fill-current animate-bounce" />
            <span>Simulate Multi-Call Surge</span>
          </button>
        </div>
      )}

      {/* Call List / Saved List */}
      <div className="flex-1 overflow-y-auto divide-y divide-cyber-border/50 p-2 space-y-2">
        {activeTab === 'queue' ? (
          calls.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No incoming calls in queue.
            </div>
          ) : (
            calls.map((call) => {
              const isSelected = call.call_id === selectedCallId;
              return (
                <div
                  key={call.call_id}
                  onClick={() => onSelectCall(call)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-cyber-card border-cyan-500 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-500/50'
                      : 'bg-cyber-dark/40 border-cyber-border hover:border-slate-600 hover:bg-cyber-dark/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      <Phone className={`w-3 h-3 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      {call.call_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border transition-all ${getUrgencyBadge(
                        call.urgency_level,
                        call.urgency_score
                      )}`}
                    >
                      {call.urgency_level} • {call.urgency_score}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-2">
                    {call.caller_tag}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        Emotion: <strong className="text-slate-200 capitalize">{call.dominant_emotion}</strong>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Score {call.urgency_score}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 shadow-sm ${getUrgencyBarColor(
                          call.urgency_score
                        )}`}
                        style={{ width: `${call.urgency_score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          savedCases.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1">
              <Archive className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p>No saved cases in local IndexedDB.</p>
              <p className="text-[10px] text-slate-600">Save dossiers from the right panel to store them locally.</p>
            </div>
          ) : (
            savedCases.map((sc) => (
              <div
                key={sc.call_id}
                className="p-3 rounded-xl bg-cyber-dark/60 border border-cyber-border hover:border-cyan-500/60 transition-all flex items-center justify-between gap-2"
              >
                <div
                  onClick={() => onSelectCall(sc)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-cyan-300">{sc.call_id}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${getUrgencyBadge(sc.urgency_level, sc.urgency_score)}`}>
                      {sc.urgency_score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">{sc.caller_tag}</p>
                </div>

                {onDeleteSavedCase && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedCase(sc.call_id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Delete local saved case"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Queue Footer */}
      <div className="p-3 border-t border-cyber-border bg-[#07070c] flex items-center justify-between text-[11px] text-slate-400">
        <span>Auto-sorted by Urgency Metric</span>
        <button
          onClick={onRefreshQueue}
          disabled={isLoading}
          className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline text-[11px]"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
