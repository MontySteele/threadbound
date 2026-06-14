// Playtest-2 live-report fixes (2026-06-12, second batch): Loom once-per-turn
// ruling (OQ#29), double-reclaim guard, echo stage/unstage paths, Stolen
// Breath's no-op upgrade.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { effectiveDef, runHooks, startTurn } from '../src/combat';
import { RELICS_BY_ID } from '../src/content/registry';
import { pickableNodes } from '../src/map';

function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  expect(s.phase).toBe('combat');
  return s;
}

function ready(state: GameState): GameState {
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

describe('Loom of Two Hands — once per turn, rare (OQ#29 ruling)', () => {
  it('grants Thread on the first own link fire of a turn only; recharges next turn', () => {
    const s = combatState();
    s.players.p1.relics.push('loom_of_two_hands');
    s.thread = 2;
    runHooks(s, 'p1', 'linkFired');
    expect(s.thread).toBe(3);
    runHooks(s, 'p1', 'linkFired');
    runHooks(s, 'p1', 'linkFired');
    expect(s.thread).toBe(3); // spent for the turn
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    startTurn(s); // next turn: +2 regen, charge back
    const before = s.thread;
    runHooks(s, 'p1', 'linkFired');
    expect(s.thread).toBe(before + 1);
  });

  it('is flagged rare (1/3 drop weight) and retexted', () => {
    const loom = RELICS_BY_ID.loom_of_two_hands;
    expect(loom.rare).toBe(true);
    expect(loom.hooks?.[0].oncePerTurn).toBe(true);
    expect(loom.text).toMatch(/first time/i);
  });
});

describe('Reclaim/Echo paths (PT2 reports)', () => {
  function withPartnerDiscard(s: GameState): string {
    // surgery: drop one of p2's drawn cards into the discard so p1 can reclaim
    const id = s.players.p2.draw[0];
    s.players.p2.draw = s.players.p2.draw.slice(1);
    s.players.p2.discard.push(id);
    return id;
  }

  it('the same card cannot be declared for Reclaim twice in one turn', () => {
    const s = combatState();
    const target = withPartnerDiscard(s);
    const s1 = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: target });
    expect(() =>
      reduce(s1, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: target }),
    ).toThrow(/already being reclaimed/);
    // (the partner can't even target it — it sits in THEIR discard, and
    // reclaim only reads the other player's pile)
    expect(() =>
      reduce(s1, { type: 'DECLARE_THREAD', player: 'p2', kind: 'reclaim', targetId: target }),
    ).toThrow(/partner's discard/);
  });

  it('an Echo can be staged, UNSTAGED (energy refunded), restaged, and exhausts on play', () => {
    let s = combatState();
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    const target = withPartnerDiscard(s);
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: target });
    s = ready(s);
    const echoId = s.players.p1.combatCards.find((c) => c.echo)!.instanceId;
    expect(s.players.p1.hand).toContain(echoId);

    const def = effectiveDef(s.players.p1.combatCards.find((c) => c.echo)!);
    const energyBefore = s.players.p1.energy;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: echoId, slot: 0, targetId: def.needsTarget ? s.combat!.enemies[0].id : undefined });
    expect(s.players.p1.energy).toBe(energyBefore - def.cost);
    // "Echo cards can't be removed" — unstaging IS supported and refunds
    s = reduce(s, { type: 'UNSTAGE_CARD', player: 'p1', cardInstanceId: echoId });
    expect(s.players.p1.energy).toBe(energyBefore);
    expect(s.players.p1.hand).toContain(echoId);

    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: echoId, slot: 0, targetId: def.needsTarget ? s.combat!.enemies[0].id : undefined });
    s = ready(s);
    expect(s.players.p1.exhaust).toContain(echoId); // echoes exhaust on play
  });
});

describe('Stolen Breath upgrade is no longer a no-op (PT2)', () => {
  it('upgraded link grants Kindled 2 (base card untouched pending OQ#30)', () => {
    const base = effectiveDef({ instanceId: 't', defId: 'stolen_breath' });
    const up = effectiveDef({ instanceId: 't', defId: 'stolen_breath', upgraded: true });
    expect(base.link?.effects).toEqual([{ op: 'kindled', amount: 1 }]);
    expect(up.link?.effects).toEqual([{ op: 'kindled', amount: 2 }]);
    expect(up.base).toEqual(base.base); // power level is OQ#30's call
  });
});
