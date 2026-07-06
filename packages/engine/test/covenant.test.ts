// Programmatic Covenant audit (§3, §2.3), scaled to the full M2 pool (M2-B1).
// This is the central enforcement pass over all content — agent-drafted
// content included. Mirrors docs/content-audit.md.

import { describe, expect, it } from 'vitest';
import { applyGrowth, effectiveDef } from '../src/combat';
import { ANSWERS_BY_ID } from '../src/content/questions';
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

  it('pool shape: 57 per character + 15 neutral, splits per the S17 bucket ruling', () => {
    // S13.2 (D3, loud edit): the rare identity pass adds +2 rares per
    // character — 55 (10R) → 57 (12R). Any further change is a sign-off row.
    // S17 bucket moves (ruled 2026-07-06, docs/S17-POWER-AUDIT.md tables
    // 6a/6b): vess 25/20/12 → 22/23/12, bram 25/20/12 → 22/25/10, neutral
    // 8/5/2 → 7/6/2 (the tallow_mark row amends the M2 §9 covenant split).
    const SPLITS: Record<CharacterId, [number, number, number]> = {
      vess: [22, 23, 12],
      bram: [22, 25, 10],
    };
    for (const ch of CHARACTERS) {
      const pool = cardsForCharacter(ch);
      expect(pool.length, ch).toBe(57);
      expect(pool.filter((c) => c.rarity === 'common').length, `${ch} commons`).toBe(SPLITS[ch][0]);
      expect(pool.filter((c) => c.rarity === 'uncommon').length, `${ch} uncommons`).toBe(SPLITS[ch][1]);
      expect(pool.filter((c) => c.rarity === 'rare').length, `${ch} rares`).toBe(SPLITS[ch][2]);
    }
    const n = neutralCards();
    expect(n.length).toBe(15);
    expect(n.filter((c) => c.rarity === 'common').length).toBe(7);
    expect(n.filter((c) => c.rarity === 'uncommon').length).toBe(6);
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
    // S13.2: denominator follows the 57-pool (vess Hex 18/57 ≈ .32,
    // bram Strike 21/57 ≈ .37 — both bands hold without retuning)
    const vessHex = cardsForCharacter('vess').filter((c) => c.tag === 'Hex').length / 57;
    const bramStrike = cardsForCharacter('bram').filter((c) => c.tag === 'Strike').length / 57;
    expect(vessHex).toBeGreaterThanOrEqual(0.27);
    expect(vessHex).toBeLessThanOrEqual(0.42);
    expect(bramStrike).toBeGreaterThanOrEqual(0.3);
    expect(bramStrike).toBeLessThanOrEqual(0.45);
  });

  it('M2-B1: mutations on every common/uncommon; upgrades on every card', () => {
    // S17: the demoted four's owed mutations landed with the 8a ratification
    // (2026-07-06) — no exemptions remain.
    for (const c of all) {
      if (c.rarity !== 'rare') {
        expect(c.mutation, `${c.id} missing mutation`).toBeTruthy();
      }
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

  it('every power-granting card exhausts (Playtest-1 — replaying an active power is a dead play)', () => {
    for (const c of all) {
      const grantsPower = [...c.base, ...(c.link?.effects ?? [])].some((e) => e.op === 'power');
      if (grantsPower) expect(c.exhaust, `${c.id} grants a power but does not exhaust`).toBe(true);
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

  it('§14.11: starter payoffs — burst is cross-player, scaling floor self-owned', () => {
    // Hatpin is plain again: no detonate anywhere on it
    const hatpin = CARDS.hatpin;
    const ops = (c: CardDef) => [
      ...c.base, ...(c.link?.effects ?? []), ...(c.upgrade?.base ?? []), ...(c.upgrade?.link?.effects ?? []),
    ].map((e) => e.op);
    expect(ops(hatpin)).not.toContain('detonate');
    // Worn Knife: pure floor — scales with Hex, never consumes it, no link
    const knife = CARDS.worn_knife;
    expect(knife.starterOnly).toBe(true);
    expect(knife.link).toBeUndefined();
    expect(ops(knife)).not.toContain('detonate');
    expect(knife.base[0].op).toBe('damagePerHex');
    // Knuckle-Crack: playable standalone, burst only via Link (Hex) —
    // amplified-never-dependent holds in both directions
    const kc = CARDS.knuckle_crack;
    expect(kc.starterOnly).toBe(true);
    expect(kc.base.some((e) => e.op === 'damage')).toBe(true);
    expect(kc.base.map((e) => e.op)).not.toContain('detonate');
    expect(kc.link?.condition).toBe('Hex');
    expect(kc.link?.effects.some((e) => e.op === 'detonate')).toBe(true);
    expect(isSelfSimilar(kc)).toBe(false); // Strike with Link (Hex)
    // one payoff card per starter deck
    expect(STARTER_DECKS.vess.filter((id) => id === 'worn_knife').length).toBe(1);
    expect(STARTER_DECKS.bram.filter((id) => id === 'knuckle_crack').length).toBe(1);
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

// ---------------------------------------------------------------------------
// S9b.2 upgrade-parity gate. Root cause of the class it closes: M2-B6's
// "upgrades on every card" batch shipped restatement blocks green because
// nothing compared an upgrade to its base. Same posture as the deducibility
// CI: cheap, permanent, loud.
// ---------------------------------------------------------------------------

/** Exemption list per the S9b.0-4 ruling: the gate lands day one and this
 *  list BURNS DOWN as S9b.3 rows land. Empty by sprint end.
 *  (thornward — the 19th restatement the S9b.3 table missed — came off
 *  2026-07-04 with the OQ#49-ruled row. List is EMPTY; keep it that way.) */
const UPGRADE_RESTATEMENT_EXEMPT = new Set<string>([]);

/** S9b.1-2 class: upgrade texts whose numbers drift from their mechanics.
 *  Emptied by the S9b.3 rewrites; stays as the place future exemptions
 *  must be annotated. */
const UPGRADE_TEXT_EXEMPT = new Set<string>([]);

describe('S9b.2 upgrade parity (the cards never lie)', () => {
  const all = Object.values(CARDS);
  const mech = (base: EffectOp[], link: CardDef['link'], cost: number, keep: boolean | undefined) =>
    JSON.stringify({
      base,
      link: link ? { condition: link.condition, effects: link.effects, replace: link.replace ?? false } : null,
      cost,
      keep: keep ?? false,
    });

  it('every upgrade differs from its effective base in base/link/cost/keep', () => {
    for (const c of all) {
      if (!c.upgrade || UPGRADE_RESTATEMENT_EXEMPT.has(c.id)) continue;
      const before = mech(c.base, c.link, c.cost, c.keep);
      const after = mech(
        c.upgrade.base ?? c.base,
        c.upgrade.link !== undefined ? c.upgrade.link : c.link,
        c.upgrade.cost ?? c.cost,
        c.upgrade.keep ?? c.keep,
      );
      expect(after, `${c.id}: upgrade is a restatement of the base card`).not.toBe(before);
    }
  });

  it('exemption burn-down: every exempt card is still actually a restatement (stale entries come off)', () => {
    for (const id of UPGRADE_RESTATEMENT_EXEMPT) {
      const c = CARDS[id];
      expect(c?.upgrade, `${id}: exempt but has no upgrade`).toBeTruthy();
      const before = mech(c.base, c.link, c.cost, c.keep);
      const after = mech(
        c.upgrade!.base ?? c.base,
        c.upgrade!.link !== undefined ? c.upgrade!.link : c.link,
        c.upgrade!.cost ?? c.cost,
        c.upgrade!.keep ?? c.keep,
      );
      expect(after, `${id}: no longer a restatement — remove it from the exemption list`).toBe(before);
    }
  });

  it('advertised numbers match effective mechanics (coarse lint, M2-B1 drift class)', () => {
    // prose spells small counts ("twice", "three times") — the lint reads both
    const WORDS: Record<number, string[]> = {
      2: ['2', 'twice', 'two'], 3: ['3', 'three'], 4: ['4', 'four'], 5: ['5', 'five'], 6: ['6', 'six'],
    };
    const advertises = (text: string, v: number) => (WORDS[v] ?? [String(v)]).some((w) => text.includes(w));
    for (const c of all) {
      if (!c.upgrade || UPGRADE_TEXT_EXEMPT.has(c.id)) continue;
      const link = c.upgrade.link !== undefined ? c.upgrade.link : c.link;
      // the card face shows upgrade text plus the canonical link line —
      // numbers may live in either
      const face = `${c.upgrade.text ?? c.text} ${link?.text ?? ''}`;
      const ops: EffectOp[] = [...(c.upgrade.base ?? c.base), ...(link?.effects ?? [])];
      for (const op of ops) {
        for (const [k, v] of Object.entries(op)) {
          if (typeof v === 'number' && v > 1) {
            expect(advertises(face, v), `${c.id} upgrade face omits ${op.op}.${k}=${v}: "${face}"`).toBe(true);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// S9d.4 grower covenant. Worn-Knife guardrail: every grower is CAPPED; no
// growth is ever a Hex application or scaling op; grown text can never lie
// (auto-render parity, swept over tally states).
// ---------------------------------------------------------------------------

describe('S9d.4 grower covenant', () => {
  const growers = Object.values(CARDS).filter((c) => c.growsWith);

  it('exactly the eight rite cards grow', () => {
    expect(growers.map((c) => c.id).sort()).toEqual([
      'rite_descant', 'rite_knell', 'rite_mourners_step', 'rite_pyre_brand',
      'rite_shroud', 'rite_toll', 'rite_vigil', 'rite_votive',
    ]);
  });

  it('every grower is capped: linear growers carry cap, tiered growers a terminal tier list', () => {
    for (const c of growers) {
      const g = c.growsWith!;
      if (g.tiers) {
        expect(g.tiers.length, `${c.id}: empty tier list`).toBeGreaterThan(0);
        const ats = g.tiers.map((t) => t.at);
        expect([...ats].sort((a, b) => a - b), `${c.id}: tiers must ascend`).toEqual(ats);
      } else {
        expect(g.cap, `${c.id}: linear grower without a cap`).toBeGreaterThan(0);
        expect(g.per, c.id).toBeGreaterThan(0);
        expect(g.amount, c.id).toBeGreaterThan(0);
        expect(g.appliesTo, c.id).toBeTruthy();
        expect(c.base.some((e) => e.op === g.appliesTo && 'amount' in e), `${c.id}: appliesTo op missing from base`).toBe(true);
      }
    }
  });

  it('no growth patch contains a Hex application or scaling op (covenant fence)', () => {
    const HEX_OPS = new Set(['hex', 'hexAll', 'hexPerLinkFired', 'doubleHex', 'damagePerHex']);
    for (const c of growers) {
      const g = c.growsWith!;
      expect(HEX_OPS.has(g.appliesTo ?? ''), c.id).toBe(false);
      for (const t of g.tiers ?? []) {
        for (const e of t.addBase ?? []) expect(HEX_OPS.has(e.op), `${c.id} tier@${t.at} base`).toBe(false);
        for (const e of t.link?.effects ?? []) expect(HEX_OPS.has(e.op), `${c.id} tier@${t.at} link`).toBe(false);
      }
    }
  });

  it('auto-render parity: grown text matches grown mechanics over a tally sweep', () => {
    const SWEEP = [0, 1, 2, 3, 5, 8, 10, 14, 20, 25, 50, 100, 500];
    for (const c of growers) {
      for (const v of SWEEP) {
        const tallies = {
          detonations: v, falls: v, boundKills: { p1: v, p2: v }, threadSpent: v,
          kindledConsumed: v, linksFired: v, momentumSpent: v, resonances: v, seenStep: {},
        };
        for (const upgraded of [false, true]) {
          const eff = applyGrowth(
            effectiveDef({ instanceId: 'sweep', defId: c.id, ...(upgraded ? { upgraded: true } : {}) }),
            tallies, 'p1',
          );
          // every numeric base amount >1 must appear in the rendered text
          for (const e of eff.base) {
            if ('amount' in e && typeof e.amount === 'number' && e.amount > 1) {
              // merged-op display: the text may show the SUM of same-op amounts
              const sum = eff.base.filter((o) => o.op === e.op && 'amount' in o)
                .reduce((a, o) => a + (o as { amount: number }).amount, 0);
              const shown = eff.text.includes(String(e.amount)) || eff.text.includes(String(sum));
              expect(shown, `${c.id}${upgraded ? '+' : ''} tally=${v}: ${e.op}=${e.amount} not in "${eff.text}"`).toBe(true);
            }
          }
          // linear bonus never exceeds its cap
          if (c.growsWith!.cap !== undefined) {
            expect(eff.grownStep ?? 0, c.id).toBeLessThanOrEqual(c.growsWith!.cap!);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// S13.2 rare identity covenant. Design law: a rare must be DILUTION-RESISTANT
// — a power, a build-around, or a card scaling with chain/pair/run state,
// never with its own draw frequency. Engine caps REQUIRED on anything that
// scales (Worn Knife/Saturate precedent); no Hex-amount growth in any design.
// ---------------------------------------------------------------------------

describe('S13.2 rare identity covenant', () => {
  /** The pass's rows: D2 revisions + D3 new rares. Editing this list is a
   *  sign-off event, not a refactor. */
  const S13_ENGINES = ['gravebloom', 'call_and_answer', 'selvage', 'keepsake', 'bellmetal', 'stokers_due'];
  const KEEP_ROWS = ['unbroken_line', 'wildfire_heart', 'final_word', 'avalanche'];

  it('the verdict table stands: KEEP rows untouched in kind, REVISE rows are engines now', () => {
    // KEEP: the two working powers stay powers; the build-around payoff and
    // the honest spike stay non-power rares
    expect(CARDS.unbroken_line.base[0].op).toBe('power');
    expect(CARDS.wildfire_heart.base[0].op).toBe('power');
    expect(CARDS.final_word.base.some((e) => e.op === 'detonateAllEnemies')).toBe(true);
    expect(CARDS.avalanche.link?.condition).toBe('partner'); // the 8×5 pair-texture spike
    // REVISE: hex BODY → hex ENGINE; smooth utility → cross-seat engine
    expect(CARDS.gravebloom.base).toEqual([{ op: 'power', power: 'gravebloom' }]);
    expect(CARDS.gravebloom.exhaust).toBe(true);
    expect(CARDS.call_and_answer.base).toEqual([{ op: 'power', power: 'call_and_answer' }]);
    expect(CARDS.call_and_answer.exhaust).toBe(true);
  });

  it('every S13.2 engine hook is CAPPED (oncePerTurn/oncePerCombat) — scaling without a cap is covenant-barred', () => {
    for (const id of S13_ENGINES) {
      const power = POWERS[id];
      expect(power, `${id}: power missing`).toBeTruthy();
      expect(power.hooks?.length, `${id}: an engine needs hooks`).toBeGreaterThan(0);
      for (const hook of power.hooks!) {
        expect(hook.oncePerTurn || hook.oncePerCombat, `${id}: uncapped hook on '${hook.on}'`).toBe(true);
      }
    }
  });

  it('no Hex-amount growth: S13.2 hook Hex applications are flat and per-turn-capped', () => {
    for (const id of S13_ENGINES) {
      for (const hook of POWERS[id].hooks ?? []) {
        for (const eff of hook.effects) {
          if (eff.op === 'hexAll') {
            expect(hook.oncePerTurn, `${id}: hexAll must be per-turn-capped`).toBe(true);
            expect(eff.amount, `${id}: hex echo stays flat`).toBeLessThanOrEqual(2);
          }
        }
      }
    }
  });

  it('the four new rares (D3) are exhaust powers, +2 per character, on the co-op texture briefs', () => {
    // S17 bucket ruling (2026-07-06): selvage and stokers_due DEMOTED to
    // uncommon on the audit read (+2.5 / +1.4 lift — glue value at rare
    // price). Their D3 identity (exhaust power on the co-op brief) stands.
    const S17_RARITY: Record<string, string> = {
      selvage: 'uncommon', keepsake: 'rare', bellmetal: 'rare', stokers_due: 'uncommon',
    };
    for (const id of ['selvage', 'keepsake', 'bellmetal', 'stokers_due']) {
      const c = CARDS[id];
      expect(c, id).toBeTruthy();
      expect(c.rarity, id).toBe(S17_RARITY[id]);
      expect(c.exhaust, id).toBe(true);
      expect(c.base).toEqual([{ op: 'power', power: id }]);
    }
    expect(CARDS.selvage.character).toBe('vess'); // chain-position payoff
    expect(CARDS.keepsake.character).toBe('vess'); // Reclaim-keyed (pull-based: the 'reclaim' hook fires for the RECLAIMER only)
    expect(POWERS.keepsake.hooks![0].on).toBe('reclaim');
    expect(CARDS.bellmetal.character).toBe('bram'); // Resonance amplifier
    expect(POWERS.bellmetal.hooks![0].on).toBe('resonance');
    expect(CARDS.stokers_due.character).toBe('bram'); // Thread-spend payoff
    expect(POWERS.stokers_due.hooks![0].on).toBe('threadSpend');
  });

  it('render parity for revised texts: every number an S13.2 engine advertises exists in its hook mechanics', () => {
    for (const id of S13_ENGINES) {
      const face = CARDS[id].text;
      const advertised = (face.match(/\d+/g) ?? []).map(Number);
      const mechanical = (POWERS[id].hooks ?? []).flatMap((h) =>
        h.effects.flatMap((e) => Object.values(e).filter((v): v is number => typeof v === 'number')));
      for (const v of advertised) {
        expect(mechanical, `${id}: text advertises ${v} but no hook effect carries it — "${face}"`).toContain(v);
      }
      for (const v of mechanical) {
        expect(advertised, `${id}: hook effect ${v} not on the card face — "${face}"`).toContain(v);
      }
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

describe('S11.4 event grammar covenant', () => {
  it('stage depth never exceeds 3; every stage has options; requires reference real content', () => {
    const walk = (opts: import('../src/types').EventOptionDef[], depth: number, where: string): void => {
      expect(depth, `${where}: stage depth > 3`).toBeLessThanOrEqual(3);
      for (const o of opts) {
        if (o.requires?.codexProven) {
          expect(ANSWERS_BY_ID[o.requires.codexProven], `${where}/${o.id}: unknown answer`).toBeTruthy();
        }
        if (o.next) {
          expect(o.next.options.length, `${where}/${o.id}: empty stage`).toBeGreaterThan(0);
          walk(o.next.options, depth + 1, `${where}/${o.id}`);
        }
      }
    };
    for (const e of Object.values(EVENTS)) walk(e.options, 1, e.id);
  });

  it('high-stakes events stay within [1,3] per act, armed PER ACT by content', () => {
    // 2026-07-04 ruling (S11.5 table): both flags sit in act 2 — act 1's
    // floor arms when act-1 high-stakes content lands (the deep-retrofit
    // sprint ruling 5 schedules). An act with flagged content must be able
    // to satisfy its floor; an act without any is not asserted against.
    const hs = Object.values(EVENTS).filter((e) => e.highStakes);
    for (const act of [1, 2] as const) {
      const n = hs.filter((e) => e.act === act || e.act === 0).length;
      expect(n, `act ${act}`).toBeLessThanOrEqual(3);
    }
    // pin the ruled set — a new flag is a new sign-off row, edit this loudly
    expect(hs.map((e) => e.id).sort()).toEqual(['broken_carillon', 'drowned_hymnal']);
  });

  it('S11.5: the deep events are exactly the four ruled rows, deep doors flag-gated', () => {
    const deep = Object.values(EVENTS).filter((e) => e.options.some((o) => o.next));
    expect(deep.map((e) => e.id).sort()).toEqual([
      'broken_carillon', 'drowned_hymnal', 'ossuary_toll', 'wax_garden',
    ]);
    // every keyed door lives on a deep event (unflagged runs hide requires
    // wholesale — a keyed option on a plain event would vanish for them)
    for (const e of Object.values(EVENTS)) {
      const keyed = e.options.some((o) => o.requires);
      if (keyed) expect(deep, e.id).toContain(e);
    }
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
      // 2 elites per act (M2-B3) + 1 (S10a); act 2 +1 (S15.2A knot-eligible pierce comp)
      expect(pools.elite.length).toBe(act === 2 ? 4 : 3);
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
