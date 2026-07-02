// Property/fuzz tests (§11), M2 scope: full runs across branching maps, shops,
// rests (upgrades/wedding), treasure, acts and the finale. Invariants checked
// every step; every sequence replays to identical state hashes.

import { describe, expect, it } from 'vitest';
import { Action, GameState, IllegalAction } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { Die, checkInvariants, randomAction } from './fuzz-driver';

const SEQUENCES = Number(process.env.FUZZ_SEQUENCES ?? 120);
const MAX_ACTIONS = 2500;

describe(`fuzz: ${SEQUENCES} seeded random action sequences across full runs (§11)`, () => {
  it('holds invariants and replays to identical state hashes', () => {
    let totalActions = 0;
    const phasesSeen = new Set<string>();
    for (let seed = 1; seed <= SEQUENCES; seed++) {
      const die = new Die(seed * 7919);
      let state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < MAX_ACTIONS; step++) {
        phasesSeen.add(state.phase);
        const action = randomAction(state, die);
        if (!action) break;
        let next: GameState;
        try {
          next = reduce(state, action);
        } catch (err) {
          expect(err, `seed=${seed} step=${step}: non-IllegalAction throw from ${action.type}: ${err}`).toBeInstanceOf(IllegalAction);
          continue;
        }
        state = next;
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      totalActions += applied.length;
      let replay = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      expect(hashState(replay)).toBe(hashes[0]);
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=${seed}: replay diverged at action ${i} (${action.type})`);
        }
      });
    }
    // the fuzzer must actually exercise the new M2 surfaces
    for (const phase of ['map', 'combat', 'reward', 'rest', 'event']) {
      expect(phasesSeen.has(phase), `fuzzer never reached ${phase}`).toBe(true);
    }
    expect(totalActions).toBeGreaterThan(SEQUENCES * 20);
  }, 600_000);
});
