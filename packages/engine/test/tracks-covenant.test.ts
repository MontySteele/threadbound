// The TB_TRACKS covenants the sprint doc promised but did not ship (S6.9
// gates 1 and 4), locked here:
//
// 1. FLAG-OFF LOCK (gate 1): with tracks unset, full seeded random runs must
//    remain byte-identical to the banked golden fixture — the covenant "a
//    flag-off run is byte-identical to main tip", held against FUTURE drift.
//    The goldens were generated from the reviewed slice merge, whose flag-off
//    behavior was verified equivalent to the pre-slice tip (seed-matched
//    30-run batteries, 2026-07-01 review). If a deliberate balance change
//    moves them, regenerate in THAT commit:  FUZZ_GOLDEN_WRITE=1 npx vitest
//    run packages/engine/test/tracks-covenant.test.ts — the diff then records
//    the drift explicitly, which is the point.
//
// 2. FLAGGED FUZZ (gate 4): the full fuzz property suite holds with
//    tracks: true — invariants every step, IllegalAction-only throws, and
//    every sequence replays to identical hashes (which pins the truth roll,
//    live mechanics and clue-event queue to the seed).
//
// 3. LOOM FUZZ: random walkers rarely survive to the finale, so the shrine
//    gets its own targeted pass — teleported loom states under random sheet
//    edits/confirms hold invariants and replay deterministically.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Action, GameState, IllegalAction } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { generateFinaleMap } from '../src/map';
import { FRAGMENTS } from '../src/content/truth';
import { Die, checkInvariants, randomAction } from './fuzz-driver';

const GOLDEN_PATH = path.resolve(__dirname, 'fixtures/tracks-covenant-golden.json');
const GOLDEN_SEEDS = 24;
const FLAGGED_SEQUENCES = 40;
const MAX_ACTIONS = 2500;

interface GoldenRow {
  seed: number;
  actions: number;
  finalHash: string;
  finalRng: number;
}

/** One full seeded random run; returns its golden row. `tracks` optionally
 *  threads the flag; assertOff additionally checks no slice state appears. */
function walk(seed: number, tracks: boolean | undefined, assertOff: boolean): GoldenRow & { applied: Action[]; hashes: string[] } {
  const die = new Die(seed * 7919);
  let state = reduce(
    initialState(seed, { p1: 'vess', p2: 'bram' }),
    tracks === undefined ? { type: 'START_RUN', seed } : { type: 'START_RUN', seed, tracks },
  );
  const applied: Action[] = [];
  const hashes: string[] = [hashState(state)];
  for (let step = 0; step < MAX_ACTIONS; step++) {
    if (assertOff) {
      expect(state.tracks, `seed=${seed} step=${step}: tracks key on a flag-off run`).toBeUndefined();
      expect(state.truth, `seed=${seed} step=${step}: truth state on a flag-off run`).toBeUndefined();
      expect(state.telemetry.truth, `seed=${seed} step=${step}: truth telemetry on a flag-off run`).toBeUndefined();
      expect(state.map.nodes.some((n) => n.kind === 'loom'), `seed=${seed}: loom node on a flag-off run`).toBe(false);
    }
    const action = randomAction(state, die);
    if (!action) break;
    try {
      state = reduce(state, action);
    } catch (err) {
      expect(err, `seed=${seed} step=${step}: non-IllegalAction throw from ${action.type}: ${err}`).toBeInstanceOf(IllegalAction);
      continue;
    }
    applied.push(action);
    hashes.push(hashState(state));
    checkInvariants(state, seed, step);
  }
  return { seed, actions: applied.length, finalHash: hashState(state), finalRng: state.rng, applied, hashes };
}

describe('TB_TRACKS covenants (S6.9 gates 1 and 4)', () => {
  it('gate 1: flag-off runs match the banked golden fixture and never grow slice state', () => {
    const rows: GoldenRow[] = [];
    for (let seed = 1; seed <= GOLDEN_SEEDS; seed++) {
      const { applied: _a, hashes: _h, ...row } = walk(seed, undefined, true);
      rows.push(row);
      // threading `tracks: false` must be indistinguishable from absent
      const explicitOff = walk(seed, false, true);
      expect(explicitOff.finalHash, `seed=${seed}: tracks:false diverged from tracks-absent`).toBe(row.finalHash);
      expect(explicitOff.actions).toBe(row.actions);
    }
    if (process.env.FUZZ_GOLDEN_WRITE) {
      fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(rows, null, 2) + '\n');
      return;
    }
    expect(fs.existsSync(GOLDEN_PATH), 'golden fixture missing — run with FUZZ_GOLDEN_WRITE=1').toBe(true);
    const golden: GoldenRow[] = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
    expect(rows, 'flag-off gameplay drifted from the banked golden (if intentional, regenerate the fixture IN the commit that moves it)').toEqual(golden);
  }, 120_000);

  it('gate 4: the fuzz property suite holds with the flag ON, replays and all', () => {
    const phasesSeen = new Set<string>();
    for (let seed = 1; seed <= FLAGGED_SEQUENCES; seed++) {
      const die = new Die(seed * 104729);
      let state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
      expect(state.truth?.tuple, `seed=${seed}: flagged run rolled no truth`).toBeTruthy();
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < MAX_ACTIONS; step++) {
        phasesSeen.add(state.phase);
        const action = randomAction(state, die);
        if (!action) break;
        try {
          state = reduce(state, action);
        } catch (err) {
          expect(err, `seed=${seed} step=${step}: non-IllegalAction throw from ${action.type}: ${err}`).toBeInstanceOf(IllegalAction);
          continue;
        }
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      // replay determinism pins the truth roll, live mechanics and the
      // weighted clue-event queue to the seed
      let replay = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
      expect(hashState(replay)).toBe(hashes[0]);
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=${seed}: flagged replay diverged at action ${i} (${action.type})`);
        }
      });
    }
    for (const phase of ['map', 'combat', 'event']) {
      expect(phasesSeen.has(phase), `flagged fuzzer never reached ${phase}`).toBe(true);
    }
  }, 300_000);

  it('loom fuzz: random sheet edits/confirms at the shrine hold invariants and replay', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const die = new Die(seed * 15485863);
      // teleport a flagged run to the loom with 0–3 random pins (the engine
      // tests' recipe) — the walker rarely survives to the finale organically
      let base = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, tracks: true });
      const pinCount = die.int(4);
      for (let i = 0; i < pinCount; i++) {
        const f = FRAGMENTS[die.int(FRAGMENTS.length)];
        base.truth!.boards[die.chance(0.5) ? 'p1' : 'p2'].push({
          fragmentId: f.id, eventId: f.eventId, act: 1, questionId: f.bearsOn, text: f.text,
        });
      }
      base.map = generateFinaleMap(true);
      base.phase = 'map';
      base = reduce(base, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
      base = reduce(base, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
      expect(base.phase).toBe('loom');

      let state = base;
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < 60 && state.phase === 'loom'; step++) {
        const action = randomAction(state, die);
        if (!action) break;
        try {
          state = reduce(state, action);
        } catch (err) {
          expect(err, `seed=${seed} step=${step}: non-IllegalAction throw from ${action.type}`).toBeInstanceOf(IllegalAction);
          continue;
        }
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      // deterministic replay from the same teleported base
      let replay = base;
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=${seed}: loom replay diverged at action ${i} (${action.type})`);
        }
      });
    }
  }, 120_000);
});
