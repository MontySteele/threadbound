// S9d — the tally: stateless growth. Growth is derived from state.tallies
// at resolution and preview time; these tests pin the derivation, the
// per-seat axis, tally wiring in real resolution, and the fences.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId, RunTallies } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { applyGrowth, effectiveDef, grownDef } from '../src/combat';
import { pickableNodes } from '../src/map';

const tallies = (v: Partial<RunTallies> = {}): RunTallies => ({
  detonations: 0, falls: 0, boundKills: { p1: 0, p2: 0 }, threadSpent: 0,
  kindledConsumed: 0, linksFired: 0, momentumSpent: 0, resonances: 0,
  seenStep: {}, ...v,
});

describe('applyGrowth — linear growers', () => {
  const knell = (t: RunTallies) =>
    applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_knell' }), t, 'p1');

  it('Knell: +1 damage per 2 detonations, text auto-rendered', () => {
    expect(knell(tallies()).base[0]).toMatchObject({ op: 'damage', amount: 3 });
    const grown = knell(tallies({ detonations: 7 })); // floor(7/2)=3
    expect(grown.base[0]).toMatchObject({ op: 'damage', amount: 6 });
    expect(grown.text).toContain('Deal 6.');
    expect(grown.grownStep).toBe(3);
  });

  it('Knell: capped at +12 (Worn-Knife guardrail)', () => {
    const grown = knell(tallies({ detonations: 999 }));
    expect(grown.base[0]).toMatchObject({ op: 'damage', amount: 15 });
    expect(grown.grownStep).toBe(12);
  });

  it('Vigil is per-seat: only the holder’s bound kills count', () => {
    const t = tallies({ boundKills: { p1: 4, p2: 0 } });
    const p1 = applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_vigil' }), t, 'p1');
    const p2 = applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_vigil' }), t, 'p2');
    expect(p1.base.find((e) => e.op === 'block')).toMatchObject({ amount: 7 }); // 3 + 4
    expect(p2.base.find((e) => e.op === 'block')).toMatchObject({ amount: 3 });
  });

  it('growth composes with upgrades and mutations (the tally is carved into the object)', () => {
    const t = tallies({ detonations: 4 }); // +2
    const up = applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_knell', upgraded: true }), t, 'p1');
    expect(up.base[0]).toMatchObject({ op: 'damage', amount: 7 }); // 5 + 2
    const mut = applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_knell', mutated: true, echo: true }), t, 'p1');
    expect(mut.base[0]).toMatchObject({ op: 'damage', amount: 6 }); // 4 + 2 (Quickened Knell)
    expect(mut.text).toContain('Deal 6.');
  });

  it('no tallies (unflagged run shape) → pass-through untouched', () => {
    const def = effectiveDef({ instanceId: 'i', defId: 'rite_knell' });
    expect(applyGrowth(def, undefined, 'p1')).toBe(def);
  });
});

describe('applyGrowth — tiered growers', () => {
  const votive = (t: RunTallies) =>
    applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_votive' }), t, 'p1');

  it('Votive: tier 1 at 8 Thread spent adds Draw 1; Thread gain never grows (economy fence)', () => {
    expect(votive(tallies({ threadSpent: 7 })).base.some((e) => e.op === 'draw')).toBe(false);
    const t1 = votive(tallies({ threadSpent: 8 }));
    expect(t1.base.some((e) => e.op === 'draw')).toBe(true);
    expect(t1.base.find((e) => e.op === 'thread')).toMatchObject({ amount: 1 });
    expect(t1.text).toContain('Draw 1.');
    expect(t1.grownStep).toBe(1);
  });

  it('Votive: tier 2 at 20 swaps the link to partner-draws-2', () => {
    const t2 = votive(tallies({ threadSpent: 20 }));
    expect(t2.link?.effects).toContainEqual({ op: 'partnerDraw', amount: 2 });
    expect(t2.grownStep).toBe(2);
  });

  it('Descant: tier 2 base draw renders merged ("Draw 2."), mechanics stay two ops', () => {
    const d = applyGrowth(effectiveDef({ instanceId: 'i', defId: 'rite_descant' }), tallies({ resonances: 14 }), 'p1');
    expect(d.base.filter((e) => e.op === 'draw').length).toBe(2);
    expect(d.text).toContain('Draw 2.');
  });
});

describe('tallies in real runs', () => {
  function riteRun(seed = 21): GameState {
    const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
    return reduce(s0, { type: 'START_RUN', seed, rites: true });
  }

  it('rites runs get tallies; unflagged runs get none (state shape holds)', () => {
    expect(riteRun().tallies).toBeTruthy();
    const plain = reduce(initialState(21, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 21 });
    expect(plain.tallies).toBeUndefined();
    expect('tallies' in plain).toBe(false);
  });

  it('grown Knell resolves with its grown number and logs the tally line once per step', () => {
    let s = riteRun(33);
    // don the Knell so the vestment card exists, then walk to combat
    const offer = s.ritesState!.offer!;
    s = reduce(s, { type: 'RITE_PICK', player: 'p1', riteId: offer.p1.includes('dr_knell') ? 'dr_knell' : offer.p1[0] });
    s = reduce(s, { type: 'RITE_PICK', player: 'p2', riteId: offer.p2[0] });
    const node = pickableNodes(s.map)[0];
    s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
    s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
    expect(s.phase).toBe('combat');
    // seed the tally and force the Knell into hand (test-only surgery)
    s.tallies!.detonations = 10; // +5
    const p1 = s.players.p1;
    const hasKnell = p1.combatCards.some((c) => c.defId === 'rite_knell');
    if (!hasKnell) {
      p1.deck.push({ instanceId: 'test_knell', defId: 'rite_knell' });
      p1.combatCards.push({ instanceId: 'test_knell', defId: 'rite_knell' });
    }
    const knellId = (p1.combatCards.find((c) => c.defId === 'rite_knell')
      ?? p1.deck.find((c) => c.defId === 'rite_knell'))!.instanceId;
    if (!p1.hand.includes(knellId)) p1.hand.push(knellId);
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    const enemy = s.combat!.enemies[0].id;
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: knellId, slot: 0, targetId: enemy });
    s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true });
    s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
    // grown Knell: 3 + 5 = 8 raw
    const hits = s.log.filter((e) => e.e === 'damage').map((e) => (e.e === 'damage' ? e.hpLoss + e.blocked : 0));
    expect(hits).toContain(8);
    // the Machine's tally line fired and recorded the step
    expect(s.log.some((e) => e.e === 'info' && e.detail.includes('Knell') && e.detail.includes('+5'))).toBe(true);
    expect(s.tallies!.seenStep['rite_knell']).toBe(5);
    expect(s.telemetry.rites?.growth?.['rite_knell']).toBe(5);
  });
});
