// Branching act maps (M2-B3): StS-style lanes, ~14 nodes, 2-3 lanes wide.
// Path choice is a negotiation: both players must pick the same next node.

import { MapNode, MapState } from './types';
import { rngInt, rngShuffle } from './rng';
import { ENCOUNTER_POOLS } from './content/encounters';
import { eventsForAct } from './content/registry';

const LAYERS = 6; // + boss layer

export function generateActMap(rngState: number, act: 1 | 2, extraElite = false): { map: MapState; rng: number } {
  let rng = rngState;
  const nodes: MapNode[] = [];
  const pools = ENCOUNTER_POOLS[act];
  const events = eventsForAct(act).map((e) => e.id);
  let eventQueue: string[] = [];
  const nextEvent = (): string => {
    if (eventQueue.length === 0) {
      const r = rngShuffle(rng, events);
      rng = r.state;
      eventQueue = r.value;
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
        if (roll.value < 50) {
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

/** Finale (§8): The Last Braid — rest → shop → The Unraveled. Linear. */
export function generateFinaleMap(): MapState {
  const nodes: MapNode[] = [
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
