// S8.7 never-lies audit, mechanically held (lore bible §4, RATIFIED; S8.8
// gate 6): the Witness never states falsehoods. The S6 lore audit found a
// mortal-ghost biography asserted as fact across witness-solo.ts, plus
// real-world scripture/calendar leaks — all rewritten in S8.7. This test
// pins the rewrite: no Witness-voiced line may carry the banned biography
// markers or real-world references again.
//
// Scope: every Witness line pool (M1 + M2 + solo + anything merged later
// through WITNESS_POOLS) and the event witness channels of events.ts,
// m2-world.ts, and clue-events.ts. character-events.ts is deliberately
// EXCLUDED — its witness lines are owned by the parallel S8.3 voice pass
// and get audited there.

import { describe, expect, it } from 'vitest';
import { WITNESS_POOLS } from '../src/witness-draw';
import { EVENTS } from '../src/content/events';
import { M2_EVENTS } from '../src/content/m2-world';
import { CLUE_EVENTS } from '../src/content/clue-events';
import { CHARACTER_EVENTS } from '../src/content/character-events';
import { FRAGMENTS } from '../src/content/truth';

// first-person mortal biography — the Witness never lived, never died,
// never had masters, was never a legend among the living
const BANNED_BIOGRAPHY = /my old masters|I'm the one who's dead|died properly|dead twice|I was a legend/i;
// real-world scripture and calendar have no purchase down here
const BANNED_WORLD = /Tuesday|commandments/i;
// S8 audit residue: body-parts-in-time biography, the self-adopted ghost
// persona, authorship of the rite's forms, and the claimed office — the
// Witness knows the forms and the statutes; it never lived, haunted, wrote,
// or held office
const BANNED_RESIDUE = /another century|back rent|haunting|helped write the forms|the last professional/i;

/** Every Witness-voiced line in the shipped content set (S8.3's
 *  character-events excluded — parallel ownership). Handles both plain
 *  pools and the S8.7 registered-pool shape, whichever ships. */
function allWitnessLines(): { where: string; line: string }[] {
  const out: { where: string; line: string }[] = [];
  for (const [ctx, pool] of Object.entries(WITNESS_POOLS)) {
    const p = pool as unknown as string[] | { base: string[]; registers?: { minPct: number; lines: string[] }[] };
    if (Array.isArray(p)) {
      for (const line of p) out.push({ where: `pool ${ctx}`, line });
    } else {
      for (const line of p.base) out.push({ where: `pool ${ctx} (base)`, line });
      for (const reg of p.registers ?? []) {
        for (const line of reg.lines) out.push({ where: `pool ${ctx} (register ${reg.minPct})`, line });
      }
    }
  }
  const eventSets: [string, { id: string; options: { witness: string }[] }[]][] = [
    ['events.ts', Object.values(EVENTS)],
    ['m2-world.ts', M2_EVENTS],
    ['clue-events.ts', CLUE_EVENTS],
  ];
  for (const [file, defs] of eventSets) {
    for (const def of defs) {
      for (const opt of def.options) out.push({ where: `${file} ${def.id}`, line: opt.witness });
    }
  }
  return out;
}

describe('S8.7 never-lies audit (gate 6)', () => {
  it('no Witness line asserts the mortal-ghost biography', () => {
    for (const { where, line } of allWitnessLines()) {
      expect(BANNED_BIOGRAPHY.test(line), `${where}: "${line}"`).toBe(false);
    }
  });

  it('no Witness line reaches for real-world scripture or calendar', () => {
    for (const { where, line } of allWitnessLines()) {
      expect(BANNED_WORLD.test(line), `${where}: "${line}"`).toBe(false);
    }
  });

  it('no Witness-voiced text carries the S8 audit residue markers (pools + events + character events + partner fragments)', () => {
    const corpus = [...allWitnessLines()];
    // character-events.ts is excluded from the S8.7 checks above (parallel
    // S8.3 ownership) but the S8 audit markers are canon everywhere
    for (const def of CHARACTER_EVENTS) {
      for (const opt of def.options) corpus.push({ where: `character-events.ts ${def.id}`, line: opt.witness });
    }
    // partner-channel fragments are Witness-voiced (solo speaks them aloud)
    for (const f of FRAGMENTS) {
      if (f.channel === 'partner') corpus.push({ where: `truth.ts ${f.id}`, line: f.text });
    }
    for (const { where, line } of corpus) {
      expect(BANNED_RESIDUE.test(line), `${where}: "${line}"`).toBe(false);
    }
  });

  it('the audit actually covered the corpus (sanity floor)', () => {
    // ~60 pool lines existed pre-S8; the merged corpus with events must
    // comfortably clear 100 — a collapse here means a pool went missing
    expect(allWitnessLines().length).toBeGreaterThan(100);
  });
});
