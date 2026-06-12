// §14.12 bot wiring: the policy Pulses dead links worth forcing, and the solo
// courtesy floor keeps the bot from draining the shared pool below 5.

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { pickableNodes } from '../src/map';

function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  return s;
}

/** A settled chain holding exactly one Pulse-worthy dead link: rendcall's
 *  Link (Hex) behind two Guards, with a fat Hex pile waiting on the enemy.
 *  The bot (p2) is out of energy and cards — its next move is the verdict. */
function pulseScenario(thread: number): BotView {
  const s = combatState();
  const stage = (pid: PlayerId, defId: string, slot: number, targetId?: string) => {
    const instanceId = `test_${pid}_${defId}_${slot}`;
    s.players[pid].deck.push({ instanceId, defId });
    s.combat!.chain.splice(slot, 0, { cardInstanceId: instanceId, owner: pid, targetId });
  };
  const enemy = s.combat!.enemies[0];
  enemy.hex = 5;
  stage('p1', 'brace_up', 0);
  stage('p1', 'brace_up', 1);
  stage('p2', 'rendcall', 2, enemy.id);
  s.players.p2.hand = [];
  s.players.p2.energy = 0;
  s.thread = thread;
  const counts = {
    p1: { hand: s.players.p1.hand.length, draw: 0 },
    p2: { hand: 0, draw: 0 },
  };
  return { ...s, you: 'p2', counts } as BotView;
}

function decideUntilSettled(policy: BotPolicy, view: BotView, max = 6) {
  const actions = [];
  for (let i = 0; i < max; i++) {
    const a = policy.decide(view);
    if (a === null) break;
    actions.push(a);
    if (a.type !== 'REORDER') break; // reorders don't change our static view
  }
  return actions;
}

describe('Pulse policy (§14.12)', () => {
  it('sim bot forces the detonation link once the chain is settled', () => {
    const policy = new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 });
    const actions = decideUntilSettled(policy, pulseScenario(6));
    const pulse = actions.find((a) => a.type === 'DECLARE_THREAD' && a.kind === 'pulse');
    expect(pulse).toBeTruthy();
    expect((pulse as { targetId?: string }).targetId).toMatch(/rendcall/);
  });

  it('solo courtesy floor: no Pulse that would take the pool below 5', () => {
    const policy = new BotPolicy({ mode: 'solo', seed: 7 });
    const actions = decideUntilSettled(policy, pulseScenario(6)); // 6-2 = 4 < 5
    expect(actions.some((a) => a.type === 'DECLARE_THREAD' && a.kind === 'pulse')).toBe(false);
  });

  it('solo bot pulses when the pool can afford the courtesy floor', () => {
    const policy = new BotPolicy({ mode: 'solo', seed: 7 });
    const actions = decideUntilSettled(policy, pulseScenario(8)); // 8-2 = 6 ≥ 5
    expect(actions.some((a) => a.type === 'DECLARE_THREAD' && a.kind === 'pulse')).toBe(true);
  });
});
