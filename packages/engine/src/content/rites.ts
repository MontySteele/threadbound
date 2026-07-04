// S7.1 + S8.1 — the Rites (docs/threadbound_sprint_S7.md, superseded in part
// by docs/threadbound_sprint_S8.md S8.0/S8.1, designer 2026-07-01):
//
//   DEATH rites are CARDS — one unique copy joins the starting deck at the
//   run-start pick (offered 2 of the role's 4). riteOnly: never in
//   reward/shop/event pools; removable at shops (shedding the vestment is a
//   story); a legal Reclaim target, so every rite card authors a mutation —
//   the vestment can die, pass through the partner, and return reborn (§5b).
//
//   BIRTH rites are PASSIVES — hidden-relic semantics, granted at the 2nd
//   character event (pick 1 of 3). The card/passive asymmetry is deliberate
//   held-reveal signal.
//
// ALL numbers and names PROVISIONAL pending the S8.8 gate-1 sign-off tables.
// Mutation names: rite-card mutations count toward the S8.6 birth-column
// quota — birth-column names where the fiction earns it (a vestment reborn
// through the partner earns it everywhere here).
//
// Covenant (S7.1): no rite effect may add Hex application, scaling, or
// density — enforced by test over card base/link/mutation and passives.

import { CardDef, RiteDef } from '../types';

// ---- death-rite cards (S8.1 table + S9d.1 growers) --------------------------
//
// S9d (supersedes the S9c.1 death-rite magnitude rows, per S9d.A3): death
// rites are the game's GROWERS — each carries a per-run tally keyed to a
// distinct axis and grows permanently as the run feeds it. Growth is
// derived (state.tallies), CAPPED (Worn-Knife guardrail, CI-enforced), and
// never a Hex application or scaling op (covenant fence). Bases, rates,
// and caps provisional pending battery (S9d.0-1). Tally scope: PAIR-wide
// except Vigil's (per-seat by nature — S9d.0-2, ruled and assumed).

export const RITE_CARDS: CardDef[] = [
  {
    id: 'rite_shroud', name: 'Shroud', character: 'vess', rarity: 'rare', cost: 1, tag: 'Guard',
    riteOnly: true,
    // S9d.1-2: mourning thickens — strongest for pairs having the hardest run
    growsWith: { axis: 'falls', per: 1, amount: 2, cap: 8, appliesTo: 'block' },
    text: 'Gain 4 Block. Link (Hex): partner gains 2 Block.',
    base: [{ op: 'block', amount: 4, primary: true }],
    link: { condition: 'Hex', text: 'Partner gains 2 Block.', effects: [{ op: 'partnerBlock', amount: 2 }] },
    mutation: {
      name: 'Cradled Shroud',
      text: 'Gain 3 Block. Partner gains 3 Block.',
      base: [{ op: 'block', amount: 3, primary: true }, { op: 'partnerBlock', amount: 3 }],
    },
    upgrade: { text: 'Gain 5 Block. Link (Hex): partner gains 3 Block.', base: [{ op: 'block', amount: 5, primary: true }], link: { condition: 'Hex', text: 'Partner gains 3 Block.', effects: [{ op: 'partnerBlock', amount: 3 }] } },
  },
  {
    id: 'rite_votive', name: 'Votive', character: 'vess', rarity: 'rare', cost: 0, tag: 'Rite',
    riteOnly: true,
    // S9d.1-4: reads the economy, never adds to it (Thread gain stays 1).
    // DESIGNER FLAG (S9d.0-4): the tier shape is the least-loved row.
    growsWith: { axis: 'threadSpent', tiers: [
      { at: 8, addBase: [{ op: 'draw', amount: 1 }] },
      { at: 20, link: { condition: 'Rite', text: 'Your partner draws 2.', effects: [{ op: 'partnerDraw', amount: 2 }] } },
    ] },
    text: 'Gain 1 Thread. Link (Rite): partner draws 1.',
    base: [{ op: 'thread', amount: 1 }],
    link: { condition: 'Rite', text: 'Partner draws 1.', effects: [{ op: 'partnerDraw', amount: 1 }] },
    mutation: {
      name: 'First-Lit Votive',
      text: 'Gain 1 Thread. Draw 1.',
      base: [{ op: 'thread', amount: 1 }, { op: 'draw', amount: 1 }],
    },
    upgrade: { text: 'Gain 2 Thread. Link (Rite): partner draws 1.', base: [{ op: 'thread', amount: 2 }] },
  },
  {
    id: 'rite_knell', name: 'Knell', character: 'vess', rarity: 'rare', cost: 1, tag: 'Strike',
    riteOnly: true, needsTarget: true,
    // S9d.1-1: the Hex archetype finally pays outside Hex amounts —
    // damage growth, covenant-clean. Watch: Hex damage share band.
    growsWith: { axis: 'detonations', per: 2, amount: 1, cap: 12, appliesTo: 'damage' },
    text: 'Deal 3. Link (Hex): Detonate.',
    base: [{ op: 'damage', amount: 3, primary: true }],
    link: { condition: 'Hex', text: 'Detonate.', effects: [{ op: 'detonate' }] },
    mutation: {
      // detonation stays — cash-out only, no Hex application (covenant-safe)
      name: 'Quickened Knell',
      text: 'Deal 4. Detonate.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'detonate' }],
    },
    upgrade: { text: 'Deal 5. Link (Hex): Detonate.', base: [{ op: 'damage', amount: 5, primary: true }] },
  },
  {
    id: 'rite_vigil', name: 'Vigil', character: 'vess', rarity: 'rare', cost: 1, tag: 'Guard',
    riteOnly: true, needsTarget: true,
    // S9d.1-3: the taunt archetype — dying to your face makes you harder
    // to ignore. Per-seat by nature (S9d.0-2).
    growsWith: { axis: 'boundKills', per: 1, amount: 1, cap: 9, appliesTo: 'block' },
    text: 'Bind the target to you. Gain 3 Block.',
    base: [{ op: 'taunt' }, { op: 'block', amount: 3, primary: true }],
    mutation: {
      name: 'Cradle-Vigil',
      text: 'Bind the target to you. Gain 2 Block. Partner gains 2 Block.',
      base: [{ op: 'taunt' }, { op: 'block', amount: 2, primary: true }, { op: 'partnerBlock', amount: 2 }],
    },
    upgrade: { text: 'Bind the target to you. Gain 5 Block.', base: [{ op: 'taunt' }, { op: 'block', amount: 5, primary: true }] },
  },
  {
    id: 'rite_toll', name: 'Toll', character: 'bram', rarity: 'rare', cost: 0, tag: 'Rite',
    riteOnly: true,
    // S9d.1-6: small cap on purpose — Momentum grants are per-turn fuel
    // and Hearth-Keeper carries interact.
    growsWith: { axis: 'linksFired', per: 25, amount: 1, cap: 2, appliesTo: 'momentum' },
    text: 'Gain 2 Momentum. Link (Surge): gain 1 more.',
    base: [{ op: 'momentum', amount: 2 }],
    link: { condition: 'Surge', text: 'Gain 1 more Momentum.', effects: [{ op: 'momentum', amount: 1 }] },
    mutation: {
      name: 'First-Struck Toll',
      text: 'Gain 2 Momentum. Partner gains 1 Kindled.',
      base: [{ op: 'momentum', amount: 2 }, { op: 'partnerKindled', amount: 1 }],
    },
    upgrade: { text: 'Gain 3 Momentum. Link (Surge): gain 1 more.', base: [{ op: 'momentum', amount: 3 }] },
  },
  {
    id: 'rite_pyre_brand', name: 'Pyre-Brand', character: 'bram', rarity: 'rare', cost: 1, tag: 'Strike',
    riteOnly: true, needsTarget: true,
    // S9d.1-5
    growsWith: { axis: 'kindledConsumed', per: 4, amount: 1, cap: 8, appliesTo: 'damage' },
    text: 'Deal 4. Link (Strike): Kindled 2.',
    base: [{ op: 'damage', amount: 4, primary: true }],
    link: { condition: 'Strike', text: 'Kindled 2.', effects: [{ op: 'kindled', amount: 2 }] },
    mutation: {
      name: 'Quickened Brand',
      text: 'Deal 4. Kindled 1.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'kindled', amount: 1 }],
    },
    upgrade: { text: 'Deal 6. Link (Strike): Kindled 2.', base: [{ op: 'damage', amount: 6, primary: true }] },
  },
  {
    id: 'rite_mourners_step', name: 'Mourner’s Step', character: 'bram', rarity: 'rare', cost: 1, tag: 'Guard',
    riteOnly: true,
    // S9d.1-7
    growsWith: { axis: 'momentumSpent', per: 10, amount: 1, cap: 6, appliesTo: 'block' },
    text: 'Gain 4 Block. Link (Guard): gain 2 Momentum.',
    base: [{ op: 'block', amount: 4, primary: true }],
    link: { condition: 'Guard', text: 'Gain 2 Momentum.', effects: [{ op: 'momentum', amount: 2 }] },
    mutation: {
      name: 'Cradled Step',
      text: 'Gain 4 Block. Partner heals 1.',
      base: [{ op: 'block', amount: 4, primary: true }, { op: 'partnerHeal', amount: 1 }],
    },
    upgrade: { text: 'Gain 6 Block. Link (Guard): gain 2 Momentum.', base: [{ op: 'block', amount: 6, primary: true }] },
  },
  {
    id: 'rite_descant', name: 'Descant', character: 'bram', rarity: 'rare', cost: 0, tag: 'Surge',
    riteOnly: true,
    // S9d.1-8: the chain archetype; tiers because linear draw growth on a
    // 0-cost is how card games die.
    growsWith: { axis: 'resonances', tiers: [
      { at: 6, link: { condition: 'Surge', text: 'You and your partner each draw 1.', effects: [{ op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 }] } },
      { at: 14, addBase: [{ op: 'draw', amount: 1 }] },
    ] },
    text: 'Draw 1. Link (Surge): partner draws 1.',
    base: [{ op: 'draw', amount: 1 }],
    link: { condition: 'Surge', text: 'Partner draws 1.', effects: [{ op: 'partnerDraw', amount: 1 }] },
    mutation: {
      name: 'First-Drawn Descant',
      text: 'Draw 2.',
      base: [{ op: 'draw', amount: 2 }],
    },
    upgrade: { text: 'Draw 2. Link (Surge): partner draws 1.', base: [{ op: 'draw', amount: 2 }] },
  },
];

// ---- rite definitions -------------------------------------------------------

export const RITES: RiteDef[] = [
  // Vess, death (the vestment donned)
  { id: 'dr_shroud', role: 'vess', kind: 'death', name: 'Shroud', cardId: 'rite_shroud',
    flavor: 'What is worn over the dead is worn first by the living.',
    text: 'Add Shroud to your deck.' },
  { id: 'dr_votive', role: 'vess', kind: 'death', name: 'Votive', cardId: 'rite_votive',
    flavor: 'A small light, paid for in advance.',
    text: 'Add Votive to your deck.' },
  { id: 'dr_knell', role: 'vess', kind: 'death', name: 'Knell', cardId: 'rite_knell',
    flavor: 'Every bell is a promise about endings.',
    text: 'Add Knell to your deck.' },
  { id: 'dr_vigil', role: 'vess', kind: 'death', name: 'Vigil', cardId: 'rite_vigil',
    flavor: 'Someone must watch. It was always going to be you.',
    text: 'Add Vigil to your deck.' },
  // Bram, death
  { id: 'dr_toll', role: 'bram', kind: 'death', name: 'Toll', cardId: 'rite_toll',
    flavor: 'The crossing has a price. Carry it in your hands.',
    text: 'Add Toll to your deck.' },
  { id: 'dr_pyre_brand', role: 'bram', kind: 'death', name: 'Pyre-Brand', cardId: 'rite_pyre_brand',
    flavor: 'Take a coal from the fire that took everything else.',
    text: 'Add Pyre-Brand to your deck.' },
  { id: 'dr_mourners_step', role: 'bram', kind: 'death', name: 'Mourner’s Step', cardId: 'rite_mourners_step',
    flavor: 'Grief has a gait. Learn it before you need it.',
    text: 'Add Mourner’s Step to your deck.' },
  { id: 'dr_descant', role: 'bram', kind: 'death', name: 'Descant', cardId: 'rite_descant',
    flavor: 'The low line carries the coffin. The high line carries the room.',
    text: 'Add Descant to your deck.' },

  // Vess, birth (the mirror sacrament — S8.1 final directions)
  { id: 'br_quickening', role: 'vess', kind: 'birth', name: 'Quickening',
    flavor: 'What returns through you comes back more alive.',
    text: 'Cards you Reclaim that keep their name arrive upgraded.',
    passives: ['reclaimUpgraded'] },
  // S9c.1 (amended by S9d.A3: birth-passive rows stand, death rows struck):
  // First-Breath 1→2 (oncePerCombat-fenced — not an attrition leak),
  // Cradle-Warden +1→+2 (bump applied in combat.ts). HOLD rows unchanged:
  // Naming-Day, Dowry-Bound, Hearth-Keeper, Quickening (S9b IS its buff).
  { id: 'br_first_breath', role: 'vess', kind: 'birth', name: 'First-Breath',
    flavor: 'The first note of the round is drawn from both lungs.',
    text: 'First Resonance ignition each combat: both players heal 2.',
    hooks: [{ on: 'resonance', oncePerCombat: true, effects: [{ op: 'heal', amount: 2 }, { op: 'partnerHeal', amount: 2 }] }] },
  { id: 'br_cradle_warden', role: 'vess', kind: 'birth', name: 'Cradle-Warden',
    flavor: 'What is built on your work stands taller.',
    text: 'Partner links fired off your cards: +2 to the linked effect.',
    passives: ['cradleWarden'] },
  // Bram, birth
  { id: 'br_hearth_keeper', role: 'bram', kind: 'birth', name: 'Hearth-Keeper',
    flavor: 'A kept fire owes nothing to the night.',
    text: 'Momentum no longer decays at end of turn (carries up to 3).',
    passives: ['momentumCarry3'] },
  { id: 'br_dowry_bound', role: 'bram', kind: 'birth', name: 'Dowry-Bound',
    flavor: 'What the other hand gives, the whole body keeps.',
    text: 'Reclaim a partner’s card: gain 2 Momentum and draw 1.',
    hooks: [{ on: 'reclaim', effects: [{ op: 'momentum', amount: 2 }, { op: 'draw', amount: 1 }] }] },
  { id: 'br_naming_day', role: 'bram', kind: 'birth', name: 'Naming-Day',
    flavor: 'A thing that has been renamed has been claimed.',
    text: 'Your mutated cards’ effects +2.',
    passives: ['namingDay'] },
];

export const RITES_BY_ID: Record<string, RiteDef> = {};
for (const r of RITES) {
  if (RITES_BY_ID[r.id]) throw new Error(`duplicate rite id ${r.id}`);
  if (r.kind === 'death' && !r.cardId) throw new Error(`death rite ${r.id} has no card`);
  if (r.kind === 'birth' && !r.hooks && !r.passives) throw new Error(`birth rite ${r.id} has no effect`);
  RITES_BY_ID[r.id] = r;
}

export function ritesFor(role: 'vess' | 'bram', kind: 'death' | 'birth'): RiteDef[] {
  return RITES.filter((r) => r.role === role && r.kind === kind);
}

/** S9a read-path: the role's rite ids filtered to the run's unlock union.
 *  Absent record or empty/unknown-id result = the FULL pool — the seeded
 *  state unlocks everything, pre-S9a claims carry no field, and a malformed
 *  claim must never brick a mandatory offer. Death offers additionally need
 *  ≥2 options, so a 1-rite pool also falls back. */
export function unlockedRites(
  role: 'vess' | 'bram',
  kind: 'death' | 'birth',
  unlocks?: Record<'vess' | 'bram', { death: string[]; birth: string[] }>,
): string[] {
  const all = ritesFor(role, kind).map((r) => r.id);
  const claimed = unlocks?.[role]?.[kind];
  if (!claimed || claimed.length === 0) return all;
  const pool = all.filter((id) => claimed.includes(id));
  if (pool.length === 0 || (kind === 'death' && pool.length < 2)) return all;
  return pool;
}
