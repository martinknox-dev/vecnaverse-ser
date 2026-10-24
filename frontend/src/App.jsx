import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import CallQueue from './components/CallQueue';
import ForensicsPanel from './components/ForensicsPanel';
import DecisionSupport from './components/DecisionSupport';
import { FALLBACK_SCENARIOS } from './mockData';

export default function App() {
  const [calls, setCalls] = useState(FALLBACK_SCENARIOS);
  const [activeCall, setActiveCall] = useState(FALLBACK_SCENARIOS[0]);
  const [isMockMode, setIsMockMode] = useState(() => {
    return new URLSearchParams(window.location.search).get('mock') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('vecna_provider') || 'offline';
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('vecna_api_key') || '';
  });
  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const wsRef = useRef(null);

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

  // Connect WebSocket for live streaming
  useEffect(() => {
    if (isMockMode) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-call`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        // Connected
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.call_id) {
            setActiveCall(payload);
            setCalls((prev) => {
              const exists = prev.some((c) => c.call_id === payload.call_id);
              if (exists) {
                return prev.map((c) => (c.call_id === payload.call_id ? payload : c));
              }
              const updated = [payload, ...prev];
              return updated.sort((a, b) => b.urgency_score - a.urgency_score);
            });
          }
        } catch (e) {
          console.error('Error parsing live WS payload', e);
        }
      };

      socket.onerror = () => {
        // Fallback silently
      };
    } catch (e) {
      // Ignore
    }

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
      console.warn('Backend not responding to /api/mock-scenarios, using local fallback.');
      setCalls(FALLBACK_SCENARIOS);
      setActiveCall(FALLBACK_SCENARIOS[0]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleSelectCall = (call) => {
    setActiveCall(call);
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

    if (isMockMode) {
      // Simulate analysis with mock data
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

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const payload = await res.json();
      setActiveCall(payload);
      setCalls((prev) => {
        const filtered = prev.filter((c) => c.call_id !== payload.call_id);
        const updated = [payload, ...filtered];
        return updated.sort((a, b) => b.urgency_score - a.urgency_score);
      });
    } catch (err) {
      alert('Forensic audio analysis failed: ' + err.message + '. Falling back to local offline scenario.');
      setActiveCall(FALLBACK_SCENARIOS[0]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimulateScenario = (scenarioKey) => {
    // If WebSocket is open and connected, send command to backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'simulate_call', scenario: scenarioKey }));
      return;
    }

    // Otherwise simulate locally instantly
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

  const handleStreamAudioChunk = (blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(blob);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cyber-dark text-slate-100">
      {/* Top Header */}
      <Header
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        provider={provider}
        backendConnected={backendConnected}
      />

      {/* Main 3-Column Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column: Priority Call Queue (3 cols on lg) */}
        <div className="lg:col-span-3 h-[420px] lg:h-auto min-h-[380px]">
          <CallQueue
            calls={calls}
            selectedCallId={activeCall?.call_id}
            onSelectCall={handleSelectCall}
            onRefreshQueue={handleRefreshQueue}
            isLoading={isLoadingQueue}
          />
        </div>

        {/* Center Column: Live SER & Forensic Biomarkers (6 cols on lg) */}
        <div className="lg:col-span-5 h-[600px] lg:h-auto min-h-[480px]">
          <ForensicsPanel
            activeCall={activeCall}
            onAnalyzeAudioFile={handleAnalyzeAudioFile}
            onSimulateScenario={handleSimulateScenario}
            isAnalyzing={isAnalyzing}
            onStreamAudioChunk={handleStreamAudioChunk}
          />
        </div>

        {/* Right Column: Investigator Decision Support (4 cols on lg) */}
        <div className="lg:col-span-4 h-[520px] lg:h-auto min-h-[440px]">
          <DecisionSupport activeCall={activeCall} />
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
    </div>
  );
}
