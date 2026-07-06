// S13.2 — the four new rares (D3: briefs approved; these full designs return
// as sign-off rows in the S13 status doc, numbers PROVISIONAL until then).
//
// Design law for this pass: a rare must be DILUTION-RESISTANT — a power, a
// build-around, or a card that scales with chain/pair/run state rather than
// with its own draw frequency (the deck-size sweep's verdict: the ~1-point
// tail is dilution, and the working rares — unbroken_line, wildfire_heart —
// are powers). All four here are exhaust powers whose value rides PAIR play:
// chain position, Resonance, Reclaim, the shared Thread pool. Every hook
// carries a once-per-turn cap (Worn Knife/Saturate precedent); no Hex-amount
// growth anywhere (covenant). Upgrades follow the power-card convention:
// a cost cut (unbroken_line+/wildfire_heart+ precedent).

import { CardDef } from '../types';

export const VESS_S13_RARES: CardDef[] = [
  {
    // the chain-position payoff: the selvage is the woven edge that keeps
    // the row from unraveling — closing the Chain seals it for BOTH seats
    id: 'selvage', name: 'Selvage', character: 'vess', rarity: 'uncommon', cost: 2, tag: 'Rite',
    exhaust: true,
    text: 'Power: when the resolved Chain closes on your card, you and your partner each gain 3 Block. Exhaust.',
    base: [{ op: 'power', power: 'selvage' }],
    mutation: {
      // S17 8a (ratified 2026-07-06): the demotion's owed mutation
      name: 'Raw Edge', text: 'Power: when the resolved Chain closes on your card, gain 4 Block. Exhaust.',
      base: [{ op: 'power', power: 'raw_edge' }],
    },
    upgrade: { cost: 1, text: 'Power: when the resolved Chain closes on your card, you and your partner each gain 3 Block. Exhaust.' },
  },
  {
    // the Reclaim-keyed engine — PULL-based only (per covenant §7: Reclaim
    // is the puller's act): what returns through her hands pays its way
    id: 'keepsake', name: 'Keepsake', character: 'vess', rarity: 'rare', cost: 1, tag: 'Rite',
    exhaust: true,
    text: 'Power: whenever you Reclaim your partner’s card, gain 1 Thread and draw 1. Exhaust.',
    base: [{ op: 'power', power: 'keepsake' }],
    upgrade: { cost: 0, text: 'Power: whenever you Reclaim your partner’s card, gain 1 Thread and draw 1. Exhaust.' },
  },
];

export const BRAM_S13_RARES: CardDef[] = [
  {
    // the Resonance amplifier: struck bellmetal keeps ringing — the pair's
    // harmony converts to his tempo
    id: 'bellmetal', name: 'Bellmetal', character: 'bram', rarity: 'rare', cost: 2, tag: 'Rite',
    exhaust: true,
    text: 'Power: when the pair ignites a Resonance, gain 3 Momentum and draw 1. Exhaust.',
    base: [{ op: 'power', power: 'bellmetal' }],
    upgrade: { cost: 1, text: 'Power: when the pair ignites a Resonance, gain 3 Momentum and draw 1. Exhaust.' },
  },
  {
    // the Thread-spend payoff: the shared pool's price, paid back in fire —
    // either seat's spend stokes him (the pool is the pair's, so is the heat)
    id: 'stokers_due', name: 'Stoker’s Due', character: 'bram', rarity: 'uncommon', cost: 2, tag: 'Rite',
    exhaust: true,
    text: 'Power: the first time Thread is spent each turn, gain 2 Momentum and 3 Block. Exhaust.',
    base: [{ op: 'power', power: 'stokers_due' }],
    mutation: {
      // S17 8a (ratified 2026-07-06): the demotion's owed mutation
      name: 'Stoker’s Advance', text: 'Power: the first time Thread is spent each turn, gain 2 Momentum. Draw 1 when played. Exhaust.',
      base: [{ op: 'power', power: 'stokers_advance' }, { op: 'draw', amount: 1 }],
    },
    upgrade: { cost: 1, text: 'Power: the first time Thread is spent each turn, gain 2 Momentum and 3 Block. Exhaust.' },
  },
];
