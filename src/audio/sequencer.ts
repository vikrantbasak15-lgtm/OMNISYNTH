import type { Step } from './types';
export const STEPS = 16;
export const createPattern = (): Step[] => Array.from({ length: STEPS }, (_, i) => ({ active: [0, 4, 8, 12].includes(i), note: 60, velocity: 0.8 }));
