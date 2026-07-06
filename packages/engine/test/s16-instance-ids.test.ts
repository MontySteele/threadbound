// S16.0 correctness fix — card instanceIds must be unique. The deck-length
// id scheme could collide: take a card on an act-2+ reward screen, spend the
// free pick-removal (deck length returns to L), then covet the SAME defId
// from the partner's leftovers → two cards sharing one instanceId. The twin
// was unstageable in combat forever ("already staged"): the S15-era 0.09% WS
// run timeouts, exposed as a hard deterministic stall by the socket-free
// path (seed 1033, vv braid). Non-colliding ids stay byte-identical.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';

function rewardAt(seed = 51): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'vess' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed });
  s.map.act = 2;
  s.phase = 'reward';
  // a vess mirror: the same defId can sit in both seats' sets
  s.reward = {
    sets: { p1: ['tallow_mark', 'withering'], p2: ['tallow_mark', 'inheritance'] },
    picked: { p1: null, p2: null },
    coveted: { p1: null, p2: null },
    gold: 0,
  };
  return s;
}

describe('S16.0 instanceId uniqueness (the seed-1033 stall class)', () => {
  it('take → free removal → covet the same defId: ids stay distinct', () => {
    let s = rewardAt();
    s = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'tallow_mark' });
    const starter = s.players.p1.deck.find((c) => c.defId === 'hatpin')!;
    s = reduce(s, { type: 'REWARD_REMOVE', player: 'p1', pick: starter.instanceId });
    s = reduce(s, { type: 'REWARD_PICK', player: 'p2', pick: 'inheritance' });
    // deck length is back to pre-take; the covet lands at the same length,
    // same act, same node, same defId — the collision recipe
    s = reduce(s, { type: 'COVET_PICK', player: 'p1', pick: 'tallow_mark' });
    const ids = s.players.p1.deck.map((c) => c.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.players.p1.deck.filter((c) => c.defId === 'tallow_mark')).toHaveLength(2);
  });

  it('non-colliding acquisitions keep the pre-S16 id scheme byte-identically', () => {
    let s = rewardAt();
    s = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'withering' });
    const got = s.players.p1.deck.find((c) => c.defId === 'withering')!;
    expect(got.instanceId).toBe(`p1_withering_10_a2n${s.map.position}`);
  });
});
