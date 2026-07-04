// S12 gates for the sigil vocabulary v2 (Part 4 of the sprint doc). Same
// posture as the S9b upgrade-differs gate: structural invariants live in CI,
// not in memory.
//
//   Gate A — coverage: every registry enemy (plus the three characters) has a
//     MOTIFS entry; a new enemy without a motif assignment fails CI.
//   Gate B — determinism: a mark is a pure function of (id, tier, act, size,
//     hue), and LOD never touches the seed stream. Snapshot hashes lock the
//     approved look — committed only after visual sign-off (Part 6, gate 3);
//     until the .snap file lands, vitest generates it locally.
//   Gate C — sanity sweep: every registry id at every applicable tier/act/LOD
//     size renders with no NaN/undefined and exactly one thread path (the
//     throughline is mandatory).

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../engine/src/content/registry';
import { MOTIFS } from '../src/motifs';
import { markSvg } from '../src/sigils';
import type { Tier } from '../src/sigils';

const CHARACTERS = ['character_vess', 'character_bram', 'character_witness'];
const CHARACTER_HUE: Record<string, string> = {
  character_vess: 'var(--hex)', character_bram: 'var(--p2)', character_witness: 'var(--witness)',
};
const LOD_SIZES = [96, 64, 40]; // one per LOD tier (>=72, 48–71, <48)

const tierOf = (id: string): Tier => {
  const def = ENEMIES[id];
  return def.boss ? 'boss' : def.elite ? 'elite' : 'normal';
};

describe('Gate A — motif coverage (registry reconciliation)', () => {
  it('every registry enemy id has a MOTIFS entry', () => {
    for (const id of Object.keys(ENEMIES)) {
      expect(MOTIFS[id], `enemy ${id} has no motif assignment — a new enemy needs a ratified table entry, not the silent figure default`).toBeDefined();
    }
  });
  it('the three characters have MOTIFS entries', () => {
    for (const id of CHARACTERS) expect(MOTIFS[id], `${id} missing from MOTIFS`).toBeDefined();
  });
  it('no stale MOTIFS entry points at a nonexistent id', () => {
    for (const id of Object.keys(MOTIFS)) {
      expect(
        ENEMIES[id] !== undefined || CHARACTERS.includes(id),
        `MOTIFS entry ${id} matches no registry enemy or character`,
      ).toBe(true);
    }
  });
});

describe('Gate B — determinism', () => {
  // a fixed cross-section: one id per archetype family plus tier/act coverage
  const FIXED: Array<[string, Tier, 1 | 2 | 3]> = [
    ['cinder_husk', 'normal', 1],
    ['tallow_wisp', 'normal', 1],
    ['thread_leech', 'normal', 1],
    ['votive_throng', 'normal', 1],
    ['bell_husk', 'normal', 2],
    ['psalm_eater', 'normal', 2],
    ['mourner', 'elite', 1],
    ['mislaid_sexton', 'elite', 1],
    ['the_cantor', 'elite', 2],
    ['interred_saint', 'boss', 1],
    ['choirmaster', 'boss', 2],
    ['the_unraveled', 'boss', 3],
    ['gravewax_husk', 'normal', 2],
    ['gravewax_husk', 'normal', 3],
    ['character_vess', 'character', 1],
    ['character_bram', 'character', 1],
    ['character_witness', 'character', 1],
  ];

  it('rendering twice yields identical markup', () => {
    for (const [id, tier, act] of FIXED) {
      const hue = CHARACTER_HUE[id];
      expect(markSvg(id, tier, act, 96, hue)).toBe(markSvg(id, tier, act, 96, hue));
    }
  });

  it('LOD changes what is drawn, never the seed stream — the thread is byte-identical at every size', () => {
    for (const [id, tier, act] of FIXED) {
      const hue = CHARACTER_HUE[id];
      const threadOf = (svg: string): string => {
        const match = svg.match(/<path class="thread-anim" d="([^"]+)"/);
        expect(match, `${id}: no thread path at some size`).not.toBeNull();
        return match![1];
      };
      const [a, b, c] = LOD_SIZES.map((s) => threadOf(markSvg(id, tier, act, s, hue)));
      expect(b, `${id}: thread drifted between LOD sizes`).toBe(a);
      expect(c, `${id}: thread drifted between LOD sizes`).toBe(a);
    }
  });

  it('snapshot hashes lock the approved look (committed at sign-off gate 3)', () => {
    const hashes: Record<string, string> = {};
    for (const [id, tier, act] of FIXED) {
      hashes[`${id}/${tier}/act${act}`] = createHash('sha256')
        .update(markSvg(id, tier, act, 96, CHARACTER_HUE[id]))
        .digest('hex');
    }
    expect(hashes).toMatchSnapshot();
  });
});

describe('Gate C — sanity sweep', () => {
  it('every mark renders clean at every LOD size, with exactly one thread path', () => {
    const all: Array<[string, Tier, 1 | 2 | 3, string | undefined]> = [
      ...Object.keys(ENEMIES).map((id): [string, Tier, 1 | 2 | 3, undefined] => [id, tierOf(id), ENEMIES[id].act, undefined]),
      ...CHARACTERS.map((id): [string, Tier, 1 | 2 | 3, string] => [id, 'character', 1, CHARACTER_HUE[id]]),
    ];
    for (const [id, tier, act, hue] of all) {
      for (const size of LOD_SIZES) {
        const svg = markSvg(id, tier, act, size, hue);
        expect(svg.includes('NaN'), `${id} @${size}: NaN in output`).toBe(false);
        expect(svg.includes('undefined'), `${id} @${size}: undefined in output`).toBe(false);
        const threads = svg.match(/class="thread-anim"/g) ?? [];
        expect(threads.length, `${id} @${size}: expected exactly one thread path, got ${threads.length}`).toBe(1);
      }
    }
  });
});
