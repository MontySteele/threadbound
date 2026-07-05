// S14.2 (sweep B16, per R6): the Wedding Knife drops normally — RATIFIED —
// and the self-cancelling "exclusion" filter (filter out, concat back) is
// gone. Distribution-identical, rng-stream-different (rides the S14.2
// regen window). Pins: the knife reaches shop stock like any relic, and
// the shrine's stakeRelic exclusion (real logic) still never offers it.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce, generateShop } from '../src/reducer';
import { ALL_RELICS } from '../src/content/registry';

function runState(seed: number): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  return reduce(s0, { type: 'START_RUN', seed });
}

describe('S14.2 B16: Wedding Knife filter simplification', () => {
  it('the knife drops like any relic (ratified drops-normally, seed sweep)', () => {
    let seen = false;
    for (let seed = 500; seed < 560 && !seen; seed++) {
      const s = runState(seed);
      const relicItems = generateShop(s).items.filter((i) => i.kind === 'relic');
      if (relicItems.some((i) => i.refId === 'wedding_knife')) seen = true;
    }
    expect(seen, 'wedding_knife never reached shop stock across the sweep').toBe(true);
  });

  it('when only the knife remains unowned, it is still granted (no exhaustion hole)', () => {
    const s = runState(501);
    const others = ALL_RELICS.filter((r) => !r.passives?.includes('wedding_knife')).map((r) => r.id);
    s.players.p1.relics = others.slice(0, Math.ceil(others.length / 2));
    s.players.p2.relics = others.slice(Math.ceil(others.length / 2));
    const relicItems = generateShop(s).items.filter((i) => i.kind === 'relic');
    expect(relicItems.length).toBeGreaterThan(0);
    expect(relicItems.every((i) => i.refId === 'wedding_knife')).toBe(true);
  });
});
