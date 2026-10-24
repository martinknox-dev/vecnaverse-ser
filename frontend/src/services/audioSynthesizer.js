/**
 * VECNA-Pulse Playable Cybercrime Audio Synthesizer & Synced Playback Engine
 * Plays backend WAV files or synthesizes realistic emergency distress calls with Web Audio
 * telephone filters and Web Speech API synchronized with the SER emotion timeline.
 */

class CyberAudioPlayer {
  constructor() {
    this.audioElement = null;
    this.speechUtterance = null;
    this.audioCtx = null;
    this.noiseNode = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 10;
    this.timeUpdateCallback = null;
    this.endedCallback = null;
    this.intervalId = null;
    this.volume = 0.8;
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0.05 * this.volume;
        this.gainNode.connect(this.audioCtx.destination);
      }
    }
  }

  startTelephoneStatic() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      // Create white noise buffer
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Telephone bandpass filter (300Hz - 3400Hz)
      const bandpass = this.audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1200;
      bandpass.Q.value = 1.0;

      whiteNoise.connect(bandpass);
      bandpass.connect(this.gainNode);
      whiteNoise.start(0);
      this.noiseNode = whiteNoise;
    } catch (e) {}
  }

  stopTelephoneStatic() {
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch (e) {}
      this.noiseNode = null;
    }
  }

  async playScenario(scenario, onTimeUpdate, onEnded) {
    this.stop();
    this.timeUpdateCallback = onTimeUpdate;
    this.endedCallback = onEnded;

    const callId = scenario.call_id || 'CALL-2026-0891';
    let sampleUrl = `/api/sample-audio/${scenario.dominant_emotion || 'panic_victim'}`;
    if (callId.includes('0891')) sampleUrl = '/api/sample-audio/panic_victim';
    else if (callId.includes('0892')) sampleUrl = '/api/sample-audio/nervous_caller';
    else if (callId.includes('0893')) sampleUrl = '/api/sample-audio/angry_caller';
    else if (callId.includes('0894')) sampleUrl = '/api/sample-audio/nervous_caller';

    // Try HTML5 Audio from backend
    try {
      const audio = new Audio(sampleUrl);
      audio.volume = this.volume;
      this.audioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.isPlaying = true;
        this.duration = audio.duration || 10;

        audio.ontimeupdate = () => {
          this.currentTime = audio.currentTime;
          this.duration = audio.duration || this.duration;
          if (this.timeUpdateCallback) {
            this.timeUpdateCallback(this.currentTime, this.duration);
          }
        };

        audio.onended = () => {
          this.stop();
          if (this.endedCallback) this.endedCallback();
        };
        return;
      }
    } catch (e) {
      // Backend audio unreachable; fallback to speech synthesizer + static
    }

    // Synthesizer Fallback: Web Speech API + Telephone line hum
    this.startTelephoneStatic();
    this.isPlaying = true;
    const textToSpeak = scenario.transcript?.raw_redacted || 'Emergency cybercrime distress call in progress.';
    this.duration = Math.max(8, textToSpeak.length * 0.07);
    this.currentTime = 0;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToSpeak.replace(/\[REDACTED-[A-Za-z]+\]/g, 'hidden'));
      utter.rate = scenario.dominant_emotion === 'fear' ? 1.2 : 1.05;
      utter.pitch = scenario.dominant_emotion === 'fear' ? 1.35 : 1.1;
      utter.volume = this.volume;

      utter.onend = () => {
        this.stop();
        if (this.endedCallback) this.endedCallback();
      };

      utter.onerror = () => {
        this.stop();
        if (this.endedCallback) this.endedCallback();
      };

      window.speechSynthesis.speak(utter);
      this.speechUtterance = utter;
    }

    // Interval to drive time updates
    const startMs = Date.now();
    this.intervalId = setInterval(() => {
      this.currentTime = (Date.now() - startMs) / 1000;
      if (this.currentTime >= this.duration) {
        this.stop();
        if (this.endedCallback) this.endedCallback();
      } else if (this.timeUpdateCallback) {
        this.timeUpdateCallback(this.currentTime, this.duration);
      }
    }, 100);
  }

  async playUploadedFile(file, onTimeUpdate, onEnded) {
    this.stop();
    this.timeUpdateCallback = onTimeUpdate;
    this.endedCallback = onEnded;

    const fileUrl = URL.createObjectURL(file);
    const audio = new Audio(fileUrl);
    audio.volume = this.volume;
    this.audioElement = audio;

    await audio.play();
    this.isPlaying = true;
    this.duration = audio.duration || 10;

    audio.ontimeupdate = () => {
      this.currentTime = audio.currentTime;
      this.duration = audio.duration || this.duration;
      if (this.timeUpdateCallback) {
        this.timeUpdateCallback(this.currentTime, this.duration);
      }
    };

    audio.onended = () => {
      this.stop();
      URL.revokeObjectURL(fileUrl);
      if (this.endedCallback) this.endedCallback();
    };
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if ('speechSynthesis' in window && this.speechUtterance) {
      window.speechSynthesis.pause();
    }
    this.stopTelephoneStatic();
    if (this.intervalId) clearInterval(this.intervalId);
    this.isPlaying = false;
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play();
      this.isPlaying = true;
    } else if ('speechSynthesis' in window && this.speechUtterance) {
      window.speechSynthesis.resume();
      this.startTelephoneStatic();
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
      this.audioElement = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      this.speechUtterance = null;
    }
    this.stopTelephoneStatic();
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    this.currentTime = 0;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) this.audioElement.volume = this.volume;
    if (this.gainNode) this.gainNode.gain.value = 0.05 * this.volume;
  }
}

export const cyberAudioPlayer = new CyberAudioPlayer();
