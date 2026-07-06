// M2 Bram pool expansion (M2-B1): 35 new cards (15C/13U/7R) bringing Bram to
// 55 (25C/20U/10R), plus mutation/upgrade overlays for the 20 M1 cards.
// Identity per §9: tempo / momentum / detonation, Strike-heavy (~35-40%).
// Covenant (§3) and pool rules (§2.3) audited by test/covenant.test.ts.

import { CardDef } from '../types';

export const BRAM_M2_CARDS: CardDef[] = [
  // -------------------------------------------------------------------------
  // COMMONS (15) — Strike×6, Guard×2, Hex×3, Surge×2, Rite×2.
  // Combined common tag floor (with M1): Strike 10, Guard 4, Hex 4, Surge 4, Rite 3.
  // Zero self-similar links at common (§2.3).
  // -------------------------------------------------------------------------
  {
    id: 'cinderbreak', name: 'Cinderbreak', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 5.',
    base: [{ op: 'damage', amount: 5, primary: true }],
    link: { condition: 'Hex', text: 'Detonate up to 2 Hexes on the target.', effects: [{ op: 'detonate', max: 2 }] },
    mutation: {
      name: 'Stitched Cinderbreak', text: 'Deal 4. Apply 2 Hex.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 5. Link (Hex): detonate up to 4 Hexes on the target.',
      link: { condition: 'Hex', text: 'Detonate up to 4 Hexes on the target.', effects: [{ op: 'detonate', max: 4 }] },
    },
  },
  {
    id: 'one_two', name: 'One-Two', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 3 twice.',
    base: [{ op: 'damage', amount: 3, times: 2, primary: true }],
    link: { condition: 'Surge', text: 'Gain 2 Momentum.', effects: [{ op: 'momentum', amount: 2 }] },
    mutation: {
      name: 'Hexbound One-Two', text: 'Deal 3 twice. Apply 1 Hex.',
      base: [{ op: 'damage', amount: 3, times: 2, primary: true }, { op: 'hex', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 3 twice. Link (Surge): gain 3 Momentum.',
      link: { condition: 'Surge', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
    },
  },
  {
    id: 'bellringer', name: 'Bellringer', character: 'bram', rarity: 'common', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 11.',
    base: [{ op: 'damage', amount: 11, primary: true }],
    link: { condition: 'Surge', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] }, // §4: widened from Rite
    mutation: {
      name: 'Stitched Bellringer', text: 'Deal 8. Gain 1 Thread.',
      base: [{ op: 'damage', amount: 8, primary: true }, { op: 'thread', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 11. Link (Rite): gain Kindled 1 and draw 1.',
      link: { condition: 'Surge', text: 'Gain Kindled 1 and draw 1.', effects: [{ op: 'kindled', amount: 1 }, { op: 'draw', amount: 1 }] },
    },
  },
  {
    id: 'ember_jab', name: 'Ember Jab', character: 'bram', rarity: 'uncommon', cost: 0, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 3.',
    base: [{ op: 'damage', amount: 3, primary: true }],
    link: { condition: 'Guard', text: 'Deal 6 instead.', effects: [{ op: 'damage', amount: 6, primary: true }], replace: true },
    mutation: {
      name: 'Hexbound Ember Jab', text: 'Deal 2. Apply 1 Hex.',
      base: [{ op: 'damage', amount: 2, primary: true }, { op: 'hex', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 3. Link (Guard): deal 7 instead.',
      link: { condition: 'Guard', text: 'Deal 7 instead.', effects: [{ op: 'damage', amount: 7, primary: true }], replace: true },
    },
  },
  {
    id: 'roundhouse', name: 'Roundhouse', character: 'bram', rarity: 'common', cost: 2, tag: 'Strike',
    text: 'Deal 5 to ALL enemies.',
    base: [{ op: 'damageAll', amount: 5, primary: true }],
    link: { condition: 'Guard', text: 'Gain 4 Block.', effects: [{ op: 'block', amount: 4 }] },
    mutation: {
      name: 'Withered Roundhouse', text: 'Deal 4 to ALL enemies. Apply 1 Hex to all.',
      base: [{ op: 'damageAll', amount: 4, primary: true }, { op: 'hexAll', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 5 to ALL enemies. Link (Guard): gain 5 Block.',
      link: { condition: 'Guard', text: 'Gain 5 Block.', effects: [{ op: 'block', amount: 5 }] },
    },
  },
  {
    id: 'body_blow', name: 'Body Blow', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 5. Gain 1 Momentum.',
    base: [{ op: 'damage', amount: 5, primary: true }, { op: 'momentum', amount: 1 }],
    link: { condition: 'Surge', text: 'Apply 1 Vulnerable.', effects: [{ op: 'vulnerable', amount: 1 }] }, // S5.2: Hex → Surge (Table A)
    mutation: {
      name: 'Stitched Body Blow', text: 'Deal 5. Apply 1 Hex.',
      base: [{ op: 'damage', amount: 5, primary: true }, { op: 'hex', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 5. Gain 1 Momentum. Link (Surge): apply 1 Vulnerable and 1 Weak.',
      link: { condition: 'Surge', text: 'Apply 1 Vulnerable and 1 Weak.', effects: [{ op: 'vulnerable', amount: 1 }, { op: 'weak', amount: 1 }] },
    },
  },
  {
    id: 'square_up', name: 'Square Up', character: 'bram', rarity: 'common', cost: 1, tag: 'Guard',
    needsTarget: true,
    text: 'Gain 5 Block. Bind the target enemy to you.',
    base: [{ op: 'block', amount: 5, primary: true }, { op: 'taunt' }],
    link: { condition: 'Surge', text: 'Gain 4 more Block.', effects: [{ op: 'block', amount: 4 }] },
    mutation: {
      name: 'Stitched Square Up', text: 'Gain 4 Block. Apply 2 Hex.',
      base: [{ op: 'block', amount: 4, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 5 Block. Bind the target enemy to you. Link (Surge): gain 5 more Block.',
      link: { condition: 'Surge', text: 'Gain 5 more Block.', effects: [{ op: 'block', amount: 5 }] },
    },
  },
  {
    id: 'forearm_wall', name: 'Forearm Wall', character: 'bram', rarity: 'common', cost: 1, tag: 'Guard',
    text: 'Gain 5 Block.',
    base: [{ op: 'block', amount: 5, primary: true }],
    link: { condition: 'Strike', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] }, // §4: widened from Rite
    mutation: {
      name: 'Hexbound Forearm Wall', text: 'Gain 5 Block. Apply 1 Hex to ALL enemies.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'hexAll', amount: 1 }],
    },
    upgrade: {
      text: 'Gain 5 Block. Link (Rite): gain Kindled 1 and 1 Thread.',
      link: { condition: 'Strike', text: 'Gain Kindled 1 and 1 Thread.', effects: [{ op: 'kindled', amount: 1 }, { op: 'thread', amount: 1 }] },
    },
  },
  {
    id: 'soot_mark', name: 'Soot Mark', character: 'bram', rarity: 'common', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex.',
    base: [{ op: 'hex', amount: 3, primary: true }],
    link: { condition: 'Strike', text: 'Gain 2 Momentum.', effects: [{ op: 'momentum', amount: 2 }] },
    mutation: {
      name: 'Stitched Soot Mark', text: 'Apply 4 Hex.',
      base: [{ op: 'hex', amount: 4, primary: true }],
    },
    upgrade: {
      text: 'Apply 3 Hex. Link (Strike): gain 3 Momentum.',
      link: { condition: 'Strike', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
    },
  },
  {
    id: 'ashfall', name: 'Ashfall', character: 'bram', rarity: 'common', cost: 1, tag: 'Hex',
    text: 'Apply 3 Hex to ALL enemies.',
    base: [{ op: 'hexAll', amount: 3, primary: true }],
    link: { condition: 'Surge', text: 'Apply 4 to all instead.', effects: [{ op: 'hexAll', amount: 4, primary: true }], replace: true },
    mutation: {
      name: 'Hexbound Ashfall', text: 'Apply 2 Hex to ALL enemies. Apply 1 Weak to all.',
      base: [{ op: 'hexAll', amount: 2, primary: true }, { op: 'weakAll', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 15 — Hex amounts untouched; Weak rides the replace link
      text: 'Apply 3 Hex to ALL enemies. Link (Surge): apply 4 to all and 1 Weak to all instead.',
      link: { condition: 'Surge', text: 'Apply 4 to all and 1 Weak to all instead.', effects: [{ op: 'hexAll', amount: 4, primary: true }, { op: 'weakAll', amount: 1 }], replace: true },
    },
  },
  {
    id: 'brand', name: 'Brand', character: 'bram', rarity: 'common', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Deal 2. Apply 2 Hex.',
    base: [{ op: 'damage', amount: 2 }, { op: 'hex', amount: 2, primary: true }],
    link: { condition: 'Guard', text: 'Apply 1 Weak.', effects: [{ op: 'weak', amount: 1 }] },
    mutation: {
      name: 'Stitched Brand', text: 'Apply 3 Hex. Apply 1 Weak.',
      base: [{ op: 'hex', amount: 3, primary: true }, { op: 'weak', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 2. Apply 2 Hex. Link (Guard): apply 2 more Hex and 1 Weak.',
      link: { condition: 'Guard', text: 'Apply 2 more Hex and 1 Weak.', effects: [{ op: 'hex', amount: 2 }, { op: 'weak', amount: 1 }] },
    },
  },
  {
    id: 'wind_up', name: 'Wind-Up', character: 'bram', rarity: 'common', cost: 0, tag: 'Surge',
    text: 'Gain 2 Momentum.',
    base: [{ op: 'momentum', amount: 2, primary: true }],
    link: { condition: 'Strike', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
    mutation: {
      name: 'Stitched Wind-Up', text: 'Apply 1 Hex to ALL enemies.',
      base: [{ op: 'hexAll', amount: 1, primary: true }],
    },
    upgrade: {
      text: 'Gain 2 Momentum. Link (Strike): draw 1 and gain 1 more Momentum.',
      link: { condition: 'Strike', text: 'Draw 1 and gain 1 more Momentum.', effects: [{ op: 'draw', amount: 1 }, { op: 'momentum', amount: 1 }] },
    },
  },
  {
    id: 'fan_the_flames', name: 'Fan the Flames', character: 'bram', rarity: 'common', cost: 1, tag: 'Surge',
    text: 'Gain 3 Momentum.',
    base: [{ op: 'momentum', amount: 3, primary: true }],
    link: { condition: 'Strike', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] }, // S5.2: Hex → Strike (Table A)
    mutation: {
      name: 'Hexbound Fan the Flames', text: 'Gain 1 Momentum. Apply 2 Hex to ALL enemies.',
      base: [{ op: 'momentum', amount: 1, primary: true }, { op: 'hexAll', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 3 Momentum. Link (Strike): draw 2.',
      link: { condition: 'Strike', text: 'Draw 2.', effects: [{ op: 'draw', amount: 2 }] },
    },
  },
  {
    id: 'banked_coals', name: 'Banked Coals', character: 'bram', rarity: 'common', cost: 1, tag: 'Rite',
    text: 'Gain Kindled 1. Gain 2 Block.',
    base: [{ op: 'kindled', amount: 1 }, { op: 'block', amount: 2, primary: true }],
    link: { condition: 'Strike', text: 'Gain 1 Thread.', effects: [{ op: 'thread', amount: 1 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Banked Coals'
      name: 'Hearth-Banked Coals', text: 'Gain 1 Thread. Gain 2 Block.',
      base: [{ op: 'thread', amount: 1 }, { op: 'block', amount: 2, primary: true }],
    },
    upgrade: {
      // S9b.3 row 16: base Block 2 → 4; Thread economy untouched
      base: [{ op: 'kindled', amount: 1 }, { op: 'block', amount: 4, primary: true }],
      text: 'Gain Kindled 1. Gain 4 Block. Link (Strike): gain 1 Thread.',
      link: { condition: 'Strike', text: 'Gain 1 Thread.', effects: [{ op: 'thread', amount: 1 }] },
    },
  },
  {
    id: 'firewatch', name: 'Firewatch', character: 'bram', rarity: 'common', cost: 1, tag: 'Rite',
    text: 'Gain 1 Thread. Gain 3 Block.',
    base: [{ op: 'thread', amount: 1 }, { op: 'block', amount: 3, primary: true }],
    link: { condition: 'Surge', text: 'Your partner gains 3 Block.', effects: [{ op: 'partnerBlock', amount: 3 }] },
    mutation: {
      name: 'Hexbound Firewatch', text: 'Gain 1 Thread. Apply 2 Hex.',
      base: [{ op: 'thread', amount: 1 }, { op: 'hex', amount: 2, primary: true }],
      link: { condition: 'Surge', text: 'Your partner gains 3 Block.', effects: [{ op: 'partnerBlock', amount: 3 }] },
    },
    upgrade: {
      text: 'Gain 1 Thread. Gain 3 Block. Link (Surge): your partner gains 4 Block.',
      link: { condition: 'Surge', text: 'Your partner gains 4 Block.', effects: [{ op: 'partnerBlock', amount: 4 }] },
    },
  },

  // -------------------------------------------------------------------------
  // UNCOMMONS (13) — Strike×4, Guard×3, Hex×2, Surge×2, Rite×2.
  // One NEW self-similar (drumbeat, Surge/Surge); pool total 3 of ≤4 (§2.3/B1).
  // -------------------------------------------------------------------------
  {
    id: 'cross_counter', name: 'Cross-Counter', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 8. Gain 4 Block.',
    base: [{ op: 'damage', amount: 8, primary: true }, { op: 'block', amount: 4 }],
    link: { condition: 'Guard', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
    mutation: {
      name: 'Stitched Cross-Counter', text: 'Deal 6. Gain 4 Block. Apply 2 Hex.',
      base: [{ op: 'damage', amount: 6, primary: true }, { op: 'block', amount: 4 }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 8. Gain 4 Block. Link (Guard): gain 3 Momentum and 3 more Block.',
      link: { condition: 'Guard', text: 'Gain 3 Momentum and 3 more Block.', effects: [{ op: 'momentum', amount: 3 }, { op: 'block', amount: 3 }] },
    },
  },
  {
    id: 'pummel', name: 'Pummel', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 3 twice.',
    base: [{ op: 'damage', amount: 3, times: 2, primary: true }],
    link: { condition: 'Surge', text: 'Deal 3 four times instead.', effects: [{ op: 'damage', amount: 3, times: 4, primary: true }], replace: true },
    mutation: {
      name: 'Hexbound Pummel', text: 'Deal 3 twice. Apply 2 Hex.',
      base: [{ op: 'damage', amount: 3, times: 2, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      // S9b.3 row 17 (S9b.0-2 ruling: 4×4=16, not 3×5) — replace preserved
      base: [{ op: 'damage', amount: 4, times: 2, primary: true }],
      text: 'Deal 4 twice. Link (Surge): deal 4 four times instead.',
      link: { condition: 'Surge', text: 'Deal 4 four times instead.', effects: [{ op: 'damage', amount: 4, times: 4, primary: true }], replace: true },
    },
  },
  {
    id: 'counterargument', name: 'Counterargument', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 7.',
    base: [{ op: 'damage', amount: 7, primary: true }],
    link: { condition: 'Guard', text: 'Apply 1 Weak and gain 3 Block.', effects: [{ op: 'weak', amount: 1 }, { op: 'block', amount: 3 }] },
    mutation: {
      name: 'Stitched Counterargument', text: 'Deal 5. Apply 2 Hex. Apply 1 Weak.',
      base: [{ op: 'damage', amount: 5, primary: true }, { op: 'hex', amount: 2 }, { op: 'weak', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 7. Link (Guard): apply 1 Weak, 1 Vulnerable, and gain 3 Block.',
      link: { condition: 'Guard', text: 'Apply 1 Weak, 1 Vulnerable, and gain 3 Block.', effects: [{ op: 'weak', amount: 1 }, { op: 'vulnerable', amount: 1 }, { op: 'block', amount: 3 }] },
    },
  },
  {
    id: 'breaker', name: 'Breaker', character: 'bram', rarity: 'uncommon', cost: 3, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 18.',
    base: [{ op: 'damage', amount: 18, primary: true }],
    link: { condition: 'Guard', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] },
    mutation: {
      name: 'Stitched Breaker', text: 'Deal 12. Apply 4 Hex.',
      base: [{ op: 'damage', amount: 12, primary: true }, { op: 'hex', amount: 4 }],
    },
    upgrade: {
      text: 'Deal 18. Link (Guard): gain Kindled 2.',
      link: { condition: 'Guard', text: 'Gain Kindled 2.', effects: [{ op: 'kindled', amount: 2 }] },
    },
  },
  {
    id: 'stand_fast', name: 'Stand Fast', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Guard',
    needsTarget: true,
    text: 'Gain 11 Block. Bind the target enemy to you.',
    base: [{ op: 'block', amount: 11, primary: true }, { op: 'taunt' }],
    link: { condition: 'Strike', text: 'Your partner gains 4 Block.', effects: [{ op: 'partnerBlock', amount: 4 }] }, // §4: widened from Rite
    mutation: {
      name: 'Hexbound Stand Fast', text: 'Gain 9 Block. Apply 2 Hex to ALL enemies.',
      base: [{ op: 'block', amount: 9, primary: true }, { op: 'hexAll', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 11 Block. Bind the target enemy to you. Link (Strike): your partner gains 5 Block.',
      link: { condition: 'Strike', text: 'Your partner gains 5 Block.', effects: [{ op: 'partnerBlock', amount: 5 }] },
    },
  },
  {
    id: 'cinder_cloak', name: 'Cinder Cloak', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Guard',
    text: 'Gain 7 Block.',
    base: [{ op: 'block', amount: 7, primary: true }],
    link: { condition: 'Strike', text: 'Apply 1 Hex to ALL enemies.', effects: [{ op: 'hexAll', amount: 1 }] }, // S5.2: Hex → Strike (Table A)
    mutation: {
      name: 'Hexbound Cinder Cloak', text: 'Gain 5 Block. Apply 2 Hex to ALL enemies.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'hexAll', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 7 Block. Link (Strike): apply 2 Hex to ALL enemies.',
      link: { condition: 'Strike', text: 'Apply 2 Hex to ALL enemies.', effects: [{ op: 'hexAll', amount: 2 }] },
    },
  },
  {
    id: 'hold_the_line', name: 'Hold the Line', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Guard',
    text: 'Gain 8 Block. Your partner gains 4 Block.',
    base: [{ op: 'block', amount: 8, primary: true }, { op: 'partnerBlock', amount: 4 }],
    link: { condition: 'Surge', text: 'Gain Kindled 1.', effects: [{ op: 'kindled', amount: 1 }] },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Hold the Line'
      name: 'Cradled Hold the Line', text: 'Gain 6 Block. Your partner gains 6 Block.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'partnerBlock', amount: 6 }],
      link: { condition: 'Surge', text: 'Gain 1 Thread.', effects: [{ op: 'thread', amount: 1 }] },
    },
    upgrade: {
      text: 'Gain 8 Block. Your partner gains 4 Block. Link (Surge): gain Kindled 1 and your partner gains Kindled 1.',
      link: { condition: 'Surge', text: 'Gain Kindled 1 and your partner gains Kindled 1.', effects: [{ op: 'kindled', amount: 1 }, { op: 'partnerKindled', amount: 1 }] },
    },
  },
  {
    id: 'pitchfire', name: 'Pitchfire', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 3 Hex. Gain 1 Momentum.',
    base: [{ op: 'hex', amount: 3, primary: true }, { op: 'momentum', amount: 1 }],
    link: { condition: 'Strike', text: 'Deal 5.', effects: [{ op: 'damage', amount: 5 }] },
    mutation: {
      name: 'Stitched Pitchfire', text: 'Apply 4 Hex.',
      base: [{ op: 'hex', amount: 4, primary: true }],
      link: { condition: 'Strike', text: 'Apply 2 more Hex.', effects: [{ op: 'hex', amount: 2 }] },
    },
    upgrade: {
      text: 'Apply 3 Hex. Gain 1 Momentum. Link (Strike): deal 6.',
      link: { condition: 'Strike', text: 'Deal 6.', effects: [{ op: 'damage', amount: 6 }] },
    },
  },
  {
    id: 'slow_burn', name: 'Slow Burn', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Hex',
    needsTarget: true,
    text: 'Apply 5 Hex.',
    base: [{ op: 'hex', amount: 5, primary: true }],
    link: { condition: 'Rite', text: 'Apply 2 more and gain 1 Thread.', effects: [{ op: 'hex', amount: 2 }, { op: 'thread', amount: 1 }] },
    mutation: {
      name: 'Hexbound Slow Burn', text: 'Apply 5 Hex. Apply 1 Weak.',
      base: [{ op: 'hex', amount: 5, primary: true }, { op: 'weak', amount: 1 }],
    },
    upgrade: {
      text: 'Apply 5 Hex. Link (Rite): apply 3 more and gain 1 Thread.',
      link: { condition: 'Rite', text: 'Apply 3 more and gain 1 Thread.', effects: [{ op: 'hex', amount: 3 }, { op: 'thread', amount: 1 }] },
    },
  },
  {
    id: 'held_breath', name: 'Held Breath', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Surge',
    keep: true,
    text: 'Gain 2 Momentum. Keep.',
    base: [{ op: 'momentum', amount: 2, primary: true }],
    link: { condition: 'Guard', text: 'Gain 3 Block.', effects: [{ op: 'block', amount: 3 }] },
    mutation: {
      name: 'Stitched Held Breath', text: 'Apply 2 Hex to ALL enemies. Keep.',
      base: [{ op: 'hexAll', amount: 2, primary: true }],
    },
    upgrade: {
      text: 'Gain 3 Momentum. Keep. Link (Guard): gain 3 Block.',
      base: [{ op: 'momentum', amount: 3, primary: true }],
      link: { condition: 'Guard', text: 'Gain 3 Block.', effects: [{ op: 'block', amount: 3 }] },
    },
  },
  {
    // Self-similar (Surge / Link Surge) — counted against the ≤4 uncommon bound.
    id: 'drumbeat', name: 'Drumbeat', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Surge',
    text: 'Draw 1. Gain Kindled 1.',
    base: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }],
    link: { condition: 'Surge', text: 'Draw 2 instead and gain 1 Momentum.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 1 }, { op: 'momentum', amount: 1 }], replace: true },
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Drumbeat'
      name: 'Quickened Drumbeat', text: 'Draw 1. Gain 1 Thread.',
      base: [{ op: 'draw', amount: 1 }, { op: 'thread', amount: 1 }],
    },
    upgrade: {
      text: 'Draw 1. Gain Kindled 1. Link (Surge): draw 2 instead and gain 2 Momentum.',
      link: { condition: 'Surge', text: 'Draw 2 instead and gain 2 Momentum.', effects: [{ op: 'draw', amount: 2 }, { op: 'kindled', amount: 1 }, { op: 'momentum', amount: 2 }], replace: true },
    },
  },
  // POWER NEEDED: forgefire — on turnStart: kindled 1 (banked heat: +1 energy arriving each following turn)
  {
    id: 'forgefire', name: 'Forgefire', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Rite', exhaust: true,
    text: 'Power: at the start of your turn, gain Kindled 1. Exhaust.',
    base: [{ op: 'power', power: 'forgefire' }],
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Forgefire'
      name: 'Quickened Forgefire', text: 'Gain 2 Thread. Draw 1.',
      base: [{ op: 'thread', amount: 2 }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      text: 'Power: at the start of your turn, gain Kindled 1. Exhaust.',
      cost: 1,
    },
  },
  // POWER NEEDED: eye_for_an_opening — on linkFired: momentum 1 (every fired link of yours feeds the swing)
  {
    id: 'eye_for_an_opening', name: 'Eye for an Opening', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Rite', exhaust: true,
    text: 'Power: whenever one of your links fires, gain 1 Momentum. Exhaust.',
    base: [{ op: 'power', power: 'eye_for_an_opening' }],
    mutation: {
      name: 'Hexbound Eye for an Opening', text: 'Apply 3 Hex. Gain 1 Thread.',
      base: [{ op: 'hex', amount: 3, primary: true }, { op: 'thread', amount: 1 }],
    },
    upgrade: {
      text: 'Power: whenever one of your links fires, gain 1 Momentum. When played, gain 2 Momentum. Exhaust.',
      base: [{ op: 'power', power: 'eye_for_an_opening' }, { op: 'momentum', amount: 2 }],
    },
  },

  // -------------------------------------------------------------------------
  // RARES (7) — Strike×3, Guard×1, Hex×1, Surge×1, Rite×1.
  // 'partner' links live only here (§2.3). Mutations optional at rare (B1).
  // -------------------------------------------------------------------------
  {
    // M2-A4: the multi-hit Momentum rare — link makes Momentum apply to EVERY hit.
    id: 'relentless', name: 'Relentless', character: 'bram', rarity: 'rare', cost: 3, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 5 four times.',
    base: [{ op: 'damage', amount: 5, times: 4, primary: true }],
    link: { condition: 'Surge', text: 'Momentum applies to every hit.', effects: [{ op: 'momentumPerHit' }] },
    upgrade: {
      text: 'Deal 5 four times. Link (any): Momentum applies to every hit.',
      link: { condition: 'any', text: 'Momentum applies to every hit.', effects: [{ op: 'momentumPerHit' }] },
    },
  },
  {
    id: 'cinderfall', name: 'Cinderfall', character: 'bram', rarity: 'rare', cost: 2, tag: 'Strike',
    text: 'Deal 6 to ALL enemies.',
    base: [{ op: 'damageAll', amount: 6, primary: true }],
    link: { condition: 'Hex', text: 'Detonate all Hexes on ALL enemies.', effects: [{ op: 'detonateAllEnemies' }] },
    upgrade: {
      text: 'Deal 6 to ALL enemies. Link (any): detonate all Hexes on ALL enemies.',
      link: { condition: 'any', text: 'Detonate all Hexes on ALL enemies.', effects: [{ op: 'detonateAllEnemies' }] },
    },
  },
  {
    id: 'final_bell', name: 'Final Bell', character: 'bram', rarity: 'rare', cost: 2, tag: 'Strike',
    needsTarget: true,
    text: 'Deal 9.',
    base: [{ op: 'damage', amount: 9, primary: true }],
    link: { condition: 'partner', text: 'Link (Partner’s card): Stun the target.', effects: [{ op: 'stun', amount: 1 }] },
    upgrade: {
      text: 'Deal 12. Link (Partner’s card): Stun the target.',
      base: [{ op: 'damage', amount: 12, primary: true }],
    },
  },
  {
    id: 'immovable', name: 'Immovable', character: 'bram', rarity: 'rare', cost: 2, tag: 'Guard',
    text: 'Gain 12 Block.',
    base: [{ op: 'block', amount: 12, primary: true }],
    link: { condition: 'partner', text: 'Link (Partner’s card): your partner gains 8 Block.', effects: [{ op: 'partnerBlock', amount: 8 }] },
    upgrade: {
      text: 'Gain 12 Block. Link (Partner’s card): your partner gains 8 Block and heals 3.',
      link: { condition: 'partner', text: 'Link (Partner’s card): your partner gains 8 Block and heals 3.', effects: [{ op: 'partnerBlock', amount: 8 }, { op: 'partnerHeal', amount: 3 }] },
    },
  },
  {
    id: 'ash_harvest', name: 'Ash Harvest', character: 'bram', rarity: 'rare', cost: 2, tag: 'Hex',
    text: 'Apply 3 Hex to ALL enemies.',
    base: [{ op: 'hexAll', amount: 3, primary: true }],
    link: { condition: 'Strike', text: 'Deal 5 to ALL enemies.', effects: [{ op: 'damageAll', amount: 5 }] },
    upgrade: {
      text: 'Apply 3 Hex to ALL enemies. Link (any): deal 6 to ALL enemies.',
      link: { condition: 'any', text: 'Deal 6 to ALL enemies.', effects: [{ op: 'damageAll', amount: 6 }] },
    },
  },
  {
    id: 'share_the_fire', name: 'Share the Fire', character: 'bram', rarity: 'rare', cost: 1, tag: 'Surge',
    text: 'Gain Kindled 2. Draw 1.',
    base: [{ op: 'kindled', amount: 2 }, { op: 'draw', amount: 1 }],
    link: { condition: 'partner', text: 'Link (Partner’s card): your partner gains Kindled 1 and draws 1.', effects: [{ op: 'partnerKindled', amount: 1 }, { op: 'partnerDraw', amount: 1 }] },
    upgrade: {
      text: 'Gain Kindled 2. Draw 1. Link (Partner’s card): your partner gains Kindled 2 and draws 1.',
      link: { condition: 'partner', text: 'Link (Partner’s card): your partner gains Kindled 2 and draws 1.', effects: [{ op: 'partnerKindled', amount: 2 }, { op: 'partnerDraw', amount: 1 }] },
    },
  },
  // POWER NEEDED: aftershock — on detonate: damageAll 3 (every detonation event cracks outward into all enemies)
  {
    id: 'aftershock', name: 'Aftershock', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Rite', exhaust: true,
    text: 'Power: whenever Hexes detonate, deal 3 to ALL enemies. Exhaust.',
    base: [{ op: 'power', power: 'aftershock' }],
    upgrade: {
      text: 'Power: whenever Hexes detonate, deal 3 to ALL enemies. Exhaust.',
      cost: 1,
    },
  },
];

// ---------------------------------------------------------------------------
// M1 overlays (M2-B1/B6): mutations for every M1 common/uncommon that lacks
// one (rendcall already has its own — upgrade only), and an upgrade for all 20.
// Upgrades deepen the link (B6 house rule) wherever a link exists to deepen.
// ---------------------------------------------------------------------------

export const BRAM_M1_OVERLAYS: Record<string, Pick<CardDef, 'mutation' | 'upgrade'>> = {
  // --- M1 commons ---
  opener: {
    mutation: {
      name: 'Stitched Opener', text: 'Deal 4. Apply 2 Hex.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 4. Gain 2 Momentum. Link (Surge): gain 5 Momentum instead.',
      link: { condition: 'Surge', text: 'Gain 5 Momentum instead.', effects: [{ op: 'damage', amount: 4, primary: true }, { op: 'momentum', amount: 5 }], replace: true },
    },
  },
  rendcall: {
    upgrade: {
      text: 'Deal 7. Link (Hex): detonate all Hexes on the target and gain 2 Momentum.',
      link: { condition: 'Hex', text: 'Detonate all Hexes on the target and gain 2 Momentum.', effects: [{ op: 'detonate' }, { op: 'momentum', amount: 2 }] },
    },
  },
  crossguard: {
    mutation: {
      name: 'Hexbound Crossguard', text: 'Gain 5 Block. Apply 2 Hex.',
      base: [{ op: 'block', amount: 5, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      // S9b.3 row 13: Momentum-floor consolidation
      text: 'Gain 5 Block. Link (Strike): gain 5 Momentum.',
      link: { condition: 'Strike', text: 'Gain 5 Momentum.', effects: [{ op: 'momentum', amount: 5 }] },
    },
  },
  bellows: {
    mutation: {
      name: 'Stitched Bellows', text: 'Apply 2 Hex. Draw 1.',
      base: [{ op: 'hex', amount: 2, primary: true }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      // S9b.3 row 14
      text: 'Gain 2 Momentum. Draw 1. Link (Guard): also gain 5 Block.',
      link: { condition: 'Guard', text: 'Also gain 5 Block.', effects: [{ op: 'block', amount: 5 }] },
    },
  },
  second_wind: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Second Wind'
      name: 'First-Drawn Second Wind', text: 'Gain 1 Thread. Draw 1.',
      base: [{ op: 'thread', amount: 1 }, { op: 'draw', amount: 1 }],
    },
    upgrade: {
      text: 'Gain Kindled 1. Draw 1. Link (Strike): also gain 1 Thread and Kindled 1.',
      link: { condition: 'Strike', text: 'Also gain 1 Thread and Kindled 1.', effects: [{ op: 'thread', amount: 1 }, { op: 'kindled', amount: 1 }] },
    },
  },
  hammerfall: {
    mutation: {
      name: 'Hexbound Hammerfall', text: 'Deal 7. Apply 3 Hex.',
      base: [{ op: 'damage', amount: 7, primary: true }, { op: 'hex', amount: 3 }],
    },
    upgrade: {
      text: 'Deal 10. Link (Guard): gain 6 Block.',
      link: { condition: 'Guard', text: 'Gain 6 Block.', effects: [{ op: 'block', amount: 6 }] },
    },
  },
  spark: {
    mutation: {
      name: 'Hexbound Spark', text: 'Apply 3 Hex.',
      base: [{ op: 'hex', amount: 3, primary: true }],
      link: { condition: 'Strike', text: 'Apply 1 more Hex.', effects: [{ op: 'hex', amount: 1 }] },
    },
    upgrade: {
      // S9b.1-2: base has been 3 Hex since M2-B1; the stale 2 hid the real
      // link improvement (Deal 3 → 5) behind a lie
      text: 'Apply 3 Hex. Link (Strike): deal 5.',
      link: { condition: 'Strike', text: 'Deal 5.', effects: [{ op: 'damage', amount: 5 }] },
    },
  },
  brace: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Brace'
      name: 'Cradled Brace', text: 'Gain 6 Block. Gain 1 Thread.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'thread', amount: 1 }],
    },
    upgrade: {
      text: 'Gain 7 Block. Link (Surge): draw 1 and gain Kindled 1.',
      link: { condition: 'Surge', text: 'Draw 1 and gain Kindled 1.', effects: [{ op: 'draw', amount: 1 }, { op: 'kindled', amount: 1 }] },
    },
  },
  kindle: {
    mutation: {
      name: 'Stitched Kindle', text: 'Gain 1 Thread. Apply 2 Hex.',
      base: [{ op: 'thread', amount: 1 }, { op: 'hex', amount: 2, primary: true }],
    },
    upgrade: {
      text: 'Gain 1 Thread. Gain 2 Momentum. Link (Strike): draw 1 and gain 1 more Momentum.',
      link: { condition: 'Strike', text: 'Draw 1 and gain 1 more Momentum.', effects: [{ op: 'draw', amount: 1 }, { op: 'momentum', amount: 1 }] },
    },
  },
  followthrough: {
    mutation: {
      name: 'Stitched Followthrough', text: 'Deal 4. Apply 2 Hex.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Deal 5. Link (Surge): apply 1 Weak and 1 Vulnerable.',
      link: { condition: 'Surge', text: 'Apply 1 Weak and 1 Vulnerable.', effects: [{ op: 'weak', amount: 1 }, { op: 'vulnerable', amount: 1 }] },
    },
  },

  // --- M1 uncommons ---
  haymaker: {
    mutation: {
      name: 'Hexbound Haymaker', text: 'Deal 8. Apply 4 Hex.',
      base: [{ op: 'damage', amount: 8, primary: true }, { op: 'hex', amount: 4 }],
    },
    upgrade: {
      text: 'Deal 12. Link (Strike): deal +Momentum×3 and don’t halve Momentum.',
      link: { condition: 'Strike', text: 'Deal +Momentum×3 and don’t halve Momentum.', effects: [{ op: 'momentumStrikeBonus', mult: 3, keepMomentum: true }] },
    },
  },
  dig_in: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Stitched Dig In'
      name: 'Cradled Dig In', text: 'Gain 6 Block. Your partner gains 4 Block.',
      base: [{ op: 'block', amount: 6, primary: true }, { op: 'partnerBlock', amount: 4 }],
    },
    upgrade: {
      text: 'Gain 8 Block. Link (Guard): your partner also gains 8 Block.',
      link: { condition: 'Guard', text: 'Your partner also gains 8 Block.', effects: [{ op: 'partnerBlock', amount: 8 }] },
    },
  },
  stoke: {
    mutation: {
      name: 'Stitched Stoke', text: 'Gain 2 Thread. Apply 2 Hex to ALL enemies.',
      base: [{ op: 'thread', amount: 2 }, { op: 'hexAll', amount: 2, primary: true }],
    },
    upgrade: {
      text: 'Power: at the start of your turn, gain 2 Momentum. Exhaust.',
      cost: 0,
    },
  },
  backdraft: {
    mutation: {
      // S8.6 (PROVISIONAL): birth-column rename, was 'Hexbound Backdraft'
      name: 'First-Drawn Backdraft', text: 'Draw 2.',
      base: [{ op: 'draw', amount: 2 }],
      link: { condition: 'Strike', text: 'Apply 2 Hex to ALL enemies.', effects: [{ op: 'hexAll', amount: 2 }] },
    },
    upgrade: {
      text: 'Draw 2. Link (Strike): gain 3 Momentum.',
      link: { condition: 'Strike', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
    },
  },
  pyre_vault: {
    mutation: {
      name: 'Stitched Pyre Vault', text: 'Deal 5 to ALL enemies. Apply 1 Hex to all.',
      base: [{ op: 'damageAll', amount: 5, primary: true }, { op: 'hexAll', amount: 1 }],
    },
    upgrade: {
      text: 'Deal 7 to ALL enemies. Link (Surge): gain 3 Momentum.',
      link: { condition: 'Surge', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
    },
  },
  shoulder_through: {
    mutation: {
      name: 'Hexbound Shoulder Through', text: 'Gain 8 Block. Apply 2 Hex.',
      base: [{ op: 'block', amount: 8, primary: true }, { op: 'hex', amount: 2 }],
    },
    upgrade: {
      text: 'Gain 10 Block. Link (Strike): apply 2 Vulnerable.',
      link: { condition: 'Strike', text: 'Apply 2 Vulnerable.', effects: [{ op: 'vulnerable', amount: 2 }] },
    },
  },
  stamp_out: {
    mutation: {
      name: 'Stitched Stamp Out', text: 'Deal 4. Apply 3 Hex.',
      base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 3 }],
    },
    upgrade: {
      text: 'Deal 5. Link (Hex): detonate up to 5 Hexes on the target.',
      link: { condition: 'Hex', text: 'Detonate up to 5 Hexes on the target.', effects: [{ op: 'detonate', max: 5 }] },
    },
  },

  // --- M1 rares (mutations optional at rare; upgrades still required) ---
  avalanche: {
    upgrade: {
      text: 'Deal 8 three times. Link (Partner’s card): deal 8 five times instead.',
      cost: 2,
    },
  },
  wildfire_heart: {
    upgrade: {
      text: 'Power: Momentum no longer halves after Strikes. Exhaust.',
      cost: 1,
    },
  },
  // S13.2: call_and_answer's overlay retired — the revised engine (cards.ts)
  // carries its own cost-cut upgrade, the power-card convention.
};
