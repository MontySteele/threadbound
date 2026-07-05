// S14.2 (sweep B14): bot link-planning shares the engine's computeLinksFired
// — the Choir Silence suppression comes along with the dedup. The drift bug
// this pins: bots' hand-rolled link math read a held link as FIRED, so they
// staged into it and could never Pulse it.

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { pickableNodes } from '../src/map';
import { computeLinksFired } from '../src/combat';

function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  return s;
}

/** A settled chain whose ONE link (rendcall off a Hex card) WOULD fire —
 *  but Choir Silence stands, so the engine holds it. Fat Hex pile waiting.
 *  The bot (p2) is out of energy and cards. */
function silenceScenario(): { state: GameState; view: BotView } {
  const s = combatState();
  const stage = (pid: PlayerId, defId: string, slot: number, targetId?: string) => {
    const instanceId = `test_${pid}_${defId}_${slot}`;
    s.players[pid].deck.push({ instanceId, defId });
    s.combat!.chain.splice(slot, 0, { cardInstanceId: instanceId, owner: pid, targetId });
  };
  const enemy = s.combat!.enemies[0];
  enemy.defId = 'choir_silence'; // the held-first-link mechanic, standing
  enemy.hex = 5;
  stage('p1', 'pinprick', 0, enemy.id);
  stage('p2', 'rendcall', 1, enemy.id); // link: Hex → detonate; prev tag Hex
  s.players.p2.hand = [];
  s.players.p2.energy = 0;
  s.thread = 8;
  const counts = {
    p1: { hand: s.players.p1.hand.length, draw: 0 },
    p2: { hand: 0, draw: 0 },
  };
  return { state: s, view: { ...s, you: 'p2', counts } as BotView };
}

describe('S14.2 B14: bot planning sees Choir Silence', () => {
  it('the engine holds the first firing link while Choir Silence stands', () => {
    const { state } = silenceScenario();
    expect(computeLinksFired(state, state.combat!.chain)).toEqual([false, false]);
  });

  it('the bot Pulses the held link (pre-B14 it read the link as fired and never could)', () => {
    const { view } = silenceScenario();
    const policy = new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 });
    const a = policy.decide(view);
    expect(a).toEqual({ type: 'DECLARE_THREAD', player: 'p2', kind: 'pulse', targetId: 'test_p2_rendcall_1' });
  });
});
