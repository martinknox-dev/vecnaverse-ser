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
  Award
} from 'lucide-react';
import { INDICATIVE_DISCLAIMER } from '../mockData';

export default function DecisionSupport({ activeCall }) {
  const [completedActions, setCompletedActions] = useState({});
  const [dispatchNotes, setDispatchNotes] = useState('');
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

  const actions = insights.recommended_actions || [];

  const toggleAction = (idx) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleLogNote = () => {
    if (!dispatchNotes.trim()) return;
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      text: dispatchNotes.trim(),
    };
    setCaseNotesLog((prev) => [newLog, ...prev]);
    setDispatchNotes('');
  };

  const handleClearNote = () => {
    setDispatchNotes('');
  };

  return (
    <div className="bg-cyber-panel border border-cyber-border rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-cyber-border bg-cyber-dark/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Investigator Decision Support
          </h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
          PLAYBOOK ACTIVE
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Crime Category Card */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-3.5 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
            Classified Cybercrime Vector
          </span>
          <div className="text-sm font-extrabold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            {insights.crime_category}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pt-1 bg-cyber-dark/60 p-2.5 rounded border border-cyber-border/70">
            <strong className="text-cyan-400 font-medium">Explainability: </strong>
            {insights.explainability_summary}
          </p>
        </div>

        {/* Recommended Actions Checklist */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Officer Triage Checklist (1930 / NCRP)
            </span>
            <span className="text-[10px] text-slate-400">
              {Object.values(completedActions).filter(Boolean).length} of {actions.length} Done
            </span>
          </div>

          <div className="space-y-2">
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

        {/* Hands-Free Officer Dispatch Notes (Wispr Flow Ready) */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Officer Dispatch Notes
              </span>
            </div>
            {/* Wispr Flow Integration Badge */}
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
              placeholder="Dictate live officer dispatch notes here using Wispr Flow (or type manually)..."
              className="w-full bg-cyber-dark border border-cyber-border rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleClearNote}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-cyber-border hover:border-slate-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>

            <button
              onClick={handleLogNote}
              disabled={!dispatchNotes.trim()}
              className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
                dispatchNotes.trim()
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Log to Case File</span>
            </button>
          </div>

          {/* Logged notes stream */}
          {caseNotesLog.length > 0 && (
            <div className="pt-2 border-t border-cyber-border/70 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">
                Incident Audit Log:
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
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
        <div className="bg-amber-950/20 border border-amber-600/40 rounded-lg p-3 space-y-1">
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
