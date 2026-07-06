// S16.3.5 (S16-D7 / OQ#45, ruled) — anti-streak single-enemy binding.
// Single-body ELITE/BOSS fights bind toward whichever seat has been bound
// less this run (per-run counter over exactly those assignments); a tie
// keeps the rolled coin, so the debut fight is still a coin flip. The
// `first` roll is consumed either way — the rng stream is byte-identical —
// and multi-enemy split behavior is untouched (binding-bias pinning,
// sprint doc Part 6 gate 1).

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';
import { rngInt } from '../src/rng';

function fresh(seed: number): GameState {
  return reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
}

describe('S16-D7: anti-streak single-enemy binding', () => {
  it('an unequal counter binds the elite to the lesser-bound seat (both directions)', () => {
    for (const [lesser, other] of [['p2', 'p1'], ['p1', 'p2']] as [PlayerId, PlayerId][]) {
      const s = fresh(101);
      s.bindsByPlayer = { [other]: 2, [lesser]: 0 } as Record<PlayerId, number>;
      startCombat(s, ['mourner']); // act-1 elite, one body
      expect(s.combat!.enemies[0].boundTo).toBe(lesser);
      expect(s.bindsByPlayer![lesser]).toBe(1);
      expect(s.bindsByPlayer![other]).toBe(2);
    }
  });

  it('a tie keeps the rolled coin — the debut elite is still a coin flip', () => {
    for (const seed of [7, 8, 9, 10, 11]) {
      const s = fresh(seed);
      const coin: PlayerId = rngInt(s.rng, 2).value === 0 ? 'p1' : 'p2';
      startCombat(s, ['the_cantor']);
      expect(s.combat!.enemies[0].boundTo, `seed ${seed}`).toBe(coin);
      expect(s.bindsByPlayer).toEqual(coin === 'p1' ? { p1: 1, p2: 0 } : { p1: 0, p2: 1 });
    }
  });

  it('a full-run streak cannot form: consecutive single-elite fights alternate seats', () => {
    const s = fresh(303);
    const seen: PlayerId[] = [];
    for (let i = 0; i < 4; i++) {
      const t = structuredClone(s);
      t.bindsByPlayer = { ...(s.bindsByPlayer ?? { p1: 0, p2: 0 }) };
      startCombat(t, ['bellkeeper']);
      seen.push(t.combat!.enemies[0].boundTo as PlayerId);
      s.bindsByPlayer = t.bindsByPlayer;
      s.rng = t.rng;
    }
    // after the coin-flip debut, the counter forces strict alternation
    expect(seen[1]).not.toBe(seen[0]);
    expect(seen[2]).not.toBe(seen[1]);
    expect(seen[3]).not.toBe(seen[2]);
  });

  it('multi-enemy fights split exactly as before and never touch the counter', () => {
    const seed = 505;
    const s = fresh(seed);
    const coin = rngInt(s.rng, 2).value; // the same `first` roll startCombat will consume
    startCombat(s, ['mourner', 'warden_of_the_crossing']);
    const bound = s.combat!.enemies.map((e) => e.boundTo);
    expect(bound[0]).toBe((0 + coin) % 2 === 0 ? 'p1' : 'p2'); // the pre-S16 formula, verbatim
    expect(bound[1]).toBe((1 + coin) % 2 === 0 ? 'p1' : 'p2');
    expect(new Set(bound).size).toBe(2); // a 2-enemy fight always binds one to each
    expect(s.bindsByPlayer).toBeUndefined(); // counter state only exists once a single-body fight created it
  });

  it('single-enemy NORMAL comps stay on the coin (the rule keys elite/boss defs only)', () => {
    const s = fresh(707);
    const coin: PlayerId = rngInt(s.rng, 2).value === 0 ? 'p1' : 'p2';
    s.bindsByPlayer = { p1: 5, p2: 0 };
    startCombat(s, ['gravewax_husk']);
    expect(s.combat!.enemies[0].boundTo).toBe(coin);
    expect(s.bindsByPlayer).toEqual({ p1: 5, p2: 0 }); // untouched
  });

  it('the rng stream is byte-identical: the anti-streak adds NO draws', () => {
    // same seed twice, one with a counter that FORCES the binding away from
    // the coin: every roll-derived value (hp, script start, drawn hands,
    // outgoing rng) must match — only boundTo may differ
    const a = fresh(909);
    const b = fresh(909);
    b.bindsByPlayer = { p1: 5, p2: 0 };
    startCombat(a, ['mourner']);
    startCombat(b, ['mourner']);
    expect(b.rng).toBe(a.rng);
    expect(b.combat!.enemies[0].hp).toBe(a.combat!.enemies[0].hp);
    expect(b.combat!.enemies[0].scriptIndex).toBe(a.combat!.enemies[0].scriptIndex);
    expect(b.players.p1.hand).toEqual(a.players.p1.hand);
    expect(b.players.p2.hand).toEqual(a.players.p2.hand);
  });
});
