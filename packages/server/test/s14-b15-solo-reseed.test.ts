// S14.2 (sweep B15): the solo driver's policy seed comes from the room's
// TRUE seed, passed out-of-band by the server — not from view.seed, which
// redactFor masks to 0 on live runs (§11). Pre-B15 every solo run's partner
// played identical seeded choices at identical contexts. Wire and
// redaction are untouched; this pins the server-side plumbing.

import { describe, expect, it } from 'vitest';
import { initialState, reduce, BotPolicy, BotView } from '@threadbound/engine';
import { SoloBotDriver } from '../src/solo';

function redactedView(seed: number): BotView {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' }, 'p2');
  const s = reduce(s0, { type: 'START_RUN', seed });
  return {
    ...s,
    seed: 0, // what redactFor sends on a live run
    rng: 0,
    you: 'p2',
    counts: { p1: { hand: 0, draw: 0 }, p2: { hand: 0, draw: 0 } },
  } as BotView;
}

const policyOf = (d: SoloBotDriver): BotPolicy => (d as unknown as { policy: BotPolicy }).policy;

describe('S14.2 B15: solo bot reseed', () => {
  it('the policy seed derives from the true room seed, not the masked view seed', () => {
    const drivers = [1111, 2222].map((trueSeed) => {
      const d = new SoloBotDriver('p2', () => trueSeed, () => 'instant', () => {});
      d.onState(redactedView(trueSeed));
      return d;
    });
    try {
      expect(policyOf(drivers[0]).seed).toBe((1111 ^ 0x501f) >>> 0);
      expect(policyOf(drivers[1]).seed).toBe((2222 ^ 0x501f) >>> 0);
      // the pre-B15 failure mode: masked views made these EQUAL (0 ^ 0x501f)
      expect(policyOf(drivers[0]).seed).not.toBe(policyOf(drivers[1]).seed);
    } finally {
      for (const d of drivers) d.stop();
    }
  });
});
