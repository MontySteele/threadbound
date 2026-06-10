// M1 card pool: 20 cards per character (§9 identities; 10C/7U/3R each).
// Covenant compliance (§3, §2.3) audited in docs/content-audit.md and enforced
// by test/covenant.test.ts. All rules are data here; effects.ts interprets.

import { CardDef, CharacterId } from '../types';

export const CARDS: Record<string, CardDef> = {};

function def(card: CardDef): void {
  CARDS[card.id] = card;
}

// ---------------------------------------------------------------------------
// VESS, the Hexweaver — control / set-up / scaling (§9)
// ---------------------------------------------------------------------------

// Commons (10) — every broad tag represented (§4)
def({
  id: 'needlework', name: 'Needlework', character: 'vess', rarity: 'common', cost: 1, tag: 'Hex',
  needsTarget: true,
  text: 'Apply 4 Hex.',
  base: [{ op: 'hex', amount: 4, primary: true }], // M2-B1 lever 3: 3 → 4
  link: { condition: 'any', text: 'Apply 1 additional Hex per link fired earlier this Chain.', effects: [{ op: 'hexPerLinkFired', per: 1 }] },
  mutation: {
    name: 'Cinder Needlework', text: 'Apply 2 Hex. Gain 2 Momentum.',
    base: [{ op: 'hex', amount: 2, primary: true }, { op: 'momentum', amount: 2 }],
  },
});
def({
  id: 'pinprick', name: 'Pinprick', character: 'vess', rarity: 'common', cost: 0, tag: 'Hex',
  needsTarget: true,
  text: 'Apply 3 Hex.',
  base: [{ op: 'hex', amount: 3, primary: true }], // M2-B1 lever 3: 2 → 3
  link: { condition: 'Strike', text: 'Apply 4 instead.', effects: [{ op: 'hex', amount: 4, primary: true }], replace: true },
});
def({
  id: 'withering', name: 'Withering', character: 'vess', rarity: 'common', cost: 1, tag: 'Hex',
  text: 'Apply 3 Hex to ALL enemies.',
  base: [{ op: 'hexAll', amount: 3, primary: true }], // M2-B1 lever 3 (2nd pass): 2 → 3
  link: { condition: 'Guard', text: 'Also apply 1 Weak to all.', effects: [{ op: 'weakAll', amount: 1 }] },
  mutation: {
    name: 'Cinder-touched Withering', text: 'Apply 1 Hex to ALL enemies. Draw 1.',
    base: [{ op: 'hexAll', amount: 1, primary: true }, { op: 'draw', amount: 1 }],
  },
});
def({
  id: 'patient_knife', name: 'Patient Knife', character: 'vess', rarity: 'common', cost: 2, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 6.',
  base: [{ op: 'damage', amount: 6, primary: true }],
  link: { condition: 'Hex', text: 'Deal 6 + 2× target’s Hex instead (does not detonate).', effects: [{ op: 'damagePerHex', base: 6, perHex: 2, primary: true }], replace: true },
});
def({
  id: 'stitchblade', name: 'Stitchblade', character: 'vess', rarity: 'common', cost: 1, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 5.',
  base: [{ op: 'damage', amount: 5, primary: true }],
  link: { condition: 'Hex', text: 'Apply 3 Hex.', effects: [{ op: 'hex', amount: 3 }] }, // lever 3 (2nd pass)
});
def({
  id: 'thornward', name: 'Thornward', character: 'vess', rarity: 'common', cost: 1, tag: 'Guard',
  text: 'Gain 6 Block.',
  base: [{ op: 'block', amount: 6, primary: true }],
  link: { condition: 'Hex', text: 'Apply 2 Hex to all enemies.', effects: [{ op: 'hexAll', amount: 2 }] }, // lever 3 (3rd pass)
});
def({
  id: 'wardknot', name: 'Wardknot', character: 'vess', rarity: 'common', cost: 1, tag: 'Guard',
  text: 'Gain 5 Block.',
  base: [{ op: 'block', amount: 5, primary: true }],
  link: { condition: 'any', text: 'Gain 3 more.', effects: [{ op: 'block', amount: 3 }] },
});
def({
  id: 'loose_stitch', name: 'Loose Stitch', character: 'vess', rarity: 'common', cost: 0, tag: 'Surge',
  text: 'Draw 1.',
  base: [{ op: 'draw', amount: 1 }],
  link: { condition: 'Strike', text: 'Draw 2 instead.', effects: [{ op: 'draw', amount: 2 }], replace: true },
});
def({
  id: 'quickening', name: 'Quickening', character: 'vess', rarity: 'common', cost: 1, tag: 'Surge',
  text: 'Draw 2.',
  base: [{ op: 'draw', amount: 2 }],
  link: { condition: 'any', text: 'Your partner draws 1.', effects: [{ op: 'partnerDraw', amount: 1 }] }, // §4: Rite too sparse for a common link
});
def({
  id: 'mendthread', name: 'Mendthread', character: 'vess', rarity: 'common', cost: 1, tag: 'Rite',
  text: 'Gain 1 Thread.',
  base: [{ op: 'thread', amount: 1 }],
  link: { condition: 'Guard', text: 'Your partner gains 4 Block.', effects: [{ op: 'partnerBlock', amount: 4 }] },
});

// Uncommons (7) — self-similar allowed but scarce (§2.3): Inheritance only.
def({
  id: 'inheritance', name: 'Inheritance', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Rite',
  text: 'Gain 2 Thread.',
  base: [{ op: 'thread', amount: 2 }],
  link: { condition: 'Rite', text: 'Gain 3 instead and your partner draws 1.', effects: [{ op: 'thread', amount: 3 }, { op: 'partnerDraw', amount: 1 }], replace: true },
});
def({
  id: 'black_lattice', name: 'Black Lattice', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Rite',
  text: 'Power: whenever Hexes detonate, gain 3 Block.',
  base: [{ op: 'power', power: 'black_lattice' }],
});
def({
  id: 'saturate', name: 'Saturate', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Hex', // lever 3: cost 2 → 1
  needsTarget: true,
  text: 'Double the target’s Hex.',
  base: [{ op: 'doubleHex' }],
  link: { condition: 'Surge', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
});
def({
  id: 'lashing_coil', name: 'Lashing Coil', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Strike',
  text: 'Deal 4 to ALL enemies.',
  base: [{ op: 'damageAll', amount: 4, primary: true }],
  link: { condition: 'Hex', text: 'Apply 3 Hex to all enemies.', effects: [{ op: 'hexAll', amount: 3 }] }, // lever 3 (3rd pass)
});
def({
  id: 'seamripper', name: 'Seamripper', character: 'vess', rarity: 'uncommon', cost: 1, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 7.',
  base: [{ op: 'damage', amount: 7, primary: true }],
  link: { condition: 'Surge', text: 'Apply 1 Vulnerable.', effects: [{ op: 'vulnerable', amount: 1 }] },
});
def({
  id: 'knotward_veil', name: 'Knotward Veil', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Guard',
  text: 'Gain 9 Block.',
  base: [{ op: 'block', amount: 9, primary: true }],
  link: { condition: 'Rite', text: 'Gain 1 Thread.', effects: [{ op: 'thread', amount: 1 }] },
});
def({
  id: 'spindle_step', name: 'Spindle Step', character: 'vess', rarity: 'uncommon', cost: 0, tag: 'Surge',
  exhaust: true,
  text: 'Gain Kindled 1. Exhaust.',
  base: [{ op: 'kindled', amount: 1 }],
  link: { condition: 'Guard', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
});

// Rares (3) — narrow 'partner' condition lives only here (§2.2).
def({
  id: 'gravebloom', name: 'Gravebloom', character: 'vess', rarity: 'rare', cost: 2, tag: 'Hex',
  needsTarget: true,
  text: 'Apply 4 Hex to ALL enemies.',
  base: [{ op: 'hexAll', amount: 4, primary: true }],
  link: { condition: 'partner', text: 'Link (Partner’s card): apply 4 more to the target.', effects: [{ op: 'hex', amount: 4 }] },
});
def({
  id: 'final_word', name: 'Final Word', character: 'vess', rarity: 'rare', cost: 3, tag: 'Strike',
  needsTarget: true,
  text: 'Detonate all Hexes on ALL enemies, then deal damage to the target equal to the stacks detonated.',
  base: [{ op: 'detonateAllEnemies' }, { op: 'damagePerDetonated', per: 1 }],
});
def({
  id: 'unbroken_line', name: 'Unbroken Line', character: 'vess', rarity: 'rare', cost: 2, tag: 'Rite',
  text: 'Power: at the start of each turn, gain 1 Thread.',
  base: [{ op: 'power', power: 'unbroken_line' }],
});

// ---------------------------------------------------------------------------
// BRAM, the Cinderfist — tempo / momentum / detonation (§9)
// ---------------------------------------------------------------------------

// Commons (10)
def({
  id: 'opener', name: 'Opener', character: 'bram', rarity: 'common', cost: 0, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 4. Gain 2 Momentum.',
  base: [{ op: 'damage', amount: 4, primary: true }, { op: 'momentum', amount: 2 }],
  link: { condition: 'Surge', text: 'Gain 4 Momentum instead.', effects: [{ op: 'damage', amount: 4, primary: true }, { op: 'momentum', amount: 4 }], replace: true },
});
def({
  id: 'rendcall', name: 'Rendcall', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 8.',
  base: [{ op: 'damage', amount: 8, primary: true }],
  link: { condition: 'Hex', text: 'Detonate all Hexes on the target.', effects: [{ op: 'detonate' }] },
  mutation: {
    name: 'Stitched Rendcall', text: 'Deal 6. Apply 2 Hex.',
    base: [{ op: 'damage', amount: 6, primary: true }, { op: 'hex', amount: 2 }],
  },
});
def({
  id: 'crossguard', name: 'Crossguard', character: 'bram', rarity: 'common', cost: 1, tag: 'Guard',
  text: 'Gain 6 Block.',
  base: [{ op: 'block', amount: 6, primary: true }],
  link: { condition: 'Strike', text: 'Gain 3 Momentum.', effects: [{ op: 'momentum', amount: 3 }] },
});
def({
  id: 'bellows', name: 'Bellows', character: 'bram', rarity: 'common', cost: 1, tag: 'Surge',
  text: 'Gain 2 Momentum. Draw 1.',
  base: [{ op: 'momentum', amount: 2, primary: true }, { op: 'draw', amount: 1 }],
  link: { condition: 'Guard', text: 'Also gain 3 Block.', effects: [{ op: 'block', amount: 3 }] },
});
def({
  id: 'second_wind', name: 'Second Wind', character: 'bram', rarity: 'common', cost: 1, tag: 'Surge',
  text: 'Gain Kindled 1. Draw 1.',
  base: [{ op: 'kindled', amount: 1 }, { op: 'draw', amount: 1 }],
  link: { condition: 'any', text: 'Also gain 1 Thread.', effects: [{ op: 'thread', amount: 1 }] },
});
def({
  id: 'hammerfall', name: 'Hammerfall', character: 'bram', rarity: 'common', cost: 2, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 10.',
  base: [{ op: 'damage', amount: 10, primary: true }],
  link: { condition: 'Guard', text: 'Gain 5 Block.', effects: [{ op: 'block', amount: 5 }] },
});
def({
  id: 'spark', name: 'Spark', character: 'bram', rarity: 'common', cost: 0, tag: 'Hex',
  needsTarget: true,
  text: 'Apply 3 Hex.',
  base: [{ op: 'hex', amount: 3, primary: true }], // M2-B1 lever 3: 2 → 3
  link: { condition: 'Strike', text: 'Deal 3.', effects: [{ op: 'damage', amount: 3 }] },
});
def({
  id: 'brace', name: 'Brace', character: 'bram', rarity: 'common', cost: 1, tag: 'Guard',
  text: 'Gain 7 Block.',
  base: [{ op: 'block', amount: 7, primary: true }],
  link: { condition: 'Surge', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
});
def({
  id: 'kindle', name: 'Kindle', character: 'bram', rarity: 'common', cost: 1, tag: 'Rite',
  text: 'Gain 1 Thread. Gain 1 Momentum.',
  base: [{ op: 'thread', amount: 1 }, { op: 'momentum', amount: 1, primary: true }],
  link: { condition: 'Hex', text: 'Draw 1.', effects: [{ op: 'draw', amount: 1 }] },
});
def({
  id: 'followthrough', name: 'Followthrough', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 6.',
  base: [{ op: 'damage', amount: 6, primary: true }],
  link: { condition: 'Hex', text: 'Apply 1 Weak.', effects: [{ op: 'weak', amount: 1 }] },
});

// Uncommons (7) — self-similar scarce (§2.3): Haymaker, Dig In (both §9 samples).
def({
  id: 'haymaker', name: 'Haymaker', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 12.',
  base: [{ op: 'damage', amount: 12, primary: true }],
  link: { condition: 'Strike', text: 'Deal +Momentum×2 and don’t halve Momentum.', effects: [{ op: 'momentumStrikeBonus', mult: 2, keepMomentum: true }] },
});
def({
  id: 'dig_in', name: 'Dig In', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Guard',
  text: 'Gain 8 Block.',
  base: [{ op: 'block', amount: 8, primary: true }],
  link: { condition: 'Guard', text: 'Your partner also gains 5 Block.', effects: [{ op: 'partnerBlock', amount: 5 }] },
});
def({
  id: 'stoke', name: 'Stoke', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Rite',
  text: 'Power: at the start of your turn, gain 2 Momentum.',
  base: [{ op: 'power', power: 'stoke' }],
});
def({
  id: 'backdraft', name: 'Backdraft', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Surge',
  text: 'Draw 2.',
  base: [{ op: 'draw', amount: 2 }],
  link: { condition: 'Strike', text: 'Gain 2 Momentum.', effects: [{ op: 'momentum', amount: 2 }] },
});
def({
  id: 'pyre_vault', name: 'Pyre Vault', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Strike',
  text: 'Deal 7 to ALL enemies.',
  base: [{ op: 'damageAll', amount: 7, primary: true }],
  link: { condition: 'Surge', text: 'Gain 2 Momentum.', effects: [{ op: 'momentum', amount: 2 }] },
});
def({
  id: 'shoulder_through', name: 'Shoulder Through', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Guard',
  needsTarget: true,
  text: 'Gain 10 Block.',
  base: [{ op: 'block', amount: 10, primary: true }],
  link: { condition: 'Strike', text: 'Apply 1 Vulnerable.', effects: [{ op: 'vulnerable', amount: 1 }] },
});
def({
  id: 'stamp_out', name: 'Stamp Out', character: 'bram', rarity: 'uncommon', cost: 1, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 5.',
  base: [{ op: 'damage', amount: 5, primary: true }],
  link: { condition: 'Hex', text: 'Detonate up to 3 Hexes on the target.', effects: [{ op: 'detonate', max: 3 }] },
});

// Rares (3)
def({
  id: 'avalanche', name: 'Avalanche', character: 'bram', rarity: 'rare', cost: 3, tag: 'Strike',
  needsTarget: true,
  text: 'Deal 8 three times.',
  base: [{ op: 'damage', amount: 8, times: 3, primary: true }],
  link: { condition: 'partner', text: 'Link (Partner’s card): deal 8 five times instead.', effects: [{ op: 'damage', amount: 8, times: 5, primary: true }], replace: true },
});
def({
  id: 'wildfire_heart', name: 'Wildfire Heart', character: 'bram', rarity: 'rare', cost: 2, tag: 'Rite',
  text: 'Power: Momentum no longer halves after Strikes.',
  base: [{ op: 'power', power: 'wildfire_heart' }],
});
def({
  id: 'call_and_answer', name: 'Call and Answer', character: 'bram', rarity: 'rare', cost: 1, tag: 'Surge',
  text: 'Draw 2.',
  base: [{ op: 'draw', amount: 2 }],
  // M2-A2: link energy is meaningful again as Kindled
  link: { condition: 'partner', text: 'Link (Partner’s card): gain Kindled 2.', effects: [{ op: 'kindled', amount: 2 }] },
});

// ---------------------------------------------------------------------------
// Starter-only cards (M2-A5): weak, mostly linkless commons so early decks are
// genuinely poor and drafting matters. Never appear in rewards/shops/events.
// ---------------------------------------------------------------------------

def({
  id: 'hatpin', name: 'Hatpin', character: 'vess', rarity: 'common', cost: 1, tag: 'Strike',
  starterOnly: true, needsTarget: true,
  text: 'Deal 4.',
  base: [{ op: 'damage', amount: 4, primary: true }],
  mutation: { name: 'Heated Hatpin', text: 'Deal 3. Gain 1 Momentum.', base: [{ op: 'damage', amount: 3, primary: true }, { op: 'momentum', amount: 1 }] },
  upgrade: { text: 'Deal 5. Link (Hex): apply 1 Hex.', base: [{ op: 'damage', amount: 5, primary: true }], link: { condition: 'Hex', text: 'Apply 1 Hex.', effects: [{ op: 'hex', amount: 1 }] } },
});
def({
  id: 'patchwork', name: 'Patchwork', character: 'vess', rarity: 'common', cost: 1, tag: 'Guard',
  starterOnly: true,
  text: 'Gain 4 Block.',
  base: [{ op: 'block', amount: 4, primary: true }],
  mutation: { name: 'Riveted Patchwork', text: 'Gain 3 Block. Gain 1 Momentum.', base: [{ op: 'block', amount: 3, primary: true }, { op: 'momentum', amount: 1 }] },
  upgrade: { text: 'Gain 5 Block. Link (any): gain 2 more.', base: [{ op: 'block', amount: 5, primary: true }], link: { condition: 'any', text: 'Gain 2 more.', effects: [{ op: 'block', amount: 2 }] } },
});
def({
  id: 'jab', name: 'Jab', character: 'bram', rarity: 'common', cost: 1, tag: 'Strike',
  starterOnly: true, needsTarget: true,
  text: 'Deal 5.',
  base: [{ op: 'damage', amount: 5, primary: true }],
  mutation: { name: 'Needled Jab', text: 'Deal 4. Apply 1 Hex.', base: [{ op: 'damage', amount: 4, primary: true }, { op: 'hex', amount: 1 }] },
  upgrade: { text: 'Deal 6. Link (Surge): gain 1 Momentum.', base: [{ op: 'damage', amount: 6, primary: true }], link: { condition: 'Surge', text: 'Gain 1 Momentum.', effects: [{ op: 'momentum', amount: 1 }] } },
});
def({
  id: 'brace_up', name: 'Brace-Up', character: 'bram', rarity: 'common', cost: 1, tag: 'Guard',
  starterOnly: true,
  text: 'Gain 4 Block.',
  base: [{ op: 'block', amount: 4, primary: true }],
  mutation: { name: 'Stitched Brace-Up', text: 'Gain 3 Block. Gain 1 Thread.', base: [{ op: 'block', amount: 3, primary: true }, { op: 'thread', amount: 1 }] },
  upgrade: { text: 'Gain 5 Block. Link (any): gain 2 more.', base: [{ op: 'block', amount: 5, primary: true }], link: { condition: 'any', text: 'Gain 2 more.', effects: [{ op: 'block', amount: 2 }] } },
});

// M2-A5 starter decks
export const STARTER_DECKS: Record<CharacterId, string[]> = {
  vess: [
    'hatpin', 'hatpin', 'hatpin', 'hatpin', 'patchwork', 'patchwork', 'patchwork',
    'pinprick', 'loose_stitch', 'mendthread',
  ],
  bram: [
    'jab', 'jab', 'jab', 'jab', 'brace_up', 'brace_up', 'brace_up',
    'opener', 'second_wind', 'kindle',
  ],
};

/** The draftable pool: starter-only cards are excluded (M2-A5). */
export function cardsForCharacter(character: CharacterId): CardDef[] {
  return Object.values(CARDS).filter((c) => c.character === character && !c.starterOnly);
}

/** Neutral pool (M2-B1) — draftable by either character. */
export function neutralCards(): CardDef[] {
  return Object.values(CARDS).filter((c) => c.character === 'neutral');
}
