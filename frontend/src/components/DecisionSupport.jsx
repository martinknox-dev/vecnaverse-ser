import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Mic,
  RotateCcw,
  Send,
  HelpCircle,
  ShieldCheck,
  Award,
  Download,
  Flame,
  Zap,
  BookmarkPlus,
  Save,
  Check
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
      time: '12:04:15 PM',
      text: 'Initial acoustic triage alert flagged. Urgency score exceeds 80.',
    },
  ]);

  const insights = activeCall?.triage_insights || {
    crime_category: 'General Cybercrime Incident',
    recommended_actions: [
      '1. Verify caller identity and assess immediate financial or physical threat.',
      '2. Advise caller not to share credentials or transfer funds.',
      '3. Log official complaint on National Cyber Crime Reporting Portal (1930).'
    ],
    explainability_summary: 'Awaiting triage telemetry analysis.',
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
      time: new Date().toLocaleTimeString(),
      text: `[Voice Co-Pilot Command]: ${dispatchNotes.trim()}`,
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
      time: new Date().toLocaleTimeString(),
      text: `[NCRP 1930 SUBMITTED]: Golden-hour freeze request #${ticketId} dispatched to banking node.`,
    };
    setCaseNotesLog((prev) => [newLog, ...prev]);
  };

  return (
    <div className="bg-[#0b0e17] border border-cyber-border rounded-2xl flex flex-col h-full shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-2.5 border-b border-cyber-border bg-[#07070c] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Investigator Decision Support
          </h2>
        </div>

        {/* Action Buttons: Save Local & Export Case Report */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSaveCaseLocally && onSaveCaseLocally(activeCall)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded shadow-sm border transition-all ${
              isCaseSaved
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-cyber-dark border-cyber-border text-slate-300 hover:border-slate-500'
            }`}
            title="Save dossier permanently in on-device IndexedDB storage"
          >
            {isCaseSaved ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved Local</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-cyan-400" />
                <span>Save Case</span>
              </>
            )}
          </button>

          <button
            onClick={onExportReport}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black rounded shadow-sm shadow-cyan-600/20 transition-all"
            title="Export complete Forensic Triage Dossier in Markdown and JSON formats"
          >
            <Download className="w-3 h-3" />
            <span>{isExporting ? 'Exporting...' : 'Export Dossier'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
        {/* Crime Category Card */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Classified Cybercrime Vector
          </span>
          <div className="text-sm font-black text-white flex items-center gap-2 font-sans">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            {insights.crime_category}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1 bg-cyber-dark/60 p-2.5 rounded-lg border border-cyber-border/70">
            <strong className="text-cyan-400 font-semibold">Explainability: </strong>
            {insights.explainability_summary}
          </p>
        </div>

        {/* 1930 NCRP Freeze Ticket Draft */}
        {ticketDraft && (
          <div className="bg-gradient-to-br from-rose-950/40 via-cyber-card to-cyber-panel border border-rose-600/50 rounded-xl p-3.5 space-y-2.5 shadow-md shadow-rose-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-200">
                  1930 NCRP Freeze Ticket Draft
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded">
                {ticketDraft.priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-cyber-dark/80 p-2 rounded-lg border border-cyber-border/70">
                <span className="text-[10px] text-slate-400 block font-mono">Ticket Docket</span>
                <strong className="font-mono text-cyan-300">{ticketDraft.ticket_id}</strong>
              </div>
              <div className="bg-cyber-dark/80 p-2 rounded-lg border border-cyber-border/70">
                <span className="text-[10px] text-slate-400 block font-mono">Amount Involved</span>
                <strong className="font-mono text-amber-300 text-sm">{ticketDraft.amount_involved}</strong>
              </div>
              <div className="bg-cyber-dark/80 p-2 rounded-lg border border-cyber-border/70">
                <span className="text-[10px] text-slate-400 block font-mono">Payment Channel</span>
                <span className="text-slate-200 font-medium">{ticketDraft.payment_channel}</span>
              </div>
              <div className="bg-cyber-dark/80 p-2 rounded-lg border border-cyber-border/70">
                <span className="text-[10px] text-slate-400 block font-mono">Golden Hour Window</span>
                <span className="text-emerald-400 font-medium">{ticketDraft.golden_hour_window_remaining || 'Active Hold'}</span>
              </div>
            </div>

            <button
              onClick={() => handleSubmitTicket(ticketDraft.ticket_id)}
              disabled={isTicketSubmitted}
              className={`w-full py-2 px-3 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md ${
                isTicketSubmitted
                  ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 cursor-default'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {isTicketSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>NCRP Emergency Freeze Dispatched (Acknowledged)</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Authorize Golden Hour Freeze via 1930 NCRP</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Recommended Actions Checklist */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Officer Triage Checklist (1930 / NCRP)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {Object.values(completedActions).filter(Boolean).length} / {actions.length} Completed
            </span>
          </div>

          <div className="space-y-1.5">
            {actions.map((act, idx) => {
              const isChecked = !!completedActions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(idx)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                    isChecked
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-slate-300 line-through opacity-75'
                      : 'bg-cyber-dark/80 border-cyber-border text-slate-200 hover:border-slate-500 hover:bg-cyber-dark'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="leading-snug">{act}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wispr Voice Co-Pilot & Dispatch Notes */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Wispr Voice Co-Pilot & Dispatch
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
              <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
              Wispr Flow Ready
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dictate live commands hands-free (e.g. 'Caller confirmed ₹45,000 sent via PhonePe, freeze account and log FIR draft')..."
              className="w-full bg-cyber-dark border border-cyber-border rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearNote}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded border border-cyber-border hover:border-slate-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Ctrl + Enter
              </span>
            </div>

            <button
              onClick={handleProcessCopilotSubmit}
              disabled={!dispatchNotes.trim() || isProcessingCopilot}
              className={`px-3 py-1.5 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all ${
                dispatchNotes.trim() && !isProcessingCopilot
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isProcessingCopilot ? (
                <>
                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Command...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Process Voice Command</span>
                </>
              )}
            </button>
          </div>

          {/* Logged notes stream */}
          {caseNotesLog.length > 0 && (
            <div className="pt-2 border-t border-cyber-border/70 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">
                Incident Audit Log:
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {caseNotesLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-cyber-dark/60 border border-cyber-border/50 text-[11px] text-slate-300"
                  >
                    <span className="font-mono text-[10px] text-cyan-400 block mb-0.5">
                      {log.time}
                    </span>
                    <p>{log.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Responsible AI Indicative Mandate Banner */}
        <div className="bg-amber-950/20 border border-amber-600/40 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Responsible AI Guardrail</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
            {insights.indicative_disclaimer || INDICATIVE_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}
