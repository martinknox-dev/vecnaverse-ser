import React from 'react';
import { Phone, AlertCircle, Clock, Volume2, ShieldAlert, Zap, Flame, Radio } from 'lucide-react';

export default function CallQueue({
  calls,
  selectedCallId,
  onSelectCall,
  onRefreshQueue,
  onSimulateSurge,
  isLoading,
  isSurgeActive
}) {
  const getUrgencyBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
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
    <div className="bg-cyber-panel border border-cyber-border rounded-xl flex flex-col h-full overflow-hidden shadow-lg">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-cyber-border bg-cyber-dark/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Priority Call Queue
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {isSurgeActive && (
            <span className="text-[10px] font-mono text-rose-300 bg-rose-950/80 border border-rose-700/80 px-1.5 py-0.5 rounded animate-pulse">
              SURGE
            </span>
          )}
          <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
            {calls.length} ACTIVE
          </span>
        </div>
      </div>

      {/* Multi-Call Surge Trigger Banner */}
      <div className="p-2.5 bg-gradient-to-r from-red-950/40 via-amber-950/20 to-cyber-dark border-b border-cyber-border/70">
        <button
          onClick={onSimulateSurge}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-md shadow-rose-600/20 transition-all active:scale-[0.98]"
          title="Simulate 4 concurrent cybercrime emergency calls with dynamic urgency re-ranking"
        >
          <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
          <span>Simulate Multi-Call Surge</span>
        </button>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto divide-y divide-cyber-border/50 p-2 space-y-2">
        {calls.length === 0 ? (
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
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-cyber-card border-cyan-500/80 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                    : 'bg-cyber-dark/40 border-cyber-border hover:border-slate-600 hover:bg-cyber-dark/80'
                }`}
              >
                {/* Header row: Call ID & Urgency Badge */}
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

                {/* Caller Tag */}
                <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-2">
                  {call.caller_tag}
                </p>

                {/* Dominant emotion & Urgency meter */}
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

                  {/* Urgency Progress Bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
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
        )}
      </div>

      {/* Queue Footer */}
      <div className="p-3 border-t border-cyber-border bg-cyber-dark/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Auto-sorted by Urgency Score</span>
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
