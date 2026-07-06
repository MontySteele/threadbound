// S15.2A (sweep B5, D2 RULED 2026-07-05: option C, A-first): the pierce
// intent — the roster's ONE way through Block. Pinned here: the block
// bypass itself, the modifier law (Weak/Fray apply pre-pierce — Weak IS the
// counterplay), the A2 damage scale, pool reachability on both topologies,
// and the Witness intro pool.

import { describe, expect, it } from 'vitest';
import { EnemyIntent, GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';
import { scaleIntent } from '../src/ascension';
import { generateActMap } from '../src/map';
import { ENCOUNTERS, ENCOUNTER_POOLS } from '../src/content/encounters';
import { ENEMIES } from '../src/content/registry';
import { WITNESS_POOLS } from '../src/witness-draw';

/** One enemy phase against p1 with a pinned intent; returns p1's HP loss.
 *  Both seats pass an empty chain so the enemy is the only actor. */
function enemyPhaseHpLoss(intent: EnemyIntent, mut?: (s: GameState) => void): number {
  const s0 = initialState(91, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed: 91 });
  startCombat(s, ['seamripper']);
  const enemy = s.combat!.enemies[0];
  enemy.boundTo = 'p1';
  enemy.intent = intent;
  s.players.p1.block = 20; // a wall a guard pair would be proud of
  mut?.(s);
  const before = s.players.p1.hp;
  let t = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
  t = reduce(t, { type: 'SET_READY', player: 'p2', ready: true });
  return before - t.players.p1.hp;
}

describe('S15.2A: attack_pierce resolution', () => {
  it('pierces past banked Block — the full amount lands', () => {
    expect(enemyPhaseHpLoss({ kind: 'attack_pierce', amount: 6 })).toBe(6);
  });

  it('control: a plain attack of the same size is fully blocked', () => {
    expect(enemyPhaseHpLoss({ kind: 'attack', amount: 6 })).toBe(0);
  });

  it('Weak dulls it (modifiers apply pre-pierce — the counterplay is real)', () => {
    const loss = enemyPhaseHpLoss({ kind: 'attack_pierce', amount: 6 }, (s) => {
      s.combat!.enemies[0].weak = 2;
    });
    expect(loss).toBe(Math.floor(6 * 0.75)); // 4
  });

  it('Fray amplifies it (same pre-block modifier law as every other hit)', () => {
    const loss = enemyPhaseHpLoss({ kind: 'attack_pierce', amount: 6 }, (s) => {
      s.players.p1.statuses.frayed = 1;
    });
    expect(loss).toBe(Math.floor(6 * 1.25)); // 7
  });

  it('A2 dmgScale scales the pierce amount', () => {
    expect(scaleIntent({ kind: 'attack_pierce', amount: 6 }, 1.1)).toEqual({ kind: 'attack_pierce', amount: 7 });
    // A0/A1 identity contract: the exact same object comes back
    const intent = { kind: 'attack_pierce' as const, amount: 6 };
    expect(scaleIntent(intent, 1)).toBe(intent);
  });
});

describe('S15.2A: the Seamripper is reachable where the ruling placed it', () => {
  it('registry + composition integrity', () => {
    expect(ENEMIES.seamripper).toBeDefined();
    for (const enc of Object.values(ENCOUNTERS)) {
      for (const id of enc.enemies) {
        expect(ENEMIES[id], `encounter ${enc.id} names unknown enemy ${id}`).toBeDefined();
      }
    }
    expect(ENCOUNTER_POOLS[2].normal).toContain('a2_ripper_eater');
    expect(ENCOUNTER_POOLS[2].elite).toContain('a2_knot_rippers');
  });

  for (const knotwork of [false, true]) {
    it(`the normal comp appears in act-2 ${knotwork ? 'braid' : 'classic'} maps across a seed sweep`, () => {
      const seen = new Set<string>();
      for (let seed = 1000; seed < 1060; seed++) {
        const { map } = generateActMap(seed, 2, false, false, [], [], knotwork);
        for (const n of map.nodes) if (n.encounterId) seen.add(n.encounterId);
      }
      expect(seen.has('a2_ripper_eater')).toBe(true);
      // knot/elite reachability is the S14 B1 coverage test's job — it
      // sweeps ENCOUNTER_POOLS generically and now includes a2_knot_rippers
    });
  }

  it('the knot comp escalates with the ladder even though its defs are normal-tier', () => {
    const spawn = (knotsCut: number): GameState => {
      const s0 = initialState(5, { p1: 'vess', p2: 'bram' });
      const s: GameState = reduce(s0, { type: 'START_RUN', seed: 5 });
      // stand the pair on an elite node so the node-kind half of the union keys
      const elite = s.map.nodes.find((n) => n.kind === 'elite') ?? s.map.nodes[0];
      elite.kind = 'elite';
      s.map.position = elite.id;
      s.map.knotsCut = knotsCut;
      startCombat(s, ENCOUNTERS.a2_knot_rippers.enemies);
      return s;
    };
    const base = spawn(0).combat!.enemies[0];
    const tightened = spawn(1).combat!.enemies[0];
    expect(tightened.maxHp).toBe(Math.round(base.maxHp * 1.1));
    expect(spawn(1).combat!.escalation).toBeCloseTo(0.10);
  });

  it('the Witness has its telegraph pool (D5 row 4, RATIFIED — S16-D1)', () => {
    const pool = WITNESS_POOLS['seamripper_intro'];
    expect(Array.isArray(pool) ? pool.length : 0).toBeGreaterThanOrEqual(3);
  });
});
