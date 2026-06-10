// Seeded RNG living inside GameState (§11). mulberry32: tiny, deterministic,
// state is a single uint32 so it serializes/hashes trivially.

export function nextRng(state: number): { value: number; state: number } {
  let a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a };
}

/** Returns integer in [0, n) and the advanced rng state. */
export function rngInt(state: number, n: number): { value: number; state: number } {
  const r = nextRng(state);
  return { value: Math.floor(r.value * n), state: r.state };
}

/** Deterministic Fisher–Yates shuffle; returns new array + advanced state. */
export function rngShuffle<T>(state: number, arr: readonly T[]): { value: T[]; state: number } {
  const out = arr.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = rngInt(s, i + 1);
    s = r.state;
    [out[i], out[r.value]] = [out[r.value], out[i]];
  }
  return { value: out, state: s };
}
