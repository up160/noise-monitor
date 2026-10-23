/**
 * Noise monitor: analysis core.
 *
 * Turns per-second sound-level readings into windowed levels, detected music sessions and a
 * report. Capture from a microphone is out of scope for this phase; everything here runs on
 * recorded or synthetic readings. Plain JavaScript with no dependencies, so `npm test` needs
 * no install step.
 */
export const projectName = "noise-monitor";
