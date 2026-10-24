import React, { useState } from 'react';
import { Phone, AlertCircle, Volume2, ShieldAlert, Archive, Trash2, Zap } from 'lucide-react';

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
        return 'bg-red-950/60 text-red-300 border-red-700/60';
      case 'HIGH':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      case 'MEDIUM':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-700/60';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const getUrgencyBarColor = (score) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-slate-500';
  };

  return (
    <div className="bg-[#0f141e] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden">
      {/* Panel Top Tabs */}
      <div className="px-3 py-2.5 border-b border-[#1e293b] bg-[#0b0f17] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#131b26] p-0.5 rounded-lg border border-[#222f44] text-xs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'queue'
                ? 'bg-slate-200 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active calls ({calls.length})
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'saved'
                ? 'bg-slate-200 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Saved ({savedCases.length})
          </button>
        </div>

        {isSurgeActive && (
          <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 border border-rose-700/80 px-2 py-0.5 rounded">
            Surge active
          </span>
        )}
      </div>

      {/* Surge action bar */}
      {activeTab === 'queue' && (
        <div className="px-3 py-2 bg-[#121824] border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Prioritized by vocal urgency</span>
          <button
            onClick={onSimulateSurge}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[#182333] border border-[#2b3a52] text-slate-200 hover:border-cyan-500/70 hover:text-white transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Test surge</span>
          </button>
        </div>
      )}

      {/* Call List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#182333] p-2 space-y-1.5">
        {activeTab === 'queue' ? (
          calls.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No active calls in queue.
            </div>
          ) : (
            calls.map((call) => {
              const isSelected = call.call_id === selectedCallId;
              return (
                <div
                  key={call.call_id}
                  onClick={() => onSelectCall(call)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-[#182333] border-cyan-500/80'
                      : 'bg-[#111723] border-[#1e293b] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Phone className={`w-3 h-3 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      {call.call_id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getUrgencyBadge(
                        call.urgency_level,
                        call.urgency_score
                      )}`}
                    >
                      {call.urgency_score} • {call.urgency_level}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-2">
                    {call.caller_tag}
                  </p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-400" />
                        <span>State: <strong className="text-slate-200 capitalize font-medium">{call.dominant_emotion}</strong></span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {call.urgency_score}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getUrgencyBarColor(
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
            <div className="p-8 text-center text-xs text-slate-500 space-y-1.5">
              <Archive className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p>No saved cases.</p>
              <p className="text-[11px] text-slate-600">Save dossiers from the decision panel to review them offline.</p>
            </div>
          ) : (
            savedCases.map((sc) => (
              <div
                key={sc.call_id}
                className="p-3 rounded-lg bg-[#111723] border border-[#1e293b] hover:border-slate-600 transition-colors flex items-center justify-between gap-2"
              >
                <div
                  onClick={() => onSelectCall(sc)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-200">{sc.call_id}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getUrgencyBadge(sc.urgency_level, sc.urgency_score)}`}>
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
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#1e293b] bg-[#0b0f17] flex items-center justify-between text-[11px] text-slate-500">
        <span>Automatic queue ranking</span>
        <button
          onClick={onRefreshQueue}
          disabled={isLoading}
          className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
