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
  Building,
  ClipboardList
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
    <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1e293b] rounded-xl flex flex-col h-full min-h-0 overflow-hidden shadow-sm transition-colors">
      {/* Panel Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Response & Incident Log
        </h2>

        {/* Action Buttons */}
        {activeCall && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSaveCaseLocally && onSaveCaseLocally(activeCall)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                isCaseSaved
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-600/70 text-emerald-800 dark:text-emerald-300'
                  : 'bg-white dark:bg-[#131b26] border-slate-300 dark:border-[#27354a] text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
              title="Save case to local browser vault"
            >
              {isCaseSaved ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
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
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 rounded transition-colors shadow-sm"
              title="Export forensic dossier in Markdown and JSON"
            >
              <Download className="w-3 h-3" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
        {activeCall ? (
          <>
            {/* Incident Type */}
            <div className="bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] rounded-lg p-3 space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                Incident classification
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {insights.crime_category}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-0.5 leading-relaxed">
                {insights.explainability_summary}
              </p>
            </div>

            {/* 1930 Account Freeze Request Card */}
            {ticketDraft && (
              <div className="bg-amber-50/70 dark:bg-[#151c28] border border-amber-300 dark:border-amber-600/40 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    1930 Account Freeze Request
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-medium">
                    {ticketDraft.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white dark:bg-[#0b0f17] p-2 rounded border border-slate-200 dark:border-[#222f44]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Docket</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{ticketDraft.ticket_id}</span>
                  </div>
                  <div className="bg-white dark:bg-[#0b0f17] p-2 rounded border border-slate-200 dark:border-[#222f44]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Amount</span>
                    <strong className="text-amber-700 dark:text-amber-300">{ticketDraft.amount_involved}</strong>
                  </div>
                  <div className="bg-white dark:bg-[#0b0f17] p-2 rounded border border-slate-200 dark:border-[#222f44]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Channel</span>
                    <span className="text-slate-800 dark:text-slate-200">{ticketDraft.payment_channel}</span>
                  </div>
                  <div className="bg-white dark:bg-[#0b0f17] p-2 rounded border border-slate-200 dark:border-[#222f44]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Window</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{ticketDraft.golden_hour_window_remaining || 'Active window'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSubmitTicket(ticketDraft.ticket_id)}
                  disabled={isTicketSubmitted}
                  className={`w-full py-1.5 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    isTicketSubmitted
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 cursor-default'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
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
            <div className="bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  Response checklist
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
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
                          ? 'bg-slate-100 dark:bg-[#0d121b] border-slate-200 dark:border-emerald-800/40 text-slate-400 line-through'
                          : 'bg-white dark:bg-[#182333] border-slate-200 dark:border-[#28384f] text-slate-800 dark:text-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-cyan-600 cursor-pointer"
                      />
                      <span className="leading-snug">{act}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dispatch Notes */}
            <div className="bg-slate-50 dark:bg-[#131b26] border border-slate-200 dark:border-[#222f44] rounded-lg p-3 space-y-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 block">
                Dispatch notes
              </span>

              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or dictate notes (e.g. 'Caller confirms transfer of 45,000 sent via PhonePe, initiate 1930 freeze')..."
                className="w-full bg-white dark:bg-[#0b0f17] border border-slate-300 dark:border-[#222f44] rounded-md p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleClearNote}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded border border-slate-300 dark:border-[#222f44] transition-colors"
                >
                  Clear
                </button>

                <button
                  onClick={handleProcessCopilotSubmit}
                  disabled={!dispatchNotes.trim() || isProcessingCopilot}
                  className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                    dispatchNotes.trim() && !isProcessingCopilot
                      ? 'bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>{isProcessingCopilot ? 'Processing...' : 'Apply note'}</span>
                </button>
              </div>

              {/* Audit Log */}
              {caseNotesLog.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-[#222f44] space-y-1">
                  <span className="text-[10px] text-slate-500 block font-medium">Incident history</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {caseNotesLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-1.5 rounded bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-[#222f44] text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-[10px] text-slate-400 block font-mono">{log.time}</span>
                        <p>{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-slate-500 space-y-1.5">
            <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-1" />
            <p className="font-medium text-slate-700 dark:text-slate-300">Awaiting incident</p>
            <p className="text-[11px] text-slate-500">
              Active incident details and response playbooks will appear here once a call is selected or analyzed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
