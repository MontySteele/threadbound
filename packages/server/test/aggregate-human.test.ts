// review fix: scripts/aggregate-human.mjs — the Hex band gate applies ONLY
// to --pair vb data (S5 gate-4 amendment), missing start stamps read as
// "unknown" rather than a floored 100% completion rate, and retraction
// lines (mid-run consent opt-out) leave the completion-rate denominator.
// Exercised end-to-end: synthetic JSONL fixtures through the real script.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../../scripts/aggregate-human.mjs');
const SHA = 'testsha';

const run = (code: string, chars: { p1: string; p2: string }, seed: number) => ({
  code,
  buildSha: SHA,
  contentVersion: 'test-content',
  mode: 'pair',
  characters: chars,
  installIds: { p1: 'install-a', p2: 'install-b' },
  outcome: 'victory',
  act: 3,
  startedAt: 1_000_000,
  endedAt: 2_200_000,
  ascension: 0,
  seed,
  telemetry: { cardsPlayed: 10, linksFired: 4, turns: 12, damageByTag: { Hex: 30, Ember: 70 } },
  actions: 40,
  feedback: [],
});

const start = (code: string, chars: { p1: string; p2: string }, seed: number) => ({
  ts: 1_000_000, code, seed, mode: 'pair', buildSha: SHA, contentVersion: 'test-content', ascension: 0, characters: chars,
});

function mkFixtures(withStarts: boolean): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-agg-'));
  const vb = { p1: 'vess', p2: 'bram' };
  const vv = { p1: 'vess', p2: 'vess' };
  fs.writeFileSync(path.join(dir, 'run-AAAAA-1.json'), JSON.stringify(run('AAAAA', vb, 1)));
  fs.writeFileSync(path.join(dir, 'run-BBBBB-2.json'), JSON.stringify(run('BBBBB', vv, 2)));
  if (withStarts) {
    const lines = [
      start('AAAAA', vb, 1),
      start('BBBBB', vv, 2),
      start('CCCCC', vb, 3), // abandoned AND retracted below (consent opt-out)
      { kind: 'retract', ts: 1_500_000, code: 'CCCCC', seed: 3, buildSha: SHA },
    ];
    fs.writeFileSync(path.join(dir, 'starts-2026-07-01.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  }
  return dir;
}

const aggregate = (dir: string, ...args: string[]): string =>
  execFileSync(process.execPath, [SCRIPT, dir, ...args], { encoding: 'utf8' });

describe('aggregate-human.mjs (review fixes, run via child_process)', () => {
  it('mixed-pair data: Hex share is telemetry-only, retracted starts leave the denominator', () => {
    const out = aggregate(mkFixtures(true));
    // (a) no --pair filter → the vb-only Hex band must NOT gate mixed data
    expect(out).toContain('Hex damage share (telemetry only for mixed pairs, S5 gate-4 amendment)');
    expect(out).not.toContain('vb gate');
    // (c) 3 start lines, one retracted → denominator 2, not 3
    expect(out).toContain('completion: 2 finished / 2 started (100%)');
    // the telemetry-only Hex line always passes (it is a read, not a gate)
    expect(out).toMatch(/PASS {2}Hex damage share \(telemetry only/);
  });

  it('--pair vb reports Hex share against the S21-R1 anchor (band retired at S21.2/2c)', () => {
    const out = aggregate(mkFixtures(true), '--pair', 'vb');
    expect(out).toContain('Hex damage share (human vb — reported; S21-R1 bot anchor 46.3)');
    expect(out).toMatch(/PASS {2}Hex damage share \(human vb/);
    expect(out).toContain('runs: 1'); // the vv run is filtered out
    expect(out).toContain('completion: 1 finished / 1 started (100%)');
  });

  it('missing start stamps read as unknown, never a floored 100%', () => {
    const out = aggregate(mkFixtures(false));
    expect(out).toContain('completion rate unknown');
    expect(out).toContain('WARNING: start stamps missing');
    expect(out).not.toMatch(/completion:.*\(100%\)/);
  });
});
