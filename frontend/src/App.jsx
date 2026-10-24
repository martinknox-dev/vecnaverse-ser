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

export default function App() {
  const [calls, setCalls] = useState(FALLBACK_SCENARIOS);
  const [activeCall, setActiveCall] = useState(FALLBACK_SCENARIOS[0]);
  const [isMockMode, setIsMockMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mock') === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHardwareWizardOpen, setIsHardwareWizardOpen] = useState(false);

  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('vecna_provider') || 'offline';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('vecna_api_key') || '';
  });
  const [currentTier, setCurrentTier] = useState(() => {
    return localStorage.getItem('vecna_model_tier') || 'MID_RANGE';
  });

  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSurgeActive, setIsSurgeActive] = useState(false);

  const [copilotData, setCopilotData] = useState(null);
  const [isProcessingCopilot, setIsProcessingCopilot] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedCases, setSavedCases] = useState([]);
  const [isCurrentCaseSaved, setIsCurrentCaseSaved] = useState(false);

  const wsRef = useRef(null);

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

      const savedTier = localStorage.getItem('vecna_model_tier');
      if (!savedTier) {
        setCurrentTier(merged.recommendedTier);
        localStorage.setItem('vecna_model_tier', merged.recommendedTier);
      }
    };

    initHardware();
    loadSavedCases();
  }, []);

  const loadSavedCases = async () => {
    const list = await getAllSavedCases();
    setSavedCases(list);
  };

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

  const handleAnalyzeAudioFile = async (file, transcriptHint) => {
    setIsAnalyzing(true);

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
            ? 'Distressed Caller / Digital Arrest'
            : file.name.includes('nervous')
            ? 'Caller with vocal hesitation'
            : 'Incoming audio inquiry',
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
      try {
        const arrayBuffer = await file.arrayBuffer();
        const clientPayload = await analyzeAudioClientSide(arrayBuffer, 16000, transcriptHint);
        setActiveCall(clientPayload);
        setCalls((prev) => [clientPayload, ...prev.filter((c) => c.call_id !== clientPayload.call_id)]);
      } catch (inner) {
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

  const handleProcessVoiceCopilot = async (officerNote) => {
    setIsProcessingCopilot(true);

    if (isMockMode || !backendConnected) {
      setTimeout(() => {
        const ticketId = `1930-NCRP-${Math.floor(100000 + Math.random() * 900000)}`;
        const mockDraft = {
          ticket_id: ticketId,
          call_id: activeCall.call_id,
          incident_category: activeCall.triage_insights?.crime_category || 'Cyber Financial Incident',
          amount_involved: '₹45,000',
          payment_channel: 'PhonePe (UPI)',
          priority: 'IMMEDIATE_FREEZE',
          freeze_target: 'Beneficiary Bank Node',
          officer_dispatch_directive: officerNote,
          status: 'DRAFT_PENDING_SUBMISSION',
          created_at_ms: Date.now(),
          golden_hour_window_remaining: '45 mins remaining',
        };
        const updated = {
          call_id: activeCall.call_id,
          updated_actions: [
            `Submit 1930 freeze ticket #${ticketId} for ₹45,000 via PhonePe.`,
            `Follow directive: ${officerNote.slice(0, 90)}...`,
            'Obtain transaction reference ID (UTR) from bank statement.',
            'Instruct complainant to change UPI PIN immediately.',
          ],
          ncrp_1930_ticket_draft: mockDraft,
          fir_summary_note: `Incident note: Caller confirmed unauthorized transfer. Directive: '${officerNote}'. 1930 draft ${ticketId} created.`,
        };
        setCopilotData(updated);
        setIsProcessingCopilot(false);
      }, 600);
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
      alert('Could not process note: ' + err.message);
    } finally {
      setIsProcessingCopilot(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);

    try {
      let reportData;
      if (isMockMode || !backendConnected) {
        reportData = {
          filename_base: `VECNA-CASE-${activeCall.call_id}`,
          markdown_report: `# Incident Case Record\n**Case ID:** ${activeCall.call_id}\n**Urgency Score:** ${activeCall.urgency_score}/100\n**State:** ${activeCall.dominant_emotion}\n\n## Transcript\n> "${activeCall.transcript?.raw_redacted}"\n\n## Notice\n${INDICATIVE_DISCLAIMER}`,
          json_packet: { activeCall, copilotData },
        };
      } else {
        const res = await fetch('/api/export-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            triage_payload: activeCall,
            officer_notes: copilotData?.fir_summary_note || 'Intake log recorded.',
            copilot_data: copilotData,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        reportData = await res.json();
      }

      const mdBlob = new Blob([reportData.markdown_report], { type: 'text/markdown;charset=utf-8' });
      const mdUrl = URL.createObjectURL(mdBlob);
      const aMd = document.createElement('a');
      aMd.href = mdUrl;
      aMd.download = `${reportData.filename_base}.md`;
      document.body.appendChild(aMd);
      aMd.click();
      document.body.removeChild(aMd);
      URL.revokeObjectURL(mdUrl);

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
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="min-h-screen flex flex-col bg-[#070a10] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left Column: Priority Call Queue */}
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

        {/* Center Column: Voice Forensics & Telemetry */}
        <div className="lg:col-span-5 h-[620px] lg:h-auto min-h-[500px]">
          <ForensicsPanel
            activeCall={activeCall}
            onAnalyzeAudioFile={handleAnalyzeAudioFile}
            onSimulateScenario={handleSimulateScenario}
            isAnalyzing={isAnalyzing}
            onStreamAudioChunk={handleStreamAudioChunk}
          />
        </div>

        {/* Right Column: Decision Support & Incident Log */}
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

      {/* Hardware Wizard Modal */}
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
