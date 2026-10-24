import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  FileText,
  RotateCcw,
  Download,
  Zap,
  Save,
  Check,
  Building
} from 'lucide-react';
import { INDICATIVE_DISCLAIMER } from '../mockData';

export default function DecisionSupport({
  activeCall,
  onProcessVoiceCopilot,
  copilotData,
  isProcessingCopilot,
  onExportReport,
  isExporting,
  onSaveCaseLocally,
  isCaseSaved
}) {
  const [completedActions, setCompletedActions] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittedTickets, setSubmittedTickets] = useState({});
  const [caseNotesLog, setCaseNotesLog] = useState([
    {
      id: 1,
      time: '12:04 PM',
      text: 'Call flagged by queue filter based on vocal urgency.',
    },
  ]);

  const insights = activeCall?.triage_insights || {
    crime_category: 'General Incident',
    recommended_actions: [
      'Verify caller location and determine if immediate financial transfers occurred.',
      'Advise caller to hold all outgoing transactions and stop sharing screen.',
      'Log incident docket on 1930 portal.',
    ],
    explainability_summary: 'Pending triage analysis.',
    indicative_disclaimer: INDICATIVE_DISCLAIMER,
  };

  const actions = (copilotData && copilotData.updated_actions) || insights.recommended_actions || [];

  const toggleAction = (idx) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleProcessCopilotSubmit = () => {
    if (!dispatchNotes.trim() || isProcessingCopilot) return;
    onProcessVoiceCopilot(dispatchNotes.trim());
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: dispatchNotes.trim(),
    };
    setCaseNotesLog((prev) => [newLog, ...prev]);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleProcessCopilotSubmit();
    }
  };

  const handleClearNote = () => {
    setDispatchNotes('');
  };

  const ticketDraft = copilotData?.ncrp_1930_ticket_draft;
  const isTicketSubmitted = ticketDraft && submittedTickets[ticketDraft.ticket_id];

  const handleSubmitTicket = (ticketId) => {
    setSubmittedTickets((prev) => ({ ...prev, [ticketId]: true }));
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `1930 freeze request #${ticketId} dispatched to banking liaison.`,
    };
    setCaseNotesLog((prev) => [newLog, ...prev]);
  };

  return (
    <div className="bg-[#0f141e] border border-[#1e293b] rounded-xl flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-2.5 border-b border-[#1e293b] bg-[#0b0f17] flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-200">
          Response & Incident Log
        </h2>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSaveCaseLocally && onSaveCaseLocally(activeCall)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors ${
              isCaseSaved
                ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                : 'bg-[#131b26] border-[#27354a] text-slate-300 hover:border-slate-500'
            }`}
            title="Save case to local browser vault"
          >
            {isCaseSaved ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-slate-400" />
                <span>Save case</span>
              </>
            )}
          </button>

          <button
            onClick={onExportReport}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-200 hover:bg-white text-slate-950 rounded transition-colors"
            title="Export forensic dossier in Markdown and JSON"
          >
            <Download className="w-3 h-3" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
        {/* Incident Type */}
        <div className="bg-[#131b26] border border-[#222f44] rounded-lg p-3 space-y-1">
          <span className="text-[10px] text-slate-400 block font-medium">
            Incident classification
          </span>
          <p className="text-sm font-semibold text-white">
            {insights.crime_category}
          </p>
          <p className="text-xs text-slate-300 pt-1 leading-relaxed">
            {insights.explainability_summary}
          </p>
        </div>

        {/* 1930 Account Freeze Request Card */}
        {ticketDraft && (
          <div className="bg-[#151c28] border border-amber-600/40 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                1930 Account Freeze Request
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300">
                {ticketDraft.priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0b0f17] p-2 rounded border border-[#222f44]">
                <span className="text-[10px] text-slate-400 block">Docket</span>
                <span className="font-mono text-slate-200">{ticketDraft.ticket_id}</span>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-[#222f44]">
                <span className="text-[10px] text-slate-400 block">Amount</span>
                <strong className="text-amber-300">{ticketDraft.amount_involved}</strong>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-[#222f44]">
                <span className="text-[10px] text-slate-400 block">Channel</span>
                <span className="text-slate-200">{ticketDraft.payment_channel}</span>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-[#222f44]">
                <span className="text-[10px] text-slate-400 block">Window</span>
                <span className="text-emerald-400">{ticketDraft.golden_hour_window_remaining || 'Active window'}</span>
              </div>
            </div>

            <button
              onClick={() => handleSubmitTicket(ticketDraft.ticket_id)}
              disabled={isTicketSubmitted}
              className={`w-full py-1.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                isTicketSubmitted
                  ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isTicketSubmitted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Freeze request logged with 1930</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Dispatch 1930 freeze request</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Checklist */}
        <div className="bg-[#131b26] border border-[#222f44] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              Response checklist
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {Object.values(completedActions).filter(Boolean).length} / {actions.length} completed
            </span>
          </div>

          <div className="space-y-1.5">
            {actions.map((act, idx) => {
              const isChecked = !!completedActions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(idx)}
                  className={`p-2 rounded-md border text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                    isChecked
                      ? 'bg-[#0d121b] border-emerald-800/40 text-slate-400 line-through'
                      : 'bg-[#182333] border-[#28384f] text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-slate-600 text-cyan-500 cursor-pointer"
                  />
                  <span className="leading-snug">{act}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch Notes */}
        <div className="bg-[#131b26] border border-[#222f44] rounded-lg p-3 space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">
            Dispatch notes
          </span>

          <textarea
            rows={3}
            value={dispatchNotes}
            onChange={(e) => setDispatchNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or dictate notes (e.g. 'Caller confirms transfer of 45,000 sent via PhonePe, initiate 1930 freeze')..."
            className="w-full bg-[#0b0f17] border border-[#222f44] rounded-md p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleClearNote}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded border border-[#222f44] transition-colors"
            >
              Clear
            </button>

            <button
              onClick={handleProcessCopilotSubmit}
              disabled={!dispatchNotes.trim() || isProcessingCopilot}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                dispatchNotes.trim() && !isProcessingCopilot
                  ? 'bg-slate-200 hover:bg-white text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{isProcessingCopilot ? 'Processing...' : 'Apply note'}</span>
            </button>
          </div>

          {/* Audit Log */}
          {caseNotesLog.length > 0 && (
            <div className="pt-2 border-t border-[#222f44] space-y-1">
              <span className="text-[10px] text-slate-500 block">Incident history</span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {caseNotesLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-1.5 rounded bg-[#0b0f17] border border-[#222f44] text-[11px] text-slate-300"
                  >
                    <span className="text-[10px] text-slate-500 block">{log.time}</span>
                    <p>{log.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
