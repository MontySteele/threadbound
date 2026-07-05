// S14.2 (sweep B1, ruled 2026-07-02): elite slots SAMPLE the pool. The old
// positional draw made the Mislaid Sexton and The Unstrung unreachable below
// A3 — the coverage gate here is the CI rider the ruling asked for: every
// pool elite reachable at A0 across a seed sweep, both topologies.

import { describe, expect, it } from 'vitest';
import { generateActMap } from '../src/map';
import { ENCOUNTER_POOLS } from '../src/content/encounters';

const SEEDS = Array.from({ length: 60 }, (_, i) => 1000 + i);

function elitesAcrossSeeds(act: 1 | 2, knotwork: boolean): Set<string> {
  const seen = new Set<string>();
  for (const seed of SEEDS) {
    const { map } = generateActMap(seed, act, false, false, [], [], knotwork);
    for (const n of map.nodes) {
      if (n.kind === 'elite' && n.encounterId) seen.add(n.encounterId);
    }
  }
  return seen;
}

describe('S14.2 B1: elite slots sample the pool', () => {
  for (const act of [1, 2] as const) {
    for (const knotwork of [false, true]) {
      it(`act ${act} ${knotwork ? 'braid' : 'classic'}: every pool elite appears at A0 across the seed sweep`, () => {
        const seen = elitesAcrossSeeds(act, knotwork);
        for (const id of ENCOUNTER_POOLS[act].elite) {
          expect(seen.has(id), `${id} unreachable at A0 (${knotwork ? 'braid' : 'classic'})`).toBe(true);
        }
      });
    }
  }

  it('the draw is seeded and deterministic (pinning: same seed, same order)', () => {
    const a = generateActMap(4242, 1, false, false, [], [], false).map;
    const b = generateActMap(4242, 1, false, false, [], [], false).map;
    const elites = (m: typeof a) => m.nodes.filter((n) => n.kind === 'elite').map((n) => n.encounterId);
    expect(elites(a)).toEqual(elites(b));
    expect(elites(a).length).toBeGreaterThan(0);
  });

  it('sample-without-replacement: no elite repeats within one act map (A3 extra elite included)', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const knotwork of [false, true]) {
        const { map } = generateActMap(seed, 1, true, false, [], [], knotwork);
        const ids = map.nodes.filter((n) => n.kind === 'elite').map((n) => n.encounterId);
        expect(new Set(ids).size, `seed ${seed} ${knotwork ? 'braid' : 'classic'}: repeated elite`).toBe(ids.length);
      }
    }
  });
});
