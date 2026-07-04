// S9b.1 bugfix slate: each confirmed playtest defect gets a pinning test.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { effectiveDef } from '../src/combat';
import { generateShop, initialState, reduce } from '../src/reducer';

describe('S9b.1-2 stale upgrade texts (the cards never lie)', () => {
  it('needlework+ advertises its real base (4 Hex, not the pre-M2-B1 3)', () => {
    const eff = effectiveDef({ instanceId: 'i', defId: 'needlework', upgraded: true });
    const hex = eff.base.find((op) => op.op === 'hex');
    expect(hex && 'amount' in hex ? hex.amount : undefined).toBe(4);
    expect(eff.text).toContain('Apply 4 Hex');
    expect(eff.text).not.toContain('Apply 3 Hex');
  });

  it('spark+ advertises its real base (3 Hex) and its real link (Deal 5)', () => {
    const eff = effectiveDef({ instanceId: 'i', defId: 'spark', upgraded: true });
    const hex = eff.base.find((op) => op.op === 'hex');
    expect(hex && 'amount' in hex ? hex.amount : undefined).toBe(3);
    expect(eff.text).toContain('Apply 3 Hex');
    expect(eff.text).toContain('deal 5');
    expect(eff.link?.effects.some((op) => op.op === 'damage' && op.amount === 5)).toBe(true);
  });

  it('upgrade texts exist for both cards (the overlays are wired)', () => {
    expect(CARDS['needlework'].upgrade?.text).toBeTruthy();
    expect(CARDS['spark'].upgrade?.text).toBeTruthy();
  });
});

describe('S9b.1-1 shop never stocks the same relic twice', () => {
  it('seed sweep: both relic slots hold distinct refIds (1000 seeds)', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
      const s = reduce(s0, { type: 'START_RUN', seed });
      const shop = generateShop(s);
      const relics = shop.items.filter((it) => it.kind === 'relic').map((it) => it.refId);
      expect(relics.length).toBe(2);
      expect(new Set(relics).size).toBe(relics.length);
    }
  });
});
