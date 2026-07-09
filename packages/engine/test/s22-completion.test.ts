// S22 Phase A pins — the completion criterion (D1), the claim (D2), the
// interposed Eye scene (D1b), and the act-4 gate/floor (D2/D3).
//
// The instrument law's teeth: every S22 key is ABSENT (never false) on an
// unclaimed run, so canon batteries and goldens are byte-identical by
// construction — pinned here as a hash equality, not an assumption.

import { describe, expect, it } from 'vitest';
import { GameState, IllegalAction, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { generateAct4Map, generateFinaleMap } from '../src/map';
import {
  ANSWERS, FIFTH_ANSWERS, QUESTIONS, answersFor, codexCompleteFor, questionClosed,
} from '../src/content/questions';

const CHARS = { p1: 'vess', p2: 'bram' } as const;

function start(seed: number, extra: Record<string, unknown> = {}, botSeat?: PlayerId): GameState {
  return reduce(initialState(seed, CHARS, botSeat), { type: 'START_RUN', seed, tracks: true, ...extra } as never);
}

/** Teleport a state to a boss reward so ADVANCE routes through advanceAct
 *  (the act-3 boss death calls the same function directly). */
function bossAdvance(state: GameState): GameState {
  const boss = state.map.nodes.find((n) => n.kind === 'boss')!;
  state.map.position = boss.id;
  state.phase = 'reward';
  state.reward = {
    sets: { p1: [], p2: [] },
    picked: { p1: 'skip', p2: 'skip' },
    coveted: { p1: 'pass', p2: 'pass' },
    gold: 0,
  } as never;
  let s = reduce(state, { type: 'ADVANCE', player: 'p1' });
  s = reduce(s, { type: 'ADVANCE', player: 'p2' });
  return s;
}

describe('S22.1 — the completion criterion (D1: per-question closure)', () => {
  it('completes exactly when every question closes (every answer adjudicated)', () => {
    const all = ANSWERS.map((a) => a.id);
    expect(codexCompleteFor(all, [])).toBe(true);
    expect(codexCompleteFor([], all)).toBe(true);
    // truths and eliminations pool — wrong answers are cartography too
    const half = all.slice(0, Math.floor(all.length / 2));
    const rest = all.slice(Math.floor(all.length / 2));
    expect(codexCompleteFor(half, rest)).toBe(true);
    // any single unadjudicated answer holds its question (and the codex) open
    for (const missing of all) {
      const without = all.filter((id) => id !== missing);
      expect(codexCompleteFor(without, []), `missing ${missing}`).toBe(false);
    }
    expect(codexCompleteFor([], [])).toBe(false);
  });

  it('is defined over the SET — closure walks QUESTIONS/answersFor, never counts', () => {
    for (const q of QUESTIONS) {
      const pool = answersFor(q.id).map((a) => a.id);
      expect(pool.length).toBeGreaterThan(0);
      expect(questionClosed(q.id, new Set(pool))).toBe(true);
      expect(questionClosed(q.id, new Set(pool.slice(1)))).toBe(false);
    }
    // the union of the per-question pools IS the public ontology
    const union = QUESTIONS.flatMap((q) => answersFor(q.id).map((a) => a.id));
    expect(new Set(union).size).toBe(ANSWERS.length);
  });
});

describe('S22.2 — the claim and the absence covenant (D2)', () => {
  it('an unclaimed run carries NO S22 state and hashes identically to a codexComplete:false claim', () => {
    const a = start(41);
    const b = start(41, { codexComplete: false });
    expect(a.codexComplete).toBeUndefined();
    expect(a.codexDeclared).toBeUndefined();
    expect(a.eye).toBeUndefined();
    expect(a.act4Open).toBeUndefined();
    expect(hashState(a)).toBe(hashState(b));
  });

  it('a declared claim opens the floor at START_RUN — no re-manifestation', () => {
    const s = start(42, { codexComplete: true, codexDeclared: FIFTH_ANSWERS[1].id });
    expect(s.codexComplete).toBe(true);
    expect(s.codexDeclared).toBe(FIFTH_ANSWERS[1].id);
    expect(s.act4Open).toBe(true);
    expect(s.phase).toBe('map'); // tracks-only run starts on the map — no Eye
    expect(s.eye).toBeUndefined();
  });

  it('an unknown declared id is dropped: the Eye manifests instead of a broken door', () => {
    const s = start(43, { codexComplete: true, codexDeclared: 'a_kin' }); // deduction id, not a fifth answer
    expect(s.codexDeclared).toBeUndefined();
    expect(s.act4Open).toBeUndefined();
    expect(s.phase).toBe('eye');
  });
});

describe('S22.1 — the interposed Eye scene (D1b)', () => {
  it('an undeclared completion halts the descent at the first map landing (tracks-only run)', () => {
    const s = start(44, { codexComplete: true });
    expect(s.phase).toBe('eye');
    expect(s.eye).toEqual({ picks: { p1: null, p2: null } });
  });

  it('on a rites run the Eye waits at the first step down — after the vestments', () => {
    let s = start(45, { rites: true, codexComplete: true });
    expect(s.phase).toBe('rites');
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      s = reduce(s, { type: 'RITE_PICK', player: pid, riteId: s.ritesState!.offer![pid][0] });
    }
    expect(s.phase).toBe('eye');
  });

  it('both seats must pick the same answer — mismatch resets both (the map convention)', () => {
    let s = start(46, { codexComplete: true });
    s = reduce(s, { type: 'EYE_DECLARE', player: 'p1', answerId: FIFTH_ANSWERS[0].id });
    expect(s.eye!.picks.p1).toBe(FIFTH_ANSWERS[0].id);
    s = reduce(s, { type: 'EYE_DECLARE', player: 'p2', answerId: FIFTH_ANSWERS[2].id });
    expect(s.eye!.picks).toEqual({ p1: null, p2: null }); // reset, still open
    expect(s.phase).toBe('eye');
    // agreement declares, opens the door, and returns to the map
    s = reduce(s, { type: 'EYE_DECLARE', player: 'p2', answerId: FIFTH_ANSWERS[2].id });
    s = reduce(s, { type: 'EYE_DECLARE', player: 'p1', answerId: FIFTH_ANSWERS[2].id });
    expect(s.codexDeclared).toBe(FIFTH_ANSWERS[2].id);
    expect(s.act4Open).toBe(true);
    expect(s.eye).toBeUndefined();
    expect(s.phase).toBe('map');
  });

  it('rejects answers outside the fifth pool, and declarations outside the scene', () => {
    const s = start(47, { codexComplete: true });
    expect(() => reduce(s, { type: 'EYE_DECLARE', player: 'p1', answerId: 'a_kin' })).toThrow(IllegalAction);
    const plain = start(48);
    expect(() => reduce(plain, { type: 'EYE_DECLARE', player: 'p1', answerId: FIFTH_ANSWERS[0].id })).toThrow(IllegalAction);
  });

  it('solo: the Witness answers with the human voice (the shrine-confirm mirror)', () => {
    let s = start(49, { codexComplete: true }, 'p2');
    expect(s.phase).toBe('eye');
    s = reduce(s, { type: 'EYE_DECLARE', player: 'p1', answerId: FIFTH_ANSWERS[3].id });
    expect(s.codexDeclared).toBe(FIFTH_ANSWERS[3].id);
    expect(s.act4Open).toBe(true);
    expect(s.phase).toBe('map');
  });

  it('CODEX_COMPLETE mid-run: while standing on the map the descent halts NOW; elsewhere it waits', () => {
    // standing on the map
    let s = start(50);
    expect(s.phase).toBe('map');
    s = reduce(s, { type: 'CODEX_COMPLETE' } as never);
    expect(s.codexComplete).toBe(true);
    expect(s.phase).toBe('eye');
    // mid-rites (not on a map screen yet): the flag lands, the scene waits
    let r = start(51, { rites: true });
    r = reduce(r, { type: 'CODEX_COMPLETE' } as never);
    expect(r.codexComplete).toBe(true);
    expect(r.phase).toBe('rites');
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      r = reduce(r, { type: 'RITE_PICK', player: pid, riteId: r.ritesState!.offer![pid][0] });
    }
    expect(r.phase).toBe('eye');
    // idempotent
    const again = reduce(s, { type: 'CODEX_COMPLETE' } as never);
    expect(hashState(again)).toBe(hashState(s));
  });
});

describe('S22.3 — the act-4 gate and the fixed floor (D2/D3)', () => {
  it('the floor is fixed authored data: one strand, three nodes, no RNG', () => {
    const m = generateAct4Map();
    expect(m.act).toBe(4);
    expect(m.nodes.map((n) => n.kind)).toEqual(['event', 'rest', 'boss']);
    expect(m.nodes[0].eventId).toBe('act4_threshold');
    expect(m.nodes[2].encounterId).toBe('caretaker');
    expect(m.nodes.map((n) => n.edges)).toEqual([[1], [2], []]);
    expect(m).toEqual(generateAct4Map()); // no rng anywhere
  });

  it('the act-3 boss advances to act 4 when the door is open — and to victory when it is not', () => {
    // door open (declared claim)
    let s = start(52, { codexComplete: true, codexDeclared: FIFTH_ANSWERS[0].id });
    s.map = generateFinaleMap(true);
    const opened = bossAdvance(s);
    expect(opened.phase).toBe('map');
    expect(opened.map.act).toBe(4);
    expect(opened.map.nodes).toHaveLength(3);
    // door dark (no claim): the far edge still ends the run
    let d = start(53);
    d.map = generateFinaleMap(true);
    const ended = bossAdvance(d);
    expect(ended.phase).toBe('victory');
  });

  it('the Caretaker down ends the run as a victory (the existing path)', () => {
    let s = start(54, { codexComplete: true, codexDeclared: FIFTH_ANSWERS[0].id });
    s.map = generateAct4Map();
    const done = bossAdvance(s);
    expect(done.phase).toBe('victory');
    expect(done.map.act).toBe(4);
  });
});
