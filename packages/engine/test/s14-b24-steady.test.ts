// S14.2 (sweep B24): the sim bot's minimal Steady heuristic — the verb had
// literally never been spent by a bot (0 across every battery on record),
// so the telemetry stat measured a structural zero. SIM-ONLY: the solo
// policy never fires it (no production surface changes).

import { describe, expect, it } from 'vitest';
import { BotPolicy, BotView } from '../src/bot-policy';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { pickableNodes } from '../src/map';

function combatView(mut: (s: GameState) => void): BotView {
  const s0 = initialState(42, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed: 42 });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  s.players.p2.hand = [];
  s.players.p2.energy = 0;
  mut(s);
  const counts = {
    p1: { hand: s.players.p1.hand.length, draw: 0 },
    p2: { hand: 0, draw: 0 },
  };
  return { ...s, you: 'p2', counts } as BotView;
}

const steadyOf = (policy: BotPolicy, view: BotView) => {
  const a = policy.decide(view);
  return a?.type === 'DECLARE_THREAD' && a.kind === 'steady' ? a : null;
};

describe('S14.2 B24: Steady heuristic (sim-only)', () => {
  it('scrubs active Fray stacks when affordable', () => {
    const view = combatView((s) => {
      s.players.p1.statuses.frayed = 1;
      s.players.p2.statuses.frayed = 1;
      s.thread = 5;
    });
    expect(steadyOf(new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 }), view))
      .toEqual({ type: 'DECLARE_THREAD', player: 'p2', kind: 'steady' });
  });

  it('pre-banks the shield when the pool scrapes bottom (remaining <= 1)', () => {
    const view = combatView((s) => { s.thread = 1; });
    expect(steadyOf(new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 }), view))
      .toEqual({ type: 'DECLARE_THREAD', player: 'p2', kind: 'steady' });
  });

  it('stays quiet with a healthy pool and no Fray (readies instead)', () => {
    const view = combatView((s) => { s.thread = 6; });
    const a = new BotPolicy({ mode: 'sim', lockstep: false, seed: 7 }).decide(view);
    expect(a).toEqual({ type: 'SET_READY', player: 'p2', ready: true });
  });

  it('never fires in solo mode (no production surface changes)', () => {
    const view = combatView((s) => {
      s.players.p1.statuses.frayed = 2;
      s.players.p2.statuses.frayed = 2;
      s.thread = 5;
    });
    expect(steadyOf(new BotPolicy({ mode: 'solo', seed: 7 }), view)).toBeNull();
  });
});
