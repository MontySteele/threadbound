// S9b.1 bugfix slate: each confirmed playtest defect gets a pinning test.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { effectiveDef, reclaimEchoShape } from '../src/combat';
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

  it('thornward+ carries the OQ#49-ruled link (2 Hex to ALL + 3 Block, no new Hex amounts)', () => {
    const eff = effectiveDef({ instanceId: 'i', defId: 'thornward', upgraded: true });
    expect(eff.link?.effects).toEqual([
      { op: 'hexAll', amount: 2 },
      { op: 'block', amount: 3 },
    ]);
    expect(eff.text).toContain('gain 3 Block');
    // the base is untouched by the ruling
    expect(eff.base).toEqual(CARDS['thornward'].base);
  });
});

describe('S9b.1-3 reclaim arrival preview (reclaimEchoShape is the one truth)', () => {
  const player = () => initialState(7, { p1: 'vess', p2: 'bram' }).players.p1;

  it('mutation-bearing cards arrive mutated; Quickening stays hidden behind mutation precedence', () => {
    const withMutation = Object.values(CARDS).find((c) => c.mutation && c.upgrade)!;
    const quickened = { ...player(), rites: ['br_quickening'] };
    const shape = reclaimEchoShape(quickened, withMutation.id);
    expect(shape.mutated).toBe(true);
    expect(shape.echo).toBe(true);
    const eff = effectiveDef({ instanceId: 'i', ...shape });
    // mutation precedence: the arrival reads as the mutation, at base cost
    expect(eff.name).toBe(withMutation.mutation!.name);
    expect(eff.cost).toBe(withMutation.cost);
  });

  it('Quickening upgrades mutation-free cards on arrival (cost included)', () => {
    const plain = Object.values(CARDS).find((c) => c.upgrade && !c.mutation);
    expect(plain, 'pool needs at least one upgrade-only card for Quickening to mean anything').toBeTruthy();
    const quickened = { ...player(), rites: ['br_quickening'] };
    const shape = reclaimEchoShape(quickened, plain!.id);
    expect(shape.upgraded).toBe(true);
    const eff = effectiveDef({ instanceId: 'i', ...shape });
    expect(eff.name).toBe(`${plain!.name}+`);
    expect(eff.cost).toBe(plain!.upgrade!.cost ?? plain!.cost);
  });

  it('without Quickening nothing arrives upgraded', () => {
    const plain = Object.values(CARDS).find((c) => c.upgrade && !c.mutation)!;
    expect(reclaimEchoShape(player(), plain.id).upgraded).toBeUndefined();
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
