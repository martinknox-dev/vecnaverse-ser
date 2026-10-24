import React, { useState } from 'react';
import { Phone, AlertCircle, Volume2, ShieldAlert, Archive, Trash2, Zap, PlusCircle } from 'lucide-react';

export default function CallQueue({
  calls = [],
  selectedCallId,
  onSelectCall,
  onRefreshQueue,
  onSimulateSurge,
  isLoading,
  isSurgeActive,
  savedCases = [],
  onDeleteSavedCase,
  isMockMode
}) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'saved'

  const getUrgencyBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800/60';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getUrgencyBarColor = (score) => {
    if (score >= 80) return 'bg-rose-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-slate-400';
  };

  return (
    <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1e293b] rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-sm transition-colors">
      {/* Panel Top Tabs */}
      <div className="px-3 py-2.5 border-b border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-[#131b26] p-0.5 rounded-lg border border-slate-300 dark:border-[#222f44] text-xs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-slate-200 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active calls ({calls.length})
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-slate-200 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Saved ({savedCases.length})
          </button>
        </div>

        {isSurgeActive && (
          <span className="text-[10px] font-mono font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-700/80 px-2 py-0.5 rounded">
            Surge active
          </span>
        )}
      </div>

      {/* Surge action bar */}
      {activeTab === 'queue' && (
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-[#121824] border-b border-slate-200 dark:border-[#1e293b] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {calls.length > 0 ? 'Prioritized by vocal urgency' : 'Queue ready'}
          </span>
          {isMockMode && (
            <button
              onClick={onSimulateSurge}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-white dark:bg-[#182333] border border-slate-300 dark:border-[#2b3a52] text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors shadow-sm"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Test surge</span>
            </button>
          )}
        </div>
      )}

      {/* Call List */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-[#182333] p-2 space-y-1.5">
        {activeTab === 'queue' ? (
          calls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <Phone className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-medium text-slate-700 dark:text-slate-300">No active calls in queue</p>
              <p className="text-[11px] max-w-[200px] text-slate-500">
                Upload a recorded audio file or start live microphone input to triage an emergency incident.
              </p>
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
                      ? 'bg-cyan-50/70 dark:bg-[#182333] border-cyan-500/80 shadow-sm'
                      : 'bg-white dark:bg-[#111723] border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Phone className={`w-3 h-3 ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                      {call.call_id}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${getUrgencyBadge(
                        call.urgency_level,
                        call.urgency_score
                      )}`}
                    >
                      {call.urgency_score} • {call.urgency_level}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1 mb-2">
                    {call.caller_tag}
                  </p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-400" />
                        <span>State: <strong className="text-slate-800 dark:text-slate-200 capitalize font-medium">{call.dominant_emotion}</strong></span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {call.urgency_score}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
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
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <Archive className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
              <p className="font-medium text-slate-700 dark:text-slate-300">No saved cases</p>
              <p className="text-[11px] text-slate-500">Save dossiers from the decision panel to review them offline.</p>
            </div>
          ) : (
            savedCases.map((sc) => (
              <div
                key={sc.call_id}
                className="p-3 rounded-lg bg-white dark:bg-[#111723] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex items-center justify-between gap-2 shadow-sm"
              >
                <div
                  onClick={() => onSelectCall(sc)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{sc.call_id}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getUrgencyBadge(sc.urgency_level, sc.urgency_score)}`}>
                      {sc.urgency_score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{sc.caller_tag}</p>
                </div>

                {onDeleteSavedCase && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedCase(sc.call_id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
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
      <div className="px-3 py-2 border-t border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-between text-[11px] text-slate-500">
        <span>Active session</span>
        <button
          onClick={onRefreshQueue}
          disabled={isLoading}
          className="text-cyan-600 dark:text-cyan-400 hover:underline transition-colors"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
