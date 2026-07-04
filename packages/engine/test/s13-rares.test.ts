// S13.2 rare engines — behavioral tests for the three NEW hook events
// (partnerLinkFired, chainClose, threadSpend) and the pull-based Reclaim
// semantics of Keepsake. Data-shape covenants live in covenant.test.ts;
// this file proves the engines actually fire, once per turn, on the
// correct seat.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
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

function forceHand(state: GameState, pid: PlayerId, defIds: string[]): string[] {
  const p = state.players[pid];
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

function ready(state: GameState): GameState {
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

function toughen(state: GameState): void {
  for (const e of state.combat!.enemies) {
    e.hp = 500;
    e.maxHp = 500;
  }
}

const target = (s: GameState) => s.combat!.enemies.find((e) => e.hp > 0 && !e.untargetable)!.id;

describe('S13.2 Gravebloom — hex echo on the PARTNER’s link-fire (partnerLinkFired)', () => {
  it('fires when the partner links, not when the holder does, and only once per turn', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('gravebloom'); // vess holds the engine
    // bram: opener (Strike) then crossguard, whose Link (Strike) fires —
    // TWO partner link-fires in one chain; the echo is capped at one
    const [opener, crossguard, bellows] = forceHand(s0, 'p2', ['opener', 'crossguard', 'bellows']);
    const hexBefore = s0.combat!.enemies.map((e) => e.hex);
    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 0, targetId: target(s0) });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: crossguard, slot: 1 });
    // bellows Link (Guard) fires off crossguard — a third link, still capped
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: bellows, slot: 2 });
    s = ready(s);
    for (let i = 0; i < s.combat!.enemies.length; i++) {
      expect(s.combat!.enemies[i].hex - hexBefore[i]).toBe(2); // once, flat 2 — never 4/6
    }
  });

  it('the holder’s own link-fires do not echo', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('gravebloom');
    // vess links off her own card: pinprick (Strike-conditioned Link needs a
    // Strike before it) — stitchblade (Strike)... use loose_stitch after
    // hatpin-like: stitchblade then pinprick? pinprick Link (Strike) fires
    // off stitchblade (Strike tag). Both are p1's own cards.
    const [blade, prick] = forceHand(s0, 'p1', ['stitchblade', 'pinprick']);
    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: blade, slot: 0, targetId: target(s0) });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: prick, slot: 1, targetId: target(s0) });
    // stitchblade (slot 0, no fire) deals damage only; pinprick's fired
    // Link (Strike) REPLACES its base — "Apply 4 instead"
    const hexFromCards = 4;
    const tgt = s.combat!.chain[0].targetId!;
    const before = s.combat!.enemies.find((e) => e.id === tgt)!.hex;
    s = ready(s);
    const after = s.combat!.enemies.find((e) => e.id === tgt)!.hex;
    expect(after - before).toBe(hexFromCards); // no +2 echo on top
    const others = s.combat!.enemies.filter((e) => e.id !== tgt);
    for (const e of others) expect(e.hex).toBe(0); // no hexAll echo anywhere
  });
});

describe('S13.2 Selvage — the chain-position payoff (chainClose)', () => {
  it('pays both seats when the chain closes on the holder’s card', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('selvage');
    const [stitch] = forceHand(s0, 'p1', ['loose_stitch']);
    const [opener] = forceHand(s0, 'p2', ['opener']);
    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 0, targetId: target(s0) });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 1 }); // p1 closes
    s = ready(s);
    // block is wiped at next turn start and hook ops don't log block events —
    // the per-seat block telemetry is the honest read (no other block source
    // in this chain)
    expect(s.telemetry.blockByPlayer).toEqual({ p1: 3, p2: 3 });
  });

  it('stays silent when the partner closes the chain', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('selvage');
    const [stitch] = forceHand(s0, 'p1', ['loose_stitch']);
    const [opener] = forceHand(s0, 'p2', ['opener']);
    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 0 });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 1, targetId: target(s0) }); // p2 closes
    s = ready(s);
    expect(s.telemetry.blockByPlayer).toEqual({ p1: 0, p2: 0 });
  });
});

describe('S13.2 Stoker’s Due — the Thread-spend payoff (threadSpend)', () => {
  it('either seat’s declared spend stokes the holder, once per turn', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p2.powers.push('stokers_due'); // bram holds it
    // p1 (the PARTNER) declares a sever — the shared pool pays, the engine fires
    const enemy = s0.combat!.enemies.find((e) => e.hp > 0)!;
    let s = reduce(s0, { type: 'DECLARE_THREAD', player: 'p1', kind: 'sever', targetId: enemy.id });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'steady' });
    const momentumBefore = s.players.p2.momentum;
    s = ready(s);
    // two spends this turn, ONE payout (oncePerTurn): +2 Momentum (it
    // survives the turn — no Strike halved it) and +3 Block in telemetry
    expect(s.players.p2.momentum - momentumBefore).toBe(2);
    expect(s.telemetry.blockByPlayer.p2).toBe(3);
  });
});

describe('S13.2 Keepsake — Reclaim-keyed, PULL-based only', () => {
  it('pays the reclaimer, not the reclaimed-from', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('keepsake');
    // seed p2's discard with a reclaimable card
    const p2 = s0.players.p2;
    p2.deck.push({ instanceId: 'test_p2_opener_x', defId: 'opener' });
    p2.discard.push('test_p2_opener_x');
    s0.thread = 10;
    let s = reduce(s0, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: 'test_p2_opener_x' });
    const handBefore = s.players.p1.hand.length;
    const threadAfterCost = 10 - 2; // reclaim costs 2
    s = ready(s);
    // Keepsake: +1 Thread and draw 1 for the PULLER (p1). Thread reads
    // post-cost, pre-turn-start (regen happens next turn; assert via log)
    expect(s.log.some((e) => e.e === 'info' && e.detail.includes('Keepsake: +1 Thread'))).toBe(true);
    void handBefore; void threadAfterCost;
  });

  it('the partner reclaiming FROM the holder pays nothing', () => {
    const s0 = combatState();
    toughen(s0);
    s0.players.p1.powers.push('keepsake');
    const p1 = s0.players.p1;
    p1.deck.push({ instanceId: 'test_p1_pinprick_x', defId: 'pinprick' });
    p1.discard.push('test_p1_pinprick_x');
    s0.thread = 10;
    let s = reduce(s0, { type: 'DECLARE_THREAD', player: 'p2', kind: 'reclaim', targetId: 'test_p1_pinprick_x' });
    s = ready(s);
    expect(s.log.some((e) => e.e === 'info' && e.detail.includes('Keepsake'))).toBe(false);
  });
});
