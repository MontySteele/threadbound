// nt-slice S6.1: truth data model + roll. Covenant-style content audit over
// the question/answer/combo tables, plus the S6.0 flag-off covenant: with
// tracks unset, START_RUN produces a state indistinguishable from pre-slice.

import { describe, expect, it } from 'vitest';
import {
  ANSWERS, ANSWERS_BY_ID, EXCLUDED_FAMILIES, FRAGMENTS, QUESTIONS, QUESTIONS_BY_ID,
  VALID_COMBOS, answersFor, rollTruth, serveFragments,
} from '../src/content/truth';
import { CLUE_EVENTS } from '../src/content/clue-events';
import { eventsForAct } from '../src/content/registry';
import { generateActMap } from '../src/map';
import { initialState, reduce } from '../src/reducer';
import { clientTruthView } from '../src/truth-view';

describe('truth content covenant (S8.2 scope)', () => {
  it('S8.2 shape: 4 questions (who/came/what/why), 15 answers (2/4/4/5)', () => {
    expect(QUESTIONS.length).toBe(4);
    expect(QUESTIONS_BY_ID.q_who.kind).toBe('self');
    expect(QUESTIONS_BY_ID.q_came.kind).toBe('self');
    expect(QUESTIONS_BY_ID.q_what.kind).toBe('world');
    expect(QUESTIONS_BY_ID.q_why.kind).toBe('world');
    expect(ANSWERS.length).toBe(15);
    expect(answersFor('q_who').length).toBe(2); // held at 2 (the bubble question)
    expect(answersFor('q_came').length).toBe(4);
    expect(answersFor('q_what').length).toBe(4);
    expect(answersFor('q_why').length).toBe(5);
  });

  it('payoff bindings match the spec (+ S8.2 q_came provisional payoff)', () => {
    // world questions key boss reveals; self questions key personal boons
    expect(QUESTIONS_BY_ID.q_what.payoff).toBe('bossFace');
    expect(QUESTIONS_BY_ID.q_why.payoff).toBe('bossMechanic');
    expect(QUESTIONS_BY_ID.q_who.payoff).toBe('healEach');
    expect(QUESTIONS_BY_ID.q_came.payoff).toBe('pendingThread'); // S14.3 (B4, R8)
  });

  it('every answer carries sheet text and a codex entry', () => {
    for (const a of ANSWERS) {
      expect(a.text.length, a.id).toBeGreaterThan(0);
      expect(a.codexTruthEntry.length, a.id).toBeGreaterThan(0);
    }
  });

  it('combo table: 80 rows (2×4×4×5 minus the excluded families), all distinct, well-formed', () => {
    expect(VALID_COMBOS.length).toBe(80);
    const seen = new Set<string>();
    for (const combo of VALID_COMBOS) {
      const key = JSON.stringify(combo);
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      for (const q of QUESTIONS) {
        const answerId = (combo as Record<string, string>)[q.id];
        expect(answerId, `${key} missing ${q.id}`).toBeTruthy();
        expect(ANSWERS_BY_ID[answerId]?.questionId, `${key} → ${answerId}`).toBe(q.id);
      }
    }
  });

  it('every answer appears in at least one valid combo', () => {
    const used = new Set(VALID_COMBOS.flatMap((c) => Object.values(c)));
    for (const a of ANSWERS) expect(used.has(a.id), a.id).toBe(true);
  });

  it('every answer is FALSE in at least one combo (an unfalsifiable answer is dead content)', () => {
    for (const a of ANSWERS) {
      const falsifiable = VALID_COMBOS.some(
        (c) => (c as Record<string, string>)[a.questionId] !== a.id,
      );
      expect(falsifiable, a.id).toBe(true);
    }
  });

  it('no combo contains an excluded family pair; families reference real answers with rationale', () => {
    for (const f of EXCLUDED_FAMILIES) {
      expect(f.why.length, f.pair.join('×')).toBeGreaterThan(0);
      for (const id of f.pair) expect(ANSWERS_BY_ID[id], id).toBeTruthy();
      for (const combo of VALID_COMBOS) {
        const ids = Object.values(combo);
        expect(
          ids.includes(f.pair[0]) && ids.includes(f.pair[1]),
          `${JSON.stringify(combo)} contains excluded ${f.pair.join('×')}`,
        ).toBe(false);
      }
    }
  });
});

describe('truth roll', () => {
  it('is deterministic in the rng state and lands on a table row', () => {
    const a = rollTruth(12345);
    const b = rollTruth(12345);
    expect(a.value).toEqual(b.value);
    expect(a.state).toBe(b.state);
    expect(a.state).not.toBe(12345);
    expect(VALID_COMBOS.some((c) => JSON.stringify(c) === JSON.stringify(a.value))).toBe(true);
  });

  it('reaches every combo across seeds (uniform draw, no dead rows)', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 5000; s++) seen.add(JSON.stringify(rollTruth(s).value));
    expect(seen.size).toBe(VALID_COMBOS.length);
  });
});

describe('START_RUN flag threading (S6.0 covenant)', () => {
  const start = (tracks?: boolean) =>
    reduce(initialState(42, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 42, tracks });

  it('flag off: no truth state, no tracks key, rng stream untouched', () => {
    const off = start();
    const explicit = start(false);
    const pre = reduce(initialState(42, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 42 });
    expect('tracks' in off).toBe(false);
    expect('truth' in off).toBe(false);
    expect(off.rng).toBe(pre.rng);
    expect(JSON.stringify(off)).toBe(JSON.stringify(pre));
    expect(JSON.stringify(explicit)).toBe(JSON.stringify(pre));
  });

  it('flag on: truth rolled, boards empty, shrine null; same seed → same tuple', () => {
    const on = start(true);
    expect(on.tracks).toBe(true);
    expect(on.truth).toBeTruthy();
    expect(Object.keys(on.truth!.tuple).sort()).toEqual(['q_came', 'q_what', 'q_who', 'q_why']);
    expect(on.truth!.boards).toEqual({ p1: [], p2: [] });
    expect(on.truth!.shrine).toBeNull();
    expect(start(true).truth!.tuple).toEqual(on.truth!.tuple);
  });

  it('flag on: the act map can place clue events (S6.2 weighted pool)', () => {
    // flagged maps may legitimately differ from unflagged ones (clue events
    // join the queue at 2× weight); the covenant is only flag-off ≡ pre-slice
    let clueNodes = 0;
    let eventNodes = 0;
    for (let seed = 0; seed < 30; seed++) {
      const flagged = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
      for (const n of flagged.map.nodes) {
        if (!n.eventId) continue;
        eventNodes++;
        if (CLUE_EVENTS.some((e) => e.id === n.eventId)) clueNodes++;
      }
    }
    expect(eventNodes).toBeGreaterThan(0);
    // 6 clue events at weight 2 among ~19 events ⇒ clue share ≈ 12/25; the
    // exact rate is tuning (S6 designer question 2), presence is the gate
    expect(clueNodes).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// S6.2: clue events + asymmetric fragments
// ---------------------------------------------------------------------------

describe('clue event covenant (S6.2 + S8.2, spec coverage audit)', () => {
  it('ten clue events: act 0, uncrossed, flagged clue', () => {
    expect(CLUE_EVENTS.length).toBe(10);
    for (const e of CLUE_EVENTS) {
      expect(e.clue, e.id).toBe(true);
      expect(e.act, e.id).toBe(0);
      expect(e.crossed, e.id).toBe(false);
    }
  });

  it('each event has exactly one clue option with a REAL cost, and a real non-clue choice', () => {
    for (const e of CLUE_EVENTS) {
      const clueOpts = e.options.filter((o) => o.effects.some((f) => f.op === 'fragments'));
      expect(clueOpts.length, e.id).toBe(1);
      const clue = clueOpts[0];
      const isCost = (f: { op: string; amount?: number }) =>
        f.op === 'loseHp' || f.op === 'pendingFray' || (f.op === 'gold' && (f.amount ?? 0) < 0);
      expect(clue.effects.some(isCost), `${e.id}: clue option must cost something`).toBe(true);
      const others = e.options.filter((o) => o !== clue);
      expect(others.length, e.id).toBeGreaterThanOrEqual(1);
      for (const o of others) {
        expect(o.effects.some((f) => f.op !== 'nothing'), `${e.id}/${o.id}: non-clue option must have real value`).toBe(true);
        expect(o.effects.some((f) => f.op === 'fragments'), e.id).toBe(false);
      }
    }
  });

  it('fragments: bear one question, eliminate exactly one answer of it, strength 1', () => {
    for (const f of FRAGMENTS) {
      expect(f.eliminates.length, f.id).toBe(1);
      expect(f.strength, f.id).toBe(1);
      expect(ANSWERS_BY_ID[f.eliminates[0]].questionId, f.id).toBe(f.bearsOn);
      expect(f.text.length, f.id).toBeGreaterThan(0);
      expect(CLUE_EVENTS.some((e) => e.id === f.eventId), f.id).toBe(true);
    }
  });

  it("per event: channel A and B bear DIFFERENT questions (no event resolves a question alone)", () => {
    for (const e of CLUE_EVENTS) {
      const slotQuestion = (channel: 'actor' | 'partner') => {
        const qs = new Set(FRAGMENTS.filter((f) => f.eventId === e.id && f.channel === channel).map((f) => f.bearsOn));
        expect(qs.size, `${e.id}/${channel}: one question per slot`).toBe(1);
        return [...qs][0];
      };
      expect(slotQuestion('actor'), e.id).not.toBe(slotQuestion('partner'));
    }
  });

  it('per slot: variants cover every answer, so a consistent fragment exists under any truth', () => {
    for (const e of CLUE_EVENTS) {
      for (const channel of ['actor', 'partner'] as const) {
        const slot = FRAGMENTS.filter((f) => f.eventId === e.id && f.channel === channel);
        const q = slot[0].bearsOn;
        const covered = new Set(slot.map((f) => f.eliminates[0]));
        expect([...covered].sort(), `${e.id}/${channel}`).toEqual(answersFor(q).map((a) => a.id).sort());
      }
    }
  });

  it('coverage: every question reachable from ≥3 events, on both channels combined', () => {
    for (const q of QUESTIONS) {
      const events = new Set(FRAGMENTS.filter((f) => f.bearsOn === q.id).map((f) => f.eventId));
      expect(events.size, q.id).toBeGreaterThanOrEqual(3);
    }
  });

  // S8.8 gate 2 — deducibility: an answer is not content until it is
  // deducible. Every answer must have ≥2 fragments bearing on its question
  // that can strike it, each SERVABLE (there exists a valid truth in which
  // the fragment's eliminated answer is false, so serveFragments can pick it).
  it('deducibility (S8.8 gate 2): every answer has ≥2 servable fragments that eliminate it', () => {
    for (const a of ANSWERS) {
      const bearing = FRAGMENTS.filter(
        (f) => f.bearsOn === a.questionId && f.eliminates.includes(a.id),
      );
      const servable = bearing.filter((f) =>
        VALID_COMBOS.some((c) => (c as Record<string, string>)[f.bearsOn] !== a.id),
      );
      expect(servable.length, `${a.id}: needs ≥2 servable striking fragments`).toBeGreaterThanOrEqual(2);
      // and from ≥2 DIFFERENT events, so one skipped node cannot orphan it
      expect(new Set(servable.map((f) => f.eventId)).size, `${a.id}: events`).toBeGreaterThanOrEqual(2);
    }
  });

  it('serveFragments never serves a fragment that eliminates the true answer (all 80 truths × 10 events)', () => {
    for (const combo of VALID_COMBOS) {
      const tuple = combo as unknown as Record<string, string>;
      for (const e of CLUE_EVENTS) {
        const served = serveFragments(e.id, tuple, 777);
        for (const f of [served.a, served.b]) {
          expect(f, `${e.id} under ${JSON.stringify(combo)}`).toBeTruthy();
          expect(f!.eliminates.includes(tuple[f!.bearsOn]), f!.id).toBe(false);
        }
        expect(served.a!.channel).toBe('actor');
        expect(served.b!.channel).toBe('partner');
      }
    }
  });

  it('pool gating: clue events only enter eventsForAct when tracks is set', () => {
    for (const act of [1, 2] as const) {
      expect(eventsForAct(act).some((e) => e.clue)).toBe(false);
      expect(eventsForAct(act, true).filter((e) => e.clue).length).toBe(10);
    }
    // and unflagged maps never place one
    for (let seed = 0; seed < 20; seed++) {
      const { map } = generateActMap(seed, 1);
      for (const n of map.nodes) {
        if (n.eventId) expect(CLUE_EVENTS.some((e) => e.id === n.eventId), n.eventId).toBe(false);
      }
    }
  });
});

describe('fragment delivery (S6.2)', () => {
  const flaggedRunAtEvent = (eventId: string, seed = 7) => {
    const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
    // drop the run directly into the event phase (unit seam — node routing is
    // covered by map tests); subject chose, uncrossed ⇒ chooser === subject
    state.phase = 'event';
    state.event = { eventId, chooser: 'p1', subject: 'p1', chosen: null };
    return state;
  };

  it('pins fragment A to the actor and B to the partner, consistent with the truth', () => {
    const state = flaggedRunAtEvent('nt_unrung_bell');
    const hpBefore = state.players.p1.hp;
    const next = reduce(state, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'ring' });
    expect(next.players.p1.hp).toBe(hpBefore - 4); // the clue still costs
    const { p1, p2 } = next.truth!.boards;
    expect(p1.length).toBe(1);
    expect(p2.length).toBe(1);
    expect(p1[0].questionId).toBe('q_what');
    expect(p2[0].questionId).toBe('q_why');
    for (const [pid, pin] of [['p1', p1[0]], ['p2', p2[0]]] as const) {
      const def = FRAGMENTS.find((f) => f.id === pin.fragmentId)!;
      expect(def.channel).toBe(pid === 'p1' ? 'actor' : 'partner');
      expect(pin.text).toBe(def.text);
      expect(def.eliminates.includes(next.truth!.tuple[def.bearsOn]), def.id).toBe(false);
      expect(pin.act).toBe(1);
    }
  });

  it('fragment text never enters the shared log', () => {
    const state = flaggedRunAtEvent('nt_flooded_crypt');
    const next = reduce(state, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'wade' });
    const logText = JSON.stringify(next.log) + JSON.stringify(next.event);
    for (const board of [next.truth!.boards.p1, next.truth!.boards.p2]) {
      for (const pin of board) expect(logText.includes(pin.text)).toBe(false);
    }
  });

  it('the non-clue option pins nothing', () => {
    const state = flaggedRunAtEvent('nt_unrung_bell');
    const next = reduce(state, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'scavenge' });
    expect(next.truth!.boards.p1.length).toBe(0);
    expect(next.truth!.boards.p2.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// S6.3: hidden-information projection (§11 extension)
// ---------------------------------------------------------------------------

describe('clientTruthView (S6.3)', () => {
  // a flagged run with one clue event resolved: both boards hold a fragment
  const pinnedState = () => {
    const seed = 11;
    const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
    state.phase = 'event';
    state.event = { eventId: 'nt_unrung_bell', chooser: 'p2', subject: 'p2', chosen: null };
    return reduce(state, { type: 'EVENT_CHOOSE', player: 'p2', optionId: 'ring' });
  };

  it('each viewer sees their own fragments and only stubs of the partner', () => {
    const state = pinnedState();
    for (const viewer of ['p1', 'p2'] as const) {
      const partner = viewer === 'p1' ? 'p2' : 'p1';
      const view = clientTruthView(state.truth!, viewer);
      // review fix: pins shed their fragmentId — variant ids encode the
      // eliminated answer, which the screen never shows before the shrine
      expect(view.board).toEqual(
        state.truth!.boards[viewer].map(({ fragmentId: _s, ...rest }) => rest),
      );
      for (const pin of view.board) expect('fragmentId' in pin).toBe(false);
      expect(view.partnerStubs.length).toBe(state.truth!.boards[partner].length);
      for (const stub of view.partnerStubs) {
        expect(Object.keys(stub).sort()).toEqual(['act', 'eventId']);
      }
    }
  });

  it('the serialized view leaks no tuple, no eliminations, no partner text', () => {
    const state = pinnedState();
    for (const viewer of ['p1', 'p2'] as const) {
      const partner = viewer === 'p1' ? 'p2' : 'p1';
      const wire = JSON.stringify(clientTruthView(state.truth!, viewer));
      expect(wire.includes('tuple')).toBe(false);
      expect(wire.includes('eliminates')).toBe(false);
      for (const pin of state.truth!.boards[partner]) {
        expect(wire.includes(pin.text), `${viewer} must not see ${pin.fragmentId}`).toBe(false);
      }
      // NO fragment id crosses to anyone — not even your own pins' (review
      // fix: variant ids encode which answer the fragment eliminates)
      for (const holder of ['p1', 'p2'] as const) {
        for (const pin of state.truth!.boards[holder]) {
          expect(wire.includes(pin.fragmentId)).toBe(false);
        }
      }
      // the true answers never appear anywhere in a mid-run view
      for (const answerId of Object.values(state.truth!.tuple)) {
        expect(wire.includes(`"${answerId}"`)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// S6.4: the Loom's Eye
// ---------------------------------------------------------------------------

import { generateFinaleMap } from '../src/map';
import { ALL_RELICS, RELICS_BY_ID } from '../src/content/registry';
import { GameState } from '../src/types';

/** Flagged run teleported to the finale with chosen fragments pinned. */
function atLoom(seed: number, pins: Array<{ pid: 'p1' | 'p2'; fragmentId: string }>): GameState {
  const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
  for (const { pid, fragmentId } of pins) {
    const def = FRAGMENTS.find((f) => f.id === fragmentId)!;
    state.truth!.boards[pid].push({
      fragmentId, eventId: def.eventId, act: 1, questionId: def.bearsOn, text: def.text,
    });
  }
  state.map = generateFinaleMap(true);
  state.phase = 'map';
  let next = reduce(state, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
  next = reduce(next, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
  return next;
}

/** A fragment id eliminating `answerId`, from any event (for board set-up). */
function fragEliminating(answerId: string): string {
  return FRAGMENTS.find((f) => f.eliminates[0] === answerId)!.id;
}

describe("the Loom's Eye (S6.4)", () => {
  it('flagged finale: loom adjacent to (not replacing) the pre-boss rest, verdict before boss', () => {
    const finale = generateFinaleMap(true);
    expect(finale.nodes.map((n) => n.kind)).toEqual(['loom', 'rest', 'shop', 'boss']);
    expect(generateFinaleMap().nodes.map((n) => n.kind)).toEqual(['rest', 'shop', 'boss']);
  });

  it('entering the loom reveals the stake and pools BOTH boards into strike-outs with sources', () => {
    // pin fragments striking four of five q_why answers across both boards
    // (S8.2: the pool grew — over-collection still earns auto-completion)
    const why = answersFor('q_why').map((a) => a.id);
    const state = atLoom(3, [
      { pid: 'p1', fragmentId: fragEliminating(why[0]) },
      { pid: 'p1', fragmentId: fragEliminating(why[1]) },
      { pid: 'p2', fragmentId: fragEliminating(why[2]) },
      { pid: 'p2', fragmentId: fragEliminating(why[3]) },
    ]);
    const shrine = state.truth!.shrine!;
    expect(state.phase).toBe('loom');
    expect(shrine.stakeRelicId).toBeTruthy();
    expect(RELICS_BY_ID[shrine.stakeRelicId!]).toBeTruthy();
    expect(Object.keys(shrine.struck.q_why).sort()).toEqual([why[0], why[1], why[2], why[3]].sort());
    expect(shrine.struck.q_why[why[0]][0].holder).toBe('p1');
    expect(shrine.struck.q_why[why[2]][0].holder).toBe('p2');
    // q_why has 5 answers, 4 struck → auto-completion pre-fills the fifth
    expect(shrine.sheet.q_why).toBe(why[4]);
    expect(shrine.sheet.q_who).toBeNull();
  });

  it('struck answers cannot be asserted; edits reset both confirmations', () => {
    const why = answersFor('q_why').map((a) => a.id);
    const state = atLoom(3, [{ pid: 'p1', fragmentId: fragEliminating(why[0]) }]);
    expect(() => reduce(state, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: 'q_why', answerId: why[0] }))
      .toThrow(/struck/);
    let s = reduce(state, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    expect(s.truth!.shrine!.confirmed.p1).toBe(true);
    s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p2', questionId: 'q_why', answerId: why[1] });
    expect(s.truth!.shrine!.confirmed).toEqual({ p1: false, p2: false });
  });

  it('pass in silence: all blanks, both confirm → no false, stake granted, no reveals', () => {
    const state = atLoom(5, []);
    let s = reduce(state, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    expect(s.truth!.shrine!.verdict).toBeNull(); // one voice is not the pair
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    const shrine = s.truth!.shrine!;
    expect(shrine.verdict).toEqual({ q_who: 'blank', q_came: 'blank', q_what: 'blank', q_why: 'blank' });
    expect(shrine.stakeLost).toBe(false);
    const relics = [...s.players.p1.relics, ...s.players.p2.relics];
    expect(relics).toContain(shrine.stakeRelicId!);
    expect(s.truth!.reveals).toEqual({ bossFace: false, bossMechanic: false, openingIntent: false });
  });

  it('true assertions pay their reveals; all-true adds the completion boon on top of the stake', () => {
    const state = atLoom(9, []);
    const tuple = state.truth!.tuple;
    state.players.p1.hp = 30;
    state.players.p2.hp = 30;
    const pendingBefore = state.pendingThread;
    let s = state;
    for (const q of ['q_who', 'q_came', 'q_what', 'q_why']) {
      s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: q, answerId: tuple[q] });
    }
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    const shrine = s.truth!.shrine!;
    expect(shrine.verdict).toEqual({ q_who: 'true', q_came: 'true', q_what: 'true', q_why: 'true' });
    expect(shrine.stakeLost).toBe(false);
    expect(s.truth!.reveals).toEqual({ bossFace: true, bossMechanic: true, openingIntent: true });
    expect(s.players.p1.hp).toBe(36); // healEach payoff
    expect(s.players.p2.hp).toBe(36);
    // S14.3 (B4, R8): q_came true → the loom leans toward you, +2 Thread
    // banked for the finale (consumed at the next combat start)
    expect(s.pendingThread).toBe(pendingBefore + 2);
    expect([...s.players.p1.relics, ...s.players.p2.relics]).toContain(shrine.stakeRelicId!);
  });

  it('the all-true boon requires all FOUR questions (three true + one blank ≠ completion)', () => {
    const state = atLoom(9, []);
    const tuple = state.truth!.tuple;
    let s = state;
    for (const q of ['q_who', 'q_what', 'q_why']) {
      s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: q, answerId: tuple[q] });
    }
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    expect(s.truth!.shrine!.verdict!.q_came).toBe('blank');
    expect(s.truth!.reveals.bossFace).toBe(true);
    expect(s.truth!.reveals.bossMechanic).toBe(true);
    expect(s.truth!.reveals.openingIntent).toBe(false); // no boon on a blank
  });

  it('ANY false assertion unravels the stake; true answers still pay; blanks stay free', () => {
    const state = atLoom(13, []);
    const tuple = state.truth!.tuple;
    const wrongWho = answersFor('q_who').find((a) => a.id !== tuple.q_who)!.id;
    let s = reduce(state, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: 'q_who', answerId: wrongWho });
    s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p2', questionId: 'q_what', answerId: tuple.q_what });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    const shrine = s.truth!.shrine!;
    expect(shrine.verdict).toEqual({ q_who: 'false', q_came: 'blank', q_what: 'true', q_why: 'blank' });
    expect(shrine.stakeLost).toBe(true);
    expect([...s.players.p1.relics, ...s.players.p2.relics]).not.toContain(shrine.stakeRelicId!);
    expect(s.truth!.reveals.bossFace).toBe(true); // the true naming still pays
    expect(s.truth!.reveals.openingIntent).toBe(false);
  });

  it('after the verdict the sheet is sealed and ADVANCE moves on to the rest', () => {
    const state = atLoom(5, []);
    let s = reduce(state, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    expect(() => reduce(s, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: 'q_who', answerId: null }))
      .toThrow(/already spoken/);
    expect(() => reduce(state, { type: 'ADVANCE', player: 'p1' })).toThrow(/not spoken/);
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    s = reduce(s, { type: 'ADVANCE', player: 'p2' });
    expect(s.phase).toBe('map');
    expect(s.map.nodes.find((n) => n.id === s.map.position)!.kind).toBe('loom');
    expect(s.map.nodes.find((n) => n.id === s.map.position)!.edges).toEqual([1]); // → rest
  });

  it('solo: the Witness follows the human — confirm and advance mirror to the bot seat', () => {
    const seed = 5;
    const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }, 'p2'), { type: 'START_RUN', seed, tracks: true });
    state.map = generateFinaleMap(true);
    state.phase = 'map';
    let s = reduce(state, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    expect(s.truth!.shrine!.verdict).not.toBeNull();
    s = reduce(s, { type: 'ADVANCE', player: 'p1' });
    expect(s.phase).toBe('map');
  });

  it('the stake covets: rare relics are ~3× overrepresented vs their pool share', () => {
    let rares = 0;
    const total = 400;
    for (let seed = 0; seed < total; seed++) {
      const s = atLoom(seed, []);
      if (RELICS_BY_ID[s.truth!.shrine!.stakeRelicId!]?.rare) rares++;
    }
    const rareShare = ALL_RELICS.filter((r) => r.rare).length / ALL_RELICS.length;
    // weighted 3:1 — observed share should clearly exceed the raw pool share
    expect(rares / total).toBeGreaterThan(rareShare * 1.8);
  });
});

// ---------------------------------------------------------------------------
// S6.5: boss faces, live mechanics, telegraphs
// ---------------------------------------------------------------------------

import { startCombat } from '../src/combat';
import { FACE_BY_ANSWER, FACES, mechanicFireTurns, rollLiveMechanics } from '../src/content/faces';

function bossFight(seed: number, reveals?: Partial<{ bossFace: boolean; bossMechanic: boolean }>) {
  const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
  for (const pid of ['p1', 'p2'] as const) {
    state.players[pid].maxHp = 999;
    state.players[pid].hp = 999;
  }
  if (reveals) Object.assign(state.truth!.reveals, reveals);
  state.map = generateFinaleMap(true);
  state.map.position = 3;
  startCombat(state, ['the_unraveled']);
  return state;
}

describe('boss faces (S6.5 + S8.5)', () => {
  // S8.5 covenant: every q_what answer wears a face; every face has a full
  // 3-mechanic pool with a real name and both lines authored.
  it('face content: four faces covering ALL q_what answers, 3 mechanics each, all lines authored', () => {
    expect(FACES.length).toBe(4);
    expect(Object.keys(FACE_BY_ANSWER).sort()).toEqual(answersFor('q_what').map((a) => a.id).sort());
    for (const a of answersFor('q_what')) {
      expect(FACE_BY_ANSWER[a.id], `answer ${a.id} has no face`).toBeTruthy();
    }
    const mechIds = new Set<string>();
    for (const f of FACES) {
      expect(f.realName.length, f.answerId).toBeGreaterThan(0);
      expect(f.mechanicPool.length, f.answerId).toBe(3);
      for (const m of f.mechanicPool) {
        expect(mechIds.has(m.id), `duplicate mechanic id ${m.id}`).toBe(false);
        mechIds.add(m.id);
        expect(m.telegraphLine.length, m.id).toBeGreaterThan(0);
        expect(m.revealLine.length, m.id).toBeGreaterThan(0);
      }
    }
  });

  it('run roll: face = the rolled q_what answer; two DISTINCT live mechanics from that face', () => {
    for (let seed = 0; seed < 40; seed++) {
      const s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
      const boss = s.truth!.boss;
      expect(boss.faceAnswerId).toBe(s.truth!.tuple.q_what);
      expect(boss.liveMechanics.length).toBe(2);
      expect(boss.liveMechanics[0]).not.toBe(boss.liveMechanics[1]);
      const pool = FACE_BY_ANSWER[boss.faceAnswerId].mechanicPool.map((m) => m.id);
      for (const mid of boss.liveMechanics) expect(pool).toContain(mid);
    }
    // both mechanic orderings reachable
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) seen.add(rollLiveMechanics('a_peal', s).value.join(','));
    expect(seen.size).toBe(6); // 3P2 orderings
  });

  it('unrevealed: mechanics take over the intent on turns 3/5 and telegraph exactly one turn before first firing', () => {
    let s = bossFight(21);
    const face = FACE_BY_ANSWER[s.truth!.boss.faceAnswerId];
    const mech = (slot: number) => face.mechanicPool.find((m) => m.id === s.truth!.boss.liveMechanics[slot])!;
    const telegraphs: string[] = [];
    const intentAt: Record<number, string> = {};
    for (let round = 0; round < 8; round++) {
      const boss = s.combat!.enemies[0];
      intentAt[s.combat!.turn] = boss.intent.kind;
      if (boss.telegraph) telegraphs.push(`${s.combat!.turn}:${boss.telegraph}`);
      s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
      s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
    }
    expect(intentAt[3]).toBe(mech(0).intent.kind);
    expect(intentAt[5]).toBe(mech(1).intent.kind);
    expect(intentAt[7]).toBe(mech(0).intent.kind); // period 4
    // telegraphs surfaced with the first-fire intents, once each
    expect(telegraphs).toEqual([`3:${mech(0).telegraphLine}`, `5:${mech(1).telegraphLine}`]);
    expect(s.combat!.enemies[0].nameOverride).toBeUndefined();
  });

  it('revealed at the shrine: real name + reveal lines from combat start, no telegraphs', () => {
    let s = bossFight(21, { bossFace: true, bossMechanic: true });
    const face = FACE_BY_ANSWER[s.truth!.boss.faceAnswerId];
    const boss0 = s.combat!.enemies[0];
    expect(boss0.nameOverride).toBe(face.realName);
    expect(boss0.revealedMechanics!.length).toBe(2);
    for (let round = 0; round < 6; round++) {
      expect(s.combat!.enemies[0].telegraph ?? null).toBeNull();
      s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
      s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
    }
  });

  it('the flagged boss opens deterministically at script index 0', () => {
    for (const seed of [1, 2, 3]) {
      const s = bossFight(seed);
      expect(s.combat!.enemies[0].scriptIndex).toBe(0);
    }
  });

  it('schedule helper: slot 0 → 3,7,11…; slot 1 → 5,9,13…', () => {
    expect(mechanicFireTurns(0)).toEqual({ first: 3, period: 4 });
    expect(mechanicFireTurns(1)).toEqual({ first: 5, period: 4 });
  });
});

describe('solo Witness channel (S6.8, ruling 8)', () => {
  it('the human sees witness-voiced partner fragments in full; the bot view stays normal', () => {
    const seed = 11;
    const state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }, 'p2'), { type: 'START_RUN', seed, tracks: true });
    state.phase = 'event';
    state.event = { eventId: 'nt_unrung_bell', chooser: 'p1', subject: 'p1', chosen: null };
    const next = reduce(state, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'ring' });
    const humanView = clientTruthView(next.truth!, 'p1', 'p2');
    expect(humanView.board.length).toBe(2); // own + witness-voiced
    const witnessPins = humanView.board.filter((f) => f.witness);
    expect(witnessPins.length).toBe(1);
    expect(witnessPins[0].text).toBe(next.truth!.boards.p2[0].text);
    expect(humanView.partnerStubs).toEqual([]);
    // co-op discipline is untouched when no botSeat is passed
    const coopView = clientTruthView(next.truth!, 'p1');
    expect(coopView.board.length).toBe(1);
    expect(coopView.partnerStubs.length).toBe(1);
  });
});

describe('slice telemetry (S6.8)', () => {
  it('counts offered/taken clue events, fragments, board opens, sheet edits, and the verdict', () => {
    const seed = 7;
    let s = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
    expect(s.telemetry.truth).toBeTruthy();
    s.phase = 'event';
    s.event = { eventId: 'nt_unrung_bell', chooser: 'p1', subject: 'p1', chosen: null };
    s = reduce(s, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'ring' });
    s = reduce(s, { type: 'BOARD_OPENED', player: 'p1' });
    s = reduce(s, { type: 'BOARD_OPENED', player: 'p2' });
    expect(s.telemetry.truth!.clueEventsTaken).toBe(1);
    expect(s.telemetry.truth!.fragmentsByPlayer).toEqual({ p1: 1, p2: 1 });
    expect(s.telemetry.truth!.boardOpensByAct[1]).toBe(2);
    // to the shrine: one edit, then silence-pass the rest
    s.map = generateFinaleMap(true);
    s.phase = 'map';
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
    const tuple = s.truth!.tuple;
    // q_who has no fragments here so it can't have auto-completed — this is
    // a real edit (q_what may arrive pre-filled; re-setting it is a no-op)
    s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: 'q_who', answerId: tuple.q_who });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    const tt = s.telemetry.truth!;
    expect(tt.sheetEdits).toBe(1);
    expect(tt.outcome!.q_who).toBe('true');
    expect(tt.stake!.lost).toBe(false);
    expect(tt.struckAtShrine).toBeGreaterThanOrEqual(0);
    // spec 'codex writes': asserted-true answers land in truths
    expect(tt.codexWrites!.truths).toContain(tuple.q_who);
    expect(tt.codexWrites!.eliminations).toEqual([]);
  });

  it('codex writes: a false assertion lands in eliminations (review fix — spec S6.8)', () => {
    const state = atLoom(9, []);
    const tuple = state.truth!.tuple;
    const wrongWhy = answersFor('q_why').map((a) => a.id).find((a) => a !== tuple.q_why)!;
    let s = reduce(state, { type: 'LOOM_SHEET_SET', player: 'p1', questionId: 'q_who', answerId: tuple.q_who });
    s = reduce(s, { type: 'LOOM_SHEET_SET', player: 'p2', questionId: 'q_why', answerId: wrongWhy });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p1', confirm: true });
    s = reduce(s, { type: 'LOOM_CONFIRM', player: 'p2', confirm: true });
    expect(s.telemetry.truth!.codexWrites).toEqual({ truths: [tuple.q_who], eliminations: [wrongWhy] });
  });

  it('flag off: no truth telemetry key (file shape unchanged)', () => {
    const s = reduce(initialState(3, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 3 });
    expect('truth' in s.telemetry).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Clue-event dedup (2026-07-01 review ruling): a visited clue event never
// re-enters a later act's pool — a scene must not replay with a different
// fragment.
// ---------------------------------------------------------------------------

describe('clue-event dedup', () => {
  const clueIds = CLUE_EVENTS.map((e) => e.id);

  it('generateActMap never re-offers excluded clue events (flagged)', () => {
    const seen = clueIds.slice(1);
    let totalOffered = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { map } = generateActMap(seed, 2, false, true, seen);
      const offered = map.nodes.filter((n) => n.kind === 'event').map((n) => n.eventId!);
      for (const id of seen) {
        expect(offered.includes(id), `seed=${seed}: excluded ${id} re-offered`).toBe(false);
      }
      totalOffered += offered.length;
    }
    // the pool still functions with five of six clue events excluded
    // (not every act-2 layout rolls an event node — assert in aggregate)
    expect(totalOffered).toBeGreaterThan(0);
  });

  it('unflagged generation ignores the exclusion list entirely (covenant)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const bare = generateActMap(seed, 1, false, false);
      const excluded = generateActMap(seed, 1, false, false, clueIds);
      expect(JSON.stringify(excluded)).toBe(JSON.stringify(bare));
    }
  });

  it('entering a clue event records it as seen; mainline events are not recorded', () => {
    const start = (eventId: string): GameState => {
      const state = reduce(initialState(11, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 11, tracks: true });
      state.phase = 'map';
      state.map = {
        act: 1, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0,
        nodes: [{ id: 0, kind: 'event', eventId, edges: [], layer: 0, lane: 0 }],
      };
      let next = reduce(state, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
      return reduce(next, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
    };
    const atClue = start('nt_unrung_bell');
    expect(atClue.phase).toBe('event');
    expect(atClue.truth!.seenClueEvents).toEqual(['nt_unrung_bell']);

    const mainline = eventsForAct(1, false).find((e) => !e.clue)!;
    const atPlain = start(mainline.id);
    expect(atPlain.phase).toBe('event');
    expect(atPlain.truth!.seenClueEvents).toEqual([]);
  });
});
