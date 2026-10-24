import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Activity,
  AudioWaveform,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Radio,
  FileAudio,
  Zap,
  Gauge,
  Sliders
} from 'lucide-react';
import { cyberAudioPlayer } from '../services/audioSynthesizer';

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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackSec, setAudioPlaybackSec] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState(10);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [freqBands, setFreqBands] = useState(new Array(24).fill(0));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const micStreamRef = useRef(null);

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

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      cyberAudioPlayer.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Live Mic Stream with 24-band frequency spectrum analyser
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setIsRecording(false);
      setFreqBands(new Array(24).fill(0));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // 32 frequency bins
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateSpectrum = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          // Pick 24 frequency bands
          const bands = [];
          for (let i = 0; i < 24; i++) {
            const raw = dataArray[i] || 0;
            bands.push(Math.min(100, Math.round((raw / 255) * 100)));
          }
          setFreqBands(bands);
          animFrameRef.current = requestAnimationFrame(updateSpectrum);
        };
        updateSpectrum();

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
        };

        mediaRecorder.start(2000);
        setIsRecording(true);
      } catch (err) {
        alert('Microphone access denied: ' + err.message);
      }
    }
  };

  // Play/Pause Playable Distress Audio
  const togglePlayAudio = () => {
    if (isPlayingAudio) {
      cyberAudioPlayer.pause();
      setIsPlayingAudio(false);
    } else {
      if (uploadFile && activeTab === 'upload') {
        cyberAudioPlayer.playUploadedFile(
          uploadFile,
          (curr, dur) => {
            setAudioPlaybackSec(curr);
            setAudioDurationSec(dur);
          },
          () => setIsPlayingAudio(false)
        );
      } else {
        cyberAudioPlayer.playScenario(
          activeCall,
          (curr, dur) => {
            setAudioPlaybackSec(curr);
            setAudioDurationSec(dur);
          },
          () => setIsPlayingAudio(false)
        );
      }
      setIsPlayingAudio(true);
    }
  };

  const handleSeek = (e) => {
    const newSec = parseFloat(e.target.value);
    setAudioPlaybackSec(newSec);
    cyberAudioPlayer.seek(newSec);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    cyberAudioPlayer.setVolume(vol);
  };

  const getEmotionColor = (emotion) => {
    switch (emotion) {
      case 'fear':
        return {
          bar: 'bg-rose-500 shadow-sm shadow-rose-500/50',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/40',
        };
      case 'distress':
        return {
          bar: 'bg-amber-500 shadow-sm shadow-amber-500/50',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/40',
        };
      case 'nervousness':
        return {
          bar: 'bg-yellow-400 shadow-sm shadow-yellow-400/50',
          text: 'text-yellow-300',
          bg: 'bg-yellow-500/10 border-yellow-500/40',
        };
      case 'anger':
        return {
          bar: 'bg-red-500 shadow-sm shadow-red-500/50',
          text: 'text-red-400',
          bg: 'bg-red-500/10 border-red-500/40',
        };
      case 'neutral':
      default:
        return {
          bar: 'bg-slate-400',
          text: 'text-slate-300',
          bg: 'bg-slate-500/10 border-slate-500/40',
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
    voice_activity_ratio: 0.85,
    confidence_score: 0.90,
  };

  const transcript = activeCall?.transcript || {
    raw_redacted: 'No active call selected or analysis pending.',
    pii_masked_count: 0,
    detected_keywords: [],
  };

  const timeline = activeCall?.timeline_segments || [];

  const renderHighlightedTranscript = (rawText, keywords = []) => {
    if (!rawText) return null;
    const piiRegex = /(\[REDACTED-[A-Za-z]+\])/g;
    const parts = rawText.split(piiRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('[REDACTED-')) {
        return (
          <span
            key={idx}
            className="inline-flex items-center font-mono text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded mx-1 shadow-sm"
          >
            {part}
          </span>
        );
      }

      if (keywords.length === 0) return <span key={idx}>{part}</span>;

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
                  className="font-bold text-rose-300 underline decoration-rose-500 decoration-2 px-1 py-0.2 bg-rose-950/60 border border-rose-800/60 rounded"
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
    <div className="bg-[#0b0e17] border border-cyber-border rounded-2xl flex flex-col h-full shadow-xl overflow-hidden">
      {/* Panel Top Mode Tabs */}
      <div className="px-4 py-2.5 border-b border-cyber-border bg-[#07070c] flex flex-wrap items-center justify-between gap-2.5">
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'upload'
                ? 'bg-cyan-600 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload WAV</span>
          </button>

          <button
            onClick={() => setActiveTab('mic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'mic'
                ? 'bg-cyan-600 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Mic Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('simulate')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-semibold ${
              activeTab === 'simulate'
                ? 'bg-cyan-600 text-black font-extrabold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Simulate Call</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
        {/* Dynamic Mode Controller Form */}
        {activeTab === 'upload' && (
          <form
            onSubmit={handleUploadSubmit}
            className="bg-cyber-dark/60 border border-cyber-border rounded-xl p-3 flex flex-col md:flex-row items-center gap-2.5"
          >
            <div className="flex-1 w-full flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-cyber-card border border-cyber-border rounded-lg cursor-pointer hover:border-slate-500 text-xs text-slate-200 shrink-0 transition-colors">
                <FileAudio className="w-4 h-4 text-cyan-400" />
                <span className="truncate max-w-[130px]">
                  {uploadFile ? uploadFile.name : 'Choose .wav File'}
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
                className="flex-1 bg-cyber-dark border border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={!uploadFile || isAnalyzing}
              className={`w-full md:w-auto px-4 py-2 text-xs font-black rounded-lg flex items-center justify-center gap-1.5 transition-all shrink-0 ${
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

        {/* Live Mic Mode with 24-band Frequency Spectrum Visualizer */}
        {activeTab === 'mic' && (
          <div className="bg-cyber-dark/60 border border-cyber-border rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                  }`}
                ></div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {isRecording ? 'Live Mic Stream Active (Streaming 2.0s Chunks)' : 'Microphone Stream Standby'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Real-time speech emotion recognition & voice biomarker tracking
                  </p>
                </div>
              </div>

              <button
                onClick={toggleRecording}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-md shadow-red-600/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'Stop Live Mic' : 'Start Live Mic Stream'}</span>
              </button>
            </div>

            {/* 24-Band Reactive Audio Spectrum */}
            <div className="bg-cyber-card p-2.5 rounded-lg border border-cyber-border space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <AudioWaveform className="w-3 h-3 text-cyan-400" />
                  24-Band Voice Spectrum (Web Audio API Analyser)
                </span>
                <span className={isRecording ? 'text-emerald-400' : 'text-slate-500'}>
                  {isRecording ? 'LIVE FEED ACTIVE' : 'AWAITING INPUT'}
                </span>
              </div>
              <div className="h-10 flex items-end gap-1 px-1 bg-cyber-dark/80 rounded border border-cyber-border/60">
                {freqBands.map((val, idx) => {
                  let barColor = 'bg-cyan-500';
                  if (idx >= 14) barColor = 'bg-amber-400';
                  if (idx >= 20) barColor = 'bg-rose-500';
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-t-sm transition-all duration-75 ${barColor}`}
                      style={{ height: `${Math.max(4, isRecording ? val : 4)}%` }}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Playable Interactive Audio Player Bar */}
        <div className="bg-gradient-to-r from-cyan-950/40 via-cyber-card to-cyber-dark border border-cyan-800/50 rounded-xl p-3 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayAudio}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isPlayingAudio
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
                }`}
                title={isPlayingAudio ? 'Pause Playback' : 'Play Synthesized Scenario Audio'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <div>
                <span className="text-xs font-bold text-white block">
                  {isPlayingAudio ? 'Playback Synchronized with SER Timeline' : 'Play Scenario Distress Call'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {Math.floor(audioPlaybackSec)}s / {Math.floor(audioDurationSec)}s • Realistic Emergency Audio Synthesizer
                </span>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Scrubbing Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">0.0s</span>
            <input
              type="range"
              min="0"
              max={audioDurationSec || 10}
              step="0.1"
              value={audioPlaybackSec}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] font-mono text-slate-400">{Math.floor(audioDurationSec)}s</span>
          </div>
        </div>

        {/* Emotion Probability Bars */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2.5">
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
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-cyber-border/40">
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

        {/* 6 Acoustic Biomarker Telemetry Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Acoustic Biomarkers (Hybrid ONNX + DSP)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">YIN • Micro-Tremor • Onsets</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Pitch (F0)</div>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                {biomarkers.pitch_hz} <span className="text-[10px] text-slate-400 font-normal">Hz</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {biomarkers.pitch_hz > 240 ? 'Acute elevation' : 'Baseline vocal zone'}
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Jitter/Tremor</div>
              <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                {biomarkers.jitter_tremor_pct} <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {biomarkers.jitter_tremor_pct > 3.0 ? 'High tremor' : 'Normal jitter'}
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Speech Rate</div>
              <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                {biomarkers.speech_rate_sps} <span className="text-[10px] text-slate-400 font-normal">sps</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Syllables / sec
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Loudness (RMS)</div>
              <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                {biomarkers.rms_energy_db} <span className="text-[10px] text-slate-400 font-normal">dB</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Decibels FS
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">VAD Speech</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                {Math.round((biomarkers.voice_activity_ratio ?? 0.85) * 100)} <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Silero VAD Ratio
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Confidence</div>
              <div className="text-base font-bold font-mono text-purple-300 mt-0.5">
                {Math.round((biomarkers.confidence_score ?? 0.90) * 100)} <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Forensic Rating
              </div>
            </div>
          </div>

          <div className="bg-cyan-950/40 border border-cyan-800/60 p-2 rounded-xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs text-cyan-200 font-medium">
              Diagnostic Tag: <strong className="text-white font-semibold">{biomarkers.vocal_anomaly}</strong>
            </span>
          </div>
        </div>

        {/* Emotion Timeline Strip with Synced Cursor */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-200">
              Temporal Emotion Timeline (2.5s Slices)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {timeline.length} segments analyzed
            </span>
          </div>

          <div className="relative">
            <div className="flex gap-1.5 h-8 w-full bg-cyber-dark p-1 rounded-lg border border-cyber-border/70 overflow-hidden">
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

            {/* Real-time playback cursor line */}
            {isPlayingAudio && audioDurationSec > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md shadow-white transition-all pointer-events-none"
                style={{ left: `${Math.min(100, (audioPlaybackSec / audioDurationSec) * 100)}%` }}
              ></div>
            )}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.0s</span>
            <span>{timeline.length > 0 ? `${timeline[timeline.length - 1].end_sec}s` : '0.0s'}</span>
          </div>
        </div>

        {/* Redacted Call Transcript Box */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-3.5 space-y-2">
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

          <div className="bg-cyber-dark/80 border border-cyber-border/80 p-3 rounded-lg text-xs leading-relaxed text-slate-200 min-h-[65px]">
            {renderHighlightedTranscript(transcript.raw_redacted, transcript.detected_keywords)}
          </div>

          {transcript.detected_keywords && transcript.detected_keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Threat Vectors:</span>
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
