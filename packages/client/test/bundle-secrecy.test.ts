// nt-slice S6.9 gate: the built client bundle must not carry the narrative
// truth tables (§11 extension — fragment prose/eliminations, combo table,
// boss faces/mechanic pools). vite.config.ts aliases the engine's secret
// content modules to the throwing stub; this test keeps that alias honest by
// grepping the ACTUAL built assets for every secret string.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRAGMENTS } from '../../engine/src/content/truth';
import { FACES } from '../../engine/src/content/faces';

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
    }
    // face real names are PUBLIC (they appear in the codex ontology prose);
    // the secret is the mechanic pools and their lines
    for (const face of FACES) {
      for (const m of face.mechanicPool) {
        expect(js.includes(m.name), `mechanic ${m.id} name leaked`).toBe(false);
        expect(js.includes(m.telegraphLine), `mechanic ${m.id} telegraph leaked`).toBe(false);
        expect(js.includes(m.revealLine), `mechanic ${m.id} reveal leaked`).toBe(false);
      }
    }
  });
});
