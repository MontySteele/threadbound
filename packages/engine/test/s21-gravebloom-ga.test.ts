// S21.5 (g-a, designer-ruled 2026-07-07): gravebloom's detonate-side rider.
// The S18-D5 enumeration left three axes unruled (the S13.2 law blocks
// raising its Hex numbers); the designer ruled g-a — a rider that fires on
// the detonation the partner's kit already wants, inside the ≤2 law (flat,
// per-turn-capped; the covenant CI checks every hook independently). The
// partnerLinkFired identity hook is untouched, and the two hooks charge
// independently (distinct oncePerTurn keys per event).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { runHooks, startCombat } from '../src/combat';
import { POWERS } from '../src/content/powers';

function combatState(seed = 5150): GameState {
  const s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
  startCombat(s, ['mourner', 'warden_of_the_crossing']);
  s.players.p1.powers.push('gravebloom');
  return s;
}

const hexes = (s: GameState): number[] => s.combat!.enemies.map((e) => e.hex);

describe('S21.5 g-a: gravebloom answers the detonation', () => {
  it('the shape holds the S13.2 law: two hooks, both hexAll ≤ 2, both per-turn-capped', () => {
    const def = POWERS.gravebloom;
    expect(def.hooks!.length).toBe(2);
    for (const hook of def.hooks!) {
      expect(hook.oncePerTurn).toBe(true);
      for (const eff of hook.effects) {
        expect(eff.op).toBe('hexAll');
        expect(eff.amount).toBeLessThanOrEqual(2);
      }
    }
    expect(def.hooks!.map((h) => h.on).sort()).toEqual(['detonate', 'partnerLinkFired']);
  });

  it('a detonation blooms 2 Hex to ALL, once per turn — and the partner-link hook charges separately', () => {
    const s = combatState();
    const before = hexes(s);
    runHooks(s, 'p1', 'detonate');
    expect(hexes(s)).toEqual(before.map((h) => h + 2));
    // second detonation the same turn: the rider is spent
    runHooks(s, 'p1', 'detonate');
    expect(hexes(s)).toEqual(before.map((h) => h + 2));
    // the identity hook is an INDEPENDENT charge (distinct oncePerTurn key)
    runHooks(s, 'p1', 'partnerLinkFired');
    expect(hexes(s)).toEqual(before.map((h) => h + 4));
  });

  it('the rider recharges at turn start, like every oncePerTurn hook', () => {
    const s = combatState();
    runHooks(s, 'p1', 'detonate');
    const after1 = hexes(s);
    s.combat!.hookOnceFired = []; // what startTurn does for hook charges
    runHooks(s, 'p1', 'detonate');
    expect(hexes(s)).toEqual(after1.map((h) => h + 2));
  });
});
