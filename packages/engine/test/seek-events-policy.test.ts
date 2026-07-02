// S7.7 TB_BOT_SEEK_EVENTS: an opt-in, SIM-ONLY routing knob — the policy
// prefers reachable EVENT nodes (lowest id among them) over the plain
// lowest-id rule. Default off; without the flag routing is unchanged, so the
// seeded batteries keep their baseline. The solo bot follows the human's
// pick and never consults this knob.

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { GameState, MapNode } from '../src/types';
import { initialState, reduce } from '../src/reducer';

/** A crafted map view: a lower-id combat node and a higher-id event node,
 *  both reachable from the start (position -1 → layer-0 nodes). */
function mapView(seed = 42): BotView {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed });
  const nodes: MapNode[] = [
    { id: 0, kind: 'combat', edges: [], layer: 0, lane: 0, encounterId: 'a1_husks' },
    { id: 1, kind: 'event', edges: [], layer: 0, lane: 1, eventId: 'cold_lantern' },
    { id: 2, kind: 'combat', edges: [], layer: 0, lane: 2, encounterId: 'a1_husks' },
  ];
  s.map = { ...s.map, nodes, position: -1, picks: { p1: null, p2: null } };
  const counts = { p1: { hand: 0, draw: 0 }, p2: { hand: 0, draw: 0 } };
  return { ...s, you: 'p1', counts } as BotView;
}

describe('TB_BOT_SEEK_EVENTS map routing (S7.7)', () => {
  it('with seekEvents, a reachable event node beats a lower-id combat node', () => {
    const policy = new BotPolicy({ mode: 'sim', seed: 7, seekEvents: true });
    const action = policy.decide(mapView());
    expect(action).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 1 });
  });

  it('without the flag the lowest-id rule is unchanged', () => {
    const policy = new BotPolicy({ mode: 'sim', seed: 7 });
    const action = policy.decide(mapView());
    expect(action).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 0 });
  });

  it('with seekEvents but no reachable event, the lowest-id rule still applies', () => {
    const view = mapView();
    view.map.nodes[1] = { id: 1, kind: 'rest', edges: [], layer: 0, lane: 1 };
    const policy = new BotPolicy({ mode: 'sim', seed: 7, seekEvents: true });
    const action = policy.decide(view);
    expect(action).toEqual({ type: 'NODE_PICK', player: 'p1', nodeId: 0 });
  });
});
