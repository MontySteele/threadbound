// S11.9 (Wave B) — bot strand routing on braid maps (TB_KNOTWORK). The
// policy values a pick by best-path summed node utility (deterministic DP);
// knots price the escalation ladder against the crossing. Non-braid maps
// never reach this code — Wave A baselines hold byte-identically (the
// seek-events tests next door pin that path).

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { GameState, MapNode } from '../src/types';
import { initialState, reduce } from '../src/reducer';

function braidView(seed: number, you: 'p1' | 'p2'): BotView {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, {
    type: 'START_RUN', seed, tracks: true, rites: true, knotwork: true,
  });
  s.phase = 'map'; // skip the rites offer screen — routing is the subject
  const counts = { p1: { hand: 0, draw: 0 }, p2: { hand: 0, draw: 0 } };
  return { ...s, you, counts } as BotView;
}

/** A crafted pre-crossing choice: bypass (rest chain) vs the knot, whose
 *  crossing also reaches a treasure on the far strand. */
function crossingView(knotsCut: number): BotView {
  const s0 = initialState(5, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, {
    type: 'START_RUN', seed: 5, tracks: true, rites: true, knotwork: true,
  });
  s.phase = 'map';
  const nodes: MapNode[] = [
    { id: 10, kind: 'combat', edges: [11, 12], layer: 1, lane: 0, strand: 'truth' },
    { id: 11, kind: 'rest', edges: [13], layer: 2, lane: 0, strand: 'truth' },
    { id: 12, kind: 'elite', edges: [13, 14], layer: 2, lane: 1, encounterId: 'a1_elite_mourner' },
    { id: 13, kind: 'rest', edges: [], layer: 3, lane: 0, strand: 'truth' },
    { id: 14, kind: 'treasure', edges: [], layer: 3, lane: 2, strand: 'power' },
  ];
  s.map = { ...s.map, nodes, position: 10, picks: { p1: null, p2: null }, knotsCut };
  const counts = { p1: { hand: 0, draw: 0 }, p2: { hand: 0, draw: 0 } };
  return { ...s, you: 'p1', counts } as BotView;
}

describe('S11.9 strand routing', () => {
  it('both seats name the same node instantly (the vote never thrashes)', () => {
    for (const seed of [3, 9, 21]) {
      const p1 = new BotPolicy({ mode: 'sim', seed: 7, seekEvents: true })
        .decide(braidView(seed, 'p1'));
      const p2 = new BotPolicy({ mode: 'sim', seed: 7, seekEvents: true })
        .decide(braidView(seed, 'p2'));
      expect(p1).toBeTruthy();
      expect(p1!.type).toBe('NODE_PICK');
      expect((p2 as { nodeId: number }).nodeId).toBe((p1 as { nodeId: number }).nodeId);
    }
  });

  it('seek-events routing commits to the TRUTH strand at the opening pick', () => {
    // the braid's first pick IS the strand commitment; truth is event-heavy
    const action = new BotPolicy({ mode: 'sim', seed: 7, seekEvents: true })
      .decide(braidView(13, 'p1'));
    expect(action).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 0 }); // truth opener
  });

  it('knot pricing: a fresh knot is taken; a thrice-escalated one is bypassed', () => {
    const fresh = new BotPolicy({ mode: 'sim', seed: 7 }).decide(crossingView(0));
    expect(fresh).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 12 }); // the knot
    const spent = new BotPolicy({ mode: 'sim', seed: 7 }).decide(crossingView(3));
    expect(spent).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 11 }); // the bypass
  });

  // S15.3: the elite-excess routing probe — OQ#55's ≥2 gate is read on this leg
  it('TB_BOT_ALL_KNOTS: even the thrice-escalated knot is taken on the probe', () => {
    const probed = new BotPolicy({ mode: 'sim', seed: 7, allKnots: true }).decide(crossingView(3));
    expect(probed).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 12 });
  });
});
