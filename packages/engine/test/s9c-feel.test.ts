// S9c — the feel slice: Witness pools (S9c.2–4), Cradle-Warden +2 (S9c.1),
// and the flag fences. Strings themselves are PROVISIONAL (designer read
// gates the merge); these tests pin the machinery, not the prose.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { RITE_CARDS } from '../src/content/rites';
import { S9C_WITNESS } from '../src/content/witness-s9c';
import { WITNESS_POOLS, witnessPoolLines } from '../src/witness-draw';

describe('S9c Witness pools — wiring and fences', () => {
  it('every rite card has exactly one first-draw naming line, merged into the pools', () => {
    for (const card of RITE_CARDS) {
      const pool = S9C_WITNESS[`rite_first_draw_${card.id}`];
      expect(pool, `${card.id} missing naming line`).toBeTruthy();
      expect(pool.length, `${card.id}: one line per card — the single-line pool IS the once-per-run fence`).toBe(1);
      expect(witnessPoolLines(`rite_first_draw_${card.id}`).length).toBe(1);
    }
  });

  it('rite_reclaim pool has 4 lines; birth-pick pool has 1', () => {
    expect(witnessPoolLines('rite_reclaim').length).toBe(4);
    expect(witnessPoolLines('rite_birth_pick').length).toBe(1);
  });

  it('fences: no pool line explains the pip economy or mechanics vocabulary', () => {
    // R6 bundle secrecy: the held reveal explains nothing. Coarse lint over
    // the words that would leak the economy.
    // ("weight" deliberately absent: queue-weights never surface in prose,
    // and physical weight is legitimate funeral language)
    const BANNED = /\bpip|\bprogress\b|\bqueue\b|\bpassive\b|\bupgrade\b|\bregister\b|%/i;
    for (const [ctx, lines] of Object.entries(S9C_WITNESS)) {
      for (const line of lines) expect(BANNED.test(line), `${ctx}: "${line}"`).toBe(false);
    }
  });

  it('all S9c pools reach WITNESS_POOLS at load', () => {
    for (const ctx of Object.keys(S9C_WITNESS)) expect(WITNESS_POOLS[ctx], ctx).toBeTruthy();
  });
});

describe('S9c.1 Cradle-Warden bumps the linked effect by 2', () => {
  function chainWithWarden(): GameState {
    const s0 = initialState(11, { p1: 'vess', p2: 'bram' });
    let s = reduce(s0, { type: 'START_RUN', seed: 11 });
    // walk to first combat node
    const node = s.map.nodes.filter((n) => n.layer === 0)[0].id;
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
    expect(s.phase).toBe('combat');
    return s;
  }

  /** combat.test.ts convention: inject instances into the deck and make
   *  them the whole hand (test-only state surgery). */
  function forceHand(s: GameState, pid: PlayerId, defIds: string[]): string[] {
    const p = s.players[pid];
    const ids: string[] = [];
    defIds.forEach((defId, i) => {
      const instanceId = `test_${pid}_${defId}_${i}`;
      p.deck.push({ instanceId, defId });
      ids.push(instanceId);
    });
    p.draw = [...p.hand, ...p.draw, ...p.discard].filter(Boolean);
    p.discard = [];
    p.hand = [...ids];
    return ids;
  }

  /** Resolve hatpin (p1, Strike, Deal 4) → spark (p2, Link (Strike): Deal 3)
   *  and return the raw damage numbers logged. */
  function resolveSparkLink(warden: boolean): number[] {
    let s = chainWithWarden();
    if (warden) (s.players.p1.rites ??= []).push('br_cradle_warden');
    const [hat] = forceHand(s, 'p1', ['hatpin']);
    const [spark] = forceHand(s, 'p2', ['spark']);
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: hat, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: spark, slot: 1, targetId: enemy });
    s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
    s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
    return s.log.filter((e) => e.e === 'damage').map((e) => (e.e === 'damage' ? e.hpLoss + e.blocked : 0));
  }

  it('partner link fired off a warden’s card gains +2 (was +1)', () => {
    // spark's link deals 3 without the rite…
    expect(resolveSparkLink(false)).toContain(3);
    // …and 5 with Cradle-Warden on the card it fired off (S9c.1: +2)
    const withWarden = resolveSparkLink(true);
    expect(withWarden).toContain(5);
    expect(withWarden).not.toContain(3);
  });
});
