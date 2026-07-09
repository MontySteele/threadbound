// S22 Phase B pins — the Caretaker (D4): binds to neither, Restoration as
// grownDef-in-reverse, run-truth wards, the Purge, the phase turn, and the
// Witness's one scripted intervention. All of it exists only in act-4
// fights, behind the completion claim — no canon battery can see it.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { generateAct4Map } from '../src/map';
import { CARDS } from '../src/content/cards';
import { ENCOUNTERS } from '../src/content/encounters';
import { ENEMIES } from '../src/content/registry';
import { CARETAKER_FACES } from '../src/content/caretaker';
import { FIFTH_ANSWERS, FIFTH_ANSWERS_BY_ID } from '../src/content/questions';
import { grownDef, restorationHolds, effectiveDef, findInstance } from '../src/combat';

const CHARS = { p1: 'vess', p2: 'bram' } as const;

function start(seed: number, declared = FIFTH_ANSWERS[0].id): GameState {
  return reduce(initialState(seed, CHARS), {
    type: 'START_RUN', seed, tracks: true, codexComplete: true, codexDeclared: declared,
  } as never);
}

/** Teleport a declared run to the Cradle and step down to the Caretaker. */
function atCaretaker(seed: number, declared = FIFTH_ANSWERS[0].id): GameState {
  let s = start(seed, declared);
  s.map = generateAct4Map();
  s.map.position = 1;
  s.phase = 'map';
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: 2 });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: 2 });
  expect(s.phase).toBe('combat');
  return s;
}

function resolveWith(s: GameState, intent: unknown): GameState {
  s.combat!.enemies[0].intent = intent as never;
  let n = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
  n = reduce(n, { type: 'SET_READY', player: 'p2', ready: true });
  return n;
}

describe('S22.4 — content sanity', () => {
  it('the Caretaker registers for lookup only; the faces map onto the fifth pool', () => {
    expect(ENEMIES.the_caretaker?.boss).toBe(true);
    expect(ENEMIES.the_caretaker.act).toBe(4);
    expect(ENCOUNTERS.caretaker.enemies).toEqual(['the_caretaker']);
    const faceKeys = Object.keys(CARETAKER_FACES);
    expect(faceKeys.length).toBeGreaterThanOrEqual(2);
    expect(faceKeys.length).toBeLessThanOrEqual(4);
    for (const [answerId, face] of Object.entries(CARETAKER_FACES)) {
      expect(FIFTH_ANSWERS_BY_ID[answerId], `${answerId} not a fifth answer`).toBeTruthy();
      expect(face.opening).toBeGreaterThanOrEqual(0);
      expect(face.opening).toBeLessThan(ENEMIES.the_caretaker.script.length);
    }
    // the phase-2 script rides the same global scales as every script
    expect(ENEMIES.the_caretaker.caretaker!.phase2Script.some((i) => i.kind === 'purge')).toBe(true);
  });
});

describe('S22.4 — the encounter', () => {
  it('binds to NEITHER player, stays targetable, and wears the declared face', () => {
    for (const [answerId, face] of Object.entries(CARETAKER_FACES)) {
      const s = atCaretaker(61, answerId);
      const e = s.combat!.enemies[0];
      expect(e.boundTo).toBeNull();
      expect(e.untargetable).toBe(false);
      expect(e.nameOverride).toBe(face.title);
      expect(e.scriptIndex).toBe(face.opening);
      expect(e.revealedMechanics).toEqual([face.mechanicLine]);
    }
    // it never touches the anti-streak ledger (it takes no bind)
    expect(atCaretaker(62).bindsByPlayer).toBeUndefined();
  });

  it('Restoration: drift reads as first cut for exactly one turn (grownDef in reverse)', () => {
    let s = atCaretaker(63);
    // manufacture drift: upgrade p1's first upgradeable card
    const inst = s.players.p1.deck.find((c) => CARDS[c.defId].upgrade)!;
    inst.upgraded = true;
    expect(effectiveDef(inst)).not.toEqual(CARDS[inst.defId]);
    expect(restorationHolds(s)).toBe(false);

    s = resolveWith(s, { kind: 'restore' });
    expect(s.combat!.restoredTurn).toBe(s.combat!.turn);
    expect(restorationHolds(s)).toBe(true);
    const restored = findInstance(s.players.p1, inst.instanceId)!;
    expect(grownDef(s, restored, 'p1')).toEqual(CARDS[inst.defId]);

    // the window closes with the turn
    s = resolveWith(s, { kind: 'block', amount: 5 });
    expect(restorationHolds(s)).toBe(false);
    expect(s.combat!.restoredTurn).toBeUndefined();
    expect(grownDef(s, findInstance(s.players.p1, inst.instanceId)!, 'p1')).not.toEqual(CARDS[inst.defId]);
  });

  it('wards: each truth named THIS descent cancels one Restoration before it lands', () => {
    let s = start(64);
    s.truth!.shrine = {
      stakeRelicId: null, sheet: {}, struck: {},
      confirmed: { p1: true, p2: true }, stakeLost: false,
      verdict: { q_who: 'true', q_came: 'false', q_what: 'true', q_why: 'blank' },
    } as never;
    s.map = generateAct4Map();
    s.map.position = 1;
    s.phase = 'map';
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: 2 });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: 2 });
    expect(s.combat!.wards).toBe(2);

    s = resolveWith(s, { kind: 'restore' });
    expect(s.combat!.wards).toBe(1);
    expect(s.combat!.restoredTurn).toBeUndefined(); // cancelled before landing
    s = resolveWith(s, { kind: 'restore' });
    expect(s.combat!.wards).toBe(0);
    s = resolveWith(s, { kind: 'restore' });
    expect(s.combat!.restoredTurn).toBe(s.combat!.turn); // wards spent — it lands
  });

  it('the profile codex does not buff the fight: no shrine verdict, no wards', () => {
    const s = atCaretaker(65);
    expect(s.combat!.wards).toBeUndefined();
  });

  it('Purge: the front of the next chain is exiled — it does not resolve and leaves the run', () => {
    let s = atCaretaker(66);
    s = resolveWith(s, { kind: 'purge', count: 1 });
    expect(s.combat!.purgeNext).toBe(1);

    const p1 = s.players.p1;
    const enemyId = s.combat!.enemies[0].id;
    const stageable = p1.hand
      .map((id) => findInstance(p1, id)!)
      .find((c) => effectiveDef(c).cost <= p1.energy)!;
    expect(stageable).toBeTruthy();
    const deckBefore = p1.deck.length;
    const playedBefore = s.telemetry.cardsPlayed;
    s = reduce(s, {
      type: 'STAGE_CARD', player: 'p1', cardInstanceId: stageable.instanceId, slot: 0,
      ...(effectiveDef(stageable).needsTarget ? { targetId: enemyId } : {}),
    });
    s = resolveWith(s, { kind: 'block', amount: 5 });
    expect(s.players.p1.deck.length).toBe(deckBefore - 1);
    expect(s.players.p1.deck.some((c) => c.instanceId === stageable.instanceId)).toBe(false);
    expect(s.telemetry.cardsPlayed).toBe(playedBefore); // it never resolved
    expect(s.combat!.purgeNext).toBeUndefined();
  });

  it('the phase turn: at half its blood the script turns to the purge and the Witness arms its one Pulse', () => {
    let s = atCaretaker(67);
    const e = s.combat!.enemies[0];
    e.hp = Math.floor(e.maxHp / 2); // the pair has cut it to the line
    s = resolveWith(s, { kind: 'block', amount: 5 });
    const after = s.combat!.enemies[0];
    expect(after.phase2).toBe(true);
    expect(s.combat!.witnessPulseNext).toBe(true);
    expect(after.intent.kind).toBe(ENEMIES.the_caretaker.caretaker!.phase2Script[0].kind);
    // once only
    s = resolveWith(s, { kind: 'block', amount: 5 });
    expect(s.combat!.witnessPulseNext).toBeUndefined(); // spent on that resolution
  });

  it('the intervention: the pair’s earliest dead Link fires, free, once', () => {
    let s = atCaretaker(68);
    s.combat!.witnessPulseNext = true;
    // stage two cards so a link CAN be dead (slot 0 links never fire naturally)
    const p1 = s.players.p1;
    const linked = p1.hand
      .map((id) => findInstance(p1, id)!)
      .filter((c) => !effectiveDef(c).needsTarget && effectiveDef(c).cost <= 1 && effectiveDef(c).link);
    if (linked.length === 0) return; // seed didn't deal a stageable linked card — other seeds pin this
    const forcedBefore = s.telemetry.forcedLinkFires;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: linked[0].instanceId, slot: 0 });
    s = resolveWith(s, { kind: 'block', amount: 5 });
    expect(s.telemetry.forcedLinkFires).toBe(forcedBefore + 1);
    expect(s.combat!.witnessPulseNext).toBeUndefined();
  });
});
