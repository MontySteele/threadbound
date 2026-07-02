// S8.7 voice arc — codex-percentage-keyed Witness registers:
// - poolLines picks the highest register whose minPct <= codexPct, else base
// - selection is a pure function of state (codexPct + the existing draw
//   machinery); a codexPct of 0/absent is byte-identical to pre-S8.7
//   behavior (the tracks-covenant golden holds this end-to-end)
// - START_RUN clamps the claimed percentage and stores it only when nonzero
// - the S7-stubbed rite pools replace the reducer's hardcoded lines, with
//   {rite} substitution in the spoken line and template-keyed no-repeat

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { WITNESS_POOLS, poolLines, sayWitness, WitnessPool } from '../src/witness-draw';
import { S8_WITNESS, WITNESS_REGISTERS } from '../src/content/witness';
import { RITES_BY_ID } from '../src/content/rites';

const start = (seed: number, opts: { rites?: boolean; codexPct?: number } = {}): GameState =>
  reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed, ...opts });

describe('register selection (poolLines)', () => {
  const pool: WitnessPool = {
    base: ['b1', 'b2'],
    registers: [
      { minPct: 30, lines: ['m1'] },
      { minPct: 70, lines: ['h1', 'h2'] },
    ],
  };

  it('pct 0 → base; below every threshold → base', () => {
    expect(poolLines(pool, 0)).toEqual(['b1', 'b2']);
    expect(poolLines(pool, 29)).toEqual(['b1', 'b2']);
  });

  it('the highest register whose minPct <= pct wins', () => {
    expect(poolLines(pool, 30)).toEqual(['m1']);
    expect(poolLines(pool, 69)).toEqual(['m1']);
    expect(poolLines(pool, 70)).toEqual(['h1', 'h2']);
    expect(poolLines(pool, 75)).toEqual(['h1', 'h2']);
    expect(poolLines(pool, 100)).toEqual(['h1', 'h2']);
  });

  it('plain-array pools and missing pools are unchanged by pct', () => {
    expect(poolLines(['a'], 0)).toEqual(['a']);
    expect(poolLines(['a'], 100)).toEqual(['a']);
    expect(poolLines(undefined, 100)).toEqual([]);
  });

  it('selection is deterministic: same state draws the same line', () => {
    const a = start(11, { codexPct: 75 });
    const b = start(11, { codexPct: 75 });
    sayWitness(a, 'resonance');
    sayWitness(b, 'resonance');
    expect(a.log.at(-1)).toEqual(b.log.at(-1));
    expect(a.rng).toBe(b.rng);
  });
});

describe('START_RUN codexPct claim clamping', () => {
  it('clamps to 0–100 and floors fractions', () => {
    expect(start(1, { codexPct: 250 }).codexPct).toBe(100);
    expect(start(1, { codexPct: 33.7 }).codexPct).toBe(33);
    expect(start(1, { codexPct: 75 }).codexPct).toBe(75);
  });

  it('absent, zero, and negative all mean ABSENT (hash covenant)', () => {
    expect(start(1).codexPct).toBeUndefined();
    expect(start(1, { codexPct: 0 }).codexPct).toBeUndefined();
    expect(start(1, { codexPct: -5 }).codexPct).toBeUndefined();
    // absent = 0 = byte-identical state
    expect(hashState(start(1, { codexPct: 0 }))).toBe(hashState(start(1)));
  });
});

describe('the authored 70% registers', () => {
  it('at pct 75 the most-heard pools speak the quieter register', () => {
    for (const ctx of ['combat_start', 'resonance', 'revival'] as const) {
      const s = start(7, { codexPct: 75 });
      sayWitness(s, ctx);
      const last = s.log.at(-1);
      expect(last?.e).toBe('witness');
      const register = WITNESS_REGISTERS[ctx].find((r) => r.minPct === 70)!;
      expect(register.lines, `${ctx} drew outside its 70% register`).toContain((last as { line: string }).line);
    }
  });

  it('at pct 0 the same pools speak base — never the register', () => {
    for (const ctx of ['combat_start', 'resonance', 'revival'] as const) {
      const s = start(7);
      sayWitness(s, ctx);
      const line = (s.log.at(-1) as { line: string }).line;
      const register = WITNESS_REGISTERS[ctx].find((r) => r.minPct === 70)!;
      expect(register.lines).not.toContain(line);
    }
  });

  it('the fall-rebind sacrament quote lives ONLY at the 70% register (§5b held reveal)', () => {
    const revival = WITNESS_POOLS.revival;
    expect(Array.isArray(revival)).toBe(false);
    const { base, registers } = revival as Exclude<WitnessPool, string[]>;
    const sacrament = registers!.find((r) => r.minPct === 70)!.lines[0];
    expect(sacrament).toMatch(/the hands receive/);
    expect(base).not.toContain(sacrament);
    expect(base.length).toBeGreaterThan(0); // the current line stays in the pool
  });
});

describe('S7-stubbed rite pools (rite_death_pick / rite_birth_arrival)', () => {
  it('the death pick draws from the pool with {rite} substituted', () => {
    let s = start(21, { rites: true });
    const riteId = s.ritesState!.offer!.p1[0];
    s = reduce(s, { type: 'RITE_PICK', player: 'p1', riteId });
    const said = s.log.filter((e) => e.e === 'witness').at(-1) as { line: string };
    expect(said.line).toContain(RITES_BY_ID[riteId].name);
    expect(said.line).not.toContain('{rite}'); // substitution happened
    // no-repeat keys on the template, so the partner gets a DIFFERENT line
    const p1Template = s.witnessSaid.at(-1)!;
    expect(S8_WITNESS.rite_death_pick).toContain(p1Template);
    s = reduce(s, { type: 'RITE_PICK', player: 'p2', riteId: s.ritesState!.offer!.p2[0] });
    const p2Template = s.witnessSaid.at(-1)!;
    expect(S8_WITNESS.rite_death_pick).toContain(p2Template);
    expect(p2Template).not.toBe(p1Template);
  });

  it('both rite pools carry 3+ lines and a {rite} token each', () => {
    for (const key of ['rite_death_pick', 'rite_birth_arrival'] as const) {
      expect(S8_WITNESS[key].length).toBeGreaterThanOrEqual(3);
      for (const line of S8_WITNESS[key]) expect(line).toContain('{rite}');
    }
    // the wrong-way pool is reserved for S8.4 — deliberately NOT authored here
    expect(WITNESS_POOLS.wrong_way).toBeUndefined();
  });
});
