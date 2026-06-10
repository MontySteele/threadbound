// Witness line selection (§10, §13.3): seeded random draw from per-context
// pools with no-repeat-within-run. Exhausted pools go silent — never echo.

import { GameState } from './types';
import { rngInt } from './rng';
import { WITNESS_LINES, WitnessContext } from './content/witness';

export function sayWitness(state: GameState, context: WitnessContext): void {
  const fresh = WITNESS_LINES[context].filter((l) => !state.witnessSaid.includes(l));
  if (fresh.length === 0) return;
  const r = rngInt(state.rng, fresh.length);
  state.rng = r.state;
  const line = fresh[r.value];
  state.witnessSaid.push(line);
  state.log.push({ e: 'witness', line });
}

/** Probability gate for combat commentary (~25% of combats, §13.3). */
export function maybeSayWitness(state: GameState, context: WitnessContext, chancePct: number): void {
  const r = rngInt(state.rng, 100);
  state.rng = r.state;
  if (r.value < chancePct) sayWitness(state, context);
}
