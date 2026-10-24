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
import { runLocalSpeechTriage } from './services/localModelEngine';
import { saveCaseToDevice, getAllSavedCases, deleteSavedCase } from './services/caseDb';
import { cyberAudioPlayer } from './services/audioSynthesizer';
import { callSiliconFlowSTT, callGroqWhisperSTT } from './services/cloudServices';
import AnalyzingOverlay from './components/AnalyzingOverlay';

export default function App() {
  // Theme state: dark / light
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vecna_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('vecna_theme', theme);
  }, [theme]);

  // Demo mode state
  const [isMockMode, setIsMockMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mock') === 'true';
  });

  // Session calls (uploads / recordings created by user in this session)
  const [sessionCalls, setSessionCalls] = useState([]);
  const [savedCases, setSavedCases] = useState([]);

  // Active call
  const [activeCall, setActiveCall] = useState(() => {
    return isMockMode ? FALLBACK_SCENARIOS[0] : null;
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
  const [isCurrentCaseSaved, setIsCurrentCaseSaved] = useState(false);

  const wsRef = useRef(null);

  // Compute displayed calls: in mock mode show demo scenarios, else show real session calls
  const displayedCalls = isMockMode
    ? FALLBACK_SCENARIOS
    : sessionCalls;

  // When demo mode toggles, update active call appropriately
  const handleToggleMockMode = (newVal) => {
    cyberAudioPlayer.stop();
    setIsMockMode(newVal);
    if (newVal) {
      setActiveCall(FALLBACK_SCENARIOS[0]);
    } else {
      if (sessionCalls.length > 0) {
        setActiveCall(sessionCalls[0]);
      } else if (savedCases.length > 0) {
        setActiveCall(savedCases[0]);
      } else {
        setActiveCall(null);
      }
    }
  };

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
    // If not mock mode and no session calls, pick first saved case as active if available
    if (!isMockMode && sessionCalls.length === 0 && list.length > 0 && !activeCall) {
      setActiveCall(list[0]);
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setBackendConnected(true);
        } else {
          setBackendConnected(false);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };

    checkBackend();
  }, []);

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
            setSessionCalls(payload.calls);
            setActiveCall(payload.calls[0]);
            setIsSurgeActive(true);
            setTimeout(() => setIsSurgeActive(false), 8000);
            return;
          }

          if (payload.call_id) {
            setActiveCall(payload);
            setSessionCalls((prev) => {
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
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [isMockMode]);

  const handleSelectCall = (call) => {
    cyberAudioPlayer.stop();
    setActiveCall(call);
    setCopilotData(null);
    const isSaved = savedCases.some((c) => c.call_id === call.call_id);
    setIsCurrentCaseSaved(isSaved);
  };

  const handleRefreshQueue = () => {
    setIsLoadingQueue(true);
    setTimeout(() => {
      setIsLoadingQueue(false);
    }, 400);
  };

  // Audio Analysis: Supports Hybrid Backend, Cloud STT, or Client-Side Pure Web Audio DSP
  const handleAnalyzeAudioFile = async (file, transcriptHint) => {
    cyberAudioPlayer.stop();
    setIsAnalyzing(true);

    let activeHint = transcriptHint ? transcriptHint.trim() : '';

    // If no hint provided and user has BYOK credentials, attempt cloud transcription during loading overlay
    if (!activeHint && apiKey) {
      try {
        if (provider === 'siliconflow') {
          const sfText = await callSiliconFlowSTT(apiKey, file);
          if (sfText) activeHint = sfText.trim();
        } else if (provider === 'groq') {
          const gText = await callGroqWhisperSTT(apiKey, file);
          if (gText) activeHint = gText.trim();
        }
      } catch (e) {}
    }

    // If backend is online, send to backend for SenseVoice / Whisper / hybrid triage
    if (backendConnected && !isMockMode) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (activeHint) {
          formData.append('transcript_hint', activeHint);
        }

        const headers = {};
        if (provider) headers['X-Provider'] = provider;
        if (apiKey) headers['X-Api-Key'] = apiKey;

        const res = await fetch('/api/analyze-audio', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (res.ok) {
          const payload = await res.json();
          setActiveCall(payload);
          setSessionCalls((prev) => {
            const filtered = prev.filter((c) => c.call_id !== payload.call_id);
            const updated = [payload, ...filtered];
            return updated.sort((a, b) => b.urgency_score - a.urgency_score);
          });
          setIsAnalyzing(false);
          return;
        }
      } catch (err) {}
    }

    // Client-side on-device models pipeline if backend is offline or on static hosting
    try {
      const arrayBuffer = await file.arrayBuffer();
      const clientPayload = await runLocalSpeechTriage(arrayBuffer, 16000, activeHint);
      setActiveCall(clientPayload);
      setSessionCalls((prev) => [clientPayload, ...prev.filter((c) => c.call_id !== clientPayload.call_id)]);
    } catch (e) {
      console.error('Audio analysis error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulateScenario = (scenarioKey) => {
    cyberAudioPlayer.stop();
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
    setSessionCalls((prev) => {
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

    setSessionCalls(surged);
    setActiveCall(surged[0]);
  };

  const handleStreamAudioChunk = (blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(blob);
    }
  };

  const handleProcessVoiceCopilot = async (officerNote) => {
    if (!activeCall) return;
    setIsProcessingCopilot(true);

    if (isMockMode || !backendConnected) {
      setTimeout(() => {
        const ticketId = `1930-NCRP-${Math.floor(100000 + Math.random() * 900000)}`;
        const mockDraft = {
          ticket_id: ticketId,
          call_id: activeCall.call_id,
          incident_category: activeCall.triage_insights?.crime_category || 'Financial Cyber Incident',
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
      }, 500);
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
    if (!activeCall) return;
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
    if (!casePayload) return;
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
    if (activeCall?.call_id === callId) {
      setIsCurrentCaseSaved(false);
    }
    await loadSavedCases();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 dark:bg-[#070a10] text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-200">
      {/* Top Header */}
      <Header
        isMockMode={isMockMode}
        setIsMockMode={handleToggleMockMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHardwareWizard={() => setIsHardwareWizardOpen(true)}
        provider={provider}
        backendConnected={backendConnected}
        currentTier={currentTier}
        storageInfo={storageInfo}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main 3-Column Dashboard Body: Flex-1, flexible layout at any zoom level */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-2.5 sm:p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:h-[calc(100vh-68px)] lg:max-h-[1100px] overflow-hidden items-stretch">
        {/* Left Column: Priority Call Queue */}
        <div className="lg:col-span-3 h-full min-h-[380px] lg:min-h-0 flex flex-col">
          <CallQueue
            calls={displayedCalls}
            selectedCallId={activeCall?.call_id}
            onSelectCall={handleSelectCall}
            onRefreshQueue={handleRefreshQueue}
            onSimulateSurge={handleSimulateSurge}
            isLoading={isLoadingQueue}
            isSurgeActive={isSurgeActive}
            savedCases={savedCases}
            onDeleteSavedCase={handleDeleteSavedCase}
            isMockMode={isMockMode}
          />
        </div>

        {/* Center Column: Voice Forensics & Telemetry */}
        <div className="lg:col-span-5 h-full min-h-[480px] lg:min-h-0 flex flex-col">
          <ForensicsPanel
            activeCall={activeCall}
            onAnalyzeAudioFile={handleAnalyzeAudioFile}
            onSimulateScenario={handleSimulateScenario}
            isAnalyzing={isAnalyzing}
            onStreamAudioChunk={handleStreamAudioChunk}
          />
        </div>

        {/* Right Column: Decision Support & Incident Log */}
        <div className="lg:col-span-4 h-full min-h-[440px] lg:min-h-0 flex flex-col">
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

      {/* Full-Screen Analyzing Progress Overlay */}
      <AnalyzingOverlay
        isOpen={isAnalyzing}
        onClose={() => setIsAnalyzing(false)}
      />
    </div>
  );
}
