// S13.3 pick-with-removal — the ONE dilution lever (D4 RULED: option A,
// act-2+ screens only). Pinning tests per battery gate 1: starter-only,
// once per screen, act gating, free (no gold interaction), and lazy state
// shape (act-1/pickless screens keep their pre-S13 shape byte-identically).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';

function rewardAt(act: 1 | 2, seed = 51): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed });
  s.map.act = act;
  s.phase = 'reward';
  s.reward = {
    sets: { p1: ['inheritance', 'withering'], p2: ['haymaker'] },
    picked: { p1: null, p2: null },
    coveted: { p1: null, p2: null },
    gold: 0,
  };
  return s;
}

describe('S13.3 pick-with-removal (D4: option A)', () => {
  it('act 1 keeps its steep, simple picks — no offer, and the action throws', () => {
    const s = rewardAt(1);
    const picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    expect(picked.reward!.removals).toBeUndefined(); // lazy shape: key never exists in act 1
    expect(() => reduce(picked, { type: 'REWARD_REMOVE', player: 'p1', pick: 'pass' }))
      .toThrow(/no removal is owed/);
  });

  it('act 2: taking a card opens the offer; skipping does not', () => {
    const s = rewardAt(2);
    const picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    expect(picked.reward!.removals).toEqual({ p1: null });
    const skipped = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'skip' });
    expect(skipped.reward!.removals).toBeUndefined();
  });

  it('starters only — it cannot strip-mine the picked engines', () => {
    const s = rewardAt(2);
    let picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    const engine = picked.players.p1.deck.find((c) => c.defId === 'inheritance')!;
    expect(() => reduce(picked, { type: 'REWARD_REMOVE', player: 'p1', pick: engine.instanceId }))
      .toThrow(/STARTER/);
    const starter = picked.players.p1.deck.find((c) => c.defId === 'hatpin')!;
    const after = reduce(picked, { type: 'REWARD_REMOVE', player: 'p1', pick: starter.instanceId });
    expect(after.players.p1.deck.some((c) => c.instanceId === starter.instanceId)).toBe(false);
    expect(after.players.p1.deck.some((c) => c.defId === 'inheritance')).toBe(true);
    // S13.1c: the lever's removals land in the per-act telemetry
    expect(after.telemetry.economy.deckRemovalsByAct[2].p1).toBe(1);
  });

  it('free — the purse never moves', () => {
    const s = rewardAt(2);
    const picked = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    const starter = picked.players.p1.deck.find((c) => c.defId === 'hatpin')!;
    const after = reduce(picked, { type: 'REWARD_REMOVE', player: 'p1', pick: starter.instanceId });
    expect(after.gold).toBe(picked.gold);
    expect(after.removalsByPlayer.p1).toBe(0); // the shop's escalation counter is untouched
  });

  it('once per screen — spending or passing closes the offer; a covet does not reopen it', () => {
    const s = rewardAt(2);
    let st = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    st = reduce(st, { type: 'REWARD_REMOVE', player: 'p1', pick: 'pass' });
    expect(() => reduce(st, { type: 'REWARD_REMOVE', player: 'p1', pick: 'pass' }))
      .toThrow(/no removal is owed/);
    // p2 picks, then p1 covets p2's leftover — p1's offer stays spent
    st = reduce(st, { type: 'REWARD_PICK', player: 'p2', pick: 'haymaker' });
    st.reward!.sets.p2.push('crossguard'); // a leftover to covet
    st = reduce(st, { type: 'COVET_PICK', player: 'p1', pick: 'crossguard' });
    expect(st.reward!.removals!.p1).toBe('pass'); // not re-opened
    expect(st.reward!.removals!.p2).toBe(null); // p2's own take opened THEIR offer
  });

  it('a covet alone (skip + covet) still counts as taking a card', () => {
    const s = rewardAt(2);
    let st = reduce(s, { type: 'REWARD_PICK', player: 'p2', pick: 'haymaker' });
    st = reduce(st, { type: 'REWARD_PICK', player: 'p1', pick: 'skip' });
    st.reward!.sets.p2.push('crossguard');
    st = reduce(st, { type: 'COVET_PICK', player: 'p1', pick: 'crossguard' });
    expect(st.reward!.removals!.p1).toBe(null); // the covet opened it
  });
});
