// S21.4 (D4, ruled 2026-07-07 on the S21.3 survey — the A3-a lever): the A3
// EXTRA crossing pays NO card picks. The survey read the OQ#66 inversion as
// real and universal (A3 above A2 on all three pairings; the extra elite's
// crossing arrived with the S16-D3 pick rewards attached and paid for
// itself). The rung's elite is a toll, not a knot: S16-D3's both-seat picks
// stay scoped to the base crossings; relic, covet charge, and gold are
// untouched. The toll is CROSSING_LAYER_A3 — generated only when the
// extraElite mod is live — so A0–A2 flow is byte-identical by construction
// (the s16-knot-reward pins and the A0 parity instruments hold unchanged).

import { describe, expect, it } from 'vitest';
import { GameState, MapNode } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';
import { CROSSING_LAYER_A3 } from '../src/content/strand-targets';

/** Teleport to `node`, start its encounter, kill everything, resolve —
 *  the s16-knot-reward harness, at a chosen ascension. */
function winAt(state: GameState, node: MapNode): GameState {
  state.map.position = node.id;
  startCombat(state, ['mourner']); // any body — it dies before acting
  for (const e of state.combat!.enemies) e.hp = 0;
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  expect(s.phase).toBe('reward');
  return s;
}

function startAt(seed: number, ascension: number): GameState {
  const lobby = initialState(seed, { p1: 'vess', p2: 'bram' });
  lobby.ascensionVotes = { p1: ascension, p2: ascension };
  return reduce(lobby, { type: 'START_RUN', seed });
}

describe('S21.4 A3-a: the extra crossing is a toll', () => {
  it('the A3 toll knot pays relic/covet/gold but NO card picks, and the screen is pass-through', () => {
    for (const seed of [11, 47, 210]) {
      const s0 = startAt(seed, 3);
      const toll = s0.map.nodes.find((n) => n.kind === 'elite' && n.layer === CROSSING_LAYER_A3);
      expect(toll, `seed ${seed}: A3 map carries the extra crossing`).toBeTruthy();
      const covetsBefore = s0.players.p1.covetCharges + s0.players.p2.covetCharges;
      const relicsBefore = s0.players.p1.relics.length + s0.players.p2.relics.length;
      const s = winAt(structuredClone(s0), toll!);
      // the toll: no picks owed, both seats pre-answered — ADVANCE is legal
      // immediately (the covet-cache pass-through precedent)
      expect(s.reward!.sets).toEqual({ p1: [], p2: [] });
      expect(s.reward!.picked).toEqual({ p1: 'skip', p2: 'skip' });
      const deckBefore = s.players.p1.deck.length + s.players.p2.deck.length;
      let t = reduce(s, { type: 'ADVANCE', player: 'p1' });
      t = reduce(t, { type: 'ADVANCE', player: 'p2' });
      expect(t.phase).toBe('map');
      expect(t.players.p1.deck.length + t.players.p2.deck.length).toBe(deckBefore);
      // the knot's OTHER rewards survive: +1 covet each, the relic drop
      expect(s.players.p1.covetCharges + s.players.p2.covetCharges).toBe(covetsBefore + 2);
      expect(s.players.p1.relics.length + s.players.p2.relics.length).toBeGreaterThan(relicsBefore);
    }
  });

  it('the BASE crossings still pay both seats at A3 — S16-D3 scoped, not repealed', () => {
    for (const seed of [11, 47]) {
      const s0 = startAt(seed, 3);
      for (const knot of s0.map.nodes.filter((n) => n.kind === 'elite' && n.layer !== CROSSING_LAYER_A3)) {
        const s = winAt(structuredClone(s0), knot);
        expect(s.reward!.sets.p1.length, `seed ${seed} L${knot.layer} p1`).toBe(3);
        expect(s.reward!.sets.p2.length, `seed ${seed} L${knot.layer} p2`).toBe(3);
        expect(s.reward!.picked).toEqual({ p1: null, p2: null });
      }
    }
  });

  it('below A3 no toll exists — every knot pays (the extra crossing is the only toll)', () => {
    for (const ascension of [0, 2]) {
      const s0 = startAt(31, ascension);
      expect(s0.map.nodes.some((n) => n.kind === 'elite' && n.layer === CROSSING_LAYER_A3)).toBe(false);
      for (const knot of s0.map.nodes.filter((n) => n.kind === 'elite')) {
        const s = winAt(structuredClone(s0), knot);
        expect(s.reward!.sets.p1.length).toBe(3);
        expect(s.reward!.sets.p2.length).toBe(3);
      }
    }
  });
});
