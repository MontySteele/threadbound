// S11.1 — the composition CI gate. Generation-time assertions over N seeded
// maps per config. HARD assertions fail the suite; PENDING ones are the
// S9b.2 burn-down pattern — they must fail today (else they come off the
// list) and flip to hard as Wave A generator commits land.

import { describe, expect, it } from 'vitest';
import { generateActMap } from '../src/map';
import { measureAct, compositionViolations } from '../src/map-composition';
import { EVENTS } from '../src/content/registry';

const N = 200;
const CHARS = ['vess', 'bram'] as const;

/** The Wave A burn-down. An assertion key leaves this set in the same commit
 *  that makes the generator satisfy it — the burn-down test below fails
 *  loudly on stale entries. */
const PENDING = new Set<string>([
  // (emptied by the S11.1 generator repairs — kept for the next wave's use)
]);

type ConfigRow = { act: 1 | 2; extraElite: boolean; label: string };
const CONFIGS: ConfigRow[] = [
  { act: 1, extraElite: false, label: 'act1' },
  { act: 2, extraElite: false, label: 'act2' },
  { act: 1, extraElite: true, label: 'act1+extraElite(A3)' },
  { act: 2, extraElite: true, label: 'act2+extraElite(A3)' },
];

// S11.5: armed PER ACT — the 2026-07-04 ruling put both flags in act 2;
// act-1 maps have nothing to place until the deep-retrofit sprint lands
const highStakesContentFor = (act: 1 | 2): boolean =>
  Object.values(EVENTS).some((e) => e.highStakes && (e.act === act || e.act === 0));

function violationsFor(row: ConfigRow, seedBase: number): Map<string, string[]> {
  const byKind = new Map<string, string[]>();
  for (let i = 0; i < N; i++) {
    const { map } = generateActMap(seedBase + i * 13, row.act, row.extraElite, true, [], [...CHARS]);
    const c = measureAct(map);
    for (const v of compositionViolations(c, row.extraElite ? 3 : 2, {
      charactersInRun: CHARS,
      highStakesContentExists: highStakesContentFor(row.act),
    })) {
      const kind = v.startsWith('elite') ? 'eliteCount'
        : v.startsWith('no shop') ? 'shop'
        : v.startsWith('no treasure') ? 'treasure'
        : v.startsWith('knot') ? 'approach'
        : v.startsWith('character-event') ? 'charOpp'
        : 'highStakes';
      const list = byKind.get(kind) ?? [];
      if (list.length < 5) list.push(`${row.label} seed ${seedBase + i * 13}: ${v}`);
      byKind.set(kind, list);
    }
  }
  return byKind;
}

describe('S11.1 composition CI (the weave holds its shape)', () => {
  for (const row of CONFIGS) {
    it(`${row.label}: hard assertions over ${N} seeded maps`, () => {
      const violations = violationsFor(row, 40_000);
      for (const [kind, examples] of violations) {
        if (PENDING.has(kind)) continue;
        expect.fail(`${kind}: ${examples.length}+ violations, e.g.\n  ${examples.join('\n  ')}`);
      }
    });
  }

  it('burn-down: every PENDING assertion still actually fails (stale entries come off)', () => {
    for (const kind of PENDING) {
      const anyViolation = CONFIGS.some((row) => violationsFor(row, 41_000).has(kind));
      expect(anyViolation, `${kind}: no longer violated — remove it from PENDING`).toBe(true);
    }
  });

  it('unflagged maps satisfy the flag-independent assertions too', () => {
    for (const act of [1, 2] as const) {
      for (let i = 0; i < N; i++) {
        const { map } = generateActMap(42_000 + i * 13, act, false, false);
        const c = measureAct(map);
        const v = compositionViolations(c, 2).filter((s) =>
          !PENDING.has(s.startsWith('no treasure') ? 'treasure' : s.startsWith('knot') ? 'approach' : ''));
        expect(v, `act ${act} seed ${42_000 + i * 13}`).toEqual([]);
      }
    }
  });
});
