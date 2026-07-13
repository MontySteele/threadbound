// S26 (OQ#82, ruled 2026-07-12) — the STATION grammar: every drawn
// x-coordinate on a braid map belongs to one of five stations (truth rail,
// truth inner, center, power inner, power rail), and every cord is one
// stroke from a four-entry alphabet {0, RAIL−INNER, INNER, RAIL}. This test
// mirrors the client's drawn-x model (MapView.pos, S26 rewrite) engine-side,
// exactly as s25-planar.test.ts does for planarity. It pins the ALPHABET,
// not the pixel values — the mirror constants below are arbitrary units, so
// G1 gate-tuning of the client's RAIL/INNER formulas cannot churn it.

import { describe, expect, it } from 'vitest';
import { MapNode, MapState } from '../src/types';
import { generateActMap } from '../src/map';

// mirror constants (arbitrary units — only their ORDER and the derived
// alphabet matter; INNER < RAIL, both nonzero, RAIL−INNER ∉ {INNER, RAIL})
const RAIL = 100;
const INNER = 55;
const ALPHABET = new Set([0, RAIL - INNER, INNER, RAIL]);
const STATIONS = new Set([0, -INNER, INNER, -RAIL, RAIL]);

const braid = (seed: number, act: 1 | 2, extraElite: boolean): MapState =>
  generateActMap(seed, act, extraElite, true, [], ['vess', 'bram']).map;

/** the client's S26 MapView.pos, engine-side: boss/elite/breath at the
 *  center, strand primaries (lane 0/2) on the rails, widened slots
 *  (lane 1/3) on the inners; sides FIXED (truth left, power right). */
function stationOf(n: MapNode): number {
  if (n.kind === 'boss' || n.kind === 'elite') return 0;
  if (!n.strand) return 0; // the breath: ONE shared rest since S25
  const side = n.strand === 'truth' ? -1 : 1;
  const primary = n.lane === 0 || n.lane === 2;
  return side * (primary ? RAIL : INNER);
}

function eachMap(fn: (map: MapState, label: string) => void): void {
  for (let i = 0; i < 100; i++) {
    for (const act of [1, 2] as const) {
      for (const extra of [false, true]) {
        const seed = 130_000 + i * 17 + act;
        fn(braid(seed, act, extra), `seed ${seed} act ${act} extra=${extra}`);
      }
    }
  }
}

describe('S26 the five stations — station-quantized geometry (OQ#82)', () => {
  it('station membership: every drawn x is one of the five stations', () => {
    eachMap((map, label) => {
      for (const n of map.nodes) {
        expect(
          STATIONS.has(stationOf(n)),
          `${label}: node ${n.id} (${n.kind} L${n.layer} lane ${n.lane}) off-station`,
        ).toBe(true);
      }
      // the center station is honest: strandless non-boss layers hold ONE
      // node (the S25 single breath) — two centered nodes would collide
      for (let layer = 0; layer <= Math.max(...map.nodes.map((n) => n.layer)); layer++) {
        const strandless = map.nodes.filter((n) => n.layer === layer && !n.strand && n.kind !== 'boss' && n.kind !== 'elite');
        expect(strandless.length <= 1, `${label}: L${layer} has ${strandless.length} strandless nodes`).toBe(true);
      }
    });
  });

  it('chord alphabet: every edge is one stroke from {0, RAIL−INNER, INNER, RAIL}, spanning one layer', () => {
    eachMap((map, label) => {
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      for (const n of map.nodes) {
        for (const toId of n.edges) {
          const t = byId.get(toId)!;
          expect(t.layer, `${label}: edge ${n.id}→${toId} spans ${t.layer - n.layer} layers`).toBe(n.layer + 1);
          const dx = Math.abs(stationOf(t) - stationOf(n));
          expect(
            ALPHABET.has(dx),
            `${label}: edge ${n.id}(${stationOf(n)})→${toId}(${stationOf(t)}) |dx|=${dx} outside the alphabet`,
          ).toBe(true);
        }
      }
    });
  });

  it('the S25 no-inversion law holds over the station projection (same embedding, narrower)', () => {
    // belt on braces: the station map is a monotone remap of the S25
    // x-order, so this CANNOT fail unless the remap stops being monotone —
    // which is exactly the fact this pins
    eachMap((map, label) => {
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      const edges = map.nodes.flatMap((n) =>
        n.edges.map((toId) => ({
          a: n.id, b: toId, layer: n.layer,
          xa: stationOf(n), xb: stationOf(byId.get(toId)!),
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
    });
  });
});
