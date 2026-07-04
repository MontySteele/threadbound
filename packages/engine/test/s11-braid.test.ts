// S11.8 (Wave B) — the braid generator, flag-gated TB_KNOTWORK. Two
// currency-keyed strands crossing at knots; the only way across the weave
// is through a snarl. Strand composition is data (content/strand-targets);
// the unflagged path is untouched by construction (the flag branches
// before a single roll — the existing golden lock is the deeper proof).

import { describe, expect, it } from 'vitest';
import { IllegalAction, MapNode, MapState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { generateActMap } from '../src/map';
import { CROSSING_LAYERS, CROSSING_LAYER_A3 } from '../src/content/strand-targets';
import { EVENTS, MAP_LAYERS } from '../src/content/registry';

const CHARS = ['vess', 'bram'] as const;
const braid = (seed: number, act: 1 | 2, extraElite = false): MapState =>
  generateActMap(seed, act, extraElite, true, [], [...CHARS], true).map;

const strandNodes = (map: MapState, strand: 'truth' | 'power'): MapNode[] =>
  map.nodes.filter((n) => n.strand === strand);

describe('S11.8 braid structure', () => {
  it('knots sit at the fixed crossing layers, owned by the weave (100 seeds, both acts)', () => {
    for (let i = 0; i < 100; i++) {
      const act = i % 2 === 0 ? 1 : (2 as const);
      const map = braid(80_000 + i * 13, act as 1 | 2);
      const knots = map.nodes.filter((n) => n.kind === 'elite');
      expect(knots.map((k) => k.layer).sort()).toEqual([...CROSSING_LAYERS].sort());
      for (const k of knots) expect(k.strand).toBeUndefined();
      // every other mid node rides a strand; breath layer + boss are shared
      for (const n of map.nodes) {
        if (n.kind === 'elite' || n.kind === 'boss' || n.layer >= MAP_LAYERS - 1) {
          expect(n.strand).toBeUndefined();
        } else {
          expect(n.strand, `seed ${80_000 + i * 13} node ${n.id}`).toBeTruthy();
        }
      }
    }
  });

  it('A3 adds a THIRD crossing layer (S11.11-1 recommendation: crossings stay scarce)', () => {
    const map = braid(81_001, 2, true);
    const layers = map.nodes.filter((n) => n.kind === 'elite').map((n) => n.layer).sort();
    expect(layers).toEqual([...CROSSING_LAYERS, CROSSING_LAYER_A3].sort());
  });

  it('the only way across the weave is through a snarl: strand edges never cross', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(82_000 + i * 13, 2);
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      for (const n of map.nodes) {
        if (!n.strand) continue;
        for (const e of n.edges) {
          const to = byId.get(e)!;
          // a strand node reaches: its own strand, a knot, or the breath layer
          const legal = to.strand === n.strand || to.kind === 'elite' || to.layer >= MAP_LAYERS - 1;
          expect(legal, `seed ${82_000 + i * 13}: ${n.id}(${n.strand}) → ${to.id}(${to.strand ?? to.kind})`).toBe(true);
        }
      }
      // and every knot releases onto BOTH strands (victory grants the crossing)
      for (const k of map.nodes.filter((n) => n.kind === 'elite')) {
        const strands = new Set(k.edges.map((e) => byId.get(e)!.strand ?? 'shared'));
        if (k.layer < MAP_LAYERS - 2) {
          expect(strands.has('truth'), `knot L${k.layer}`).toBe(true);
          expect(strands.has('power'), `knot L${k.layer}`).toBe(true);
        }
      }
    }
  });

  it('strand quotas hold (S11.11-4 data): truth is event-heavy, power pays power', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(83_000 + i * 13, 1);
      const truth = strandNodes(map, 'truth');
      const power = strandNodes(map, 'power');
      expect(truth.filter((n) => n.kind === 'event').length).toBeGreaterThanOrEqual(3);
      expect(truth.filter((n) => n.kind === 'combat').length).toBeLessThanOrEqual(2);
      expect(truth.filter((n) => n.kind === 'rest').length).toBeGreaterThanOrEqual(1);
      expect(power.filter((n) => n.kind === 'shop').length).toBeGreaterThanOrEqual(1);
      expect(power.filter((n) => n.kind === 'treasure').length).toBeGreaterThanOrEqual(1);
      expect(power.filter((n) => n.kind === 'rest').length).toBeGreaterThanOrEqual(1);
      expect(power.filter((n) => n.kind === 'event').length).toBeLessThanOrEqual(2);
      expect(power.filter((n) => n.kind === 'combat').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('character doors ride BOTH strands, one per seat (D6/D7 is never strand-gated)', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(84_000 + i * 13, 1);
      for (const strand of ['truth', 'power'] as const) {
        for (const ch of CHARS) {
          const doors = strandNodes(map, strand).filter(
            (n) => n.kind === 'event' && EVENTS[n.eventId!]?.character === ch,
          );
          expect(doors.length, `seed ${84_000 + i * 13} ${strand}/${ch}`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('the high-stakes floor deals into the truth strand on act 2', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(85_000 + i * 13, 2);
      const hs = map.nodes.filter((n) => n.kind === 'event' && EVENTS[n.eventId!]?.highStakes);
      expect(hs.length, `seed ${85_000 + i * 13}`).toBeGreaterThanOrEqual(1);
      expect(hs.length).toBeLessThanOrEqual(3);
      expect(hs.some((n) => n.strand === 'truth')).toBe(true);
    }
  });

  it('everything is reachable and everything reaches the boss; the breath layer is shared and plain', () => {
    for (let i = 0; i < 60; i++) {
      const map = braid(86_000 + i * 13, 2);
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      const boss = map.nodes.find((n) => n.kind === 'boss')!;
      // forward reachability from layer 0
      const seen = new Set<number>();
      const stack = map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        stack.push(...byId.get(cur)!.edges);
      }
      expect(seen.size, `seed ${86_000 + i * 13}`).toBe(map.nodes.length);
      // every non-boss node has a way forward
      for (const n of map.nodes) {
        if (n !== boss) expect(n.edges.length, `node ${n.id}`).toBeGreaterThan(0);
      }
      const breath = map.nodes.filter((n) => n.layer === MAP_LAYERS - 1);
      expect(breath.every((n) => n.kind === 'rest' && n.variant === undefined)).toBe(true);
    }
  });

  it('deterministic: same seed, same braid, same rng out', () => {
    const a = generateActMap(777, 2, false, true, [], [...CHARS], true);
    const b = generateActMap(777, 2, false, true, [], [...CHARS], true);
    expect(a.map.nodes).toEqual(b.map.nodes);
    expect(a.rng).toBe(b.rng);
  });

  it('flagged dressing rides the braid too: knot pins, mid-map variants only', () => {
    const map = braid(87_001, 2);
    for (const k of map.nodes.filter((n) => n.kind === 'elite')) {
      expect(k.scoutRelicId).toBeTruthy();
    }
    for (const n of map.nodes) {
      if (n.variant === undefined) continue;
      expect(n.layer).toBeGreaterThan(0);
      expect(n.layer).toBeLessThan(MAP_LAYERS - 1);
    }
  });
});

describe('S11.8 braid runs hold invariants (fuzz smoke — the full Wave B fuzz gate rides S11.10)', () => {
  it('seeded random walkers survive braid runs, both flags on', async () => {
    const { Die, checkInvariants, randomAction } = await import('./fuzz-driver');
    for (const seed of [3, 7, 11]) {
      const die = new Die(seed * 7919);
      let s = reduce(
        initialState(seed, { p1: 'vess', p2: 'bram' }),
        { type: 'START_RUN', seed, tracks: true, rites: true, knotwork: true },
      );
      for (let step = 0; step < 800; step++) {
        if (s.phase === 'victory' || s.phase === 'game_over') break;
        const action = randomAction(s, die);
        if (!action) break;
        try {
          s = reduce(s, action);
        } catch (e) {
          if (!(e instanceof IllegalAction)) throw e;
        }
        checkInvariants(s, seed, step);
      }
    }
  });
});

describe('S11.8 flag plumbing', () => {
  it('START_RUN knotwork sets the flag and generates a braid act 1; unflagged runs carry neither', () => {
    const s0 = initialState(91, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 91, tracks: true, rites: true, knotwork: true });
    expect(s.knotwork).toBe(true);
    expect(s.map.nodes.some((n) => n.strand)).toBe(true);
    const u0 = initialState(92, { p1: 'vess', p2: 'bram' });
    const u = reduce(u0, { type: 'START_RUN', seed: 92 });
    expect(u.knotwork).toBeUndefined();
    expect(u.map.nodes.every((n) => n.strand === undefined)).toBe(true);
  });
});
