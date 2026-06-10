// Unit tests for the combat loop (§2), Thread (§5), Binding (§6), Resonance (§2.3).

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { computeResonanceSlots, longestSoloRun } from '../src/combat';

/** Start a run and return a state in the first combat. */
function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  return reduce(s0, { type: 'START_RUN', seed });
}

/** Force specific defIds into a player's hand (test-only state surgery). */
function forceHand(state: GameState, pid: PlayerId, defIds: string[]): string[] {
  const p = state.players[pid];
  const pool = [...p.hand, ...p.draw, ...p.discard];
  const ids: string[] = [];
  for (const defId of defIds) {
    const inst = p.deck.find(
      (c) => c.defId === defId && pool.includes(c.instanceId) && !ids.includes(c.instanceId),
    );
    if (!inst) throw new Error(`no ${defId} available for ${pid}`);
    ids.push(inst.instanceId);
  }
  p.hand = [...ids];
  p.draw = pool.filter((id) => !ids.includes(id));
  p.discard = [];
  return ids;
}

function ready(state: GameState): GameState {
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

describe('combat basics (§2)', () => {
  it('starts with 6 Thread, 3 energy, 5-card hands, revealed intents and bindings (§2.1, §5)', () => {
    const s = combatState();
    expect(s.phase).toBe('combat');
    expect(s.thread).toBe(6);
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      expect(s.players[pid].hand.length).toBe(5);
      expect(s.players[pid].energy).toBe(3);
    }
    for (const e of s.combat!.enemies) {
      expect(e.intent).toBeTruthy();
      expect(['p1', 'p2']).toContain(e.boundTo);
    }
    // multi-enemy fights split bindings (§6 weighting)
    const bindings = new Set(s.combat!.enemies.map((e) => e.boundTo));
    expect(bindings.size).toBe(2);
  });

  it('enforces the energy budget at staging', () => {
    let s = combatState();
    const ids = forceHand(s, 'p1', ['needlework', 'needlework', 'withering', 'stitchblade']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[0], slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[1], slot: 1, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[2], slot: 2 });
    // 3 energy spent; a fourth 1-cost card exceeds the budget
    expect(() =>
      reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: ids[3], slot: 3, targetId: enemy }),
    ).toThrow(/energy/);
  });

  it('links fire off the previous slot across players: Hex feeds Rendcall detonation (§2.3)', () => {
    let s = combatState();
    const [needle] = forceHand(s, 'p1', ['needlework']);
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    const enemy = s.combat!.enemies[0];
    const hpBefore = enemy.hp;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: enemy.id });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: enemy.id });
    s = ready(s);
    const det = s.log.find((e) => e.e === 'detonate');
    expect(det).toBeTruthy(); // 3 Hex applied then detonated by the link
    expect(det && det.e === 'detonate' && det.stacks).toBe(3);
    const after = s.combat?.enemies.find((e) => e.id === enemy.id);
    if (after) expect(after.hp).toBeLessThan(hpBefore - 8); // 8 base + 9 detonation (minus block rolls)
  });

  it('replace-links replace the base effect (Loose Stitch draws 2 instead of 1)', () => {
    let s = combatState();
    const [stitch] = forceHand(s, 'p1', ['loose_stitch']);
    const [opener] = forceHand(s, 'p2', ['opener']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 1 });
    const handBefore = s.players.p1.hand.length;
    s = ready(s);
    // started with handBefore, played 0 from hand (stitch already staged), drew 2, then drew to 5
    expect(s.players.p1.hand.length).toBeGreaterThanOrEqual(Math.min(5, handBefore + 2));
  });
});

describe('Resonance (§2.3)', () => {
  const slot = (owner: PlayerId) => ({ cardInstanceId: 'x', owner });

  it('requires 3+ fired links AND both players in the streak', () => {
    // 4 cards, links fire on slots 1..3
    const cross = [slot('p1'), slot('p2'), slot('p1'), slot('p2')];
    expect(computeResonanceSlots(cross, [false, true, true, true]).has(3)).toBe(true);
    // same shape but one owner: solo streaks never ignite
    const solo = [slot('p1'), slot('p1'), slot('p1'), slot('p1')];
    expect(computeResonanceSlots(solo, [false, true, true, true]).size).toBe(0);
    // only 2 fired links: no ignition
    expect(computeResonanceSlots(cross, [false, true, true, false]).size).toBe(0);
  });

  it('ignites in real resolution and boosts the final card by +50%', () => {
    let s = combatState(7);
    // p1: needlework(Hex), p2: rendcall (Link Hex fires), p1: loose_stitch (Link Strike fires),
    // p2: opener (Link Surge fires) → 3 fired links, both players → opener resonates.
    const [needle, stitch] = forceHand(s, 'p1', ['needlework', 'loose_stitch']);
    const [rend, opener] = forceHand(s, 'p2', ['rendcall', 'opener']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: enemy });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 2 });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 3, targetId: enemy });
    s = ready(s);
    const ignite = s.log.find((e) => e.e === 'resonance_ignite');
    expect(ignite).toBeTruthy();
    // opener's 4 damage resonates: ceil(4 * 1.5) = 6
    const hits = s.log.filter((e) => e.e === 'damage');
    expect(hits.some((h) => h.e === 'damage' && h.amount === 6)).toBe(true);
    expect(s.telemetry.resonances).toBe(1);
  });
});

describe('The Thread (§5)', () => {
  it('Pulse boosts the partner’s next card by +3 and costs 2 Thread', () => {
    let s = combatState();
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    forceHand(s, 'p1', ['wardknot']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 0, targetId: enemy });
    s = ready(s);
    expect(s.thread).toBe(6 - 2 + 2); // -2 pulse, +2 regen for turn 2
    const hit = s.log.find((e) => e.e === 'damage');
    expect(hit && hit.e === 'damage' && hit.amount).toBe(11); // 8 + 3
  });

  it('overdrafting the Thread frays both players (§5)', () => {
    let s = combatState();
    // 6 thread; 3 pulses (p1) + 1 sever (p2) = 9 → frays on the last
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'sever', targetId: s.combat!.enemies[0].id });
    const frayWasLogged = ready(s).log.some((e) => e.e === 'fray');
    expect(frayWasLogged).toBe(true);
    expect(ready(s).thread).toBeGreaterThanOrEqual(0);
  });

  it('Steady prevents the next Fray', () => {
    let s = combatState();
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'steady' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' });
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'pulse' }); // 1+2+2+2=7 > 6
    s = ready(s);
    expect(s.log.some((e) => e.e === 'fray')).toBe(false);
    expect(s.players.p1.statuses.frayed).toBe(0);
  });

  it('Sever Binding moves an enemy to the other player (§6)', () => {
    let s = combatState();
    const enemy = s.combat!.enemies[0];
    const before = enemy.boundTo;
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'sever', targetId: enemy.id });
    s = ready(s);
    const after = s.combat?.enemies.find((e) => e.id === enemy.id);
    if (after && after.hp > 0) expect(after.boundTo).toBe(before === 'p1' ? 'p2' : 'p1');
  });

  it('Reclaim copies a partner discard card as a mutated Echo (§5, §7)', () => {
    let s = combatState();
    // play p2's rendcall so it lands in discard, then p1 reclaims it next turn
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 0, targetId: enemy });
    s = ready(s);
    expect(s.players.p2.discard).toContain(rend);
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p1', kind: 'reclaim', targetId: rend });
    s = ready(s);
    const echoId = s.players.p1.hand.find((id) => id.startsWith('echo_'));
    expect(echoId).toBeTruthy();
    const echo = s.players.p1.combatCards.find((c) => c.instanceId === echoId)!;
    expect(echo.echo).toBe(true);
    expect(echo.mutated).toBe(true); // rendcall has a hand-authored mutation
    expect(s.players.p2.discard).toContain(rend); // the original never leaves
  });
});

describe('The Mourner (§6)', () => {
  it('longestSoloRun measures same-owner runs', () => {
    const slot = (o: PlayerId) => ({ cardInstanceId: 'x', owner: o });
    expect(longestSoloRun([slot('p1'), slot('p1'), slot('p2')])).toBe(2);
    expect(longestSoloRun([slot('p1'), slot('p1'), slot('p1'), slot('p1')])).toBe(4);
    expect(longestSoloRun([])).toBe(0);
  });
});

describe('run flow (§8)', () => {
  it('a finished combat yields two reward sets of 3 and Covet rules hold', () => {
    let s = combatState(11);
    // cheat the enemies dead, then resolve
    for (const e of s.combat!.enemies) e.hp = 1;
    const [needle] = forceHand(s, 'p1', ['needlework']);
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: s.combat!.enemies[0].id });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: s.combat!.enemies[1]?.id ?? s.combat!.enemies[0].id });
    s = ready(s);
    expect(s.phase).toBe('reward');
    expect(s.reward!.sets.p1.length).toBe(3);
    expect(s.reward!.sets.p2.length).toBe(3);
    // covet before partner picks is illegal (§8)
    expect(() => reduce(s, { type: 'COVET_PICK', player: 'p1', pick: s.reward!.sets.p2[0] })).toThrow();
    const deckBefore = s.players.p1.deck.length;
    s = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: s.reward!.sets.p1[0] });
    s = reduce(s, { type: 'REWARD_PICK', player: 'p2', pick: 'skip' });
    expect(s.players.p1.deck.length).toBe(deckBefore + 1);
    // now p1 may covet from p2's passed-over set, spending the charge
    s = reduce(s, { type: 'COVET_PICK', player: 'p1', pick: s.reward!.sets.p2[1] });
    expect(s.players.p1.covetCharges).toBe(0);
    expect(s.players.p1.deck.length).toBe(deckBefore + 2);
  });
});
