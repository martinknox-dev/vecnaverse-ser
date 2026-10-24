import React, { useState, useRef } from 'react';
import {
  Upload,
  Mic,
  Play,
  Activity,
  AudioWaveform,
  Volume2,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Radio,
  FileAudio
} from 'lucide-react';

export default function ForensicsPanel({
  activeCall,
  onAnalyzeAudioFile,
  onSimulateScenario,
  isAnalyzing,
  onStreamAudioChunk
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'mic' | 'simulate'
  const [isRecording, setIsRecording] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [transcriptHint, setTranscriptHint] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    onAnalyzeAudioFile(uploadFile, transcriptHint);
  };

  // Live Mic Stream
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            if (onStreamAudioChunk) {
              onStreamAudioChunk(event.data);
            }
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const file = new File([audioBlob], 'live_mic_recording.wav', { type: 'audio/wav' });
          onAnalyzeAudioFile(file, 'Live caller microphone transmission captured.');
          stream.getTracks().forEach((track) => track.stop());
        };

        // Slice every 2 seconds for real-time live SER chunks
        mediaRecorder.start(2000);
        setIsRecording(true);
      } catch (err) {
        alert('Microphone access denied or not available: ' + err.message);
      }
    }
  };

  // Helper colors for emotions
  const getEmotionColor = (emotion) => {
    switch (emotion) {
      case 'fear':
        return {
          bar: 'bg-rose-500',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30',
        };
      case 'distress':
        return {
          bar: 'bg-amber-500',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
        };
      case 'nervousness':
        return {
          bar: 'bg-yellow-400',
          text: 'text-yellow-300',
          bg: 'bg-yellow-500/10 border-yellow-500/30',
        };
      case 'anger':
        return {
          bar: 'bg-red-500',
          text: 'text-red-400',
          bg: 'bg-red-500/10 border-red-500/30',
        };
      case 'neutral':
      default:
        return {
          bar: 'bg-slate-400',
          text: 'text-slate-300',
          bg: 'bg-slate-500/10 border-slate-500/30',
        };
    }
  };

  const emotionProbs = activeCall?.emotion_probabilities || {
    fear: 0.2,
    distress: 0.2,
    nervousness: 0.2,
    anger: 0.2,
    neutral: 0.2,
  };

  const biomarkers = activeCall?.acoustic_biomarkers || {
    pitch_hz: 180.0,
    jitter_tremor_pct: 1.5,
    speech_rate_sps: 4.2,
    rms_energy_db: -20.0,
    vocal_anomaly: 'Awaiting signal feed...',
  };

  const transcript = activeCall?.transcript || {
    raw_redacted: 'No active call selected or analysis pending.',
    pii_masked_count: 0,
    detected_keywords: [],
  };

  const timeline = activeCall?.timeline_segments || [];

  // Formatter for transcript highlighting PII tags & keywords
  const renderHighlightedTranscript = (rawText, keywords = []) => {
    if (!rawText) return null;

    // Pattern to match [REDACTED-*] tags
    const piiRegex = /(\[REDACTED-[A-Za-z]+\])/g;
    const parts = rawText.split(piiRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('[REDACTED-')) {
        return (
          <span
            key={idx}
            className="inline-flex items-center font-mono text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded mx-1 shadow-sm"
          >
            {part}
          </span>
        );
      }

      // Highlight keywords within non-PII text
      if (keywords.length === 0) return <span key={idx}>{part}</span>;

      // Simple keyword highlighter
      const escapedKws = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const kwRegex = new RegExp(`(${escapedKws.join('|')})`, 'gi');
      const kwParts = part.split(kwRegex);

      return (
        <span key={idx}>
          {kwParts.map((subPart, sIdx) => {
            const isMatch = keywords.some(
              (kw) => kw.toLowerCase() === subPart.toLowerCase()
            );
            if (isMatch) {
              return (
                <span
                  key={sIdx}
                  className="font-bold text-rose-300 underline decoration-rose-500 decoration-2 px-0.5 bg-rose-500/10 rounded"
                >
                  {subPart}
                </span>
              );
            }
            return <span key={sIdx}>{subPart}</span>;
          })}
        </span>
      );
    });
  };

  return (
    <div className="bg-cyber-panel border border-cyber-border rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
      {/* Panel Top Mode Tabs */}
      <div className="px-4 py-3 border-b border-cyber-border bg-cyber-dark/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Speech Emotion Forensics & Biomarkers
          </h2>
        </div>

        {/* Input Mode Switcher */}
        <div className="flex items-center bg-cyber-dark p-0.5 rounded-lg border border-cyber-border text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'upload'
                ? 'bg-cyan-600 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload WAV</span>
          </button>

          <button
            onClick={() => setActiveTab('mic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'mic'
                ? 'bg-cyan-600 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Mic Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('simulate')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              activeTab === 'simulate'
                ? 'bg-cyan-600 text-black font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Simulate Call</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Dynamic Mode Controller Form */}
        {activeTab === 'upload' && (
          <form
            onSubmit={handleUploadSubmit}
            className="bg-cyber-dark/60 border border-cyber-border rounded-lg p-3.5 flex flex-col md:flex-row items-center gap-3"
          >
            <div className="flex-1 w-full flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-cyber-card border border-cyber-border rounded-md cursor-pointer hover:border-slate-500 text-xs text-slate-200 shrink-0">
                <FileAudio className="w-4 h-4 text-cyan-400" />
                <span className="truncate max-w-[140px]">
                  {uploadFile ? uploadFile.name : 'Select .wav File'}
                </span>
                <input
                  type="file"
                  accept="audio/wav,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                placeholder="Optional transcript hint (e.g. caller reporting digital arrest)..."
                value={transcriptHint}
                onChange={(e) => setTranscriptHint(e.target.value)}
                className="flex-1 bg-cyber-dark border border-cyber-border rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={!uploadFile || isAnalyzing}
              className={`w-full md:w-auto px-4 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                !uploadFile || isAnalyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing Audio...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Forensic Analysis</span>
                </>
              )}
            </button>
          </form>
        )}

        {activeTab === 'mic' && (
          <div className="bg-cyber-dark/60 border border-cyber-border rounded-lg p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                }`}
              ></div>
              <div>
                <p className="text-xs font-bold text-white">
                  {isRecording ? 'Live Mic Stream Active' : 'Microphone Stream Standby'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Streams real-time 2.0s PCM audio chunks to WebSocket engine
                </p>
              </div>
            </div>

            <button
              onClick={toggleRecording}
              className={`px-4 py-2 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isRecording ? 'Stop Live Mic' : 'Start Live Mic Stream'}</span>
            </button>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="bg-cyber-dark/60 border border-cyber-border rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Trigger Live Simulated Cybercrime Call:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time WebSocket Push</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'digital_arrest', label: '1. Digital Arrest', level: 'Critical Fear' },
                { id: 'upi_fraud', label: '2. UPI APK Fraud', level: 'Active Drain' },
                { id: 'distressed_victim', label: '3. Sextortion Crisis', level: 'Extortion' },
                { id: 'informant', label: '4. Mule Informant', level: 'Mule Ring Tip' },
              ].map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => onSimulateScenario(scen.id)}
                  className="p-2 rounded bg-cyber-card border border-cyber-border hover:border-cyan-500/60 hover:bg-slate-800 text-left transition-all"
                >
                  <div className="text-xs font-bold text-slate-100">{scen.label}</div>
                  <div className="text-[10px] text-cyan-400">{scen.level}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emotion Probability Bars */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Emotion Class Probabilities
              </span>
              <span className="text-[10px] font-mono text-slate-400">(Normalized 0.0 - 1.0)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Dominant Emotion:</span>
              <span
                className={`font-bold capitalize font-mono px-2 py-0.5 rounded border ${
                  getEmotionColor(activeCall?.dominant_emotion).bg
                } ${getEmotionColor(activeCall?.dominant_emotion).text}`}
              >
                {activeCall?.dominant_emotion || 'neutral'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { key: 'fear', label: 'Fear' },
              { key: 'distress', label: 'Distress' },
              { key: 'nervousness', label: 'Nervousness' },
              { key: 'anger', label: 'Anger' },
              { key: 'neutral', label: 'Neutral' },
            ].map(({ key, label }) => {
              const prob = emotionProbs[key] ?? 0.0;
              const pct = Math.round(prob * 100);
              const colorInfo = getEmotionColor(key);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-300">{label}</span>
                    <span className={`font-mono font-bold ${colorInfo.text}`}>{pct}% ({prob.toFixed(2)})</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-cyber-border/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorInfo.bar}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Acoustic Biomarkers Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Extracted Acoustic Biomarkers (Real DSP)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">librosa • yin • onsets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Pitch (F0) */}
            <div className="bg-cyber-card border border-cyber-border p-3 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Pitch (F0)</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {biomarkers.pitch_hz} <span className="text-xs text-slate-400 font-normal">Hz</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {biomarkers.pitch_hz > 240 ? 'Acute elevation' : 'Baseline vocal zone'}
              </div>
            </div>

            {/* Jitter / Tremor */}
            <div className="bg-cyber-card border border-cyber-border p-3 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Vocal Jitter/Tremor</div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                {biomarkers.jitter_tremor_pct} <span className="text-xs text-slate-400 font-normal">%</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {biomarkers.jitter_tremor_pct > 3.0 ? 'High vocal shaking' : 'Normal jitter'}
              </div>
            </div>

            {/* Speech Rate */}
            <div className="bg-cyber-card border border-cyber-border p-3 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Speech Rate</div>
              <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
                {biomarkers.speech_rate_sps} <span className="text-xs text-slate-400 font-normal">sps</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Syllables per second
              </div>
            </div>

            {/* RMS Energy */}
            <div className="bg-cyber-card border border-cyber-border p-3 rounded-lg">
              <div className="text-[11px] text-slate-400 font-medium">Loudness (RMS)</div>
              <div className="text-lg font-bold font-mono text-slate-100 mt-1">
                {biomarkers.rms_energy_db} <span className="text-xs text-slate-400 font-normal">dB</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Decibels full scale
              </div>
            </div>
          </div>

          {/* Anomaly banner */}
          <div className="bg-cyan-950/40 border border-cyan-800/60 p-2.5 rounded-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-cyan-200 font-medium">
              Acoustic Anomaly Diagnostic:{' '}
              <strong className="text-white font-semibold">{biomarkers.vocal_anomaly}</strong>
            </span>
          </div>
        </div>

        {/* Emotion Timeline Strip */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-200">
              Temporal Emotion Timeline (2.5s Slices)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {timeline.length} segments analyzed
            </span>
          </div>

          <div className="flex gap-1.5 h-8 w-full bg-cyber-dark p-1 rounded-md border border-cyber-border/70">
            {timeline.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic flex items-center px-2">
                No timeline slices available.
              </div>
            ) : (
              timeline.map((seg, idx) => {
                const colorInfo = getEmotionColor(seg.emotion);
                return (
                  <div
                    key={idx}
                    title={`${seg.start_sec}s - ${seg.end_sec}s: ${seg.emotion.toUpperCase()} (Urgency ${seg.urgency})`}
                    className={`flex-1 rounded flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all hover:opacity-90 ${colorInfo.bar}`}
                  >
                    <span className="truncate px-1">{seg.emotion[0].toUpperCase()}:{seg.urgency}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0s</span>
            <span>{timeline.length > 0 ? `${timeline[timeline.length - 1].end_sec}s` : '0.0s'}</span>
          </div>
        </div>

        {/* Redacted Transcript Box */}
        <div className="bg-cyber-card border border-cyber-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Redacted Call Transcript
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                {transcript.pii_masked_count} PII MASKED
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Regex PII Masking: Phone, Aadhaar, OTP, Account
            </span>
          </div>

          <div className="bg-cyber-dark/80 border border-cyber-border/80 p-3.5 rounded-lg text-xs leading-relaxed text-slate-200 min-h-[70px]">
            {renderHighlightedTranscript(transcript.raw_redacted, transcript.detected_keywords)}
          </div>

          {/* Detected Keywords Badges */}
          {transcript.detected_keywords && transcript.detected_keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Threat Keywords:</span>
              {transcript.detected_keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold uppercase bg-red-950/70 text-red-300 border border-red-800/80 px-2 py-0.5 rounded font-mono"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
