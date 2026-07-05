// nt-slice S6.9 gate: the built client bundle must not carry the narrative
// truth tables (§11 extension — fragment prose/eliminations, combo table,
// boss faces/mechanic pools). vite.config.ts aliases the engine's secret
// content modules to the throwing stub; this test keeps that alias honest by
// grepping the ACTUAL built assets for every secret string.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRAGMENTS, VALID_COMBOS } from '../../engine/src/content/truth';
import { FACES } from '../../engine/src/content/faces';
import { WITNESS_REGISTERS } from '../../engine/src/content/witness';

const assetsDir = path.resolve(__dirname, '../dist/assets');

describe('bundle secrecy (§11 extension)', () => {
  it('no fragment prose, telegraph, reveal line, or mechanic name ships in the client JS', () => {
    // pretest builds the client; a missing dist means the gate cannot pass
    expect(fs.existsSync(assetsDir), 'client dist missing — run the build first').toBe(true);
    const js = fs
      .readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf8'))
      .join('\n');
    expect(js.length).toBeGreaterThan(0);
    for (const f of FRAGMENTS) {
      expect(js.includes(f.text), `fragment ${f.id} leaked into the bundle`).toBe(false);
      // ids too: a shipped id enumerates the fragment table even without prose
      expect(js.includes(f.id), `fragment id ${f.id} leaked into the bundle`).toBe(false);
    }
    // the VALID-COMBO table: no serialized row in any common object-literal
    // shape — JSON form, and minified/quoted key:value adjacency
    for (const combo of VALID_COMBOS) {
      expect(js.includes(JSON.stringify(combo)), `combo row ${JSON.stringify(combo)} leaked (JSON form)`).toBe(false);
      for (const [q, a] of Object.entries(combo)) {
        for (const pat of [`${q}:"${a}"`, `${q}:'${a}'`, `${q}":"${a}"`]) {
          expect(js.includes(pat), `combo pair ${pat} leaked into the bundle`).toBe(false);
        }
      }
    }
    // S14.3 (B10): the held-reveal registers (the sacrament fall-rebind
    // quote, the procession-direction hint, the 70% voice-arc lines) must
    // not be datamine-able from the bundle — template vars ({rite}) are
    // stripped and every remaining chunk asserted absent
    for (const registers of Object.values(WITNESS_REGISTERS)) {
      for (const reg of registers) {
        for (const line of reg.lines) {
          for (const chunk of line.split(/\{[^}]+\}/).filter((c) => c.length >= 20)) {
            expect(js.includes(chunk), `held-reveal register chunk leaked: ${chunk.slice(0, 40)}…`).toBe(false);
          }
        }
      }
    }
    // face real names are PUBLIC (they appear in the codex ontology prose);
    // the secret is the mechanic pools and their lines
    for (const face of FACES) {
      for (const m of face.mechanicPool) {
        expect(js.includes(m.id), `mechanic id ${m.id} leaked`).toBe(false);
        expect(js.includes(m.name), `mechanic ${m.id} name leaked`).toBe(false);
        expect(js.includes(m.telegraphLine), `mechanic ${m.id} telegraph leaked`).toBe(false);
        expect(js.includes(m.revealLine), `mechanic ${m.id} reveal leaked`).toBe(false);
      }
    }
  });
});
