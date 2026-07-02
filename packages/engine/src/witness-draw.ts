// Witness line selection (§10, §13.3): seeded random draw from per-context
// pools with no-repeat-within-run. Exhausted pools go silent — never echo.
// M2 pools/expansions (m2-world.ts) are merged at load; S2.1 adds the solo
// pools (witness-solo.ts), which only ever fire when state.botSeat is set.

import { GameState } from './types';
import { rngInt } from './rng';
import { WITNESS_LINES as M1_LINES } from './content/witness';
import { M2_WITNESS } from './content/m2-world';
import { SOLO_WITNESS } from './content/witness-solo';

export const WITNESS_POOLS: Record<string, string[]> = {};
for (const [ctx, lines] of Object.entries(M1_LINES)) WITNESS_POOLS[ctx] = [...lines];
for (const [ctx, lines] of Object.entries(M2_WITNESS)) {
  WITNESS_POOLS[ctx] = [...(WITNESS_POOLS[ctx] ?? []), ...lines];
}
for (const [ctx, lines] of Object.entries(SOLO_WITNESS)) {
  WITNESS_POOLS[ctx] = [...(WITNESS_POOLS[ctx] ?? []), ...lines];
}

export function sayWitness(state: GameState, context: string): void {
  const pool = WITNESS_POOLS[context] ?? [];
  const fresh = pool.filter((l) => !state.witnessSaid.includes(l));
  if (fresh.length === 0) return;
  const r = rngInt(state.rng, fresh.length);
  state.rng = r.state;
  const line = fresh[r.value];
  state.witnessSaid.push(line);
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
