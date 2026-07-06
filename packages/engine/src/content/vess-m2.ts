// Vess M2 expansion (M2-B1): 35 new cards (15C/13U/7R) bringing her pool to
// 55 (25C/20U/10R), plus mutation/upgrade overlays for the 20 M1 Vess cards.
//
// Covenant notes (§3, §2.3):
// - Every base effect stands alone; links are pure upside.
// - Zero self-similar commons. ONE new self-similar uncommon (braided_malice);
//   with M1's Inheritance the pool holds 2 of the ≤4 bound.
// - 'partner' conditions appear only on rares. Stun appears only on a rare.
// - Combined commons per broad tag: Hex 8, Strike 5, Guard 5, Surge 4, Rite 3.
// - Hex share of the 55-card pool: 18 cards (~33%), per §9 identity.
// - Detonation access widened (M2-B1 Hex rebalance): unpicking (link),
//   pale_unmaking, rend_the_weave, funeral_lace.
// - Keep (M2-A1) on exactly two Surge cards: threadlight, patient_breath.
// - Kindled (M2-A2) is the only energy grant used.

import { CardDef } from '../types';

export const VESS_M2_CARDS: CardDef[] = [
  // -------------------------------------------------------------------------
  // COMMONS (15) — Hex ×5, Strike ×3, Guard ×3, Surge ×2, Rite ×2
  // -------------------------------------------------------------------------
  {
    id: 'hollow_seam', name: 'Hollow Seam', character: 'vess', rarity: 'common', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex.',
    base: [{ op: 'hex', amount: 3, primary: true }],
    link: { condition: 'Strike', text: 'Apply 2 more.', effects: [{ op: 'hex', amount: 2 }] },
    mutation: {
      name: 'Cinder Seam', text: 'Apply 2 Hex. Gain 2 Momentum.',
      base: [{ op: 'hex', amount: 2, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Apply 3 Hex. Link (Strike): apply 3 more.',
      link: { condition: 'Strike', text: 'Apply 3 more.', effects: [{ op: 'hex', amount: 3 }] },
    },
  },
  {
    id: 'graverust', name: 'Graverust', character: 'vess', rarity: 'common', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 2 Hex. Apply 1 Weak.',
    base: [{ op: 'hex', amount: 2, primary: true }, { op: 'weak', amount: 1 }],
    link: { condition: 'Guard', text: 'Apply 2 more Hex.', effects: [{ op: 'hex', amount: 2 }] },
    mutation: {
      name: 'Forgerust', text: 'Apply 2 Hex. Deal 3.',
      base: [{ op: 'hex', amount: 2, primary: true }, { op: 'damage', amount: 3 }],
    },
    upgrade: {
      text: 'Apply 2 Hex. Apply 1 Weak. Link (Guard): apply 2 more Hex and 1 more Weak.',
      link: { condition: 'Guard', text: 'Apply 2 more Hex and 1 more Weak.', effects: [{ op: 'hex', amount: 2 }, { op: 'weak', amount: 1 }] },
    },
  },
  {
    id: 'seeding_curse', name: 'Seeding Curse', character: 'vess', rarity: 'common', cost: 0, tag: 'Hex',
    text: 'Apply 1 Hex to ALL enemies.',
    base: [{ op: 'hexAll', amount: 1, primary: true }],
    link: { condition: 'Surge', text: 'Apply 2 instead.', effects: [{ op: 'hexAll', amount: 2, primary: true }], replace: true },
    mutation: {
      name: 'Ash Scatter', text: 'Deal 2 to ALL enemies.',
      base: [{ op: 'damageAll', amount: 2, primary: true }],
    },
    upgrade: {
      text: 'Apply 1 Hex to ALL enemies. Link (Surge): apply 2 instead and draw 1.',
      link: { condition: 'Surge', text: 'Apply 2 instead and draw 1.', effects: [{ op: 'hexAll', amount: 2, primary: true }, { op: 'draw', amount: 1 }], replace: true },
    },
  },
  {
    id: 'spite_stitch', name: 'Spite-Stitch', character: 'vess', rarity: 'common', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex.',
    base: [{ op: 'hex', amount: 3, primary: true }],
    link: { condition: 'Guard', text: 'Gain 3 Block.', effects: [{ op: 'block', amount: 3 }] }, // §4: widened from Rite
    mutation: {
      name: 'Grudge Iron', text: 'Deal 4. Apply 1 Hex.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 1 }],
    },
    upgrade: {
      text: 'Apply 3 Hex. Link (Guard): gain 3 Block and 1 Thread.',
      link: { condition: 'Guard', text: 'Gain 3 Block and 1 Thread.', effects: [{ op: 'block', amount: 3 }, { op: 'thread', amount: 1 }] },
    },
  },
  {
    id: 'thousand_pins', name: 'Thousand Pins', character: 'vess', rarity: 'common', cost: 2, tag: 'Hex',
    text: 'Apply 3 Hex to ALL enemies.',
    base: [{ op: 'hexAll', amount: 3, primary: true }],
    link: { condition: 'Strike', text: 'Deal 2 to ALL enemies.', effects: [{ op: 'damageAll', amount: 2 }] },
    mutation: {
      name: 'Hail of Knuckles', text: 'Deal 3 to ALL enemies. Gain 2 Momentum.',
      base: [{ op: 'damageAll', amount: 3, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Apply 3 Hex to ALL enemies. Link (Strike): deal 3 to ALL enemies.',
      link: { condition: 'Strike', text: 'Deal 3 to ALL enemies.', effects: [{ op: 'damageAll', amount: 3 }] },
    },
  },
  {
    id: 'cinch', name: 'Cinch', character: 'vess', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 6.',
    base: [{ op: 'damage', amount: 6, primary: true }],
    link: { condition: 'Guard', text: 'Gain 4 Block.', effects: [{ op: 'block', amount: 4 }] },
    mutation: {
      name: 'Cinder Cinch', text: 'Deal 6. Gain 1 Momentum.',
      base: [{ op: 'damage', amount: 6, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 5
      text: 'Deal 6. Link (Guard): gain 6 Block.',
      link: { condition: 'Guard', text: 'Gain 6 Block.', effects: [{ op: 'block', amount: 6 }] },
    },
  },
  {
    id: 'unpicking', name: 'Unpicking', character: 'vess', rarity: 'uncommon', cost: 0, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 3.',
    base: [{ op: 'damage', amount: 3, primary: true }],
    link: { condition: 'Hex', text: 'Detonate 1 Hex on the target.', effects: [{ op: 'detonate', max: 1 }] },
    mutation: {
      name: 'Sparkbite', text: 'Deal 3. Link (Hex): detonate up to 2 Hexes on the target.',
      base: [{ op: 'damage', amount: 3, primary: true }],
      link: { condition: 'Hex', text: 'Detonate up to 2 Hexes on the target.', effects: [{ op: 'detonate', max: 2 }] },
    },
    upgrade: {
      text: 'Deal 3. Link (Hex): detonate up to 2 Hexes on the target.',
      link: { condition: 'Hex', text: 'Detonate up to 2 Hexes on the target.', effects: [{ op: 'detonate', max: 2 }] },
    },
  },
  {
    id: 'seam_split', name: 'Seam-Split', character: 'vess', rarity: 'common', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 9.',
    base: [{ op: 'damage', amount: 9, primary: true }],
    link: { condition: 'Surge', text: 'Deal 4 more.', effects: [{ op: 'damage', amount: 4 }] },
    mutation: {
      name: 'Hammered Seam', text: 'Deal 9. Gain 2 Momentum.',
      base: [{ op: 'damage', amount: 9, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 9. Link (Surge): deal 6 more.',
      link: { condition: 'Surge', text: 'Deal 6 more.', effects: [{ op: 'damage', amount: 6 }] },
    },
  },
  {
    id: 'burr_shell', name: 'Burr-Shell', character: 'vess', rarity: 'common', cost: 1, tag: 'Guard',
    text: 'Gain 5 Block.',
    base: [{ op: 'block', amount: 5, primary: true }],
    link: { condition: 'Surge', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    mutation: {
      name: 'Ember Shell', text: 'Gain 5 Block. Gain 1 Momentum.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      text: 'Gain 5 Block. Link (Surge): gain 2 more and draw 1.',
      link: { condition: 'Surge', text: 'Gain 2 more and draw 1.', effects: [{ op: 'block', amount: 2 }, { op: 'draw', amount: 1 }] },
    },
  },
  {
    id: 'needle_wall', name: 'Needle Wall', character: 'vess', rarity: 'common', cost: 2, tag: 'Guard',
    needsTarget: true,
    text: 'Gain 8 Block. Bind the target enemy to you.',
    base: [{ op: 'block', amount: 8, primary: true }, { op: 'taunt' }],
    link: { condition: 'Hex', text: 'Apply 2 Hex to it.', effects: [{ op: 'hex', amount: 2 }] },
    mutation: {
      name: 'Brawler’s Wall', text: 'Gain 8 Block. Bind the target enemy to you. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 8, primary: true }, { op: 'taunt' }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      // S9b.3 row 6: binding-architect lean
      text: 'Gain 8 Block. Bind the target enemy to you. Link (Hex): apply 2 Hex to it and gain 3 Block.',
      link: { condition: 'Hex', text: 'Apply 2 Hex to it and gain 3 Block.', effects: [{ op: 'hex', amount: 2 }, { op: 'block', amount: 3 }] },
    },
  },
  {
    id: 'quiet_mending', name: 'Quiet Mending', character: 'vess', rarity: 'common', cost: 1, tag: 'Guard',
    // S9d.A1 (ruled option a): the pool's only repeatable heal becomes a
    // once-per-combat co-op ritual — it exhausts, and the S7.6 interaction
    // (partner Reclaims it from the exhaust pile as an Echo) is INTENDED.
    exhaust: true,
    text: 'Gain 6 Block.',
    base: [{ op: 'block', amount: 6, primary: true }],
    link: { condition: 'Surge', text: 'Heal 3.', effects: [{ op: 'heal', amount: 3 }] }, // §4: widened from Rite
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Rough Comfort'
      name: 'Swaddled Comfort', text: 'Gain 6 Block. Draw 1.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 7 per S9d.A1: soul-thread texture, still exhausting
      text: 'Gain 6 Block. Link (Surge): heal 3. Your partner heals 2.',
      link: { condition: 'Surge', text: 'Heal 3. Your partner heals 2.', effects: [{ op: 'heal', amount: 3 }, { op: 'partnerHeal', amount: 2 }] },
    },
  },
  {
    id: 'threadlight', name: 'Threadlight', character: 'vess', rarity: 'common', cost: 0, tag: 'Surge',
    keep: true,
    text: 'Gain Kindled 1. Keep.',
    base: [{ op: 'kindled', amount: 1 }],
    link: { condition: 'Guard', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    mutation: {
      name: 'Coal-light', text: 'Gain Kindled 1. Gain 1 Momentum. Keep.',
      base: [{ op: 'kindled', amount: 1 }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      text: 'Gain Kindled 1. Keep. Link (Guard): draw 1 and gain Kindled 1 more.',
      link: { condition: 'Guard', text: 'Draw 1 and gain Kindled 1 more.', effects: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }] },
    },
  },
  {
    id: 'gathering_slack', name: 'Gathering Slack', character: 'vess', rarity: 'common', cost: 1, tag: 'Surge',
    text: 'Draw 1. Gain Kindled 1.',
    base: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }],
    link: { condition: 'Hex', text: 'Draw 2 instead.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 1 }], replace: true },
    mutation: {
      name: 'Slipped Breath', text: 'Draw 1. Gain 2 Momentum.', // OQ#36: renamed from "Stolen Breath" (collided with the neutral common)
      base: [{ op: 'draw', amount: 1 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      // S9b.3 row 8 — full replace list preserved (draw + kindled + the rider)
      text: 'Draw 1. Gain Kindled 1. Link (Hex): draw 2 and gain 1 Momentum instead.',
      link: { condition: 'Hex', text: 'Draw 2 and gain 1 Momentum instead.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 1 }, { op: 'momentum', amount: 1 }], replace: true },
    },
  },
  {
    id: 'small_rites', name: 'Small Rites', character: 'vess', rarity: 'common', cost: 1, tag: 'Rite',
    text: 'Gain 1 Thread. Draw 1.',
    base: [{ op: 'thread', amount: 1 }, { op: 'draw', amount: 1 }],
    link: { condition: 'Hex', text: 'Apply 1 Hex to ALL enemies.', effects: [{ op: 'hexAll', amount: 1 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Ember Rites'
      name: 'Hearth Rites', text: 'Gain 1 Thread. Gain 2 Momentum.',
      base: [{ op: 'thread', amount: 1 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 1 Thread. Draw 1. Link (Hex): apply 2 Hex to ALL enemies.',
      link: { condition: 'Hex', text: 'Apply 2 Hex to ALL enemies.', effects: [{ op: 'hexAll', amount: 2 }] },
    },
  },
  {
    id: 'waxbound_oath', name: 'Waxbound Oath', character: 'vess', rarity: 'common', cost: 1, tag: 'Rite',
    text: 'Gain 3 Block. Gain 1 Thread.',
    base: [{ op: 'block', amount: 3, primary: true }, { op: 'thread', amount: 1 }],
    link: { condition: 'Surge', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] },
    mutation: {
      name: 'Oath of Ash', text: 'Gain 3 Block. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 3, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 3 Block. Gain 1 Thread. Link (Surge): gain Kindled 1 and your partner gains 3 Block.',
      link: { condition: 'Surge', text: 'Gain Kindled 1 and your partner gains 3 Block.', effects: [{ op: 'kindled', amount: 1 }, { op: 'partnerBlock', amount: 3 }] },
    },
  },

  // -------------------------------------------------------------------------
  // UNCOMMONS (13) — Hex ×5, Strike ×2, Guard ×2, Surge ×2, Rite ×2
  // Self-similar here: braided_malice only (pool total 2 of ≤4).
  // -------------------------------------------------------------------------
  {
    id: 'festering_knot', name: 'Festering Knot', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 5 Hex.',
    base: [{ op: 'hex', amount: 5, primary: true }],
    link: { condition: 'Guard', text: 'Apply 2 Weak.', effects: [{ op: 'weak', amount: 2 }] },
    mutation: {
      name: 'Scalding Knot', text: 'Apply 3 Hex. Gain 3 Momentum.',
      base: [{ op: 'hex', amount: 3, primary: true }, { op: 'momentum', amount: 3 }],
    },
    upgrade: {
      // S9b.3 row 9
      text: 'Apply 5 Hex. Link (Guard): apply 3 Weak.',
      link: { condition: 'Guard', text: 'Apply 3 Weak.', effects: [{ op: 'weak', amount: 3 }] },
    },
  },
  {
    id: 'braided_malice', name: 'Braided Malice', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex.',
    base: [{ op: 'hex', amount: 3, primary: true }],
    link: { condition: 'Hex', text: 'Double the target’s Hex (max +6).', effects: [{ op: 'doubleHex' }] },
    mutation: {
      name: 'Braided Fury', text: 'Apply 2 Hex. Gain 2 Momentum. Draw 1.',
      base: [{ op: 'hex', amount: 2, primary: true }, { op: 'momentum', amount: 2 }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      text: 'Apply 3 Hex. Link (Hex): double the target’s Hex (max +6), then apply 2 more.',
      link: { condition: 'Hex', text: 'Double the target’s Hex (max +6), then apply 2 more.', effects: [{ op: 'doubleHex' }, { op: 'hex', amount: 2 }] },
    },
  },
  {
    id: 'carrion_lace', name: 'Carrion Lace', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 4 Hex. Apply 1 Vulnerable.',
    base: [{ op: 'hex', amount: 4, primary: true }, { op: 'vulnerable', amount: 1 }],
    link: { condition: 'Strike', text: 'Deal 4.', effects: [{ op: 'damage', amount: 4 }] },
    mutation: {
      name: 'Carrion Brand', text: 'Deal 6. Apply 1 Vulnerable.',
      base: [{ op: 'damage', amount: 6, primary: true }, { op: 'vulnerable', amount: 1 }],
    },
    upgrade: {
      text: 'Apply 4 Hex. Apply 1 Vulnerable. Link (Strike): deal 5.',
      link: { condition: 'Strike', text: 'Deal 5.', effects: [{ op: 'damage', amount: 5 }] },
    },
  },
  {
    id: 'inkwell_curse', name: 'Inkwell Curse', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 2 Hex. Draw 1.',
    base: [{ op: 'hex', amount: 2, primary: true }, { op: 'draw', amount: 1 }],
    link: { condition: 'Surge', text: 'Apply 2 more Hex.', effects: [{ op: 'hex', amount: 2 }] },
    mutation: {
      name: 'Soot Inkwell', text: 'Apply 1 Hex. Draw 2.',
      base: [{ op: 'hex', amount: 1, primary: true }, { op: 'draw', amount: 2 }],
    },
    upgrade: {
      text: 'Apply 2 Hex. Draw 1. Link (Surge): apply 3 more Hex.',
      link: { condition: 'Surge', text: 'Apply 3 more Hex.', effects: [{ op: 'hex', amount: 3 }] },
    },
  },
  {
    id: 'pale_unmaking', name: 'Pale Unmaking', character: 'vess', rarity: 'rare', cost: 2, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex, then detonate up to 3 Hexes on the target.',
    base: [{ op: 'hex', amount: 3, primary: true }, { op: 'detonate', max: 3 }],
    link: { condition: 'Strike', text: 'Detonate ALL Hexes on the target instead.', effects: [{ op: 'hex', amount: 3, primary: true }, { op: 'detonate' }], replace: true },
    mutation: {
      name: 'Red Unmaking', text: 'Deal 4, then detonate up to 3 Hexes on the target.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'detonate', max: 3 }],
    },
    upgrade: {
      // S9b.3 row 10 (S9b.0-3 ruling): the flexible detonator cheapens —
      // battery watches Hex damage share (§14.10 band 25–45%)
      cost: 1,
      text: 'Apply 3 Hex, then detonate up to 3 Hexes on the target. Link (Strike): detonate ALL Hexes on the target instead.',
      link: { condition: 'Strike', text: 'Detonate ALL Hexes on the target instead.', effects: [{ op: 'hex', amount: 3, primary: true }, { op: 'detonate' }], replace: true },
    },
  },
  {
    id: 'rend_the_weave', name: 'Rend the Weave', character: 'vess', rarity: 'rare', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 8.',
    base: [{ op: 'damage', amount: 8, primary: true }],
    link: { condition: 'Hex', text: 'Detonate all Hexes on the target.', effects: [{ op: 'detonate' }] },
    mutation: {
      name: 'Rend Again', text: 'Deal 8. Gain 2 Momentum. Link (Hex): detonate all Hexes on the target.',
      base: [{ op: 'damage', amount: 8, primary: true }, { op: 'momentum', amount: 2 }],
      link: { condition: 'Hex', text: 'Detonate all Hexes on the target.', effects: [{ op: 'detonate' }] },
    },
    upgrade: {
      // S9b.3 row 11 — mirrors rendcall's authored upgrade
      text: 'Deal 8. Link (Hex): detonate all Hexes on the target and gain 2 Momentum.',
      link: { condition: 'Hex', text: 'Detonate all Hexes on the target and gain 2 Momentum.', effects: [{ op: 'detonate' }, { op: 'momentum', amount: 2 }] },
    },
  },
  {
    id: 'measured_cut', name: 'Measured Cut', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 6.',
    base: [{ op: 'damage', amount: 6, primary: true }],
    link: { condition: 'Rite', text: 'Deal 6 again.', effects: [{ op: 'damage', amount: 6 }] },
    mutation: {
      name: 'Wild Cut', text: 'Deal 7. Gain 1 Momentum.',
      base: [{ op: 'damage', amount: 7, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 12: base touched — the link IS this card's whole story
      base: [{ op: 'damage', amount: 7, primary: true }],
      text: 'Deal 7. Link (Rite): deal 7 again.',
      link: { condition: 'Rite', text: 'Deal 7 again.', effects: [{ op: 'damage', amount: 7 }] },
    },
  },
  {
    id: 'shroudwork', name: 'Shroudwork', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Guard',
    text: 'Gain 10 Block.',
    base: [{ op: 'block', amount: 10, primary: true }],
    link: { condition: 'Hex', text: 'Your partner gains 5 Block.', effects: [{ op: 'partnerBlock', amount: 5 }] },
    mutation: {
      name: 'Cindershroud', text: 'Gain 9 Block. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 9, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 10 Block. Link (Hex): your partner gains 6 Block.',
      link: { condition: 'Hex', text: 'Your partner gains 6 Block.', effects: [{ op: 'partnerBlock', amount: 6 }] },
    },
  },
  {
    id: 'martyrs_knot', name: 'Martyr’s Knot', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Guard',
    needsTarget: true,
    text: 'Gain 5 Block. Bind the target enemy to you.',
    base: [{ op: 'block', amount: 5, primary: true }, { op: 'taunt' }],
    link: { condition: 'Rite', text: 'Gain 4 more Block.', effects: [{ op: 'block', amount: 4 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Brawler’s Oath'
      name: 'Cradled Oath', text: 'Gain 6 Block. Bind the target enemy to you. Draw 1.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'taunt' }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      text: 'Gain 5 Block. Bind the target enemy to you. Link (Rite): gain 5 more Block.',
      link: { condition: 'Rite', text: 'Gain 5 more Block.', effects: [{ op: 'block', amount: 5 }] },
    },
  },
  {
    id: 'patient_breath', name: 'Patient Breath', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Surge',
    keep: true,
    text: 'Gain Kindled 2. Keep.',
    base: [{ op: 'kindled', amount: 2 }],
    link: { condition: 'Hex', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    mutation: {
      name: 'Held Fury', text: 'Gain Kindled 1. Gain 2 Momentum. Keep.',
      base: [{ op: 'kindled', amount: 1 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain Kindled 2. Keep. Link (Hex): draw 1 and gain Kindled 1 more.',
      link: { condition: 'Hex', text: 'Draw 1 and gain Kindled 1 more.', effects: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }] },
    },
  },
  {
    id: 'drawn_breath', name: 'Drawn Breath', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Surge',
    text: 'Draw 2.',
    base: [{ op: 'draw', amount: 2 }],
    link: { condition: 'Guard', text: 'Gain 3 Block.', effects: [{ op: 'block', amount: 3 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Bellows-Breath'
      name: 'Quickened Bellows', text: 'Draw 1. Gain 3 Momentum.',
      base: [{ op: 'draw', amount: 1 }, { op: 'momentum', amount: 3 }],
    },
    upgrade: {
      text: 'Draw 2. Link (Guard): gain 4 Block.',
      link: { condition: 'Guard', text: 'Gain 4 Block.', effects: [{ op: 'block', amount: 4 }] },
    },
  },
  // POWER NEEDED: spitespun_mantle — on detonate: hexAll 1 (whenever Hexes detonate, apply 1 Hex to ALL enemies)
  {
    id: 'spitespun_mantle', name: 'Spitespun Mantle', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Rite', exhaust: true,
    text: 'Power: whenever Hexes detonate, apply 1 Hex to ALL enemies. Exhaust.',
    base: [{ op: 'power', power: 'spitespun_mantle' }],
    mutation: {
      name: 'Cinderspun Mantle', text: 'Gain 8 Block. Gain 3 Momentum.',
      base: [{ op: 'block', amount: 8, primary: true }, { op: 'momentum', amount: 3 }],
    },
    upgrade: {
      cost: 1,
      text: 'Power: whenever Hexes detonate, apply 1 Hex to ALL enemies. Exhaust.',
    },
  },
  {
    id: 'votive_thread', name: 'Votive Thread', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Rite',
    text: 'Gain 1 Thread. Gain 4 Block.',
    base: [{ op: 'thread', amount: 1 }, { op: 'block', amount: 4, primary: true }],
    link: { condition: 'Surge', text: 'Gain 1 Thread more.', effects: [{ op: 'thread', amount: 1 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Votive Cinder' —
      // votive (death column) hands off to dowry (birth column)
      name: 'Dowry Cinder', text: 'Gain 1 Thread. Gain 2 Momentum. Link (any): draw 1.',
      base: [{ op: 'thread', amount: 1 }, { op: 'momentum', amount: 2 }],
      link: { condition: 'any', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    },
    upgrade: {
      text: 'Gain 1 Thread. Gain 4 Block. Link (Surge): gain 2 Thread more.',
      link: { condition: 'Surge', text: 'Gain 2 Thread more.', effects: [{ op: 'thread', amount: 2 }] },
    },
  },

  // -------------------------------------------------------------------------
  // RARES (7) — Hex ×3, Strike ×1, Guard ×1, Surge ×1, Rite ×1
  // 'partner' conditions and Stun live only here (§2.3, §4).
  // -------------------------------------------------------------------------
  {
    id: 'funeral_lace', name: 'Funeral Lace', character: 'vess', rarity: 'rare', cost: 3, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 4 Hex to ALL enemies, then detonate all Hexes on the target.',
    base: [{ op: 'hexAll', amount: 4, primary: true }, { op: 'detonate' }],
    link: { condition: 'partner', text: 'Link (Partner’s card): detonate ALL enemies’ Hexes instead.', effects: [{ op: 'hexAll', amount: 4, primary: true }, { op: 'detonateAllEnemies' }], replace: true },
    upgrade: {
      text: 'Apply 4 Hex to ALL enemies, then detonate all Hexes on the target. Link (any): detonate ALL enemies’ Hexes instead.',
      link: { condition: 'any', text: 'Detonate ALL enemies’ Hexes instead.', effects: [{ op: 'hexAll', amount: 4, primary: true }, { op: 'detonateAllEnemies' }], replace: true },
    },
  },
  {
    id: 'widows_arithmetic', name: 'Widow’s Arithmetic', character: 'vess', rarity: 'rare', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Double the target’s Hex (max +6).',
    base: [{ op: 'doubleHex' }],
    link: { condition: 'partner', text: 'Link (Partner’s card): double it again (max +6).', effects: [{ op: 'doubleHex' }] },
    upgrade: {
      text: 'Double the target’s Hex (max +6). Link (any): double it again (max +6).',
      link: { condition: 'any', text: 'Double it again (max +6).', effects: [{ op: 'doubleHex' }] },
    },
  },
  {
    id: 'tally_of_griefs', name: 'Tally of Griefs', character: 'vess', rarity: 'rare', cost: 2, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 4 Hex, plus 1 per link fired earlier this Chain.',
    base: [{ op: 'hex', amount: 4, primary: true }, { op: 'hexPerLinkFired', per: 1 }],
    link: { condition: 'any', text: 'Plus 2 per instead.', effects: [{ op: 'hex', amount: 4, primary: true }, { op: 'hexPerLinkFired', per: 2 }], replace: true },
    upgrade: {
      text: 'Apply 4 Hex, plus 1 per link fired earlier this Chain. Link (any): plus 3 per instead.',
      link: { condition: 'any', text: 'Plus 3 per instead.', effects: [{ op: 'hex', amount: 4, primary: true }, { op: 'hexPerLinkFired', per: 3 }], replace: true },
    },
  },
  {
    id: 'needles_verdict', name: 'Needle’s Verdict', character: 'vess', rarity: 'rare', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 5 + 3× target’s Hex (does not detonate).',
    base: [{ op: 'damagePerHex', base: 5, perHex: 3, primary: true }],
    link: { condition: 'Hex', text: 'Stun the target.', effects: [{ op: 'stun', amount: 1 }] },
    upgrade: {
      text: 'Deal 5 + 3× target’s Hex (does not detonate). Link (any): Stun the target.',
      link: { condition: 'any', text: 'Stun the target.', effects: [{ op: 'stun', amount: 1 }] },
    },
  },
  {
    id: 'eye_of_the_loom', name: 'Eye of the Loom', character: 'vess', rarity: 'rare', cost: 2, tag: 'Guard',
    text: 'Gain 12 Block.',
    base: [{ op: 'block', amount: 12, primary: true }],
    link: { condition: 'partner', text: 'Link (Partner’s card): your partner gains 12 Block too.', effects: [{ op: 'partnerBlock', amount: 12 }] },
    upgrade: {
      text: 'Gain 12 Block. Link (any): your partner gains 12 Block too.',
      link: { condition: 'any', text: 'Your partner gains 12 Block too.', effects: [{ op: 'partnerBlock', amount: 12 }] },
    },
  },
  {
    id: 'borrowed_hour', name: 'Borrowed Hour', character: 'vess', rarity: 'rare', cost: 1, tag: 'Surge',
    text: 'Draw 2. Gain Kindled 1.',
    base: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 1 }],
    link: { condition: 'any', text: 'Gain Kindled 2 instead.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 2 }], replace: true },
    upgrade: {
      text: 'Draw 2. Gain Kindled 1. Link (any): gain Kindled 3 instead.',
      link: { condition: 'any', text: 'Gain Kindled 3 instead.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 3 }], replace: true },
    },
  },
  // POWER NEEDED: loom_of_hours — on turnStart: kindled 1, block 2 (at the start of each turn, gain Kindled 1 and 2 Block)
  {
    id: 'loom_of_hours', name: 'Loom of Hours', character: 'vess', rarity: 'rare', cost: 3, tag: 'Rite', exhaust: true,
    text: 'Power: at the start of each turn, gain Kindled 1 and 2 Block. Exhaust.',
    base: [{ op: 'power', power: 'loom_of_hours' }],
    upgrade: {
      cost: 2,
      text: 'Power: at the start of each turn, gain Kindled 1 and 2 Block. Exhaust.',
    },
  },
];

// ---------------------------------------------------------------------------
// M1 overlays — mutations (§7) for every M1 common/uncommon still missing one
// (needlework and withering already carry theirs), and upgrades (M2-B6) for
// all 20. Upgrades deepen the link clause; cost cuts used twice, sparingly.
// ---------------------------------------------------------------------------

export const VESS_M1_OVERLAYS: Record<string, Pick<CardDef, 'mutation' | 'upgrade'>> = {
  // Commons
  needlework: {
    upgrade: {
      // S9b.1-2: base has been 4 Hex since M2-B1; the overlay text still said 3
      text: 'Apply 4 Hex. Link (Strike): apply 2 additional Hex per link fired earlier this Chain.',
      link: { condition: 'Strike', text: 'Apply 2 additional Hex per link fired earlier this Chain.', effects: [{ op: 'hexPerLinkFired', per: 2 }] },
    },
  },
  pinprick: {
    mutation: {
      name: 'Ember Prick', text: 'Apply 1 Hex. Deal 3.',
      base: [{ op: 'hex', amount: 1, primary: true }, { op: 'damage', amount: 3 }],
    },
    upgrade: {
      // S9b.3 row 1: non-Hex rider on the replace link (no new Hex amounts)
      text: 'Apply 3 Hex. Link (Strike): apply 4 and draw 1 instead.',
      link: { condition: 'Strike', text: 'Apply 4 and draw 1 instead.', effects: [{ op: 'hex', amount: 4, primary: true }, { op: 'draw', amount: 1 }], replace: true },
    },
  },
  withering: {
    upgrade: {
      // S9b.3 row 2: Weak growth, not Hex
      text: 'Apply 3 Hex to ALL enemies. Link (Guard): also apply 2 Weak to all.',
      link: { condition: 'Guard', text: 'Also apply 2 Weak to all.', effects: [{ op: 'weakAll', amount: 2 }] },
    },
  },
  patient_knife: {
    mutation: {
      name: 'Impatient Knife', text: 'Deal 8. Gain 2 Momentum.',
      base: [{ op: 'damage', amount: 8, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 6. Link (Hex): deal 6 + 3× target’s Hex instead (does not detonate).',
      link: { condition: 'Hex', text: 'Deal 6 + 3× target’s Hex instead (does not detonate).', effects: [{ op: 'damagePerHex', base: 6, perHex: 3, primary: true }], replace: true },
    },
  },
  stitchblade: {
    mutation: {
      name: 'Cinderblade', text: 'Deal 6. Gain 1 Momentum.',
      base: [{ op: 'damage', amount: 6, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 3
      text: 'Deal 5. Link (Hex): apply 3 Hex. Draw 1.',
      link: { condition: 'Hex', text: 'Apply 3 Hex. Draw 1.', effects: [{ op: 'hex', amount: 3 }, { op: 'draw', amount: 1 }] },
    },
  },
  thornward: {
    mutation: {
      name: 'Spitewall', text: 'Gain 6 Block. Gain 1 Momentum.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      // OQ#49 ruling (2026-07-04): the 19th restatement, M2-B6 discipline —
      // link deepened with a non-Hex rider, no new Hex amounts.
      text: 'Gain 6 Block. Link (Hex): apply 2 Hex to ALL enemies and gain 3 Block.',
      link: { condition: 'Hex', text: 'Apply 2 Hex to ALL enemies and gain 3 Block.', effects: [{ op: 'hexAll', amount: 2 }, { op: 'block', amount: 3 }] },
    },
  },
  wardknot: {
    mutation: {
      name: 'Knucklewrap', text: 'Gain 5 Block. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 5 Block. Link (Surge): gain 5 more.',
      link: { condition: 'Surge', text: 'Gain 5 more.', effects: [{ op: 'block', amount: 5 }] },
    },
  },
  loose_stitch: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Loose Spark'
      name: 'First-Drawn Spark', text: 'Draw 1. Gain 1 Momentum.',
      base: [{ op: 'draw', amount: 1 }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 4 (battery flag: 0-cost draw) — replace list preserved
      text: 'Draw 1. Link (Strike): draw 3 instead.',
      link: { condition: 'Strike', text: 'Draw 3 instead.', effects: [{ op: 'draw', amount: 3 }], replace: true },
    },
  },
  quickening: {
    mutation: {
      name: 'Quickfire', text: 'Draw 2. Gain 1 Momentum.',
      base: [{ op: 'draw', amount: 2 }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      text: 'Draw 2. Link (Guard): draw 1 and your partner draws 1.',
      link: { condition: 'Guard', text: 'Draw 1 and your partner draws 1.', effects: [{ op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 }] },
    },
  },
  mendthread: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Cinderthread'
      name: 'Hearth-Thread', text: 'Gain 1 Thread. Gain 2 Momentum.',
      base: [{ op: 'thread', amount: 1 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 1 Thread. Link (Guard): your partner gains 5 Block.',
      link: { condition: 'Guard', text: 'Your partner gains 5 Block.', effects: [{ op: 'partnerBlock', amount: 5 }] },
    },
  },

  // Uncommons
  inheritance: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Spent Inheritance' —
      // spent (death column, tithe paid) becomes dowered (birth column, paid forward)
      name: 'Dowered Inheritance', text: 'Gain 2 Thread. Gain 2 Momentum.',
      base: [{ op: 'thread', amount: 2 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 2 Thread. Link (Rite): gain 3 instead, and you and your partner each draw 1.',
      link: { condition: 'Rite', text: 'Gain 3 instead, and you and your partner each draw 1.', effects: [{ op: 'thread', amount: 3 }, { op: 'draw', amount: 1 }, { op: 'partnerDraw', amount: 1 }], replace: true },
    },
  },
  black_lattice: {
    mutation: {
      name: 'Cinder Lattice', text: 'Gain 6 Block. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      cost: 1,
      text: 'Power: whenever Hexes detonate, gain 3 Block. Exhaust.',
    },
  },
  saturate: {
    mutation: {
      name: 'Saturated Ash', text: 'Apply 3 Hex. Draw 1.',
      base: [{ op: 'hex', amount: 3, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      text: 'Double the target’s Hex. Link (Surge): draw 2.',
      link: { condition: 'Surge', text: 'Draw 2.', effects: [{ op: 'draw', amount: 2 }] },
    },
  },
  lashing_coil: {
    mutation: {
      name: 'Lashing Ember', text: 'Deal 5 to ALL enemies. Gain 1 Momentum.',
      base: [{ op: 'damageAll', amount: 5, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 4 to ALL enemies. Link (Hex): apply 2 Hex to all enemies.',
      link: { condition: 'Hex', text: 'Apply 2 Hex to all enemies.', effects: [{ op: 'hexAll', amount: 2 }] },
    },
  },
  seamripper: {
    mutation: {
      name: 'Ripping Hook', text: 'Deal 8. Gain 1 Momentum.',
      base: [{ op: 'damage', amount: 8, primary: true }, { op: 'momentum', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 7. Link (Surge): apply 2 Vulnerable.',
      link: { condition: 'Surge', text: 'Apply 2 Vulnerable.', effects: [{ op: 'vulnerable', amount: 2 }] },
    },
  },
  knotward_veil: {
    mutation: {
      name: 'Smokeveil', text: 'Gain 9 Block. Gain 2 Momentum.',
      base: [{ op: 'block', amount: 9, primary: true }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 9 Block. Link (Rite): gain 1 Thread and 3 Block.',
      link: { condition: 'Rite', text: 'Gain 1 Thread and 3 Block.', effects: [{ op: 'thread', amount: 1 }, { op: 'block', amount: 3 }] },
    },
  },
  spindle_step: {
    mutation: {
      name: 'Spindle Lunge', text: 'Gain Kindled 1. Gain 2 Momentum. Exhaust.',
      base: [{ op: 'kindled', amount: 1 }, { op: 'momentum', amount: 2 }],
    },
    upgrade: {
      text: 'Gain Kindled 1. Exhaust. Link (Guard): draw 2.',
      link: { condition: 'Guard', text: 'Draw 2.', effects: [{ op: 'draw', amount: 2 }] },
    },
  },

  // Rares (mutations omitted — Echoing a rare delivers it unmutated, M2-B1)
  // S13.2: gravebloom's overlay retired — the revised engine (cards.ts)
  // carries its own cost-cut upgrade, the power-card convention.
  final_word: {
    upgrade: {
      text: 'Detonate all Hexes on ALL enemies, then deal damage to the target equal to the stacks detonated. Link (Hex): equal to 2× the stacks instead.',
      link: { condition: 'Hex', text: 'Deal 2× the stacks instead.', effects: [{ op: 'detonateAllEnemies' }, { op: 'damagePerDetonated', per: 2 }], replace: true },
    },
  },
  unbroken_line: {
    upgrade: {
      cost: 1,
      text: 'Power: at the start of each turn, gain 1 Thread. Exhaust.',
    },
  },
};
