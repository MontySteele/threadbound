// S11.1 — composition CI substrate. Generation-time assertions over seeded
// maps, shared by the vitest gate (test/map-composition.test.ts) and the
// standalone CI script (scripts/map-composition.js). Pure measurement here;
// pass/fail policy (hard vs pending burn-down) lives with the gate.
//
// The knotwork vocabulary (S11.0-1): elites are KNOTS; the map is the weave.

import { MapState } from './types';
import { EVENTS } from './content/registry';

export interface ActComposition {
  eliteCount: number;
  shops: number;
  treasures: number;
  /** per knot: how many DISTINCT approach compositions reach it (multiset of
   *  node kinds along a layer-0 → knot path; the knot itself excluded) */
  knotApproaches: number[];
  /** character-event nodes on the map, per character (queue admission —
   *  visiting is routing's problem, D6/D7 language) */
  characterOpportunities: Record<string, number>;
  /** events flagged high-stakes on this map (S11.4 content — 0 until the
   *  deep events land) */
  highStakesEvents: number;
}

/** All distinct approach-composition counts for one target node. Exported
 *  for the S11.1 generator repair (map.ts), which fixes maps until this
 *  measure clears 2 for every knot. */
export function distinctApproaches(map: MapState, targetId: number): number {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const target = byId.get(targetId)!;
  const seen = new Set<string>();
  let walked = 0;
  const walk = (nodeId: number, kinds: string[]): void => {
    if (walked > 50_000) return; // DAG is small; this is a safety valve
    const node = byId.get(nodeId)!;
    if (nodeId === targetId) {
      walked++;
      seen.add([...kinds].sort().join(','));
      return;
    }
    if (node.layer >= target.layer) return;
    for (const e of node.edges) {
      const next = byId.get(e)!;
      if (next.layer <= target.layer) walk(e, nodeId === targetId ? kinds : [...kinds, node.kind]);
    }
  };
  for (const n of map.nodes.filter((n) => n.layer === 0)) walk(n.id, []);
  return seen.size;
}

export function measureAct(map: MapState): ActComposition {
  const knots = map.nodes.filter((n) => n.kind === 'elite');
  const characterOpportunities: Record<string, number> = { vess: 0, bram: 0 };
  let highStakesEvents = 0;
  for (const n of map.nodes) {
    if (n.kind !== 'event' || !n.eventId) continue;
    const def = EVENTS[n.eventId];
    if (def?.character) characterOpportunities[def.character] = (characterOpportunities[def.character] ?? 0) + 1;
    if (def?.highStakes) highStakesEvents++;
  }
  return {
    eliteCount: knots.length,
    shops: map.nodes.filter((n) => n.kind === 'shop').length,
    treasures: map.nodes.filter((n) => n.kind === 'treasure').length,
    knotApproaches: knots.map((k) => distinctApproaches(map, k.id)),
    characterOpportunities,
    highStakesEvents,
  };
}

/** The S11.1 assertion set over one measured act. Returns violation strings
 *  (empty = clean). `expectElites` is 2, or 3 at A3 extraElite. */
export function compositionViolations(c: ActComposition, expectElites: number, opts?: {
  /** rites/tracks config: character-event opportunities are only asserted
   *  when character events are in the pool at all */
  charactersInRun?: readonly string[];
  /** S11.4/S11.5: only asserted once high-stakes content exists in pools */
  highStakesContentExists?: boolean;
}): string[] {
  const out: string[] = [];
  if (c.eliteCount !== expectElites) out.push(`elite count ${c.eliteCount} != ${expectElites}`);
  if (c.shops < 1) out.push('no shop');
  if (c.treasures < 1) out.push('no treasure');
  for (const [i, n] of c.knotApproaches.entries()) {
    if (n < 2) out.push(`knot ${i}: ${n} distinct approach composition(s), need >=2`);
  }
  for (const ch of opts?.charactersInRun ?? []) {
    if ((c.characterOpportunities[ch] ?? 0) < 2) {
      out.push(`character-event opportunities for ${ch}: ${c.characterOpportunities[ch] ?? 0} < 2`);
    }
  }
  if (opts?.highStakesContentExists && (c.highStakesEvents < 1 || c.highStakesEvents > 3)) {
    out.push(`high-stakes events ${c.highStakesEvents} outside [1, 3]`);
  }
  return out;
}
