// S11.7 pacing-node variants (ruling 6): toll-door rests (one seat heals,
// vote-named) and covet caches (one-of-two treasure; a Covet charge seizes
// the rest). Variants exist only on flagged maps — unflagged shape, rng and
// goldens untouched by construction.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { generateActMap } from '../src/map';
import { ascensionMods } from '../src/ascension';
import { MAP_LAYERS } from '../src/content/registry';

/** A flagged run whose FIRST map pick lands on a fabricated variant node. */
function atVariant(seed: number, kind: 'rest' | 'treasure', variant: 'toll' | 'covet'): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s = reduce(s0, { type: 'START_RUN', seed, tracks: true });
  const n = s.map.nodes.find((x) => x.layer === 0)!;
  n.kind = kind;
  n.variant = variant;
  delete n.encounterId;
  return reduce(reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: n.id }),
    { type: 'NODE_PICK', player: 'p2', nodeId: n.id });
}

describe('S11.7 variant assignment (generation)', () => {
  it('unflagged maps carry NO variants (golden covenant)', () => {
    for (let i = 0; i < 100; i++) {
      const { map } = generateActMap(70_000 + i * 13, i % 2 === 0 ? 1 : 2, false, false);
      for (const n of map.nodes) expect(n.variant, `seed ${70_000 + i * 13} node ${n.id}`).toBeUndefined();
    }
  });

  it('flagged variants sit only on mid-map rests/treasures — the breath layer never varies', () => {
    let tolls = 0;
    let covets = 0;
    for (let i = 0; i < 100; i++) {
      const { map } = generateActMap(71_000 + i * 13, 2, false, true, [], ['vess', 'bram']);
      for (const n of map.nodes) {
        if (n.variant === undefined) continue;
        expect(n.layer).toBeGreaterThan(0);
        expect(n.layer).toBeLessThan(MAP_LAYERS - 1);
        if (n.variant === 'toll') { expect(n.kind).toBe('rest'); tolls++; }
        if (n.variant === 'covet') { expect(n.kind).toBe('treasure'); covets++; }
      }
      // never fully replacing plain rests: the breath-before-boss layer
      expect(map.nodes.some((n) => n.kind === 'rest' && n.variant === undefined)).toBe(true);
    }
    expect(tolls).toBeGreaterThan(0); // the coin actually lands sometimes
    expect(covets).toBeGreaterThan(0);
  });
});

describe('S11.7 toll-door rest', () => {
  it('REST_CHOOSE is closed; disagreement resets; the match heals ONE seat at 1.5×', () => {
    let s = atVariant(31, 'rest', 'toll');
    expect(s.phase).toBe('rest');
    expect(s.rest!.toll).toBeTruthy();
    expect(() => reduce(s, { type: 'REST_CHOOSE', player: 'p1', option: 'rest' })).toThrow(/toll-door/);
    s.players.p1.hp = 10;
    s.players.p2.hp = 10;
    // disagreement resets both votes
    s = reduce(s, { type: 'TOLL_PICK', player: 'p1', seat: 'p1' });
    s = reduce(s, { type: 'TOLL_PICK', player: 'p2', seat: 'p2' });
    expect(s.rest!.toll!.votes).toEqual({ p1: null, p2: null });
    expect(s.players.p1.hp).toBe(10);
    // agreement pays the toll: ONE seat, 1.5× a plain rest's heal
    s = reduce(s, { type: 'TOLL_PICK', player: 'p1', seat: 'p2' });
    s = reduce(s, { type: 'TOLL_PICK', player: 'p2', seat: 'p2' });
    const heal = Math.floor(s.players.p2.maxHp * ascensionMods(0).restHeal * 1.5);
    expect(s.players.p2.hp).toBe(10 + heal);
    expect(s.players.p1.hp).toBe(10); // the other seat gets edified, not mended
    expect(s.rest!.toll!.healed).toBe('p2');
    expect(() => reduce(s, { type: 'TOLL_PICK', player: 'p1', seat: 'p1' })).toThrow(/paid/);
    // the door is spent — Onward opens for both
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    expect(s.phase).toBe('map');
  });
});

describe('S11.7 covet cache', () => {
  it('one-of-two by vote-match; the relic path grants no gold; a charge seizes the rest', () => {
    let s = atVariant(37, 'treasure', 'covet');
    expect(s.phase).toBe('covet_treasure');
    const ct = () => s.covetTreasure!;
    const goldBefore = s.gold;
    expect(() => reduce(s, { type: 'ADVANCE', player: 'p1' })).toThrow(/divide/);
    // disagreement resets
    s = reduce(s, { type: 'TREASURE_PICK', player: 'p1', choice: 'gold' });
    s = reduce(s, { type: 'TREASURE_PICK', player: 'p2', choice: 'relic' });
    expect(ct().votes).toEqual({ p1: null, p2: null });
    // agreement takes the relic — and ONLY the relic
    s = reduce(s, { type: 'TREASURE_PICK', player: 'p1', choice: 'relic' });
    s = reduce(s, { type: 'TREASURE_PICK', player: 'p2', choice: 'relic' });
    expect(ct().taken).toBe('relic');
    expect(s.players[ct().owner].relics).toContain(ct().relicId);
    expect(s.gold).toBe(goldBefore);
    // no charge, no seize
    s.players.p1.covetCharges = 0;
    expect(() => reduce(s, { type: 'TREASURE_SEIZE', player: 'p1' })).toThrow(/charges/);
    // a charge seizes the coin
    s.players.p1.covetCharges = 1;
    s = reduce(s, { type: 'TREASURE_SEIZE', player: 'p1' });
    expect(s.gold).toBe(goldBefore + ct().gold);
    expect(s.players.p1.covetCharges).toBe(0);
    expect(s.telemetry.covetsSpent.p1).toBe(1);
    expect(() => reduce(s, { type: 'TREASURE_SEIZE', player: 'p2' })).toThrow(/already seized/);
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    expect(s.phase).toBe('map');
    expect(s.covetTreasure).toBeUndefined(); // DELETED, not nulled (shape parity)
  });

  it('the cache consumes the plain treasure’s exact rolls (rng parity between variants)', () => {
    const s0 = initialState(41, { p1: 'vess', p2: 'bram' });
    const base = reduce(s0, { type: 'START_RUN', seed: 41, tracks: true });
    const n = base.map.nodes.find((x) => x.layer === 0)!;
    n.kind = 'treasure';
    delete n.encounterId;
    const enter = (st: GameState): GameState =>
      reduce(reduce(st, { type: 'NODE_PICK', player: 'p1', nodeId: n.id }),
        { type: 'NODE_PICK', player: 'p2', nodeId: n.id });
    const plainSide = enter(structuredClone(base));
    const covetBase = structuredClone(base);
    covetBase.map.nodes.find((x) => x.id === n.id)!.variant = 'covet';
    const covetSide = enter(covetBase);
    expect(covetSide.rng).toBe(plainSide.rng); // same rolls, same order
    expect(covetSide.phase).toBe('covet_treasure');
    expect(plainSide.phase).toBe('reward');
  });
});
