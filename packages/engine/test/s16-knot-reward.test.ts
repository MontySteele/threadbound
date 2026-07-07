// S16.1 (S16-D3) — knot rewards pay a card pick to BOTH seats, pinned.
//
// Finding on record (S16-STATUS.md): the D3-B ruling's premise ("today:
// strand-local") did not match the shipped code — every combat victory,
// knots included, has offered BOTH seats a pick from their own pools since
// M2 (§8), on both topologies. The ruled END STATE is therefore already
// live; this suite pins it so it can never silently regress into the
// strand-local shape the ruling forbids. No balance change landed (the ×3
// lesson: a mismatched premise returns as a decision packet, not an
// improvised dose).

import { describe, expect, it } from 'vitest';
import { GameState, MapNode } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';

/** Teleport to `node`, start its encounter, kill everything, resolve —
 *  the engine's own victory path builds the reward screen. */
function winAt(state: GameState, node: MapNode): GameState {
  state.map.position = node.id;
  startCombat(state, ['mourner']); // any body — it dies before acting
  for (const e of state.combat!.enemies) e.hp = 0;
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

function expectBothSeatOffers(s: GameState, label: string): void {
  expect(s.phase, label).toBe('reward');
  const r = s.reward!;
  expect(r.sets.p1.length, `${label} p1 set`).toBe(3);
  expect(r.sets.p2.length, `${label} p2 set`).toBe(3);
  expect(r.picked, label).toEqual({ p1: null, p2: null });
  // and both picks are actually TAKEABLE — the offer is real, not cosmetic
  let t = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: r.sets.p1[0] });
  t = reduce(t, { type: 'REWARD_PICK', player: 'p2', pick: r.sets.p2[0] });
  expect(t.players.p1.deck.some((c) => c.defId === r.sets.p1[0]), label).toBe(true);
  expect(t.players.p2.deck.some((c) => c.defId === r.sets.p2[0]), label).toBe(true);
}

describe('S16-D3 pinning: both-seat card offers at every knot, both topologies', () => {
  it('braid knots (every crossing, acts 1 and 2) offer both seats a pick', () => {
    for (const seed of [11, 47, 210]) {
      let s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }),
        { type: 'START_RUN', seed });
      for (const knot of s.map.nodes.filter((n) => n.kind === 'elite')) {
        expectBothSeatOffers(winAt(structuredClone(s), knot), `seed ${seed} act1 knot L${knot.layer}`);
      }
      // act 2 braid: advance via the generator (teleport pattern)
      s.map.act = 2;
      for (const knot of s.map.nodes.filter((n) => n.kind === 'elite')) {
        expectBothSeatOffers(winAt(structuredClone(s), knot), `seed ${seed} act2 knot L${knot.layer}`);
      }
    }
  });

  it('default START_RUN (no flags) offers both seats a pick at elites — the braid is the game (S21.5)', () => {
    for (const seed of [11, 47, 210]) {
      const s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      const elite = s.map.nodes.find((n) => n.kind === 'elite')!;
      expectBothSeatOffers(winAt(structuredClone(s), elite), `seed ${seed} classic elite`);
    }
  });

  it('non-knot combat rewards keep the same both-seat shape (nothing regressed to strand-local)', () => {
    const seed = 47;
    const s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }),
      { type: 'START_RUN', seed });
    const combat = s.map.nodes.find((n) => n.kind === 'combat')!;
    expectBothSeatOffers(winAt(structuredClone(s), combat), 'braid combat node');
  });
});
