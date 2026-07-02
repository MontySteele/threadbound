// Branching act maps (M2-B3): StS-style lanes, ~14 nodes, 2-3 lanes wide.
// Path choice is a negotiation: both players must pick the same next node.

import { MapNode, MapState } from './types';
import { rngInt, rngShuffle } from './rng';
import { ENCOUNTER_POOLS } from './content/encounters';
import { MAP_EVENT_PCT, MAP_LAYERS, eventsForAct } from './content/registry';

// S7.5: acts 1–2 widened L6→L7, event share 22%→32% (combat absorbs the
// delta; rest/treasure untouched). Env-overridable via TB_MAP_LAYERS /
// TB_MAP_EVENT_PCT — see content/registry.ts for the ruling.
const LAYERS = MAP_LAYERS; // + boss layer

export function generateActMap(
  rngState: number, act: 1 | 2, extraElite = false, tracks = false,
  /** gated events (clue/character) already visited — never re-offered: a
   *  scene must not replay with a different fragment or double-credit
   *  progress (2026-07-01 ruling). Unflagged runs pass nothing and
   *  eventsForAct carries no gated events anyway. */
  seenGatedEvents: readonly string[] = [],
  /** S7.3: characters in the run, when the rites flag is set — admits their
   *  character events to the pool at clue weight */
  riteCharacters: readonly string[] = [],
): { map: MapState; rng: number } {
  let rng = rngState;
  const nodes: MapNode[] = [];
  const pools = ENCOUNTER_POOLS[act];
  const eventDefs = eventsForAct(act, tracks, riteCharacters).filter(
    (e) => !(e.clue || e.character || e.rare) || !seenGatedEvents.includes(e.id),
  );
  const events = eventDefs.map((e) => e.id);
  let eventQueue: string[] = [];
  const nextEvent = (): string => {
    if (eventQueue.length === 0) {
      if (tracks || riteCharacters.length > 0) {
        // nt-slice S6.2 + S7.3: weighted order — clue and character events
        // carry elevated queue weight ("one economy, two payoffs"),
        // surfacing earlier among the few event nodes a run visits.
        // S8.4: rare events (the wrong-way event) carry HALF a normal
        // event's weight. Integer weights against normal=2, so the
        // half-weight slot fits at 1 — the RELATIVE weights are what
        // matter to the sampler.
        // 2026-07-02 ruling (review-sweep B6): character events 2×→4×.
        // 10 clue events at equal weight took ~62% of gated slots and
        // birth picks reached 0–10% of seats; 4× puts the two tracks at
        // rough parity (20 vs 24 weight units). This pre-spends the first
        // rung of decision-tree D6-B; if arrival is still late, the
        // ladder resumes at L8/E32.
        // Sample-without-replacement; unflagged runs keep the plain shuffle
        // (and its exact rng consumption) below — rare events never reach
        // that branch (eventsForAct gates them out unflagged).
        const pool = eventDefs.map((e) => ({ id: e.id, w: e.character ? 8 : e.clue ? 4 : e.rare ? 1 : 2 }));
        while (pool.length > 0) {
          const total = pool.reduce((sum, p) => sum + p.w, 0);
          const r = rngInt(rng, total);
          rng = r.state;
          let acc = 0;
          let idx = 0;
          for (let i = 0; i < pool.length; i++) {
            acc += pool[i].w;
            if (r.value < acc) { idx = i; break; }
          }
          eventQueue.push(pool[idx].id);
          pool.splice(idx, 1);
        }
      } else {
        const r = rngShuffle(rng, events);
        rng = r.state;
        eventQueue = r.value;
      }
    }
    return eventQueue.shift()!;
  };
  const pick = <T>(arr: T[]): T => {
    const r = rngInt(rng, arr.length);
    rng = r.state;
    return arr[r.value];
  };

  // lane counts per layer (2-3), deterministic from rng
  const laneCounts: number[] = [];
  for (let l = 0; l < LAYERS; l++) {
    const r = rngInt(rng, 2);
    rng = r.state;
    laneCounts.push(l === LAYERS - 1 ? 2 : 2 + r.value);
  }

  // exactly 2 elites per act (M2-B3), placed in layers 2-4 on distinct layers.
  // S4.4 A3: +1 elite — the remaining 2-4 layer also gets one. Same rng draws
  // as A0 (the flag adds no rolls), so lower rungs reproduce A0 maps exactly.
  const eliteLayerRoll = rngInt(rng, 3);
  rng = eliteLayerRoll.state;
  const eliteLayers = [2 + eliteLayerRoll.value, 2 + ((eliteLayerRoll.value + 1) % 3)];
  if (extraElite) eliteLayers.push(2 + ((eliteLayerRoll.value + 2) % 3));
  const eliteIds = [...pools.elite];
  // guarantee ≥1 shop and ≥1 treasure in layers 1-4
  const shopLayerRoll = rngInt(rng, 4);
  rng = shopLayerRoll.state;
  const shopLayer = 1 + shopLayerRoll.value;
  const treasureLayerRoll = rngInt(rng, 4);
  rng = treasureLayerRoll.state;
  const treasureLayer = 1 + treasureLayerRoll.value;

  let id = 0;
  for (let layer = 0; layer < LAYERS; layer++) {
    for (let lane = 0; lane < laneCounts[layer]; lane++) {
      let node: MapNode;
      if (layer === LAYERS - 1) {
        node = { id, kind: 'rest', edges: [], layer, lane }; // breath before the boss
      } else if (layer === 0) {
        node = { id, kind: 'combat', edges: [], layer, lane, encounterId: pick(pools.easy) };
      } else if (eliteLayers.includes(layer) && lane === 0) {
        node = { id, kind: 'elite', edges: [], layer, lane, encounterId: eliteIds[eliteLayers.indexOf(layer) % eliteIds.length] };
      } else if (layer === shopLayer && lane === laneCounts[layer] - 1) {
        node = { id, kind: 'shop', edges: [], layer, lane };
      } else if (layer === treasureLayer && lane === 1 && laneCounts[layer] > 2) {
        node = { id, kind: 'treasure', edges: [], layer, lane };
      } else {
        const roll = rngInt(rng, 100);
        rng = roll.state;
        // shares: combat takes what the event share leaves below 72;
        // rest (72–85) and treasure (86–99) are pacing, not routing — fixed
        if (roll.value < 72 - MAP_EVENT_PCT) {
          node = { id, kind: 'combat', edges: [], layer, lane, encounterId: pick(layer <= 1 ? pools.easy : pools.normal) };
        } else if (roll.value < 72) {
          node = { id, kind: 'event', edges: [], layer, lane, eventId: nextEvent() };
        } else if (roll.value < 86) {
          node = { id, kind: 'rest', edges: [], layer, lane };
        } else {
          node = { id, kind: 'treasure', edges: [], layer, lane };
        }
      }
      nodes.push(node);
      id++;
    }
  }
  // boss layer
  const bossId = id;
  nodes.push({ id: bossId, kind: 'boss', edges: [], layer: LAYERS, lane: 0, encounterId: pools.boss });

  // edges: connect each node to next-layer nodes with |lane delta| <= 1
  for (const node of nodes) {
    if (node.id === bossId) continue;
    const nextLayer = nodes.filter((n) => n.layer === node.layer + 1);
    if (nextLayer.length === 0) continue;
    if (node.layer === LAYERS - 1) {
      node.edges = [bossId];
      continue;
    }
    node.edges = nextLayer
      .filter((n) => Math.abs(n.lane - node.lane) <= 1)
      .map((n) => n.id);
    if (node.edges.length === 0) node.edges = [nextLayer[0].id];
  }

  return {
    map: { act, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0 },
    rng,
  };
}

/** Finale (§8): The Last Braid — rest → shop → The Unraveled. Linear.
 *  nt-slice: flagged runs get the Loom's Eye FIRST, adjacent to (never
 *  replacing) the pre-boss rest — the verdict lands before the rest so the
 *  all-true boon (opening intent) can show there, and before the boss. */
export function generateFinaleMap(tracks = false): MapState {
  const nodes: MapNode[] = tracks
    ? [
        { id: 0, kind: 'loom', edges: [1], layer: 0, lane: 0 },
        { id: 1, kind: 'rest', edges: [2], layer: 1, lane: 0 },
        { id: 2, kind: 'shop', edges: [3], layer: 2, lane: 0 },
        { id: 3, kind: 'boss', edges: [], layer: 3, lane: 0, encounterId: 'finale_boss' },
      ]
    : [
        { id: 0, kind: 'rest', edges: [1], layer: 0, lane: 0 },
        { id: 1, kind: 'shop', edges: [2], layer: 1, lane: 0 },
        { id: 2, kind: 'boss', edges: [], layer: 2, lane: 0, encounterId: 'finale_boss' },
      ];
  return { act: 3, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0 };
}

/** Nodes currently pickable: layer-0 entries at position -1, else current edges. */
export function pickableNodes(map: MapState): number[] {
  if (map.position === -1) return map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
  return map.nodes.find((n) => n.id === map.position)?.edges ?? [];
}
