// S14.2 (sweep B13, per R7): enemies whose OWN script moves tethers (a
// sever intent) are exempt from the §14.8 every-3rd-turn auto-retether —
// the cadence exists to un-park fights those enemies already un-park, and
// the two cancelling in one enemy phase logged as a contradiction
// (seed-1007). Small behavior change accepted knowingly in the ruling.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';

/** Combat at the cadence turn (turn % 3 === 0), both seats passing an empty
 *  chain so the enemy phase is the only actor. The enemy starts bound to
 *  p1; the cadence (when it applies) walks the binding to p2. */
function enemyPhaseAtCadence(defId: string): { before: 'p1'; after: string | null } {
  const s0 = initialState(77, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed: 77 });
  startCombat(s, [defId]);
  const enemy = s.combat!.enemies[0];
  enemy.boundTo = 'p1';
  // pin a harmless intent so the enemy's own action can't move the tether
  // or end the fight — the cadence is the only tether-mover in the phase
  enemy.intent = { kind: 'block', amount: 1 };
  s.combat!.turn = 3;
  let t = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
  t = reduce(t, { type: 'SET_READY', player: 'p2', ready: true });
  return { before: 'p1', after: t.combat?.enemies[0]?.boundTo ?? null };
}

describe('S14.2 B13: §14.8 auto-retether exemption', () => {
  it('a plain elite still re-tethers on the cadence turn', () => {
    expect(enemyPhaseAtCadence('mourner').after).toBe('p2');
  });

  it('a tether-moving enemy (Warden of the Crossing) is exempt', () => {
    expect(enemyPhaseAtCadence('warden_of_the_crossing').after).toBe('p1');
  });

  it('the Bellkeeper (act-2 sever intent) is exempt too — the rule is def-driven', () => {
    expect(enemyPhaseAtCadence('bellkeeper').after).toBe('p1');
  });
});
