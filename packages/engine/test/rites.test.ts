// S7/S8.1 — the Rites: registry covenants, the death-rite offer, character
// events → birth-rite threshold, flag discipline, and a flagged fuzz pass.
// Rite tables are PROVISIONAL pending the S8.8 gate-1 sign-off.

import { describe, expect, it } from 'vitest';
import { Action, EffectOp, GameState, IllegalAction, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { RITES, RITE_CARDS, RITES_BY_ID, ritesFor } from '../src/content/rites';
import { CHARACTER_EVENTS } from '../src/content/character-events';
import { CARDS, cardsForCharacter, neutralCards } from '../src/content/cards';
import { eventsForAct } from '../src/content/registry';
import { runHooks } from '../src/combat';
import { Die, checkInvariants, randomAction } from './fuzz-driver';

const start = (seed: number, opts: { tracks?: boolean; rites?: boolean } = {}): GameState =>
  reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, ...opts });

// ---------------------------------------------------------------------------
// S7.1 registry covenants
// ---------------------------------------------------------------------------

describe('rite registry covenant (S7.1/S8.1)', () => {
  it('every role has 4 death rites (cards) and 3 birth rites (passives)', () => {
    for (const role of ['vess', 'bram'] as const) {
      const death = ritesFor(role, 'death');
      const birth = ritesFor(role, 'birth');
      expect(death.length).toBeGreaterThanOrEqual(4);
      expect(birth.length).toBeGreaterThanOrEqual(3);
      for (const r of death) {
        const card = CARDS[r.cardId!];
        expect(card, `${r.id} card missing`).toBeTruthy();
        expect(card.riteOnly, `${r.id} card not riteOnly`).toBe(true);
        expect(card.character).toBe(role);
        // S8.1: every rite card is a legal Reclaim target with an authored
        // mutation, and upgradeable like any card
        expect(card.mutation, `${r.id} card missing mutation`).toBeTruthy();
        expect(card.upgrade, `${r.id} card missing upgrade`).toBeTruthy();
      }
      for (const r of birth) {
        expect(r.hooks?.length || r.passives?.length, `${r.id} inert`).toBeTruthy();
      }
    }
  });

  it('no rite effect grows Hex (OQ#28/OQ#43 caps are load-bearing)', () => {
    const HEX_OPS = new Set(['hex', 'hexAll', 'hexPerLinkFired', 'doubleHex']);
    const scan = (ops: EffectOp[] | undefined, label: string): void => {
      for (const op of ops ?? []) {
        expect(HEX_OPS.has(op.op), `${label}: ${op.op} grows Hex`).toBe(false);
      }
    };
    for (const card of RITE_CARDS) {
      scan(card.base, `${card.id} base`);
      scan(card.link?.effects, `${card.id} link`);
      scan(card.mutation?.base, `${card.id} mutation`);
      scan(card.mutation?.link?.effects, `${card.id} mutation link`);
      scan(card.upgrade?.base, `${card.id} upgrade`);
      scan(card.upgrade?.link?.effects, `${card.id} upgrade link`);
    }
    for (const rite of RITES) {
      for (const hook of rite.hooks ?? []) {
        for (const op of hook.effects) {
          expect(op.op === 'hexAll', `${rite.id} hook grows Hex`).toBe(false);
        }
      }
    }
  });

  it('rite cards never enter draft pools; character events never enter unflagged pools', () => {
    for (const role of ['vess', 'bram'] as const) {
      for (const c of cardsForCharacter(role)) expect(c.riteOnly).toBeFalsy();
    }
    for (const c of neutralCards()) expect(c.riteOnly).toBeFalsy();
    for (const act of [1, 2] as const) {
      // unflagged and tracks-only pools carry no character events
      expect(eventsForAct(act, false).some((e) => e.character)).toBe(false);
      expect(eventsForAct(act, true).some((e) => e.character)).toBe(false);
      // rites pools carry only the present characters' events
      const pool = eventsForAct(act, false, ['vess']);
      expect(pool.some((e) => e.character === 'vess')).toBe(true);
      expect(pool.some((e) => e.character === 'bram')).toBe(false);
    }
    expect(CHARACTER_EVENTS.length).toBeGreaterThanOrEqual(6);
    for (const role of ['vess', 'bram'] as const) {
      expect(CHARACTER_EVENTS.filter((e) => e.character === role).length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------------------------------------------------------------------------
// Flag discipline
// ---------------------------------------------------------------------------

describe('rites flag discipline (S7.0)', () => {
  it('flag off: no rites keys, no rites phase; rites:false ≡ absent', () => {
    const off = start(11);
    expect(off.rites).toBeUndefined();
    expect(off.ritesState).toBeUndefined();
    expect(off.telemetry.rites).toBeUndefined();
    expect(off.phase).toBe('map');
    const explicit = start(11, { rites: false });
    expect(hashState(explicit)).toBe(hashState(off));
  });

  it('tracks-only runs gain no rites keys (independent toggles)', () => {
    const t = start(12, { tracks: true });
    expect(t.rites).toBeUndefined();
    expect(t.ritesState).toBeUndefined();
    expect(t.phase).toBe('map');
  });

  it('same seed → same offer, same truth, deterministic rites roll after the truth roll', () => {
    const a = start(13, { tracks: true, rites: true });
    const b = start(13, { tracks: true, rites: true });
    expect(a.ritesState!.offer).toEqual(b.ritesState!.offer);
    expect(a.truth!.tuple).toEqual(b.truth!.tuple);
    // NOTE: a tracks-only run's truth legitimately differs from a
    // tracks+rites run's — character events change act-1 map generation's
    // rng consumption before the truth roll. The covenants that must hold
    // are rites-off ≡ pre-S7 (golden lock) and same-seed determinism (here).
  });
});

// ---------------------------------------------------------------------------
// S7.2 death-rite offer
// ---------------------------------------------------------------------------

describe('the death-rite offer (S7.2/S8.0)', () => {
  it('each player is offered 2 distinct of their role’s 4; the pick adds the card', () => {
    let s = start(21, { rites: true });
    expect(s.phase).toBe('rites');
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const offer = s.ritesState!.offer![pid];
      expect(offer.length).toBe(2);
      expect(new Set(offer).size).toBe(2);
      const role = s.players[pid].character;
      for (const id of offer) expect(RITES_BY_ID[id].role).toBe(role);
    }
    const deckBefore = s.players.p1.deck.length;
    const pick = s.ritesState!.offer!.p1[0];
    s = reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: pick });
    expect(s.players.p1.rites).toEqual([pick]);
    expect(s.players.p1.deck.length).toBe(deckBefore + 1);
    expect(s.players.p1.deck.some((c) => c.defId === RITES_BY_ID[pick].cardId)).toBe(true);
    expect(s.telemetry.rites!.deathPick.p1).toBe(pick);
    expect(s.phase).toBe('rites'); // partner still choosing
    // un-offered vestments and double-vesting are refused
    const other = RITES.find((r) => r.role === 'vess' && r.kind === 'death' && !s.ritesState!.offer!.p1.includes(r.id))!;
    expect(() => reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: other.id })).toThrow(IllegalAction);
    s = reduce(s, { type: 'RITE_PICK', player: 'p2', riteId: s.ritesState!.offer!.p2[1] });
    expect(s.phase).toBe('map');
    expect(s.ritesState!.offer).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S7.3/S7.4 character events → birth threshold
// ---------------------------------------------------------------------------

/** Teleport a rites run onto a single-node map holding the given event. */
function atEvent(s: GameState, eventId: string): GameState {
  s = structuredClone(s);
  s.phase = 'map';
  s.map = {
    act: s.map.act, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0,
    nodes: [{ id: 0, kind: 'event', eventId, edges: [], layer: 0, lane: 0 }],
  };
  let n = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
  return reduce(n, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
}

function vestedRun(seed: number): GameState {
  let s = start(seed, { rites: true });
  s = reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: s.ritesState!.offer!.p1[0] });
  s = reduce(s, { type: 'RITE_PICK', player: 'p2', riteId: s.ritesState!.offer!.p2[0] });
  return s;
}

describe('character events and the birth threshold (S7.3/S7.4)', () => {
  it('the matching seat is the actor; resolution pays 1 progress; dedup records it', () => {
    let s = vestedRun(31);
    s = atEvent(s, 'ce_vess_station');
    expect(s.phase).toBe('event');
    expect(s.event!.subject).toBe('p1'); // vess sits at p1
    expect(s.ritesState!.seenEvents).toContain('ce_vess_station');
    s = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'strip' });
    expect(s.ritesState!.progress.p1).toBe(1);
    expect(s.telemetry.rites!.characterEvents.p1).toBe(1);
    expect(s.ritesState!.birthChoice).toBeNull();
  });

  it('the 2nd character event owes the birth pick; ADVANCE is gated; the pick lands the passive', () => {
    let s = vestedRun(32);
    s = atEvent(s, 'ce_vess_station');
    s = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'strip' });
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    s = atEvent(s, 'ce_vess_wardline');
    s = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'unpick' });
    expect(s.ritesState!.progress.p1).toBe(2);
    expect(s.ritesState!.birthChoice).toBe('p1');
    // the owing seat cannot advance; the partner can ready up
    expect(() => reduce(s, { type: 'ADVANCE', player: 'p1' })).toThrow(IllegalAction);
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    // wrong-role and death rites are refused; a birth rite lands
    expect(() => reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: 'br_hearth_keeper' })).toThrow(IllegalAction);
    expect(() => reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: 'dr_shroud' })).toThrow(IllegalAction);
    s = reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: 'br_first_breath' });
    expect(s.players.p1.rites).toContain('br_first_breath');
    expect(s.ritesState!.birthChoice).toBeNull();
    expect(s.ritesState!.birthPicked.p1).toBe(true);
    expect(s.telemetry.rites!.birthPick.p1).toBe('br_first_breath');
    expect(s.telemetry.rites!.birthTiming.p1).toEqual({ act: 1, layer: 0 });
    // a 3rd character event pays progress but owes nothing further
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = atEvent(s, 'ce_vess_needle');
    s = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'leave' });
    expect(s.ritesState!.progress.p1).toBe(3);
    expect(s.ritesState!.birthChoice).toBeNull();
  });

  it('an unowed birth pick is refused', () => {
    const s = vestedRun(33);
    expect(() => reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: 'br_first_breath' })).toThrow(IllegalAction);
  });

  it('oncePerCombat hooks fire exactly once per combat (First-Breath)', () => {
    const s = vestedRun(34);
    (s.players.p1.rites ??= []).push('br_first_breath');
    s.players.p1.hp -= 5;
    s.players.p2.hp -= 5;
    // minimal combat shell — runHooks only needs the charge trackers
    s.combat = { hookOnceFired: [], hookCombatFired: [] } as never as GameState['combat'];
    const before = { p1: s.players.p1.hp, p2: s.players.p2.hp };
    runHooks(s, 'p1', 'resonance');
    expect(s.players.p1.hp).toBe(before.p1 + 1);
    expect(s.players.p2.hp).toBe(before.p2 + 1);
    runHooks(s, 'p1', 'resonance'); // charge spent — no second heal
    expect(s.players.p1.hp).toBe(before.p1 + 1);
    expect(s.players.p2.hp).toBe(before.p2 + 1);
  });
});

// ---------------------------------------------------------------------------
// Flagged fuzz: TB_TRACKS + TB_RITES together (gate 4 pattern) — invariants,
// IllegalAction-only throws, replay determinism, and the rites surfaces
// actually exercised.
// ---------------------------------------------------------------------------

describe('rites fuzz (flag on, 25 seeds)', () => {
  it('holds invariants and replays with tracks+rites on', () => {
    let vestings = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const die = new Die(seed * 60013);
      let state = start(seed, { tracks: true, rites: true });
      expect(state.phase).toBe('rites');
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < 2500; step++) {
        const action = randomAction(state, die);
        if (!action) break;
        try {
          state = reduce(state, action);
        } catch (err) {
          expect(err, `seed=\${seed} step=\${step}: non-IllegalAction from \${action.type}`).toBeInstanceOf(IllegalAction);
          continue;
        }
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      vestings += (state.players.p1.rites ?? []).length + (state.players.p2.rites ?? []).length;
      let replay = start(seed, { tracks: true, rites: true });
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=\${seed}: rites replay diverged at action \${i} (\${action.type})`);
        }
      });
    }
    expect(vestings).toBeGreaterThan(25); // both seats vest in most runs
  });
}, 300_000);
