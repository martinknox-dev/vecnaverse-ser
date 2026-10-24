/**
 * Voice Audio Playback & Real-Time Synced Speech Engine
 * Speaks scenario transcripts clearly using natural browser speech synthesis
 * and plays uploaded audio files cleanly with zero siren/noise distortion.
 */

class CyberAudioPlayer {
  constructor() {
    this.audioElement = null;
    this.speechUtterance = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 10;
    this.timeUpdateCallback = null;
    this.endedCallback = null;
    this.intervalId = null;
    this.volume = 0.9;
  }

  cleanSpokenText(raw) {
    if (!raw) return 'Emergency call audio stream in progress.';
    // Replace redacted tokens with smooth spoken words
    return raw
      .replace(/\[REDACTED-PHONE\]/gi, 'masked phone number')
      .replace(/\[REDACTED-Aadhaar\]/gi, 'masked identity number')
      .replace(/\[REDACTED-OTP\]/gi, 'one time password')
      .replace(/\[REDACTED-ACCT\]/gi, 'bank account number')
      .replace(/₹(\d+)/g, '$1 rupees')
      .trim();
  }

  getBestVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    // Prefer English voices with natural quality
    const enVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('David') ||
          v.name.includes('Jenny') ||
          v.name.includes('Zira'))
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
    return enVoice || null;
  }

  async playScenario(scenario, onTimeUpdate, onEnded) {
    this.stop();
    this.timeUpdateCallback = onTimeUpdate;
    this.endedCallback = onEnded;

    const rawText = scenario.transcript?.raw_redacted || 'Emergency response call in progress.';
    const textToSpeak = this.cleanSpokenText(rawText);

    if (!('speechSynthesis' in window)) {
      this.isPlaying = false;
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      const voice = this.getBestVoice();
      if (voice) utter.voice = voice;

      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = this.volume;

      // Estimate duration based on word count (~150 words per minute)
      const wordCount = textToSpeak.split(/\s+/).length;
      this.duration = Math.max(5, Math.round((wordCount / 140) * 60));
      this.currentTime = 0;
      this.isPlaying = true;

      const startTime = Date.now();
      this.intervalId = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        this.currentTime = Math.min(this.duration, elapsed);
        if (this.timeUpdateCallback) {
          this.timeUpdateCallback(this.currentTime, this.duration);
        }
      }, 100);

      utter.onend = () => {
        this.stop();
        if (this.endedCallback) this.endedCallback();
      };

      utter.onerror = () => {
        this.stop();
        if (this.endedCallback) this.endedCallback();
      };

      this.speechUtterance = utter;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      this.stop();
    }
  }

  async playUploadedFile(file, onTimeUpdate, onEnded) {
    this.stop();
    this.timeUpdateCallback = onTimeUpdate;
    this.endedCallback = onEnded;

    try {
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
    } catch (e) {
      this.stop();
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if ('speechSynthesis' in window && this.speechUtterance) {
      window.speechSynthesis.pause();
    }
    if (this.intervalId) clearInterval(this.intervalId);
    this.isPlaying = false;
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play();
      this.isPlaying = true;
    } else if ('speechSynthesis' in window && this.speechUtterance) {
      window.speechSynthesis.resume();
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
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    this.currentTime = 0;
  }

  seek(timeSec) {
    this.currentTime = timeSec;
    if (this.audioElement) {
      this.audioElement.currentTime = timeSec;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) this.audioElement.volume = this.volume;
  }
}

export const cyberAudioPlayer = new CyberAudioPlayer();
