// Witness line selection (§10, §13.3): seeded random draw from per-context
// pools with no-repeat-within-run. Exhausted pools go silent — never echo.
// M2 pools/expansions (m2-world.ts) are merged at load; S2.1 adds the solo
// pools (witness-solo.ts), which only ever fire when state.botSeat is set.
//
// S8.7 voice arc: pools may carry codex-percentage-keyed REGISTERS (lore
// bible §4 — sardonic collector early, quieter and more deliberate as the
// profile's codex fills). Register selection is a pure function of
// state.codexPct (set once at START_RUN) — it consumes NO extra rng, and a
// run with codexPct absent/0 draws from base pools byte-identically to
// pre-S8.7 behavior (held by the tracks-covenant golden).

import { GameState } from './types';
import { rngInt } from './rng';
import { WITNESS_LINES as M1_LINES, S8_WITNESS, WITNESS_REGISTERS } from './content/witness';
import { M2_WITNESS } from './content/m2-world';
import { SOLO_WITNESS } from './content/witness-solo';
import { S9C_WITNESS } from './content/witness-s9c';
import { S13_WITNESS } from './content/witness-s13';

export interface WitnessRegister {
  /** lowest codex fill % (0–100) at which this register speaks */
  minPct: number;
  lines: string[];
}

export interface RegisteredPool {
  base: string[];
  registers?: WitnessRegister[];
}

export type WitnessPool = string[] | RegisteredPool;

export const WITNESS_POOLS: Record<string, WitnessPool> = {};
const mergeLines = (ctx: string, lines: string[]): void => {
  const existing = WITNESS_POOLS[ctx];
  const prior = existing === undefined ? [] : Array.isArray(existing) ? existing : existing.base;
  WITNESS_POOLS[ctx] = [...prior, ...lines];
};
for (const [ctx, lines] of Object.entries(M1_LINES)) mergeLines(ctx, lines);
for (const [ctx, lines] of Object.entries(M2_WITNESS)) mergeLines(ctx, lines);
for (const [ctx, lines] of Object.entries(SOLO_WITNESS)) mergeLines(ctx, lines);
for (const [ctx, lines] of Object.entries(S8_WITNESS)) mergeLines(ctx, lines);
for (const [ctx, lines] of Object.entries(S9C_WITNESS)) mergeLines(ctx, lines);
for (const [ctx, lines] of Object.entries(S13_WITNESS)) mergeLines(ctx, lines);
for (const [ctx, registers] of Object.entries(WITNESS_REGISTERS)) {
  const existing = WITNESS_POOLS[ctx];
  const base = existing === undefined ? [] : Array.isArray(existing) ? existing : existing.base;
  WITNESS_POOLS[ctx] = {
    base,
    registers: [...registers].sort((a, b) => a.minPct - b.minPct),
  };
}

/** The lines a pool offers at a given codex fill: the highest register whose
 *  minPct <= codexPct, else base. Pure — no rng, no state. */
export function poolLines(pool: WitnessPool | undefined, codexPct: number): string[] {
  if (pool === undefined) return [];
  if (Array.isArray(pool)) return pool;
  let lines = pool.base;
  for (const reg of pool.registers ?? []) {
    if (reg.minPct <= codexPct) lines = reg.lines; // sorted ascending — last applicable wins
  }
  return lines;
}

/** Client-side convenience (App.tsx lobby greeting etc.): the pool's lines at
 *  a codex fill, defaulting to the base register. */
export function witnessPoolLines(context: string, codexPct = 0): string[] {
  return poolLines(WITNESS_POOLS[context], codexPct);
}

/** Draw a line. `vars` substitutes {token} placeholders into the SPOKEN line;
 *  no-repeat tracking keys on the raw template, so a 4-line templated pool
 *  still serves both seats distinct lines. */
export function sayWitness(state: GameState, context: string, vars?: Record<string, string>): void {
  const lines = poolLines(WITNESS_POOLS[context], state.codexPct ?? 0);
  const fresh = lines.filter((l) => !state.witnessSaid.includes(l));
  if (fresh.length === 0) return;
  const r = rngInt(state.rng, fresh.length);
  state.rng = r.state;
  const template = fresh[r.value];
  state.witnessSaid.push(template);
  const line = vars ? template.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : template;
  state.log.push({ e: 'witness', line });
}

/** Probability gate for combat commentary (~25% of combats, §13.3). */
export function maybeSayWitness(state: GameState, context: string, chancePct: number): void {
  const r = rngInt(state.rng, 100);
  state.rng = r.state;
  if (r.value < chancePct) sayWitness(state, context);
}

/** S2.1 — the solo profile's chattier combat voice. No-op outside solo runs,
 *  so co-op cadence (and its rng stream) is untouched by construction. Capped
 *  at 2–3 lines per combat so it stays a partner, not a podcast. */
export const SOLO_COMBAT_LINE_CAP = 3;

export function maybeSaySolo(state: GameState, context: string, chancePct: number): void {
  if (!state.botSeat) return;
  const combat = state.combat;
  if (combat && (combat.witnessLines ?? 0) >= SOLO_COMBAT_LINE_CAP) return;
  const r = rngInt(state.rng, 100);
  state.rng = r.state;
  if (r.value >= chancePct) return;
  const before = state.witnessSaid.length;
  sayWitness(state, context);
  if (combat && state.witnessSaid.length > before) {
    combat.witnessLines = (combat.witnessLines ?? 0) + 1;
  }
}
