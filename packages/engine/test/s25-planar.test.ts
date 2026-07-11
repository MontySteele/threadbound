// S25 (OQ#81, ruled 2026-07-11) — the PLANAR braid: no two cords may cross
// in the drawn embedding, under any circumstance. This test is the law's
// teeth: it mirrors the client's drawn-x model (MapView.pos — sides flip at
// each crossing below, widened inners offset toward the center, knots /
// breath / boss at the center) and asserts that no pair of edges between
// consecutive layers inverts drawn order. If a generator change reintroduces
// a crossing, this fails before any designer's eye has to catch it.

import { describe, expect, it } from 'vitest';
import { MapNode, MapState } from '../src/types';
import { generateActMap } from '../src/map';

const braid = (seed: number, act: 1 | 2, extraElite: boolean): MapState =>
  generateActMap(seed, act, extraElite, true, [], ['vess', 'bram']).map;

/** drawn x in COL units — the client's MapView.pos, engine-side. S25:
 *  strand sides are FIXED (the old per-crossing flip forced the bypass
 *  edges to swap sides mid-air — inherently non-planar); the warps pinch
 *  at knots instead of X-ing through them. */
function drawnX(map: MapState, n: MapNode): number {
  if (n.kind === 'boss' || n.kind === 'elite') return 0;
  if (!n.strand) {
    // shared layer (the breath): centered in insertion order
    const mates = map.nodes.filter((m) => m.layer === n.layer);
    const i = mates.findIndex((m) => m.id === n.id);
    return (i - (mates.length - 1) / 2) * 1.1;
  }
  const x = n.strand === 'truth' ? -1 : 1;
  const primary = n.lane === 0 || n.lane === 2;
  return primary ? x : x + (x < 0 ? 0.62 : -0.62);
}

/** every edge pair between consecutive layers, no shared endpoint, must
 *  preserve drawn order — an inversion is a crossing */
function assertPlanar(map: MapState, label: string): void {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const edges = map.nodes.flatMap((n) =>
    n.edges.map((toId) => ({
      a: n.id, b: toId,
      layer: n.layer,
      xa: drawnX(map, n),
      xb: drawnX(map, byId.get(toId)!),
    })),
  );
  for (const e of edges) {
    for (const f of edges) {
      if (e === f || e.layer !== f.layer) continue;
      if (e.a === f.a || e.b === f.b) continue; // shared endpoints meet, never cross
      const inverted = (e.xa - f.xa) * (e.xb - f.xb) < 0;
      expect(
        inverted,
        `${label}: cords cross between L${e.layer}→L${e.layer + 1}: ` +
        `${e.a}(${e.xa})→${e.b}(${e.xb}) × ${f.a}(${f.xa})→${f.b}(${f.xb})`,
      ).toBe(false);
    }
  }
}

/** the client's warp waypoint rule (MapView) — beside a knot the thread
 *  runs through the widened INNER slot, else the primary. Every consecutive
 *  waypoint pair must be a real edge: that is what lets edge-planarity
 *  cover the drawn warps too. */
function warpChain(map: MapState, strand: 'truth' | 'power'): MapNode[] {
  const maxLayer = Math.max(...map.nodes.map((n) => n.layer));
  const waypoints: MapNode[] = [];
  for (let layer = 0; layer < maxLayer; layer++) {
    const knot = map.nodes.find((n) => n.kind === 'elite' && n.layer === layer);
    if (knot) { waypoints.push(knot); continue; }
    const own = map.nodes.filter((n) => n.strand === strand && n.layer === layer);
    if (own.length > 0) {
      const nearKnot = map.nodes.some((n) => n.kind === 'elite' && Math.abs(n.layer - layer) === 1);
      const inner = own.find((n) => n.lane === 1 || n.lane === 3);
      const primary = own.find((n) => n.lane === 0 || n.lane === 2) ?? own[0];
      waypoints.push(nearKnot && inner ? inner : primary);
      continue;
    }
    const shared = map.nodes.filter((n) => !n.strand && n.layer === layer);
    if (shared.length > 0) waypoints.push(shared[0]);
  }
  return waypoints;
}

describe('S25 the planar braid — no cords cross, ever', () => {
  it('holds across 100 seeds × both acts × with and without the A3 knot', () => {
    for (let i = 0; i < 100; i++) {
      for (const act of [1, 2] as const) {
        for (const extra of [false, true]) {
          const seed = 90_000 + i * 17 + act;
          assertPlanar(braid(seed, act, extra), `seed ${seed} act ${act} extra=${extra}`);
        }
      }
    }
  });

  it('every warp segment coincides with a real edge (so edge-planarity covers the warps)', () => {
    for (let i = 0; i < 60; i++) {
      for (const extra of [false, true]) {
        const seed = 97_000 + i * 13;
        const map = braid(seed, i % 2 === 0 ? 1 : 2, extra);
        for (const strand of ['truth', 'power'] as const) {
          const chain = warpChain(map, strand);
          for (let k = 0; k < chain.length - 1; k++) {
            expect(
              chain[k].edges.includes(chain[k + 1].id),
              `seed ${seed} extra=${extra} ${strand} warp L${chain[k].layer}: ${chain[k].id}→${chain[k + 1].id} is not an edge`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('the breath is ONE shared rest and every layer-5 node ties into it (OQ#81)', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(95_000 + i * 13, i % 2 === 0 ? 1 : 2, i % 3 === 0);
      const breath = map.nodes.filter((n) => n.layer === 6 && n.kind !== 'boss');
      expect(breath.length, `seed ${95_000 + i * 13}`).toBe(1);
      expect(breath[0].kind).toBe('rest');
      expect(breath[0].variant).toBeUndefined();
      for (const n of map.nodes.filter((n) => n.layer === 5)) {
        expect(n.edges).toEqual([breath[0].id]);
      }
    }
  });

  it('knots stay reachable and still release onto both strands (the crossing IS the reward)', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(96_000 + i * 13, 2, true);
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      for (const k of map.nodes.filter((n) => n.kind === 'elite')) {
        // reachable: someone below edges into the knot
        expect(map.nodes.some((n) => n.edges.includes(k.id)), `knot L${k.layer} inbound`).toBe(true);
        if (k.layer < 5) {
          const strands = new Set(k.edges.map((e) => byId.get(e)!.strand));
          expect(strands.has('truth'), `knot L${k.layer} → truth`).toBe(true);
          expect(strands.has('power'), `knot L${k.layer} → power`).toBe(true);
        }
      }
    }
  });
});
