// nt-slice S6.1: truth data model + roll. Covenant-style content audit over
// the question/answer/combo tables, plus the S6.0 flag-off covenant: with
// tracks unset, START_RUN produces a state indistinguishable from pre-slice.

import { describe, expect, it } from 'vitest';
import {
  ANSWERS, ANSWERS_BY_ID, QUESTIONS, QUESTIONS_BY_ID, VALID_COMBOS, answersFor, rollTruth,
} from '../src/content/truth';
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

  it('flag on: map generation is identical to flag off (truth roll happens last)', () => {
    const on = start(true);
    const off = start();
    expect(JSON.stringify(on.map)).toBe(JSON.stringify(off.map));
    // exactly one extra rng advance, spent on the truth roll
    expect(on.rng).not.toBe(off.rng);
  });
});
