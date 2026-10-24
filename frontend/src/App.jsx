import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import HardwareWizardModal from './components/HardwareWizardModal';
import CallQueue from './components/CallQueue';
import ForensicsPanel from './components/ForensicsPanel';
import DecisionSupport from './components/DecisionSupport';
import { FALLBACK_SCENARIOS, INDICATIVE_DISCLAIMER } from './mockData';
import { detectBrowserHardware, fetchBackendHardware } from './services/hardwareEngine';
import { analyzeAudioClientSide } from './services/clientSerEngine';
import { saveCaseToDevice, getAllSavedCases, deleteSavedCase } from './services/caseDb';
import { callSiliconFlowSTT, callSiliconFlowChat } from './services/cloudServices';

export default function App() {
  const [calls, setCalls] = useState(FALLBACK_SCENARIOS);
  const [activeCall, setActiveCall] = useState(FALLBACK_SCENARIOS[0]);
  const [isMockMode, setIsMockMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mock') === 'true';
  });

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHardwareWizardOpen, setIsHardwareWizardOpen] = useState(false);

  // Settings & Tier
  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('vecna_provider') || 'offline';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('vecna_api_key') || '';
  });
  const [currentTier, setCurrentTier] = useState(() => {
    return localStorage.getItem('vecna_model_tier') || 'MID_RANGE';
  });

  // Hardware telemetry & Storage
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  // Status & loading
  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSurgeActive, setIsSurgeActive] = useState(false);

  // Copilot & Cases
  const [copilotData, setCopilotData] = useState(null);
  const [isProcessingCopilot, setIsProcessingCopilot] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedCases, setSavedCases] = useState([]);
  const [isCurrentCaseSaved, setIsCurrentCaseSaved] = useState(false);

  const wsRef = useRef(null);

  // Hardware Profiling on mount
  useEffect(() => {
    const initHardware = async () => {
      const browserHw = await detectBrowserHardware();
      const backendHw = await fetchBackendHardware();

      const merged = {
        ...browserHw,
        backend: backendHw,
        cores: backendHw?.cpu_cores || browserHw.cores,
        memory: backendHw?.ram_total_gb || browserHw.memory,
        recommendedTier: backendHw?.recommended_tier || browserHw.recommendedTier,
      };

      setHardwareInfo(merged);
      setStorageInfo(browserHw.storage);

      // Auto-set recommended tier if user hasn't chosen one yet
      const savedTier = localStorage.getItem('vecna_model_tier');
      if (!savedTier) {
        setCurrentTier(merged.recommendedTier);
        localStorage.setItem('vecna_model_tier', merged.recommendedTier);
      }

      // Show wizard on first visit
      const wizardDone = localStorage.getItem('vecna_hardware_setup_done');
      if (!wizardDone) {
        setIsHardwareWizardOpen(true);
      }
    };

    initHardware();
    loadSavedCases();
  }, []);

  const loadSavedCases = async () => {
    const list = await getAllSavedCases();
    setSavedCases(list);
  };

  // Check backend health & fetch scenarios on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setBackendConnected(true);
          if (!isMockMode) {
            fetchScenarios();
          }
        } else {
          setBackendConnected(false);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };

    checkBackend();
  }, [isMockMode]);

  // Connect WebSocket for live streaming & surges
  useEffect(() => {
    if (isMockMode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-call`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.action === 'surge_batch' && Array.isArray(payload.calls)) {
            setCalls(payload.calls);
            setActiveCall(payload.calls[0]);
            setIsSurgeActive(true);
            setTimeout(() => setIsSurgeActive(false), 8000);
            return;
          }

          if (payload.call_id) {
            setActiveCall(payload);
            setCalls((prev) => {
              const exists = prev.some((c) => c.call_id === payload.call_id);
              let updated;
              if (exists) {
                updated = prev.map((c) => (c.call_id === payload.call_id ? payload : c));
              } else {
                updated = [payload, ...prev];
              }
              return updated.sort((a, b) => b.urgency_score - a.urgency_score);
            });
          }
        } catch (e) {
          console.error('Error parsing live WS payload', e);
        }
      };
    } catch (e) {}

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [isMockMode]);

  const fetchScenarios = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch('/api/mock-scenarios');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCalls(data);
          setActiveCall(data[0]);
        }
      }
    } catch (err) {
      setCalls(FALLBACK_SCENARIOS);
      setActiveCall(FALLBACK_SCENARIOS[0]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleSelectCall = (call) => {
    setActiveCall(call);
    setCopilotData(null);
    const isSaved = savedCases.some((c) => c.call_id === call.call_id);
    setIsCurrentCaseSaved(isSaved);
  };

  const handleRefreshQueue = () => {
    if (isMockMode) {
      setCalls([...FALLBACK_SCENARIOS]);
      setActiveCall(FALLBACK_SCENARIOS[0]);
    } else {
      fetchScenarios();
    }
  };

  // Audio Analysis: Supports Hybrid Backend, Client-Side Pure Web Audio DSP, or SiliconFlow Cloud BYOK
  const handleAnalyzeAudioFile = async (file, transcriptHint) => {
    setIsAnalyzing(true);

    // If pure client tier or backend offline, run 100% on-device Web Audio DSP!
    if (currentTier === 'LOW_END' || (!backendConnected && !isMockMode)) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const clientPayload = await analyzeAudioClientSide(arrayBuffer, 16000, transcriptHint);
        setActiveCall(clientPayload);
        setCalls((prev) => [clientPayload, ...prev.filter((c) => c.call_id !== clientPayload.call_id)]);
      } catch (e) {
        console.error('Client DSP analysis failed:', e);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    if (isMockMode) {
      setTimeout(() => {
        const simulated = {
          ...FALLBACK_SCENARIOS[0],
          call_id: `CALL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          timestamp_ms: Date.now(),
          caller_tag: file.name.includes('panic')
            ? 'Panic Victim / Urgent Digital Arrest'
            : file.name.includes('nervous')
            ? 'Hesitant Caller / High Vocal Shaking'
            : 'Audio Forensic Inspection Complete',
        };
        setActiveCall(simulated);
        setCalls((prev) => [simulated, ...prev]);
        setIsAnalyzing(false);
      }, 900);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (transcriptHint) {
        formData.append('transcript_hint', transcriptHint);
      }

      const headers = {};
      if (provider) headers['X-Provider'] = provider;
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const res = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const payload = await res.json();
      setActiveCall(payload);
      setCalls((prev) => {
        const filtered = prev.filter((c) => c.call_id !== payload.call_id);
        const updated = [payload, ...filtered];
        return updated.sort((a, b) => b.urgency_score - a.urgency_score);
      });
    } catch (err) {
      // Graceful fallback to client-side engine if backend fails
      try {
        const arrayBuffer = await file.arrayBuffer();
        const clientPayload = await analyzeAudioClientSide(arrayBuffer, 16000, transcriptHint);
        setActiveCall(clientPayload);
        setCalls((prev) => [clientPayload, ...prev.filter((c) => c.call_id !== clientPayload.call_id)]);
      } catch (inner) {
        alert('Forensic audio analysis failed. Using fallback scenario.');
        setActiveCall(FALLBACK_SCENARIOS[0]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulateScenario = (scenarioKey) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'simulate_call', scenario: scenarioKey }));
      return;
    }

    let match = FALLBACK_SCENARIOS[0];
    if (scenarioKey === 'upi_fraud') match = FALLBACK_SCENARIOS[2];
    else if (scenarioKey in { distressed_victim: 1, sextortion: 1 }) match = FALLBACK_SCENARIOS[1];
    else if (scenarioKey === 'informant') match = FALLBACK_SCENARIOS[3];

    const simulated = {
      ...match,
      call_id: `LIVE-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp_ms: Date.now(),
    };

    setActiveCall(simulated);
    setCalls((prev) => {
      const updated = [simulated, ...prev.filter((c) => c.call_id !== simulated.call_id)];
      return updated.sort((a, b) => b.urgency_score - a.urgency_score);
    });
  };

  const handleSimulateSurge = () => {
    setIsSurgeActive(true);
    setTimeout(() => setIsSurgeActive(false), 8000);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'simulate_surge' }));
      return;
    }

    const now = Date.now();
    const surged = [
      {
        ...FALLBACK_SCENARIOS[0],
        call_id: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
        urgency_score: 96,
        urgency_level: 'CRITICAL',
        timestamp_ms: now - 5000,
      },
      {
        ...FALLBACK_SCENARIOS[1],
        call_id: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
        urgency_score: 93,
        urgency_level: 'CRITICAL',
        timestamp_ms: now - 15000,
      },
      {
        ...FALLBACK_SCENARIOS[2],
        call_id: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
        urgency_score: 88,
        urgency_level: 'CRITICAL',
        timestamp_ms: now - 35000,
      },
      {
        ...FALLBACK_SCENARIOS[3],
        call_id: `SURGE-${Math.floor(1000 + Math.random() * 9000)}`,
        urgency_score: 62,
        urgency_level: 'HIGH',
        timestamp_ms: now - 60000,
      },
    ];

    setCalls(surged);
    setActiveCall(surged[0]);
  };

  const handleStreamAudioChunk = (blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(blob);
    }
  };

  // Wispr Voice Co-Pilot handler
  const handleProcessVoiceCopilot = async (officerNote) => {
    setIsProcessingCopilot(true);

    if (isMockMode || !backendConnected) {
      setTimeout(() => {
        const ticketId = `1930-NCRP-${Math.floor(100000 + Math.random() * 900000)}`;
        const mockDraft = {
          ticket_id: ticketId,
          call_id: activeCall.call_id,
          incident_category: activeCall.triage_insights?.crime_category || 'Cyber Financial Fraud',
          amount_involved: '₹45,000',
          payment_channel: 'PhonePe (UPI)',
          priority: 'CRITICAL_GOLDEN_HOUR_FREEZE',
          freeze_target: 'Beneficiary Bank / Gateway Account Node',
          officer_dispatch_directive: officerNote,
          status: 'DRAFT_PENDING_SUBMISSION',
          created_at_ms: Date.now(),
          golden_hour_window_remaining: '46 mins (High Recovery Probability)',
        };
        const updated = {
          call_id: activeCall.call_id,
          updated_actions: [
            `1. [GOLDEN HOUR ACTION]: Submit 1930 NCRP Freeze Ticket #${ticketId} to block ₹45,000 at PhonePe (UPI).`,
            `2. [OFFICER DIRECTIVE]: ${officerNote.slice(0, 100)}...`,
            '3. [TRANSACTION LOG]: Request UTR reference from complainant banking statement for police diary.',
            '4. [EVIDENCE SECURED]: Snapshot fraudulent video call/SMS headers and archive device MAC address.',
          ],
          ncrp_1930_ticket_draft: mockDraft,
          fir_summary_note: `Officer Diary Entry: Complainant confirmed fraud. Dictated: '${officerNote}'. Initiated 1930 Ticket ${ticketId}.`,
        };
        setCopilotData(updated);
        setIsProcessingCopilot(false);
      }, 700);
      return;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (provider) headers['X-Provider'] = provider;
      if (apiKey) headers['X-Api-Key'] = apiKey;

      const res = await fetch('/api/voice-copilot', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          call_id: activeCall.call_id,
          officer_voice_note: officerNote,
          current_payload: activeCall,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCopilotData(data);
    } catch (err) {
      alert('Voice Co-Pilot processing failed: ' + err.message);
    } finally {
      setIsProcessingCopilot(false);
    }
  };

  // Export Forensic Case Report handler
  const handleExportReport = async () => {
    setIsExporting(true);

    try {
      let reportData;
      if (isMockMode || !backendConnected) {
        reportData = {
          filename_base: `VECNA-CASE-REPORT-${activeCall.call_id}`,
          markdown_report: `# VECNA-Pulse Forensic Case Dossier\n**Case ID:** ${activeCall.call_id}\n**Urgency:** ${activeCall.urgency_score} (${activeCall.urgency_level})\n**Dominant Emotion:** ${activeCall.dominant_emotion}\n\n## Transcript\n> "${activeCall.transcript?.raw_redacted}"\n\n## Legal Notice\n${INDICATIVE_DISCLAIMER}`,
          json_packet: { activeCall, copilotData },
        };
      } else {
        const res = await fetch('/api/export-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triage_payload: activeCall,
            officer_notes: copilotData?.fir_summary_note || 'Standard officer intake log.',
            copilot_data: copilotData,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        reportData = await res.json();
      }

      // Download Markdown dossier
      const mdBlob = new Blob([reportData.markdown_report], { type: 'text/markdown;charset=utf-8' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const aMd = document.createElement('a');
      aMd.href = mdUrl;
      aMd.download = `${reportData.filename_base}.md`;
      document.body.appendChild(aMd);
      aMd.click();
      document.body.removeChild(aMd);
      URL.revokeObjectURL(mdUrl);

      // Download JSON telemetry evidence packet
      const jsonBlob = new Blob([JSON.stringify(reportData.json_packet, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const aJson = document.createElement('a');
      aJson.href = jsonUrl;
      aJson.download = `${reportData.filename_base}.json`;
      document.body.appendChild(aJson);
      aJson.click();
      document.body.removeChild(aJson);
      URL.revokeObjectURL(jsonUrl);
    } catch (err) {
      alert('Export report failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Persistent On-Device Case Saving (IndexedDB)
  const handleSaveCaseLocally = async (casePayload) => {
    try {
      await saveCaseToDevice(casePayload);
      setIsCurrentCaseSaved(true);
      await loadSavedCases();
    } catch (e) {
      alert('Could not save case locally: ' + e.message);
    }
  };

  const handleDeleteSavedCase = async (callId) => {
    await deleteSavedCase(callId);
    if (activeCall.call_id === callId) {
      setIsCurrentCaseSaved(false);
    }
    await loadSavedCases();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07070c] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHardwareWizard={() => setIsHardwareWizardOpen(true)}
        provider={provider}
        backendConnected={backendConnected}
        currentTier={currentTier}
        storageInfo={storageInfo}
      />

      {/* Main 3-Column Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column: Priority Call Queue (3 cols on lg) */}
        <div className="lg:col-span-3 h-[460px] lg:h-auto min-h-[420px]">
          <CallQueue
            calls={calls}
            selectedCallId={activeCall?.call_id}
            onSelectCall={handleSelectCall}
            onRefreshQueue={handleRefreshQueue}
            onSimulateSurge={handleSimulateSurge}
            isLoading={isLoadingQueue}
            isSurgeActive={isSurgeActive}
            savedCases={savedCases}
            onDeleteSavedCase={handleDeleteSavedCase}
          />
        </div>

        {/* Center Column: Live SER & Forensic Biomarkers (5 cols on lg) */}
        <div className="lg:col-span-5 h-[620px] lg:h-auto min-h-[500px]">
          <ForensicsPanel
            activeCall={activeCall}
            onAnalyzeAudioFile={handleAnalyzeAudioFile}
            onSimulateScenario={handleSimulateScenario}
            isAnalyzing={isAnalyzing}
            onStreamAudioChunk={handleStreamAudioChunk}
          />
        </div>

        {/* Right Column: Investigator Decision Support (4 cols on lg) */}
        <div className="lg:col-span-4 h-[560px] lg:h-auto min-h-[460px]">
          <DecisionSupport
            activeCall={activeCall}
            onProcessVoiceCopilot={handleProcessVoiceCopilot}
            copilotData={copilotData}
            isProcessingCopilot={isProcessingCopilot}
            onExportReport={handleExportReport}
            isExporting={isExporting}
            onSaveCaseLocally={handleSaveCaseLocally}
            isCaseSaved={isCurrentCaseSaved}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={provider}
        setProvider={setProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />

      {/* Hardware & Model Setup Wizard Modal */}
      <HardwareWizardModal
        isOpen={isHardwareWizardOpen}
        onClose={() => setIsHardwareWizardOpen(false)}
        hardwareInfo={hardwareInfo}
        currentTier={currentTier}
        onSelectTier={(tier) => setCurrentTier(tier)}
        storageInfo={storageInfo}
        onRefreshStorage={async () => {
          const hw = await detectBrowserHardware();
          setStorageInfo(hw.storage);
        }}
      />
    </div>
  );
}
