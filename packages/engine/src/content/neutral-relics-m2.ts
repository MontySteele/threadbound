// M2 content: neutral card pool (15) + relic pool (28). Design references:
// §3 Covenant, §4 tags, §5 Thread, §7 Wedding Knife, §9 pool targets;
// M2-B1 (mutations, Hex rebalance: 1 neutral detonator), M2-B2 (relic hooks,
// ≥8 co-op relics), M2-B6 (upgrades deepen the link, not the base numbers),
// M2-A1 (Keep), M2-A2 (Kindled — there is no raw energy op).
//
// Neutral Covenant audit (enforced by test/covenant.test.ts):
// - 8 common / 5 uncommon / 2 rare; every broad tag represented.
// - Standalone-playable bases throughout; links are pure upside.
// - Common/uncommon links read broad tags + 'any' only; 'partner' rare-only.
// - Self-similar (tag X, Link (X)): zero at common; exactly one at uncommon
//   (Linked Shields). Link (any) is not self-similar (M2-A4).
// - Exactly one neutral detonator: Crack the Seal (M2-B1 Hex rebalance).
// - Threadwork cards (gain Thread): Litany of Mending, Tithe of Thread,
//   Two as One — three, per target of 2-3.
// - One Keep card: Patience (M2-A1).
// - Mutations on every common/uncommon (rares Echo unmutated, M2-B1);
//   upgrades on every card, all deepening the link clause (M2-B6).

import { CardDef, RelicDef } from '../types';

// ---------------------------------------------------------------------------
// NEUTRAL CARDS — glue, not build-arounds: slightly under character power.
// ---------------------------------------------------------------------------

export const NEUTRAL_CARDS: CardDef[] = [
  // --- Commons (8) ---------------------------------------------------------
  {
    id: 'splinter', name: 'Splinter', character: 'neutral', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 5.',
    base: [{ op: 'damage', amount: 5, primary: true }],
    link: { condition: 'Hex', text: 'Apply 1 Hex.', effects: [{ op: 'hex', amount: 1 }] },
    mutation: {
      name: 'Pale Splinter', text: 'Deal 3. Draw 1.',
      base: [{ op: 'damage', amount: 3, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Hex', text: 'Apply 3 Hex.', effects: [{ op: 'hex', amount: 3 }] },
    },
  },
  {
    id: 'shared_burden', name: 'Shared Burden', character: 'neutral', rarity: 'common', cost: 1, tag: 'Guard',
    text: 'Gain 5 Block.',
    base: [{ op: 'block', amount: 5, primary: true }],
    link: { condition: 'Strike', text: 'Your partner gains 3 Block.', effects: [{ op: 'partnerBlock', amount: 3 }] },
    mutation: {
      name: 'Hold the Seam', text: 'Gain 3 Block. Draw 1.',
      base: [{ op: 'block', amount: 3, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Strike', text: 'Your partner gains 4 Block.', effects: [{ op: 'partnerBlock', amount: 4 }] },
    },
  },
  {
    id: 'tallow_mark', name: 'Tallow Mark', character: 'neutral', rarity: 'common', cost: 0, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 2 Hex.',
    base: [{ op: 'hex', amount: 2, primary: true }],
    link: { condition: 'Guard', text: 'Also apply 1 Weak.', effects: [{ op: 'weak', amount: 1 }] },
    mutation: {
      name: 'Guttering Mark', text: 'Apply 1 Hex. Draw 1.',
      base: [{ op: 'hex', amount: 1, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Guard', text: 'Also apply 1 Weak and 1 Vulnerable.', effects: [{ op: 'weak', amount: 1 }, { op: 'vulnerable', amount: 1 }] },
    },
  },
  {
    // OQ#30 (S5.4): designer's ruling direction — the free self-replacing
    // chain filler now Exhausts (once per combat).
    id: 'stolen_breath', name: 'Stolen Breath', character: 'neutral', rarity: 'common', cost: 0, tag: 'Surge', exhaust: true,
    text: 'Draw 1. Exhaust.',
    base: [{ op: 'draw', amount: 1 }],
    link: { condition: 'Rite', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] }, // S5.2 Table B: back to Rite (pre-§4 condition)
    mutation: {
      name: 'Caught Breath', text: 'Draw 1. Gain 2 Block.', // OQ#47: renamed from "Held Breath" (collided with Bram's uncommon)
      base: [{ op: 'draw', amount: 1 }, { op: 'block', amount: 2 }],
    },
    // PT2 fix: the upgrade was a byte-identical copy of the base link — a
    // no-op "+". Smallest real deepening; the card's overall power level is
    // OQ#30's call, so the base stays untouched.
    upgrade: {
      text: 'Draw 1. Link (Rite): Gain Kindled 2. Exhaust.',
      link: { condition: 'Rite', text: 'Gain Kindled 2.', effects: [{ op: 'kindled', amount: 2 }] },
    },
  },
  {
    id: 'litany_of_mending', name: 'Litany of Mending', character: 'neutral', rarity: 'common', cost: 1, tag: 'Rite',
    text: 'Gain 1 Thread.',
    base: [{ op: 'thread', amount: 1 }],
    link: { condition: 'Guard', text: 'You and your partner each gain 2 Block.', effects: [{ op: 'block', amount: 2 }, { op: 'partnerBlock', amount: 2 }] },
    mutation: {
      name: 'Murmured Litany', text: 'Gain 2 Block. Draw 1.',
      base: [{ op: 'block', amount: 2 }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Guard', text: 'You and your partner each gain 3 Block.', effects: [{ op: 'block', amount: 3 }, { op: 'partnerBlock', amount: 3 }] },
    },
  },
  {
    id: 'twinned_cut', name: 'Twinned Cut', character: 'neutral', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 6.',
    base: [{ op: 'damage', amount: 6, primary: true }],
    link: { condition: 'Surge', text: 'Deal 3 more.', effects: [{ op: 'damage', amount: 3 }] },
    mutation: {
      name: 'Half-Twinned Cut', text: 'Deal 4. Draw 1.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Surge', text: 'Deal 4 more.', effects: [{ op: 'damage', amount: 4 }] },
    },
  },
  {
    id: 'candle_watch', name: 'Candle Watch', character: 'neutral', rarity: 'common', cost: 1, tag: 'Guard',
    text: 'Gain 4 Block. Your partner gains 2 Block.',
    base: [{ op: 'block', amount: 4, primary: true }, { op: 'partnerBlock', amount: 2 }],
    link: { condition: 'Strike', text: 'Gain 3 more Block.', effects: [{ op: 'block', amount: 3 }] }, // §4: widened from Rite
    mutation: {
      name: 'Lone Candle', text: 'Gain 3 Block. Draw 1.',
      base: [{ op: 'block', amount: 3, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Strike', text: 'You and your partner each gain 3 more Block.', effects: [{ op: 'block', amount: 3 }, { op: 'partnerBlock', amount: 3 }] },
    },
  },
  {
    id: 'patience', name: 'Patience', character: 'neutral', rarity: 'common', cost: 0, tag: 'Surge',
    keep: true,
    text: 'Gain Kindled 1. Keep.',
    base: [{ op: 'kindled', amount: 1 }],
    link: { condition: 'Guard', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    mutation: {
      name: 'Worn Patience', text: 'Draw 1. Keep.',
      base: [{ op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Guard', text: 'Draw 1 and gain 1 Block.', effects: [{ op: 'draw', amount: 1 }, { op: 'block', amount: 1 }] },
    },
  },

  // --- Uncommons (5) -------------------------------------------------------
  {
    // The one neutral detonator (M2-B1 Hex rebalance).
    id: 'crack_the_seal', name: 'Crack the Seal', character: 'neutral', rarity: 'uncommon', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 4.',
    base: [{ op: 'damage', amount: 4, primary: true }],
    link: { condition: 'Hex', text: 'Detonate up to 2 Hexes on the target.', effects: [{ op: 'detonate', max: 2 }] },
    mutation: {
      name: 'Crack the Wax', text: 'Deal 3. Draw 1.',
      base: [{ op: 'damage', amount: 3, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Hex', text: 'Detonate up to 4 Hexes on the target.', effects: [{ op: 'detonate', max: 4 }] },
    },
  },
  {
    id: 'tithe_of_thread', name: 'Tithe of Thread', character: 'neutral', rarity: 'uncommon', cost: 1, tag: 'Rite',
    text: 'Gain 2 Thread.',
    base: [{ op: 'thread', amount: 2 }],
    link: { condition: 'Surge', text: 'Draw 1. Your partner draws 1.', effects: [{ op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 }] },
    mutation: {
      name: 'Lean Tithe', text: 'Gain 1 Thread. Draw 1.',
      base: [{ op: 'thread', amount: 1 }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Surge', text: 'Draw 1. Your partner draws 1.', effects: [{ op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 }] },
    },
  },
  {
    // The single self-similar uncommon allowed in the neutral pool (§2.3).
    id: 'linked_shields', name: 'Linked Shields', character: 'neutral', rarity: 'uncommon', cost: 2, tag: 'Guard',
    text: 'Gain 7 Block.',
    base: [{ op: 'block', amount: 7, primary: true }],
    link: { condition: 'Guard', text: 'Your partner gains 6 Block.', effects: [{ op: 'partnerBlock', amount: 6 }] }, // OQ#34: 4 → 6 (co-op half is the identity)
    mutation: {
      name: 'Unlinked Shield', text: 'Gain 5 Block. Draw 1.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Guard', text: 'Your partner gains 7 Block.', effects: [{ op: 'partnerBlock', amount: 7 }] },
    },
  },
  {
    id: 'quick_words', name: 'Quick Words', character: 'neutral', rarity: 'uncommon', cost: 1, tag: 'Surge',
    text: 'Draw 2.',
    base: [{ op: 'draw', amount: 2 }],
    link: { condition: 'Strike', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] },
    mutation: {
      name: 'Quiet Words', text: 'Draw 1. Gain Kindled 1.',
      base: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Strike', text: 'Gain Kindled 1 and your partner draws 1.', effects: [{ op: 'kindled', amount: 1 }, { op: 'partnerDraw', amount: 1 }] },
    },
  },
  {
    id: 'shared_sigil', name: 'Shared Sigil', character: 'neutral', rarity: 'uncommon', cost: 1, tag: 'Hex',
    text: 'Apply 2 Hex to ALL enemies.',
    base: [{ op: 'hexAll', amount: 2, primary: true }],
    link: { condition: 'Guard', text: 'Your partner draws 1.', effects: [{ op: 'partnerDraw', amount: 1 }] }, // §4: widened from Rite
    mutation: {
      name: 'Split Sigil', text: 'Apply 1 Hex to ALL enemies. Draw 1.',
      base: [{ op: 'hexAll', amount: 1, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      link: { condition: 'Guard', text: 'Your partner draws 1 and gains 2 Block.', effects: [{ op: 'partnerDraw', amount: 1 }, { op: 'partnerBlock', amount: 2 }] },
    },
  },

  // --- Rares (2) — 'partner' links live only here (§2.2). Rares Echo
  // unmutated (M2-B1), so no mutation entries. -------------------------------
  {
    id: 'two_as_one', name: 'Two as One', character: 'neutral', rarity: 'rare', cost: 2, tag: 'Rite',
    text: 'Gain 2 Thread. You and your partner each gain 3 Block.',
    base: [{ op: 'thread', amount: 2 }, { op: 'block', amount: 3, primary: true }, { op: 'partnerBlock', amount: 3 }],
    link: {
      condition: 'partner',
      text: 'Link (Partner’s card): you and your partner each gain Kindled 1.',
      effects: [{ op: 'kindled', amount: 1 }, { op: 'partnerKindled', amount: 1 }],
    },
    upgrade: {
      link: {
        condition: 'partner',
        text: 'Link (Partner’s card): you and your partner each gain Kindled 1 and draw 1.',
        effects: [
          { op: 'kindled', amount: 1 }, { op: 'partnerKindled', amount: 1 },
          { op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 },
        ],
      },
    },
  },
  {
    id: 'crossing_blow', name: 'Crossing Blow', character: 'neutral', rarity: 'rare', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 9.',
    base: [{ op: 'damage', amount: 9, primary: true }],
    link: {
      condition: 'partner',
      text: 'Link (Partner’s card): deal 14 instead and your partner gains 4 Block.',
      effects: [{ op: 'damage', amount: 14, primary: true }, { op: 'partnerBlock', amount: 4 }],
      replace: true,
    },
    upgrade: {
      link: {
        condition: 'partner',
        text: 'Link (Partner’s card): deal 18 instead and your partner gains 4 Block.',
        effects: [{ op: 'damage', amount: 18, primary: true }, { op: 'partnerBlock', amount: 4 }],
        replace: true,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// RELICS — 28 total, ≥8 co-op/Thread-specific (M2-B2). Each PassiveId appears
// on at most one relic; momentumNoHalve belongs to Wildfire Heart (a card).
// Text is the UI's only window into a relic — it must match the hooks exactly.
// ---------------------------------------------------------------------------

export const RELICS: RelicDef[] = [
  // --- Co-op / Thread relics (13) ------------------------------------------
  {
    id: 'wedding_knife', name: 'Wedding Knife',
    text: 'Once per rest site, you and your partner may permanently trade one card each. Both must confirm.',
    coop: true,
    passives: ['wedding_knife'],
  },
  {
    id: 'braided_censer', name: 'Braided Censer',
    text: 'Whenever Resonance ignites, you and your partner each heal 2.',
    coop: true,
    hooks: [{ on: 'resonance', effects: [{ op: 'heal', amount: 2 }, { op: 'partnerHeal', amount: 2 }] }],
  },
  {
    id: 'chord_of_the_choir', name: 'Chord of the Choir',
    text: 'Whenever Resonance ignites, draw 1 and gain Kindled 1.',
    coop: true,
    hooks: [{ on: 'resonance', effects: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }] }],
  },
  {
    id: 'knotted_votive', name: 'Knotted Votive',
    text: 'Whenever the Thread frays, you and your partner each gain 3 Block.',
    coop: true,
    hooks: [{ on: 'fray', effects: [{ op: 'block', amount: 3 }, { op: 'partnerBlock', amount: 3 }] }],
  },
  {
    id: 'scar_votive', name: 'Scar Votive',
    text: 'Whenever the Thread frays, heal 3.',
    coop: true,
    hooks: [{ on: 'fray', effects: [{ op: 'heal', amount: 3 }] }],
  },
  {
    id: 'pulsekeepers_ring', name: 'Pulsekeeper’s Ring',
    // §14.13 (OQ#27): the flat cost break literally doubled Pulses per
    // Thread — ruled overpowered. Now a run-persistent charge counter on the
    // owner (PlayerState.ringPulses, engine-special-cased in resolveTurn):
    // every 3rd Pulse costs 1. If Playtest 2 reads it dead, the pre-agreed
    // (b) escalation is "every third Pulse FREE".
    text: 'Every third Pulse costs 1 Thread. The Ring keeps count.',
    coop: true,
  },
  {
    id: 'threadspool_reliquary', name: 'Threadspool Reliquary',
    text: 'The Thread regenerates 1 additional point at the start of each turn.',
    coop: true,
    passives: ['threadRegenPlusOne'],
  },
  {
    id: 'bridegrooms_knot', name: 'Bridegroom’s Knot',
    text: 'Begin each combat with 3 additional Thread.',
    coop: true,
    hooks: [{ on: 'combatStart', effects: [{ op: 'thread', amount: 3 }] }],
  },
  {
    id: 'loom_of_two_hands', name: 'Loom of Two Hands',
    // PT2 ruling (OQ#29, 2026-06-12): per-link was +3-5 Thread/turn at live
    // link rates — dissolved the §14.12 economy. Once per turn, rare weight.
    text: 'The first time one of your links fires each turn, gain 1 Thread.',
    coop: true,
    rare: true,
    hooks: [{ on: 'linkFired', oncePerTurn: true, effects: [{ op: 'thread', amount: 1 }] }],
  },
  {
    id: 'steadfast_icon', name: 'Steadfast Icon',
    text: 'The first Fray each combat is absorbed.',
    coop: true,
    passives: ['startCombatFrayImmune'],
  },
  {
    id: 'twin_phylactery', name: 'Twin Phylactery',
    text: 'At the start of your turn, your partner gains 1 Block.',
    coop: true,
    hooks: [{ on: 'turnStart', effects: [{ op: 'partnerBlock', amount: 1 }] }],
  },
  {
    id: 'covetous_psalter', name: 'Covetous Psalter',
    text: 'You may hold 3 Covet charges.',
    coop: true,
    passives: ['covetMaxPlusOne'],
  },
  {
    id: 'tithing_bowl', name: 'Tithing Bowl',
    text: 'Whenever you Covet a card, heal 3.',
    coop: true,
    hooks: [{ on: 'covet', effects: [{ op: 'heal', amount: 3 }] }],
  },

  // --- Solo relics (15) -----------------------------------------------------
  {
    id: 'ember_coal', name: 'Ember Coal',
    text: 'Begin each combat with 3 Momentum.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'momentum', amount: 3 }] }],
  },
  {
    id: 'whetstone_psalm', name: 'Whetstone Psalm',
    text: 'At the start of your turn, gain 1 Momentum.',
    hooks: [{ on: 'turnStart', effects: [{ op: 'momentum', amount: 1 }] }],
  },
  {
    id: 'hungry_whetstone', name: 'Hungry Whetstone',
    text: 'Whenever one of your links fires, gain 1 Momentum.',
    hooks: [{ on: 'linkFired', effects: [{ op: 'momentum', amount: 1 }] }],
  },
  {
    id: 'vigil_lamp', name: 'Vigil Lamp',
    text: 'Whenever one of your links fires, gain 1 Block.',
    hooks: [{ on: 'linkFired', effects: [{ op: 'block', amount: 1 }] }],
  },
  {
    id: 'cracked_bell', name: 'Cracked Bell',
    // PT2 clarity: it rings once per BURST (detonation event), any size —
    // not per stack, not once per combat
    text: 'Whenever Hexes detonate (once per burst, any size), deal 2 damage to ALL enemies.',
    hooks: [{ on: 'detonate', effects: [{ op: 'damageAll', amount: 2 }] }],
  },
  {
    id: 'ashen_censer', name: 'Ashen Censer',
    text: 'Whenever Hexes detonate, gain 3 Block.',
    hooks: [{ on: 'detonate', effects: [{ op: 'block', amount: 3 }] }],
  },
  {
    id: 'needlecase_of_saint_morrow', name: 'Needlecase of Saint Morrow',
    text: 'At the start of each combat, apply 3 Hex to ALL enemies.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'hexAll', amount: 3 }] }],
  },
  {
    id: 'hexwrought_locket', name: 'Hexwrought Locket',
    text: 'At the start of your turn, apply 1 Hex to ALL enemies.',
    hooks: [{ on: 'turnStart', effects: [{ op: 'hexAll', amount: 1 }] }],
  },
  {
    id: 'sealed_reliquary', name: 'Sealed Reliquary',
    text: 'Begin each combat with 6 Block.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'block', amount: 6 }] }],
  },
  {
    id: 'iron_girdle', name: 'Iron Girdle',
    text: 'At the start of your turn, gain 2 Block.',
    hooks: [{ on: 'turnStart', effects: [{ op: 'block', amount: 2 }] }],
  },
  {
    id: 'patient_bookmark', name: 'Patient Bookmark',
    text: 'Retain 1 card of your choice at the end of each turn.',
    passives: ['handRetainOne'],
  },
  {
    id: 'kindling_bundle', name: 'Kindling Bundle',
    text: 'Begin each combat Kindled 1.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'kindled', amount: 1 }] }],
  },
  {
    id: 'drawn_curtain', name: 'Drawn Curtain',
    text: 'Draw 2 additional cards at the start of each combat.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'draw', amount: 2 }] }],
  },
  {
    id: 'census_of_wounds', name: 'Census of Wounds',
    text: 'At the start of each combat, heal 3.',
    hooks: [{ on: 'combatStart', effects: [{ op: 'heal', amount: 3 }] }],
  },
  {
    id: 'saints_marrow', name: 'Saint’s Marrow',
    text: 'When taken, heal 8.',
    onPickup: [{ op: 'heal', amount: 8 }],
  },
];
