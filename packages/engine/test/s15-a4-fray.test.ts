// S15.2B (sweep B5 option B, D2 RULED 2026-07-05: option C, A-first): at A4
// the Fray damage bonus lands PAST Block. Below A4 the arithmetic is
// byte-identical to the old pre-block multiplier — pinned both ways. The
// rung finally bites the pair it was aimed at: a turtle with a full wall
// still pays the Fray tax.

import { describe, expect, it } from 'vitest';
import { EnemyIntent, GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';

function enemyPhase(intent: EnemyIntent, mut: (s: GameState) => void): { hpLoss: number } {
  const s0 = initialState(91, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed: 91 });
  startCombat(s, ['seamripper']);
  const enemy = s.combat!.enemies[0];
  enemy.boundTo = 'p1';
  enemy.intent = intent;
  s.players.p1.block = 20;
  mut(s);
  const before = s.players.p1.hp;
  let t = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
  t = reduce(t, { type: 'SET_READY', player: 'p2', ready: true });
  return { hpLoss: before - t.players.p1.hp };
}

describe('S15.2B: A4 post-block Fray', () => {
  it('A0 control: the Fray bonus is still a pre-block multiplier (fully blocked)', () => {
    const { hpLoss } = enemyPhase({ kind: 'attack', amount: 8 }, (s) => {
      s.players.p1.statuses.frayed = 1;
    });
    expect(hpLoss).toBe(0); // floor(8 × 1.25) = 10, all eaten by the wall
  });

  it('A4: the Fray bonus lands past Block — the turtle pays the tax', () => {
    const { hpLoss } = enemyPhase({ kind: 'attack', amount: 8 }, (s) => {
      s.ascension = 4;
      s.players.p1.statuses.frayed = 1;
    });
    expect(hpLoss).toBe(2); // base 8 blocked; the +25% bonus (2) bypasses
  });

  it('A4 with two Fray stacks: the bypassing bonus scales with the stacks', () => {
    const { hpLoss } = enemyPhase({ kind: 'attack', amount: 8 }, (s) => {
      s.ascension = 4;
      s.players.p1.statuses.frayed = 2;
    });
    expect(hpLoss).toBe(4); // floor(8 × 1.5) − 8
  });

  it('A4 unfrayed: nothing phantom — a plain attack is still fully blocked', () => {
    const { hpLoss } = enemyPhase({ kind: 'attack', amount: 8 }, (s) => {
      s.ascension = 4;
    });
    expect(hpLoss).toBe(0);
  });

  it('A4 pierce + Fray: identical total to the pre-block law (7 = floor(6 × 1.25))', () => {
    const { hpLoss } = enemyPhase({ kind: 'attack_pierce', amount: 6 }, (s) => {
      s.ascension = 4;
      s.players.p1.statuses.frayed = 1;
    });
    expect(hpLoss).toBe(7);
  });
});
