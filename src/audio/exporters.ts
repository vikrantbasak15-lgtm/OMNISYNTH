import { Mp3Encoder } from 'lamejs';
import type { Patch, Step } from './types';

export interface RenderProject { patch: Patch; pattern: Step[]; kicks: boolean[]; hats: boolean[]; snares?: boolean[]; tempo: number; }

const sampleRate = 44100;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

function oscillator(phase: number, type: OscillatorType) {
  const cycle = phase - Math.floor(phase);
  if (type === 'sine') return Math.sin(phase * Math.PI * 2);
  if (type === 'square') return cycle < .5 ? 1 : -1;
  if (type === 'triangle') return 1 - 4 * Math.abs(Math.round(cycle) - cycle);
  return 2 * cycle - 1;
}

/** Renders the local 16-step session without sending any audio to a server. */
export function renderProject(project: RenderProject) {
  const secondsPerStep = 60 / project.tempo / 4;
  const totalFrames = Math.ceil((project.pattern.length * secondsPerStep + 1.2) * sampleRate);
  const output = new Float32Array(totalFrames);
  const add = (start: number, duration: number, callback: (t: number) => number) => {
    const end = Math.min(totalFrames, start + Math.floor(duration * sampleRate));
    for (let frame = start; frame < end; frame++) output[frame] += callback((frame - start) / sampleRate);
  };
  project.pattern.forEach((step, index) => {
    const start = Math.floor(index * secondsPerStep * sampleRate);
    if (step.active) {
      const duration = Math.min(secondsPerStep * .88, Math.max(.06, project.patch.release + .18));
      const frequency = hz(step.note);
      add(start, duration, time => {
        const attack = Math.min(1, time / Math.max(.005, project.patch.attack));
        const release = Math.max(.0001, 1 - Math.max(0, time - duration * .54) / Math.max(.01, duration * .46));
        const detuned = oscillator(time * frequency * (1 + project.patch.detune / 12000), project.patch.waveform) * .25;
        const raw = oscillator(time * frequency, project.patch.waveform) + detuned;
        return Math.tanh(raw * (1 + project.patch.drive * 12)) * attack * release * step.velocity * project.patch.gain;
      });
    }
    if (project.kicks[index]) add(start, .19, time => Math.sin(Math.PI * 2 * (145 * Math.exp(-time * 12)) * time) * Math.exp(-time * 26) * .52);
    if (project.snares?.[index]) add(start, .14, time => (Math.random() * 2 - 1) * Math.exp(-time * 24) * .18);
    if (project.hats[index]) add(start, .065, time => (Math.random() * 2 - 1) * Math.exp(-time * 78) * .09);
  });
  for (let i = 0; i < output.length; i++) output[i] = clamp(output[i]);
  return output;
}

export function wavBlob(samples: Float32Array) {
  const buffer = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(clamp(sample) * 32767), true));
  return new Blob([buffer], { type: 'audio/wav' });
}

export function mp3Blob(samples: Float32Array) {
  const encoder = new Mp3Encoder(1, sampleRate, 192); const pcm = new Int16Array(samples.length);
  samples.forEach((sample, index) => { pcm[index] = Math.round(clamp(sample) * 32767); });
  const chunks: Int8Array[] = [];
  for (let offset = 0; offset < pcm.length; offset += 1152) { const chunk = encoder.encodeBuffer(pcm.subarray(offset, Math.min(offset + 1152, pcm.length))); if (chunk.length) chunks.push(chunk); }
  const end = encoder.flush(); if (end.length) chunks.push(end);
  return new Blob(chunks.map(chunk => chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer), { type: 'audio/mpeg' });
}

const variable = (value: number) => { const bytes = [value & 0x7f]; while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80); return bytes; };
const u32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];

export function midiBlob(pattern: Step[], tempo: number) {
  const track = [0, 0xff, 0x51, 3, ...u32(Math.round(60_000_000 / tempo)).slice(1), 0, 0xc0, 0]; let lastTick = 0;
  pattern.forEach((step, index) => { if (!step.active) return; const tick = index * 120; track.push(...variable(tick - lastTick), 0x90, step.note, Math.round(step.velocity * 100)); track.push(...variable(92), 0x80, step.note, 0); lastTick = tick + 92; });
  track.push(0, 0xff, 0x2f, 0); const bytes = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0, 0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track]);
  return new Blob([bytes], { type: 'audio/midi' });
}

export async function midiPattern(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer()); if (String.fromCharCode(...bytes.slice(0, 4)) !== 'MThd') throw new Error('That is not a Standard MIDI file.');
  const steps: Step[] = Array.from({ length: 16 }, () => ({ active: false, note: 60, velocity: .8 })); const ticks = (bytes[12] << 8) | bytes[13]; let index = 14;
  while (index + 8 < bytes.length) { if (String.fromCharCode(...bytes.slice(index, index + 4)) !== 'MTrk') break; const length = (bytes[index + 4] << 24) | (bytes[index + 5] << 16) | (bytes[index + 6] << 8) | bytes[index + 7]; let cursor = index + 8, end = cursor + length, time = 0, status = 0; while (cursor < end) { let delta = 0, byte; do { byte = bytes[cursor++]; delta = (delta << 7) | (byte & 0x7f); } while (byte & 0x80); time += delta; let command = bytes[cursor++]; if (command < 0x80) { cursor--; command = status; } else status = command; if (command === 0xff) { cursor++; const size = bytes[cursor++]; cursor += size; continue; } const type = command & 0xf0; const note = bytes[cursor++]; const velocity = bytes[cursor++]; if (type === 0x90 && velocity > 0) { const step = Math.min(15, Math.round(time / Math.max(1, ticks / 4))); steps[step] = { active: true, note, velocity: velocity / 127 }; } } index = end; }
  return steps;
}
