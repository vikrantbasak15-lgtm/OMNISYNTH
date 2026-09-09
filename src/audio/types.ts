export type Waveform = OscillatorType;

export interface Patch {
  id: string;
  name: string;
  waveform: Waveform;
  cutoff: number;
  resonance: number;
  attack: number;
  release: number;
  gain: number;
  detune: number;
  drive: number;
}

export interface Step { active: boolean; note: number; velocity: number; }

export const DEFAULT_PATCH: Patch = { id: 'init', name: 'Init Saw', waveform: 'sawtooth', cutoff: 2200, resonance: 2, attack: 0.012, release: 0.22, gain: 0.18, detune: 8, drive: 0 };
