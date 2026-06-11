// Unit tests for the combat loop (§2), Thread (§5), Binding (§6), and the M2
// rules revisions (hands A1, Kindled A2, Fallen A3, Pulse carry D4, Unraveled).

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { computeResonanceSlots, longestSoloRun } from '../src/combat';
import { pickableNodes } from '../src/map';

/** Start a run and walk both players onto the first (combat) map node. */
function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  expect(s.phase).toBe('combat');
  return s;
}

/**
 * Put specific defIds into a player's hand (test-only state surgery): injects
 * instances into the deck when the starter deck doesn't carry them.
 */
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

/** Beef up enemies so damage assertions aren't capped by remaining HP. */
function toughen(state: GameState): void {
  for (const e of state.combat!.enemies) {
    e.hp = 500;
    e.maxHp = 500;
  }
}

describe('fixed draw of 5 (Playtest-1 ruling, §14.7)', () => {
  it('cards drawn during resolution are EXTRA next turn, not absorbed by the refill', () => {
    const s0 = combatState();
    toughen(s0);
    const [stitch] = forceHand(s0, 'p1', ['loose_stitch']); // 0-cost "Draw 1"
    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 0 });
    s = ready(s);
    expect(s.phase).toBe('combat');
    // p1: 1 carried (drawn mid-resolution) + 5 fresh; p2: just the 5
    expect(s.players.p1.hand.length).toBe(6);
    expect(s.players.p2.hand.length).toBe(5);
  });
});

describe('map negotiation (M2-B3)', () => {
  it('requires both players to pick the same node; mismatches bounce', () => {
    const s0 = initialState(7, { p1: 'vess', p2: 'bram' });
    let s = reduce(s0, { type: 'START_RUN', seed: 7 });
    expect(s.phase).toBe('map');
    const options = pickableNodes(s.map);
    expect(options.length).toBeGreaterThanOrEqual(2);
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: options[0] });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: options[1] });
    expect(s.phase).toBe('map'); // disagreement — nobody moves
    expect(s.map.mismatchStreak).toBe(1);
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: options[0] });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: options[0] });
    expect(s.phase).toBe('combat'); // layer 0 is always combat
  });
});

describe('combat basics (§2)', () => {
  it('starts with 6 Thread, 3 energy, 5-card hands, intents and bindings', () => {
    const s = combatState();
    expect(s.thread).toBe(6);
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      expect(s.players[pid].hand.length).toBe(5);
      expect(s.players[pid].energy).toBe(3);
    }
    for (const e of s.combat!.enemies) {
      expect(e.intent).toBeTruthy();
      expect(['p1', 'p2']).toContain(e.boundTo);
    }
  });

  it('enforces the energy budget at staging and refunds on unstage', () => {
    let s = combatState();
    const ids = forceHand(s, 'p1', ['needlework', 'needlework', 'withering', 'stitchblade']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[0], slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[1], slot: 1, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[2], slot: 2 });
    expect(s.players.p1.energy).toBe(0);
    expect(() =>
      reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[3], slot: 3, targetId: enemy }),
    ).toThrow(/energy/);
    s = reduce(s, { type: 'UNSTAGE_CARD', player: 'p1', cardInstanceId: ids[2] });
    expect(s.players.p1.energy).toBe(1);
  });

  it('links fire off the previous slot across players: Hex feeds Rendcall detonation (§2.3)', () => {
    let s = combatState();
    const [needle] = forceHand(s, 'p1', ['needlework']);
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    const enemy = s.combat!.enemies[0];
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: enemy.id });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: enemy.id });
    s = ready(s);
    const det = s.log.find((e) => e.e === 'detonate');
    expect(det && det.e === 'detonate' && det.stacks).toBe(4); // Needlework post-lever-3

  });

  it('M2-A1: cards in hand at commit discard at end of turn; cards drawn during resolution carry', () => {
    let s = combatState();
    // p1 hand: loose_stitch (will be staged) + two bystanders that must discard
    const [stitch, bystander1, bystander2] = forceHand(s, 'p1', ['loose_stitch', 'wardknot', 'wardknot']);
    const [opener] = forceHand(s, 'p2', ['opener']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 1 }); // Link (Strike): draw 2
    s = ready(s);
    if (s.phase !== 'combat') return; // enemies died — nothing left to assert
    const p1 = s.players.p1;
    // bystanders discarded (M2-A1)...
    expect(p1.hand).not.toContain(bystander1);
    expect(p1.hand).not.toContain(bystander2);
    expect(p1.discard).toContain(bystander1);
    // ...and the 2 cards drawn mid-resolution (Link Strike: draw 2) carry as
    // EXTRA on top of the fixed 5 (Playtest-1 ruling, §14.7)
    expect(p1.hand.length).toBe(7);
  });

  it('M2-A2: Kindled banks energy into the next turn', () => {
    let s = combatState();
    const [wind] = forceHand(s, 'p2', ['second_wind']); // Gain Kindled 1. Draw 1.
    forceHand(s, 'p1', ['wardknot']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: wind, slot: 0 });
    s = ready(s);
    if (s.phase !== 'combat') return;
    expect(s.players.p2.energy).toBe(4); // 3 + Kindled 1
    expect(s.players.p2.kindled).toBe(0);
  });

  it('M2-D4: Pulse skips cards with no primary number and lands on the next that has one', () => {
    let s = combatState();
    const [stitch, knife] = forceHand(s, 'p1', ['loose_stitch', 'stitchblade']);
    forceHand(s, 'p2', ['brace_up']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'pulse' });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 0 }); // draw only — no primary
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: knife, slot: 1, targetId: enemy }); // Deal 5
    toughen(s);
    s = ready(s);
    const hits = s.log.filter((e) => e.e === 'damage');
    // stitchblade deals 5 + 3 Pulse = 8 (raw, vs unblocked enemy: hpLoss+blocked = 8)
    expect(hits.some((h) => h.e === 'damage' && h.hpLoss + h.blocked === 8)).toBe(true);
  });
});

describe('Resonance (§2.3)', () => {
  const slot = (owner: PlayerId) => ({ cardInstanceId: 'x', owner });

  it('requires 3+ fired links AND both players in the streak', () => {
    const cross = [slot('p1'), slot('p2'), slot('p1'), slot('p2')];
    expect(computeResonanceSlots(cross, [false, true, true, true]).has(3)).toBe(true);
    const solo = [slot('p1'), slot('p1'), slot('p1'), slot('p1')];
    expect(computeResonanceSlots(solo, [false, true, true, true]).size).toBe(0);
    expect(computeResonanceSlots(cross, [false, true, true, false]).size).toBe(0);
  });

  it('ignites in real resolution and boosts the final card by +50%', () => {
    let s = combatState(7);
    const [needle, stitch] = forceHand(s, 'p1', ['needlework', 'loose_stitch']);
    const [rend, opener] = forceHand(s, 'p2', ['rendcall', 'opener']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 2 });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 3, targetId: enemy });
    toughen(s);
    s = ready(s);
    expect(s.log.find((e) => e.e === 'resonance_ignite')).toBeTruthy();
    // opener's 4 damage resonates: ceil(4 * 1.5) = 6 raw
    const hits = s.log.filter((e) => e.e === 'damage');
    expect(hits.some((h) => h.e === 'damage' && h.hpLoss + h.blocked === 6)).toBe(true);
    expect(s.telemetry.resonances).toBe(1);
  });
});

describe('The Thread (§5)', () => {
  it('Pulse boosts the partner’s next primary number by +3 and costs 2 Thread', () => {
    let s = combatState();
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    forceHand(s, 'p1', ['wardknot']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 0, targetId: enemy });
    toughen(s);
    s = ready(s);
    const hit = s.log.find((e) => e.e === 'damage');
    expect(hit && hit.e === 'damage' && hit.hpLoss + hit.blocked).toBe(11); // 8 + 3
  });

  it('overdrafting the Thread frays both players (§5)', () => {
    let s = combatState();
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'sever', targetId: s.combat!.enemies[0].id });
    const done = ready(s);
    expect(done.log.some((e) => e.e === 'fray')).toBe(true);
    expect(done.thread).toBeGreaterThanOrEqual(0);
  });

  it('Steady prevents the next Fray', () => {
    let s = combatState();
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'steady' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = ready(s);
    expect(s.log.some((e) => e.e === 'fray')).toBe(false);
  });

  it('Reclaim copies a partner discard card as a mutated Echo (§5, §7)', () => {
    let s = combatState();
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 0, targetId: enemy });
    s = ready(s);
    if (s.phase !== 'combat') return;
    expect(s.players.p2.discard).toContain(rend);
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: rend });
    s = ready(s);
    if (s.phase !== 'combat') return;
    const echoId = [...s.players.p1.hand, ...s.players.p1.discard].find((id) => id.startsWith('echo_'));
    expect(echoId).toBeTruthy();
    const echo = s.players.p1.combatCards.find((c) => c.instanceId === echoId)!;
    expect(echo.echo).toBe(true);
    expect(echo.mutated).toBe(true);
    expect(s.players.p2.discard).toContain(rend);
  });
});

describe('Fallen (M2-A3)', () => {
  function fellP1(seed = 3): GameState {
    let s = combatState(seed);
    s.players.p1.hp = 1; // next hit fells them
    for (const e of s.combat!.enemies) {
      e.boundTo = 'p1';
      e.intent = { kind: 'attack', amount: 10 };
    }
    return ready(s);
  }

  it('a player at 0 HP is Fallen: enemies rebind, Thread goes slack, no turns', () => {
    const s = fellP1();
    expect(s.phase).toBe('combat');
    expect(s.players.p1.fallen).toBe(true);
    expect(s.players.p1.hp).toBe(0);
    for (const e of s.combat!.enemies) {
      if (e.hp > 0 && e.boundTo !== null) expect(e.boundTo).toBe('p2');
    }
    expect(s.players.p1.ready).toBe(true); // takes no turns
    expect(() => reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'pulse' })).toThrow(/slack/);
    expect(() => reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: 'x', slot: 0 })).toThrow();
  });

  it('the survivor winning the combat revives the Fallen at 1 HP', () => {
    let s = fellP1();
    expect(s.players.p1.fallen).toBe(true);
    for (const e of s.combat!.enemies) e.hp = 1;
    const [card] = forceHand(s, 'p2', ['rendcall']);
    const target = s.combat!.enemies.find((e) => e.hp > 0)!.id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: card, slot: 0, targetId: target });
    // pyre vault would be better; just kill them all manually except target logic:
    for (const e of s.combat!.enemies) if (e.id !== target) e.hp = 0;
    s = ready(s);
    expect(s.phase).toBe('reward');
    expect(s.players.p1.fallen).toBe(false);
    expect(s.players.p1.hp).toBe(1);
    expect(s.log.some((e) => e.e === 'revived')).toBe(true);
  });

  it('both down = run over', () => {
    let s = combatState(3);
    s.players.p1.hp = 1;
    s.players.p2.hp = 1;
    for (const e of s.combat!.enemies) e.intent = { kind: 'attack_all', amount: 10 };
    s = ready(s);
    expect(s.phase).toBe('game_over');
  });
});

describe('The Mourner & chain shapes (§6)', () => {
  it('longestSoloRun measures same-owner runs', () => {
    const slot = (o: PlayerId) => ({ cardInstanceId: 'x', owner: o });
    expect(longestSoloRun([slot('p1'), slot('p1'), slot('p2')])).toBe(2);
    expect(longestSoloRun([slot('p1'), slot('p1'), slot('p1'), slot('p1')])).toBe(4);
    expect(longestSoloRun([])).toBe(0);
  });
});

describe('concede (M3 downtime list)', () => {
  it('requires both confirmations, is retractable, and routes through game_over', () => {
    let s = combatState(13);
    s = reduce(s, { type: 'CONCEDE', player: 'p1', confirm: true });
    expect(s.phase).toBe('combat'); // one vote is not a decision
    s = reduce(s, { type: 'CONCEDE', player: 'p1', confirm: false }); // changed our mind
    s = reduce(s, { type: 'CONCEDE', player: 'p2', confirm: true });
    expect(s.phase).toBe('combat');
    s = reduce(s, { type: 'CONCEDE', player: 'p1', confirm: true });
    expect(s.phase).toBe('game_over'); // both agreed — summary + epitaph route
    expect(s.log.some((e) => e.e === 'witness')).toBe(true);
    expect(() => reduce(s, { type: 'CONCEDE', player: 'p1', confirm: true })).toThrow();
  });
});

describe('run flow (§8, M2-B4/B6)', () => {
  it('combat victory yields reward sets, gold, and Covet rules hold', () => {
    let s = combatState(11);
    const goldBefore = s.gold;
    for (const e of s.combat!.enemies) e.hp = 1;
    const [needle] = forceHand(s, 'p1', ['lashing_coil']); // AoE cleans up
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0 });
    s = ready(s);
    expect(s.phase).toBe('reward');
    expect(s.gold).toBeGreaterThan(goldBefore);
    expect(s.reward!.sets.p1.length).toBe(3);
    expect(() => reduce(s, { type: 'COVET_PICK', player: 'p1', pick: s.reward!.sets.p2[0] })).toThrow();
    const deckBefore = s.players.p1.deck.length;
    s = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: s.reward!.sets.p1[0] });
    s = reduce(s, { type: 'REWARD_PICK', player: 'p2', pick: 'skip' });
    s = reduce(s, { type: 'COVET_PICK', player: 'p1', pick: s.reward!.sets.p2[1] });
    expect(s.players.p1.covetCharges).toBe(0);
    expect(s.players.p1.deck.length).toBe(deckBefore + 2);
    // both advance → back to the map
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    expect(s.phase).toBe('map');
  });

  it('upgrades overlay at a rest site (M2-B6)', () => {
    let s = combatState(5);
    // surgically enter a rest state
    s.phase = 'rest';
    s.combat = null;
    s.rest = { chosen: { p1: null, p2: null }, upgradePicked: { p1: false, p2: false }, wedding: null };
    s = reduce(s, { type: 'REST_CHOOSE', player: 'p1', option: 'upgrade' });
    const target = s.players.p1.deck.find((c) => !c.upgraded)!;
    s = reduce(s, { type: 'UPGRADE_PICK', player: 'p1', cardInstanceId: target.instanceId });
    expect(s.players.p1.deck.find((c) => c.instanceId === target.instanceId)!.upgraded).toBe(true);
    expect(() => reduce(s, { type: 'UPGRADE_PICK', player: 'p1', cardInstanceId: target.instanceId })).toThrow();
  });
});
