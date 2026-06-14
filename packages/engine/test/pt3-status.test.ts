// OQ#46: enemy-applied Weak / Vulnerable / Fray are deferred to the start of
// the player's NEXT turn (so a 1-stack actually lasts a turn instead of being
// wiped before it can bite), while thread-overdraft Fray stays immediate.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { resolveTurn, startTurn, spendThread } from '../src/combat';
import { pickableNodes } from '../src/map';

function combatState(seed = 7): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  expect(s.phase).toBe('combat');
  return s;
}

/** Reduce the fight to a single high-HP enemy bound to p1 with a chosen intent. */
function loneEnemy(s: GameState, intent: any): void {
  const e = s.combat!.enemies[0];
  s.combat!.enemies = [e];
  e.hp = 200; e.maxHp = 200; e.strength = 0; e.boundTo = 'p1';
  e.intent = intent;
}

describe('OQ#46: enemy debuffs take hold next turn', () => {
  it('Weak defers off statuses, activates at the next turn start, then decrements', () => {
    const s = combatState();
    loneEnemy(s, { kind: 'debuff_weak', amount: 2 });
    resolveTurn(s);
    // applied during the enemy phase, but parked in pendingStatus
    expect(s.players.p1.statuses.weak).toBe(0);
    expect(s.players.p1.pendingStatus.weak).toBe(2);
    // activates at the player's next turn start
    startTurn(s);
    expect(s.players.p1.statuses.weak).toBe(2);
    expect(s.players.p1.pendingStatus.weak).toBe(0);
    // then ticks down turn by turn (so amount 2 = two effective turns)
    startTurn(s);
    expect(s.players.p1.statuses.weak).toBe(1);
  });

  it('Vulnerable defers the same way', () => {
    const s = combatState();
    loneEnemy(s, { kind: 'debuff_vulnerable', amount: 2 });
    resolveTurn(s);
    expect(s.players.p1.statuses.vulnerable).toBe(0);
    expect(s.players.p1.pendingStatus.vulnerable).toBe(2);
    startTurn(s);
    expect(s.players.p1.statuses.vulnerable).toBe(2);
  });

  it('boss Fray defers, bites for exactly one turn, then clears', () => {
    const s = combatState();
    loneEnemy(s, { kind: 'attack_fray', amount: 1 });
    resolveTurn(s);
    // both players fray (the Thread is shared), but next turn
    expect(s.players.p1.statuses.frayed).toBe(0);
    expect(s.players.p1.pendingStatus.frayed).toBe(1);
    expect(s.players.p2.pendingStatus.frayed).toBe(1);
    startTurn(s);
    expect(s.players.p1.statuses.frayed).toBe(1);
    expect(s.players.p2.statuses.frayed).toBe(1);
    // Fray is a one-turn status: reset at the following turn start, no carry
    startTurn(s);
    expect(s.players.p1.statuses.frayed).toBe(0);
  });

  it('thread-overdraft Fray stays IMMEDIATE (player-phase, not deferred)', () => {
    const s = combatState();
    s.thread = 0;
    s.players.p1.statuses.frayed = 0;
    s.players.p2.statuses.frayed = 0;
    spendThread(s, 1); // overdraft → fray now, this turn
    expect(s.players.p1.statuses.frayed).toBe(1);
    expect(s.players.p2.statuses.frayed).toBe(1);
    expect(s.players.p1.pendingStatus.frayed).toBe(0);
  });
});
