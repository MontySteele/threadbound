// Programmatic Covenant audit (§3, §2.3) — the enforcement pass that keeps
// pool rules from silently dying as content grows. Mirrors docs/content-audit.md.

import { describe, expect, it } from 'vitest';
import { CARDS, STARTER_DECKS, cardsForCharacter } from '../src/content/cards';
import { BroadTag, CharacterId } from '../src/types';

const BROAD_TAGS: BroadTag[] = ['Strike', 'Guard', 'Hex', 'Surge', 'Rite'];
const CHARACTERS: CharacterId[] = ['vess', 'bram'];

describe('Covenant (§3) and pool rules (§2.3)', () => {
  const all = Object.values(CARDS);

  it('M1 pool: 20 cards per character, 10C/7U/3R', () => {
    for (const ch of CHARACTERS) {
      const pool = cardsForCharacter(ch);
      expect(pool.length).toBe(20);
      expect(pool.filter((c) => c.rarity === 'common').length).toBe(10);
      expect(pool.filter((c) => c.rarity === 'uncommon').length).toBe(7);
      expect(pool.filter((c) => c.rarity === 'rare').length).toBe(3);
    }
  });

  it('rule 1: every card is playable standalone (non-empty base effects)', () => {
    for (const c of all) expect(c.base.length, c.id).toBeGreaterThan(0);
  });

  it('rule 2: common/uncommon links read broad tags (or any) only', () => {
    for (const c of all) {
      if (!c.link || c.rarity === 'rare') continue;
      expect([...BROAD_TAGS, 'any']).toContain(c.link.condition);
    }
  });

  it('§2.2: narrow conditions (partner) appear only at rare', () => {
    for (const c of all) {
      if (c.link?.condition === 'partner') expect(c.rarity, c.id).toBe('rare');
    }
  });

  it('§2.3: no self-similar cards at common; scarce (≤2/char) at uncommon', () => {
    for (const c of all) {
      const selfSimilar = c.link && c.link.condition === c.tag;
      if (c.rarity === 'common') expect(selfSimilar, `${c.id} is self-similar at common`).toBeFalsy();
    }
    for (const ch of CHARACTERS) {
      const n = cardsForCharacter(ch).filter(
        (c) => c.rarity === 'uncommon' && c.link && c.link.condition === c.tag,
      ).length;
      expect(n, `${ch} self-similar uncommons`).toBeLessThanOrEqual(2);
    }
  });

  it('§4: every broad tag appears at common rarity in both pools', () => {
    for (const ch of CHARACTERS) {
      const commons = cardsForCharacter(ch).filter((c) => c.rarity === 'common');
      for (const tag of BROAD_TAGS) {
        expect(commons.some((c) => c.tag === tag), `${ch} commons missing ${tag}`).toBe(true);
      }
    }
  });

  it('§4: each pool leans ~35% into its heavy tag but stays diverse', () => {
    const vessHex = cardsForCharacter('vess').filter((c) => c.tag === 'Hex').length;
    const bramStrike = cardsForCharacter('bram').filter((c) => c.tag === 'Strike').length;
    expect(vessHex).toBeGreaterThanOrEqual(5);
    expect(vessHex).toBeLessThanOrEqual(9);
    expect(bramStrike).toBeGreaterThanOrEqual(5);
    expect(bramStrike).toBeLessThanOrEqual(9);
  });

  it('starter decks reference only existing common cards of the right character', () => {
    for (const ch of CHARACTERS) {
      for (const id of STARTER_DECKS[ch]) {
        const def = CARDS[id];
        expect(def, id).toBeTruthy();
        expect(def.character).toBe(ch);
        expect(def.rarity).toBe('common');
      }
      expect(STARTER_DECKS[ch].length).toBe(10);
    }
  });

  it('mutations (§7) are deterministic hand-authored variants with standalone bases', () => {
    for (const c of all) {
      if (c.mutation) expect(c.mutation.base.length, c.id).toBeGreaterThan(0);
    }
  });
});
