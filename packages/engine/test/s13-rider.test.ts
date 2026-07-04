// S13.4 rare legibility rider (D5): the Witness NAMES a rare on first pick.
// Machinery: S9c D9-C existence-naming on the acquisition trigger — one
// authored line per draftable rare, single-line pools, no-repeat-within-run
// as the once-per-run fence. Lines PROVISIONAL until the witness read.

import { describe, expect, it } from 'vitest';
import { WITNESS_POOLS } from '../src/witness-draw';
import { S13_WITNESS } from '../src/content/witness-s13';
import { cardsForCharacter, neutralCards } from '../src/content/cards';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';

const draftableRares = [
  ...cardsForCharacter('vess'), ...cardsForCharacter('bram'), ...neutralCards(),
].filter((c) => c.rarity === 'rare');

function rewardWith(set: string[], seed = 61): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed });
  s.phase = 'reward';
  s.reward = {
    sets: { p1: set, p2: [] },
    picked: { p1: null, p2: 'skip' },
    coveted: { p1: null, p2: null },
    gold: 0,
  };
  return s;
}

describe('S13.4 — one authored line per draftable rare', () => {
  it('every draftable rare has exactly one rare_first_pick line; no stray pools', () => {
    for (const c of draftableRares) {
      const pool = WITNESS_POOLS[`rare_first_pick_${c.id}`];
      expect(pool, `${c.id}: missing naming line`).toBeTruthy();
      expect(Array.isArray(pool) ? pool.length : -1, `${c.id}: the single-line pool IS the once-per-run fence`).toBe(1);
    }
    // the authored set matches the draftable set exactly — a retired rare's
    // line comes out with it, and vestments (riteOnly) are never in here
    const authored = Object.keys(S13_WITNESS).map((k) => k.replace('rare_first_pick_', '')).sort();
    expect(authored).toEqual(draftableRares.map((c) => c.id).sort());
  });
});

describe('S13.4 — the naming fires once, on any acquisition channel', () => {
  it('a reward pick of a rare is named; the second copy is not (no-repeat fence)', () => {
    const s = rewardWith(['bellmetal']);
    const line = S13_WITNESS.rare_first_pick_bellmetal[0];
    const picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'bellmetal' });
    expect(picked.log).toContainEqual({ e: 'witness', line });
    expect(picked.witnessSaid).toContain(line);
    // second acquisition of the same def: silence (and NO rng draw — the
    // exhausted pool returns before the roll)
    picked.phase = 'reward';
    picked.reward = { sets: { p1: ['bellmetal'], p2: [] }, picked: { p1: null, p2: 'skip' }, coveted: { p1: null, p2: null }, gold: 0 };
    const rngBefore = picked.rng;
    const again = reduce(picked, { type: 'REWARD_PICK', player: 'p1', pick: 'bellmetal' });
    expect(again.log.filter((e) => e.e === 'witness')).toEqual([]);
    expect(again.rng).toBe(rngBefore);
  });

  it('a common pick is never named', () => {
    const s = rewardWith(['inheritance']);
    const picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    expect(picked.log.filter((e) => e.e === 'witness')).toEqual([]);
  });
});
