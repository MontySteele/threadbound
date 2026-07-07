// S16.0c — determinism + aggregation gates for the socket-free instrument.
//
//   gate 1 (pinned): same seed twice on the socket-free path → byte-identical
//   telemetry. This is the property the WS path could never have (the OQ#20
//   jitter class: 61/99 same-seed runs flipped outcome between invocations,
//   S13.6 accounting) and the property the S16-R1 paired-read rule stands on.
//
//   shard gate (pinned): N shards ≡ 1 shard on the same seed set — the shard
//   partition is contiguous and exhaustive, and the forked-worker battery's
//   stdout is byte-identical to the in-process battery's (modulo the loud
//   shard-count header line, which is the point of the header).
//
// The one-time WS parity bridge (socket-free vs WS pooled aggregates on the
// identical build) is a RECORDED read, not a test — S16-STATUS.md carries it.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { playRunLocal } from '../src/local';
import { shardPlan } from '../src/sim';

const CHARS = { p1: 'vess', p2: 'bram' } as const;
const NO_FLAGS = { tracks: false, rites: false }; // knotwork left the flag set at S21.5 (OQ#65)

describe('S16.0a socket-free determinism (gate 1)', () => {
  it('same seed twice → byte-identical RunResult (telemetry included)', () => {
    const opts = { seed: 4321, characters: CHARS, ascension: 0, flags: NO_FLAGS, policy: {} };
    const a = playRunLocal(opts);
    const b = playRunLocal(opts);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('same seed twice on the braid, probe knobs on → byte-identical', () => {
    const opts = {
      seed: 987, characters: CHARS, ascension: 0,
      flags: { tracks: false, rites: false },
      policy: { allKnots: true },
    };
    const a = playRunLocal(opts);
    const b = playRunLocal(opts);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('distinct seeds diverge (the instrument is not constant)', () => {
    const a = playRunLocal({ seed: 11, characters: CHARS, ascension: 0, flags: NO_FLAGS, policy: {} });
    const b = playRunLocal({ seed: 12, characters: CHARS, ascension: 0, flags: NO_FLAGS, policy: {} });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('S16.0b shard partition', () => {
  it('is contiguous, exhaustive, and balanced for every (runs, shards) shape', () => {
    for (const runs of [1, 2, 5, 7, 200]) {
      for (const shards of [1, 2, 3, 4, 7]) {
        const plan = shardPlan(runs, shards);
        expect(plan).toHaveLength(shards);
        let at = 0;
        for (const s of plan) {
          expect(s.offset).toBe(at);
          at += s.count;
        }
        expect(at).toBe(runs); // exhaustive, no overlap
        const counts = plan.map((s) => s.count);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('N shards ≡ 1 shard: forked battery stdout byte-identical to in-process (socket-free)', () => {
    const sim = path.resolve(__dirname, '../dist/sim.js');
    const env = {
      PATH: process.env.PATH,
      SEED: '7300',
    } as NodeJS.ProcessEnv;
    const run = (shards: string): string =>
      execFileSync(process.execPath, [sim, '4'], { env: { ...env, TB_SIM_SHARDS: shards } })
        .toString()
        .split('\n')
        .filter((l) => !l.startsWith('sim: shards')) // the loud boundary line differs by design
        .join('\n');
    expect(run('2')).toBe(run('1'));
  }, 120_000);
});
