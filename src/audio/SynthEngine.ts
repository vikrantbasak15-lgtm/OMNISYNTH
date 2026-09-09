import type { Patch } from './types';

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Lightweight, polyphonic subtractive synth using the browser's native audio graph. */
export class SynthEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private synthBus?: GainNode;
  private drumBus?: GainNode;
  private output?: GainNode;
  private analyser?: AnalyserNode;
  private waveform?: Uint8Array<ArrayBuffer>;
  private spectrum?: Uint8Array<ArrayBuffer>;
  private sampleBuffer?: AudioBuffer;
  private recordingDestination?: MediaStreamAudioDestinationNode;
  private delay?: DelayNode;
  private delayWet?: GainNode;
  private voices = new Map<number, { osc: OscillatorNode; osc2: OscillatorNode; amp: GainNode }>();

  async start() {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = 0.7;
      this.synthBus = this.context.createGain(); this.drumBus = this.context.createGain();
      this.synthBus.gain.value = .9; this.drumBus.gain.value = .9;
      this.synthBus.connect(this.master); this.drumBus.connect(this.master);
      this.output = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = .72;
      this.waveform = new Uint8Array(this.analyser.fftSize);
      this.spectrum = new Uint8Array(this.analyser.frequencyBinCount);
      this.master.connect(this.output);
      this.output.connect(this.analyser).connect(this.context.destination);
      this.delay = this.context.createDelay(1);
      const feedback = this.context.createGain();
      this.delayWet = this.context.createGain();
      this.delay.delayTime.value = .24; feedback.gain.value = .32; this.delayWet.gain.value = 0;
      this.master.connect(this.delay); this.delay.connect(feedback).connect(this.delay); this.delay.connect(this.delayWet).connect(this.output);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  noteOn(midi: number, patch: Patch, velocity = 0.8) {
    if (!this.context || !this.master) return;
    this.noteOff(midi, patch);
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    const blend = this.context.createGain();
    const shaper = this.context.createWaveShaper();
    osc.type = patch.waveform;
    osc.frequency.setValueAtTime(hz(midi), now);
    osc2.type = patch.waveform;
    osc2.frequency.setValueAtTime(hz(midi), now);
    osc2.detune.value = patch.detune;
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(patch.cutoff, now); filter.Q.value = patch.resonance;
    blend.gain.value = .28;
    if (patch.drive > 0) {
      const curve = new Float32Array(256); const amount = patch.drive * 16;
      for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = Math.tanh(x * (1 + amount)); }
      shaper.curve = curve; shaper.oversample = '2x';
    }
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, patch.gain * velocity), now + patch.attack);
    osc.connect(filter); osc2.connect(blend).connect(filter); filter.connect(shaper).connect(amp).connect(this.synthBus!);
    osc.start(); osc2.start(); this.voices.set(midi, { osc, osc2, amp });
  }

  noteOff(midi: number, patch: Patch) {
    const voice = this.voices.get(midi); if (!voice || !this.context) return;
    const now = this.context.currentTime;
    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setValueAtTime(Math.max(0.0001, voice.amp.gain.value), now);
    voice.amp.gain.exponentialRampToValueAtTime(0.0001, now + patch.release);
    voice.osc.stop(now + patch.release + 0.03); voice.osc2.stop(now + patch.release + 0.03); this.voices.delete(midi);
  }

  allNotesOff(patch: Patch) { [...this.voices.keys()].forEach(note => this.noteOff(note, patch)); }

  setMasterGain(value: number) {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, 0.015);
  }

  setDelay(amount: number) {
    if (!this.context || !this.delayWet) return;
    this.delayWet.gain.setTargetAtTime(Math.max(0, Math.min(.45, amount)), this.context.currentTime, .02);
  }

  setSynthGain(value: number) { if (this.context && this.synthBus) this.synthBus.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, .02); }
  setDrumGain(value: number) { if (this.context && this.drumBus) this.drumBus.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, .02); }

  /** A normalized time-domain snapshot for visualizers. No audio data leaves the browser. */
  getWaveform() {
    if (!this.analyser || !this.waveform) return undefined;
    this.analyser.getByteTimeDomainData(this.waveform);
    return this.waveform;
  }

  getSpectrum() { if (!this.analyser || !this.spectrum) return undefined; this.analyser.getByteFrequencyData(this.spectrum); return this.spectrum; }
  getLevel() { const values = this.getWaveform(); if (!values) return 0; let total = 0; values.forEach(value => { const centered = (value - 128) / 128; total += centered * centered; }); return Math.min(1, Math.sqrt(total / values.length) * 2); }

  async loadSample(file: File) { await this.start(); if (!this.context) return; this.sampleBuffer = await this.context.decodeAudioData(await file.arrayBuffer()); }
  hasSample() { return Boolean(this.sampleBuffer); }
  triggerSample(midi = 60) { if (!this.context || !this.sampleBuffer || !this.drumBus) return; const source = this.context.createBufferSource(), gain = this.context.createGain(); source.buffer = this.sampleBuffer; source.playbackRate.value = 2 ** ((midi - 60) / 12); gain.gain.value = .7; source.connect(gain).connect(this.drumBus); source.start(); }
  getRecordingStream() { if (!this.context || !this.output) return undefined; if (!this.recordingDestination) { this.recordingDestination = this.context.createMediaStreamDestination(); this.output.connect(this.recordingDestination); } return this.recordingDestination.stream; }

  kick() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime, osc = this.context.createOscillator(), amp = this.context.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(145, now); osc.frequency.exponentialRampToValueAtTime(48, now + .12);
    amp.gain.setValueAtTime(.5, now); amp.gain.exponentialRampToValueAtTime(.0001, now + .18);
    osc.connect(amp).connect(this.drumBus!); osc.start(now); osc.stop(now + .19);
  }

  hat() {
    if (!this.context || !this.master) return;
    const frames = Math.floor(this.context.sampleRate * .055), buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), amp = this.context.createGain(), now = this.context.currentTime;
    noise.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 6000;
    amp.gain.setValueAtTime(.12, now); amp.gain.exponentialRampToValueAtTime(.0001, now + .05);
    noise.connect(filter).connect(amp).connect(this.drumBus!); noise.start(now);
  }

  snare() {
    if (!this.context || !this.drumBus) return;
    const frames = Math.floor(this.context.sampleRate * .16), buffer = this.context.createBuffer(1, frames, this.context.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), amp = this.context.createGain(), now = this.context.currentTime; noise.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1800; amp.gain.setValueAtTime(.22, now); amp.gain.exponentialRampToValueAtTime(.0001, now + .15); noise.connect(filter).connect(amp).connect(this.drumBus!); noise.start(now);
  }

  clap() { if (!this.context || !this.drumBus) return; [0, .025, .05].forEach(offset => { const frames = Math.floor(this.context!.sampleRate * .06), buffer = this.context!.createBuffer(1, frames, this.context!.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1; const source = this.context!.createBufferSource(), amp = this.context!.createGain(); source.buffer = buffer; amp.gain.setValueAtTime(.11, this.context!.currentTime + offset); amp.gain.exponentialRampToValueAtTime(.0001, this.context!.currentTime + offset + .06); source.connect(amp).connect(this.drumBus!); source.start(this.context!.currentTime + offset); }); }
}
