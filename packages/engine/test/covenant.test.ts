// Programmatic Covenant audit (§3, §2.3), scaled to the full M2 pool (M2-B1).
// This is the central enforcement pass over all content — agent-drafted
// content included. Mirrors docs/content-audit.md.

import { describe, expect, it } from 'vitest';
import { CARDS, ENEMIES, EVENTS, ALL_RELICS, eventsForAct } from '../src/content/registry';
import { STARTER_DECKS, cardsForCharacter, neutralCards } from '../src/content/cards';
import { POWERS } from '../src/content/powers';
import { ENCOUNTERS, ENCOUNTER_POOLS } from '../src/content/encounters';
import { BroadTag, CardDef, CharacterId, EffectOp } from '../src/types';

const BROAD_TAGS: BroadTag[] = ['Strike', 'Guard', 'Hex', 'Surge', 'Rite'];
const CHARACTERS: CharacterId[] = ['vess', 'bram'];

function isSelfSimilar(c: CardDef): boolean {
  return !!c.link && c.link.condition === c.tag;
}

describe('Covenant (§3) and pool rules (§2.3) — full M2 pool', () => {
  const all = Object.values(CARDS);

  it('pool shape: 55 per character (25C/20U/10R) + 15 neutral (8/5/2), starters excluded', () => {
    for (const ch of CHARACTERS) {
      const pool = cardsForCharacter(ch);
      expect(pool.length, ch).toBe(55);
      expect(pool.filter((c) => c.rarity === 'common').length, `${ch} commons`).toBe(25);
      expect(pool.filter((c) => c.rarity === 'uncommon').length, `${ch} uncommons`).toBe(20);
      expect(pool.filter((c) => c.rarity === 'rare').length, `${ch} rares`).toBe(10);
    }
    const n = neutralCards();
    expect(n.length).toBe(15);
    expect(n.filter((c) => c.rarity === 'common').length).toBe(8);
    expect(n.filter((c) => c.rarity === 'uncommon').length).toBe(5);
    expect(n.filter((c) => c.rarity === 'rare').length).toBe(2);
  });

  it('rule 1: every card is playable standalone', () => {
    for (const c of all) expect(c.base.length, c.id).toBeGreaterThan(0);
  });

  it('rule 2: common/uncommon links read broad tags (or any) only; partner is rare-only (§2.2)', () => {
    for (const c of all) {
      if (!c.link) continue;
      if (c.rarity !== 'rare') expect([...BROAD_TAGS, 'any'], c.id).toContain(c.link.condition);
      if (c.link.condition === 'partner') expect(c.rarity, c.id).toBe('rare');
      // upgrades must obey the same rarity rules they were born under
      if (c.upgrade?.link && c.rarity !== 'rare') {
        expect([...BROAD_TAGS, 'any'], `${c.id} upgrade`).toContain(c.upgrade.link.condition);
      }
    }
  });

  it('§2.3: zero self-similar commons; ≤4 self-similar uncommons per character (M2-B1)', () => {
    for (const c of all) {
      if (c.rarity === 'common') expect(isSelfSimilar(c), `${c.id} self-similar common`).toBe(false);
    }
    for (const ch of CHARACTERS) {
      const n = cardsForCharacter(ch).filter((c) => c.rarity === 'uncommon' && isSelfSimilar(c)).length;
      expect(n, `${ch} self-similar uncommons`).toBeLessThanOrEqual(4);
    }
    const nNeutral = neutralCards().filter((c) => c.rarity === 'uncommon' && isSelfSimilar(c)).length;
    expect(nNeutral).toBeLessThanOrEqual(1);
  });

  it('§4 + M2-B1: every broad tag has ≥3 commons per character', () => {
    for (const ch of CHARACTERS) {
      const commons = cardsForCharacter(ch).filter((c) => c.rarity === 'common');
      for (const tag of BROAD_TAGS) {
        expect(commons.filter((c) => c.tag === tag).length, `${ch} commons ${tag}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('§4: pools lean into their heavy tags without drowning them', () => {
    const vessHex = cardsForCharacter('vess').filter((c) => c.tag === 'Hex').length / 55;
    const bramStrike = cardsForCharacter('bram').filter((c) => c.tag === 'Strike').length / 55;
    expect(vessHex).toBeGreaterThanOrEqual(0.27);
    expect(vessHex).toBeLessThanOrEqual(0.42);
    expect(bramStrike).toBeGreaterThanOrEqual(0.3);
    expect(bramStrike).toBeLessThanOrEqual(0.45);
  });

  it('M2-B1: mutations on every common/uncommon; upgrades on every card', () => {
    for (const c of all) {
      if (c.rarity !== 'rare') expect(c.mutation, `${c.id} missing mutation`).toBeTruthy();
      expect(c.upgrade ?? c.starterOnly, `${c.id} missing upgrade`).toBeTruthy();
      if (c.mutation) expect(c.mutation.base.length, c.id).toBeGreaterThan(0);
    }
  });

  it('M2-A2: no card references a nonexistent energy op; Kindled is the only banking', () => {
    const scan = (effects: EffectOp[] | undefined, where: string) => {
      for (const e of effects ?? []) {
        expect((e as { op: string }).op, where).not.toBe('energy');
      }
    };
    for (const c of all) {
      scan(c.base, c.id);
      scan(c.link?.effects, c.id);
      scan(c.mutation?.base, c.id);
      scan(c.upgrade?.base, c.id);
    }
  });

  it('every power referenced by a card exists in the POWERS registry', () => {
    const scan = (effects: EffectOp[] | undefined, where: string) => {
      for (const e of effects ?? []) {
        if (e.op === 'power') expect(POWERS[e.power], `${where} references unknown power ${e.power}`).toBeTruthy();
      }
    };
    for (const c of all) {
      scan(c.base, c.id);
      scan(c.link?.effects, c.id);
      scan(c.mutation?.base, c.id);
      scan(c.upgrade?.base, c.id);
    }
  });

  it('M2-A5: starter decks are 10 starter-weighted cards; starter-only cards never in pools', () => {
    for (const ch of CHARACTERS) {
      expect(STARTER_DECKS[ch].length).toBe(10);
      for (const id of STARTER_DECKS[ch]) {
        expect(CARDS[id], id).toBeTruthy();
        expect(CARDS[id].character).toBe(ch);
      }
      expect(STARTER_DECKS[ch].filter((id) => CARDS[id].starterOnly).length).toBeGreaterThanOrEqual(7);
      for (const c of cardsForCharacter(ch)) expect(c.starterOnly, c.id).toBeFalsy();
    }
  });
});

describe('relics (M2-B2)', () => {
  it('28 relics, ≥8 co-op, Wedding Knife present, passives sane', () => {
    expect(ALL_RELICS.length).toBe(28);
    expect(ALL_RELICS.filter((r) => r.coop).length).toBeGreaterThanOrEqual(8);
    const knife = ALL_RELICS.find((r) => r.passives?.includes('wedding_knife'));
    expect(knife).toBeTruthy();
    expect(knife!.id).toBe('wedding_knife');
    const ids = new Set(ALL_RELICS.map((r) => r.id));
    expect(ids.size).toBe(28);
  });
});

describe('world referential integrity (M2-B3/B5)', () => {
  it('encounters reference existing enemies; pools reference existing encounters', () => {
    for (const enc of Object.values(ENCOUNTERS)) {
      for (const id of enc.enemies) expect(ENEMIES[id], `${enc.id} → ${id}`).toBeTruthy();
    }
    for (const act of [1, 2] as const) {
      const pools = ENCOUNTER_POOLS[act];
      for (const id of [...pools.easy, ...pools.normal, ...pools.elite, pools.boss]) {
        expect(ENCOUNTERS[id], id).toBeTruthy();
      }
      expect(pools.elite.length).toBe(2); // 2 elites per act (M2-B3)
    }
    expect(ENCOUNTERS.finale_boss).toBeTruthy();
    expect(ENEMIES.the_unraveled.unraveled?.severTurns).toBe(2);
  });

  it('chorus trio exists and shares the chorus flag (§6)', () => {
    const chorus = Object.values(ENEMIES).filter((e) => e.chorus);
    expect(chorus.length).toBe(3);
  });

  it('events: ≥12 total, ≥4 crossed, crossed tone split ~60/40 (M2-B5)', () => {
    const events = Object.values(EVENTS);
    expect(events.length).toBeGreaterThanOrEqual(12);
    const crossed = events.filter((e) => e.crossed);
    expect(crossed.length).toBeGreaterThanOrEqual(4);
    const comedy = crossed.filter((e) => e.tone === 'comedy').length;
    expect(comedy).toBeGreaterThanOrEqual(1);
    expect(comedy / crossed.length).toBeLessThanOrEqual(0.5);
    expect(eventsForAct(1).length).toBeGreaterThanOrEqual(4);
    expect(eventsForAct(2).length).toBeGreaterThanOrEqual(4);
  });
});
