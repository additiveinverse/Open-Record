export const LISTENING = "Making record.";
export const SAVED = "Record saved.";

// Spoken after each captured utterance; keep short so they don't interrupt the thought.
export const ACKS = ["Go on."];

export const REPROMPTS = ["I'm still listening."];

export type Rng = () => number;

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}
