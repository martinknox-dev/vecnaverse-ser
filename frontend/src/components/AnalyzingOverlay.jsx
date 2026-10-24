import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Waves, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AnalyzingOverlay({ isOpen, onClose }) {
  const [progress, setProgress] = useState(12);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Decoding audio stream', detail: 'Reading PCM samples and normalizing amplitude' },
    { title: 'Extracting acoustic biomarkers', detail: 'Calculating pitch F0, vocal tremor, and pace' },
    { title: 'Evaluating emotion probabilities', detail: 'Mapping vocal tension across emotion classes' },
    { title: 'Applying PII masking & triage rules', detail: 'Screening for threat keywords and identifiers' },
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(12);
      setCurrentStep(0);
      return;
    }

    // Dynamic staged progression
    const timer1 = setTimeout(() => {
      setProgress(35);
      setCurrentStep(1);
    }, 250);

    const timer2 = setTimeout(() => {
      setProgress(68);
      setCurrentStep(2);
    }, 600);

    const timer3 = setTimeout(() => {
      setProgress(90);
      setCurrentStep(3);
    }, 1100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 transition-colors">
        {/* Animated Beacon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-inner">
            <Activity className="w-7 h-7 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Analyzing Audio Signal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Extracting vocal biomarkers and evaluating threat indicators
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Processing</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400">{progress}%</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div
              className="bg-cyan-600 dark:bg-cyan-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Staged Checklist */}
        <div className="space-y-2.5 pt-1">
          {steps.map((st, idx) => {
            const isDone = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? 'bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-slate-900 dark:text-slate-100'
                    : isDone
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : isCurrent ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700"></div>
                  )}
                </div>

                <div className="flex-1">
                  <div className={`font-medium ${isCurrent ? 'text-slate-900 dark:text-white font-semibold' : ''}`}>
                    {st.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {st.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety dismiss button if stuck */}
        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Cancel analysis
          </button>
        </div>
      </div>
    </div>
  );
}
