// S15.2A (B5): the bot reads the pierce telegraph — Block resets each turn,
// so banking a Guard card into a turn where every incoming hit pierces is a
// wasted play. PRODUCTION-WIDE (sim + solo): this is correct play off public
// telegraph info, not a heuristic gamble — same class as B14's planning fix.
// Gate 5 of the sprint reads the guard suite's play-rate shift off this.

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { EnemyIntent, GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { pickableNodes } from '../src/map';

/** p2 (bram) holding exactly one Guard and one Strike, low HP, every living
 *  enemy bound to p2 wearing `intent`. Returns the staged card's defId. */
function stagedUnder(intent: EnemyIntent): string {
  const s0 = initialState(42, { p1: 'vess', p2: 'bram' });
  let s: GameState = reduce(s0, { type: 'START_RUN', seed: 42 });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  const p2 = s.players.p2;
  const brace = p2.deck.find((c) => c.defId === 'brace_up')!;
  const jab = p2.deck.find((c) => c.defId === 'jab')!;
  p2.hand = [brace.instanceId, jab.instanceId];
  p2.energy = 3;
  p2.hp = Math.floor(p2.maxHp * 0.3); // lowHp: the guard preference is live
  for (const e of s.combat!.enemies) {
    e.boundTo = 'p2';
    e.intent = intent;
  }
  const counts = {
    p1: { hand: s.players.p1.hand.length, draw: 0 },
    p2: { hand: 2, draw: 0 },
  };
  const view = { ...s, you: 'p2', counts } as BotView;
  const a = new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 }).decide(view);
  expect(a?.type).toBe('STAGE_CARD');
  const staged = a!.type === 'STAGE_CARD' ? a.cardInstanceId : '';
  return p2.deck.find((c) => c.instanceId === staged)!.defId;
}

describe('S15.2A: bot reads the pierce telegraph', () => {
  it('control: at low HP under a plain attack, the Guard card is preferred', () => {
    expect(stagedUnder({ kind: 'attack', amount: 8 })).toBe('brace_up');
  });

  it('under a pierce-only telegraph the Guard preference inverts — stage the Strike', () => {
    expect(stagedUnder({ kind: 'attack_pierce', amount: 8 })).toBe('jab');
  });
});
