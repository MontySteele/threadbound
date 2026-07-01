// nt-slice S6.1: truth data model + roll. Covenant-style content audit over
// the question/answer/combo tables, plus the S6.0 flag-off covenant: with
// tracks unset, START_RUN produces a state indistinguishable from pre-slice.

import { describe, expect, it } from 'vitest';
import {
  ANSWERS, ANSWERS_BY_ID, FRAGMENTS, QUESTIONS, QUESTIONS_BY_ID, VALID_COMBOS,
  answersFor, rollTruth, serveFragments,
} from '../src/content/truth';
import { CLUE_EVENTS } from '../src/content/clue-events';
import { eventsForAct } from '../src/content/registry';
import { generateActMap } from '../src/map';
import { initialState, reduce } from '../src/reducer';

describe('truth content covenant (slice scope)', () => {
  it('slice shape: 3 questions (who/what/why), 7 answers (2/2/3)', () => {
    expect(QUESTIONS.length).toBe(3);
    expect(QUESTIONS_BY_ID.q_who.kind).toBe('self');
    expect(QUESTIONS_BY_ID.q_what.kind).toBe('world');
    expect(QUESTIONS_BY_ID.q_why.kind).toBe('world');
    expect(ANSWERS.length).toBe(7);
    expect(answersFor('q_who').length).toBe(2);
    expect(answersFor('q_what').length).toBe(2);
    expect(answersFor('q_why').length).toBe(3);
  });

  it('payoff bindings match the slice spec', () => {
    // world questions key boss reveals; the self question keys the personal boon
    expect(QUESTIONS_BY_ID.q_what.payoff).toBe('bossFace');
    expect(QUESTIONS_BY_ID.q_why.payoff).toBe('bossMechanic');
    expect(QUESTIONS_BY_ID.q_who.payoff).toBe('healEach');
  });

  it('every answer carries sheet text and a codex entry', () => {
    for (const a of ANSWERS) {
      expect(a.text.length, a.id).toBeGreaterThan(0);
      expect(a.codexTruthEntry.length, a.id).toBeGreaterThan(0);
    }
  });

  it('combo table: 12 rows, all distinct, referencing only defined answers on the right question', () => {
    expect(VALID_COMBOS.length).toBe(12);
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
    for (let s = 0; s < 500; s++) seen.add(JSON.stringify(rollTruth(s).value));
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
    expect(Object.keys(on.truth!.tuple).sort()).toEqual(['q_what', 'q_who', 'q_why']);
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

describe('clue event covenant (S6.2, spec coverage audit)', () => {
  it('six clue events: act 0, uncrossed, flagged clue', () => {
    expect(CLUE_EVENTS.length).toBe(6);
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

  it('serveFragments never serves a fragment that eliminates the true answer (all 12 truths × 6 events)', () => {
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
      expect(eventsForAct(act, true).filter((e) => e.clue).length).toBe(6);
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
