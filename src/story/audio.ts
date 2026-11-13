import type { AmbienceName, AudioCue } from "./types";
export type AmbienceLevels = Partial<Record<AmbienceName, number>>;

/** Unpitched winter sound; narration prefers recordings, with browser speech as fallback. */
export class StoryAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private crackle: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = false;
  private hidden = false;
  private lastLevels = { wind: -1, crackle: -1 };
  private suspendTimer = 0;
  private voiceTimer = 0;
  private utterance: SpeechSynthesisUtterance | null = null;
  private recording: HTMLAudioElement | null = null;
  private recordingActive = false;
  private resumeRecording = false;
  private pending: { id: string; text: string } | null = null;
  private spokenId = "";
  private disposed = false;
  private speechInitialized = false;

  constructor(
    private readonly onNotice: (message: string) => void = () => undefined,
    private readonly tracks: Readonly<Record<string, string>> = {},
  ) {}
  get isEnabled(): boolean { return this.enabled; }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    if (this.suspendTimer) window.clearTimeout(this.suspendTimer);
    this.suspendTimer = 0;
    if (!enabled) {
      this.stopNarration();
      this.onNotice("");
      this.fadeMaster(0);
      const context = this.context;
      if (context) this.suspendTimer = window.setTimeout(() => {
        if (!this.enabled && context.state === "running") void context.suspend().catch(() => undefined);
      }, 250);
      return;
    }
    try {
      this.ensureGraph();
      if (!this.context) return; // Speech can still work without Web Audio.
      await this.context.resume();
      this.fadeMaster(this.enabled && !this.hidden ? 0.65 : 0);
    } catch {
      // Do not disable a working narrator if ambience cannot start.
      this.onNotice("Background sound could not start. You can still read the story.");
    }
  }

  updateAmbience(levels: AmbienceLevels): void {
    const target = (name: AmbienceName, node: GainNode | null, scale: number) => {
      if (!node || !this.context) return;
      const duck = this.utterance || this.recordingActive ? 0.4 : 1;
      const next = this.enabled && !this.hidden ? Math.max(0, levels[name] ?? 0) * scale * duck : 0;
      if (Math.abs(next - this.lastLevels[name]) < 0.0005) return;
      this.lastLevels[name] = next;
      node.gain.setTargetAtTime(next, this.context.currentTime, 0.8);
    };
    target("wind", this.wind, 0.12);
    target("crackle", this.crackle, 0.09);
  }

  playCue(cue: AudioCue["id"]): void {
    const context = this.context, master = this.master;
    if (!this.enabled || this.hidden || !context || !master || !this.noiseBuffer || context.state !== "running") return;
    const now = context.currentTime;
    const duration = cue === "strike" ? 0.22 : cue === "out" ? 0.28 : 0.7;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.Q.value = 0.45;
    filter.frequency.setValueAtTime(cue === "strike" ? 2800 : cue === "out" ? 1900 : 520, now);
    filter.frequency.exponentialRampToValueAtTime(cue === "rush" ? 160 : 650, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(cue === "strike" ? 0.22 : 0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(now, Math.random() * 3);
    source.stop(now + duration + 0.02);
  }

  /** A continuous reading per chapter; caption changes never interrupt it. */
  speak(id: string, text: string, replay = false): void {
    if (!this.enabled || this.hidden || this.disposed || (!replay && (id === this.spokenId || id === this.pending?.id))) return;
    this.stopNarration();
    const track = this.tracks[id];
    if (track) {
      // Ordinary media playback does not need an OS/browser speech voice.
      const recording = new Audio(track);
      recording.preload = "none";
      recording.volume = 0.9;
      this.recording = recording;
      this.spokenId = id;
      this.onNotice("");
      recording.onplaying = () => {
        if (this.recording === recording) this.recordingActive = true;
      };
      recording.onended = () => {
        if (this.recording === recording) this.releaseRecording();
      };
      const failed = () => {
        if (this.recording !== recording || !this.enabled || this.disposed) return;
        this.releaseRecording();
        this.spokenId = "";
        this.onNotice("The chapter recording could not play. Select Read chapter to retry.");
      };
      recording.onerror = failed;
      void recording.play().catch(failed);
      return;
    }
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance === "undefined") {
      this.onNotice("Narration is unavailable in this browser. The full story is available as captions.");
      return;
    }
    if (!this.speechInitialized) {
      this.speechInitialized = true;
      window.speechSynthesis.addEventListener("voiceschanged", this.voicesChanged);
      window.speechSynthesis.getVoices();
    }
    this.pending = { id, text };
    this.tryNarration();
  }
  private voicesChanged = (): void => { if (this.pending) this.tryNarration(); };

  private tryNarration(): void {
    if (!this.pending || !this.enabled || this.hidden || this.disposed) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices().filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
    const voice = voices.find((item) => item.localService && /^en[-_]GB/i.test(item.lang))
      ?? voices.find((item) => item.localService) ?? voices.find((item) => item.default) ?? voices[0];
    if (!voice) {
      this.onNotice("Waiting for an English narration voice…");
      if (!this.voiceTimer) this.voiceTimer = window.setTimeout(() => {
        this.voiceTimer = 0;
        if (this.pending && this.enabled) this.onNotice("No English narration voice or chapter recording is available. You can continue reading the captions.");
      }, 3000);
      return;
    }
    if (this.voiceTimer) window.clearTimeout(this.voiceTimer);
    this.voiceTimer = 0;
    const request = this.pending;
    this.pending = null;
    this.spokenId = request.id;
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    this.utterance = utterance;
    this.onNotice("");
    utterance.onend = () => { if (this.utterance === utterance) this.utterance = null; };
    utterance.onerror = (event) => {
      if (this.utterance !== utterance) return;
      this.utterance = null;
      this.spokenId = "";
      if (event.error !== "canceled" && event.error !== "interrupted") {
        this.onNotice("The narrator could not start. Select Read chapter to try again, or continue with captions.");
      }
    };
    synth.resume();
    synth.speak(utterance);
  }

  private stopNarration(): void {
    this.releaseRecording();
    this.pending = null;
    this.spokenId = "";
    this.utterance = null;
    if (this.voiceTimer) window.clearTimeout(this.voiceTimer);
    this.voiceTimer = 0;
    if (this.speechInitialized) window.speechSynthesis?.cancel();
  }

  private releaseRecording(): void {
    const recording = this.recording;
    this.recording = null;
    this.recordingActive = false;
    this.resumeRecording = false;
    if (!recording) return;
    recording.onplaying = recording.onended = recording.onerror = null;
    recording.pause();
    recording.removeAttribute("src");
    recording.load();
  }

  async setDocumentVisible(visible: boolean): Promise<void> {
    this.hidden = !visible;
    if (!this.enabled) return;
    if (visible) {
      const recording = this.recording;
      if (recording && this.resumeRecording) {
        this.resumeRecording = false;
        void recording.play().catch(() => {
          if (this.recording === recording) this.onNotice("Select Read chapter to resume narration.");
        });
      }
      if (this.speechInitialized) window.speechSynthesis?.resume();
      if (this.pending) this.tryNarration();
      await this.context?.resume().catch(() => undefined);
      this.fadeMaster(this.enabled && !this.hidden ? 0.65 : 0);
    } else {
      if (this.recording) {
        this.resumeRecording = !this.recording.paused;
        this.recording.pause();
      }
      if (this.speechInitialized) window.speechSynthesis?.pause();
      this.fadeMaster(0);
      await this.context?.suspend().catch(() => undefined);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopNarration();
    if (this.speechInitialized) window.speechSynthesis?.removeEventListener("voiceschanged", this.voicesChanged);
    if (this.suspendTimer) window.clearTimeout(this.suspendTimer);
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = null;
    this.master = this.wind = this.crackle = null;
    this.noiseBuffer = null;
  }
  private fadeMaster(value: number): void {
    if (this.context && this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.16);
  }

  private ensureGraph(): void {
    if (this.context || typeof window.AudioContext === "undefined") return;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    // Eight-second gusts and irregular fire ticks. No oscillators or pitched effects.
    const length = context.sampleRate * 8;
    const windBuffer = context.createBuffer(1, length, context.sampleRate);
    const fireBuffer = context.createBuffer(1, length, context.sampleRate);
    const rawBuffer = context.createBuffer(1, length, context.sampleRate);
    const wind = windBuffer.getChannelData(0), fire = fireBuffer.getChannelData(0), raw = rawBuffer.getChannelData(0);
    let brown = 0, burst = 0;
    const decay = Math.exp(-1 / (context.sampleRate * 0.008));
    for (let i = 0; i < length; i++) {
      const noise = Math.random() * 2 - 1;
      brown = (brown + noise * 0.025) / 1.025;
      const t = i / context.sampleRate;
      const gust = 0.55 + Math.sin(t * Math.PI / 4) * 0.2 + Math.sin(t * Math.PI / 2) * 0.12;
      wind[i] = brown * 3 * gust;
      if (Math.random() < 7 / context.sampleRate) burst = Math.random() * 0.8;
      burst *= decay;
      fire[i] = noise * (0.018 + burst);
      raw[i] = noise * 0.6;
    }
    const edge = Math.floor(context.sampleRate * 0.08);
    for (let i = 0; i < edge; i++) {
      const fade = i / edge;
      wind[i] *= fade; wind[length - 1 - i] *= fade;
      fire[i] *= fade; fire[length - 1 - i] *= fade;
    }
    this.noiseBuffer = rawBuffer;
    const layer = (buffer: AudioBuffer, frequency: number): GainNode => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = frequency;
      filter.Q.value = 0.3;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(master);
      source.start();
      return gain;
    };
    this.wind = layer(windBuffer, 700);
    this.crackle = layer(fireBuffer, 3100);
  }
}
