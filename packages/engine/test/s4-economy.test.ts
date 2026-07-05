// S4 sign-off coverage: removal economy (S4.2 / gate 3), Pulsekeeper's Ring
// counter (S4.3 / gate 4), ascension skeleton (S4.4), gold telemetry (S4.1).

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId, ShopItem } from '../src/types';
import { initialState, reduce, removalPrice } from '../src/reducer';
import { startCombat } from '../src/combat';
import { ascensionMods, scaleIntent } from '../src/ascension';
import { pickableNodes } from '../src/map';

function startedRun(seed = 42, p2: 'vess' | 'bram' = 'bram'): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2 });
  return reduce(s0, { type: 'START_RUN', seed });
}

function combatState(seed = 42): GameState {
  let s = startedRun(seed);
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  expect(s.phase).toBe('combat');
  return s;
}

function ready(state: GameState): GameState {
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

/** Test-only: drop a synthetic shop in front of the pair (S4.2 rows). */
function enterShop(state: GameState): GameState {
  const s = structuredClone(state);
  s.phase = 'shop';
  s.combat = null;
  const items: ShopItem[] = [
    { id: 'rm_p1', kind: 'removal', forPlayer: 'p1', price: 0, sold: false },
    { id: 'rm_p2', kind: 'removal', forPlayer: 'p2', price: 0, sold: false },
  ];
  s.shop = { items };
  return s;
}

describe('S4.2 shop removal rework (OQ#8) — sign-off gate 3', () => {
  it('escalates per player and run-persistently; partner unaffected; counters survive to the next shop', () => {
    let s = enterShop(startedRun());
    s.gold = 1000;

    // player A buys 3 removals: 75 / 100 / 125 charged
    for (const expected of [75, 100, 125]) {
      expect(removalPrice(s, 'p1')).toBe(expected);
      const before = s.gold;
      const card = s.players.p1.deck[0].instanceId;
      s = reduce(s, { type: 'SHOP_REMOVE', player: 'p1', itemId: 'rm_p1', cardInstanceId: card });
      expect(before - s.gold).toBe(expected);
    }
    expect(s.removalsByPlayer.p1).toBe(3);

    // player B's first removal still costs 75 — the counter is per player
    expect(removalPrice(s, 'p2')).toBe(75);
    const before = s.gold;
    const cardB = s.players.p2.deck[0].instanceId;
    s = reduce(s, { type: 'SHOP_REMOVE', player: 'p2', itemId: 'rm_p2', cardInstanceId: cardB });
    expect(before - s.gold).toBe(75);

    // run-persistence: a NEW shop node sees the same counters
    s = enterShop(s);
    expect(removalPrice(s, 'p1')).toBe(150);
    expect(removalPrice(s, 'p2')).toBe(100);

    // telemetry mirrors (S4.1): spend category + the independent counter
    expect(s.telemetry.goldSpentByCategory.p1.removals).toBe(300);
    expect(s.telemetry.goldSpentByCategory.p2.removals).toBe(75);
    expect(s.telemetry.removalsByPlayer).toEqual({ p1: 3, p2: 1 });
  });

  it('never sells out — only gold and the deck floor gate it', () => {
    let s = enterShop(startedRun());
    s.gold = 10000;
    // unlimited: remove down to the 5-card floor (starter decks are 10)
    for (let i = 0; i < 5; i++) {
      s = reduce(s, { type: 'SHOP_REMOVE', player: 'p1', itemId: 'rm_p1', cardInstanceId: s.players.p1.deck[0].instanceId });
    }
    expect(s.players.p1.deck.length).toBe(5);
    expect(() =>
      reduce(s, { type: 'SHOP_REMOVE', player: 'p1', itemId: 'rm_p1', cardInstanceId: s.players.p1.deck[0].instanceId }),
    ).toThrow(/thin enough/);
    // gold gates: a too-poor purse rejects
    const poor = structuredClone(s);
    poor.gold = 10;
    expect(() =>
      reduce(poor, { type: 'SHOP_REMOVE', player: 'p2', itemId: 'rm_p2', cardInstanceId: poor.players.p2.deck[0].instanceId }),
    ).toThrow(/not enough gold/);
  });

  it("rejects using the partner's service row", () => {
    let s = enterShop(startedRun());
    s.gold = 1000;
    expect(() =>
      reduce(s, { type: 'SHOP_REMOVE', player: 'p1', itemId: 'rm_p2', cardInstanceId: s.players.p1.deck[0].instanceId }),
    ).toThrow(/partner/);
  });
});

describe("S4.3 Pulsekeeper's Ring (OQ#27) — sign-off gate 4", () => {
  it('owner Pulses 6× across two combats → exactly 2 discounts, counter survives the boundary', () => {
    let s = combatState();
    s.players.p1.relics.push('pulsekeepers_ring');
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }

    // combat 1: three Pulses by the owner (threadActions injected directly —
    // this tests the resolution counter/cost path, not declaration legality)
    const threadBefore = s.thread;
    s.combat!.threadActions = [1, 2, 3].map(() => ({ player: 'p1' as PlayerId, kind: 'pulse' as const, targetId: 'none' }));
    s = ready(s);
    expect(s.players.p1.ringPulses).toBe(3);
    expect(s.telemetry.ringDiscountsFired).toBe(1);
    // 2 + 2 + 1 = 5 spent (the 3rd was the discounted one)
    expect(s.telemetry.threadSpent).toBe(5);
    expect(threadBefore - 5).toBeGreaterThanOrEqual(0); // no accidental fray in this fixture

    // combat boundary: counter persists on player run state
    for (const e of s.combat!.enemies) e.hp = 0;
    s = ready(s);
    expect(s.phase).toBe('reward');
    expect(s.players.p1.ringPulses).toBe(3);

    // combat 2: three more — the 6th Pulse is the 2nd discount
    startCombat(s, ['cinder_husk']);
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    s.combat!.threadActions = [4, 5, 6].map(() => ({ player: 'p1' as PlayerId, kind: 'pulse' as const, targetId: 'none' }));
    s = ready(s);
    expect(s.players.p1.ringPulses).toBe(6);
    expect(s.telemetry.ringDiscountsFired).toBe(2);
  });

  it("a non-owner's Pulses neither tick the counter nor get the discount", () => {
    let s = combatState();
    s.players.p1.relics.push('pulsekeepers_ring');
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    s.combat!.threadActions = [1, 2, 3].map(() => ({ player: 'p2' as PlayerId, kind: 'pulse' as const, targetId: 'none' }));
    s = ready(s);
    expect(s.players.p1.ringPulses).toBe(0);
    expect(s.players.p2.ringPulses).toBe(0);
    expect(s.telemetry.ringDiscountsFired).toBe(0);
    expect(s.telemetry.threadSpent).toBe(6); // 2 + 2 + 2, no break
  });
});

describe('S4.4 ascension skeleton', () => {
  it('A0 is the default and the identity: no votes → ascension 0, mods are no-ops', () => {
    const s = startedRun();
    expect(s.ascension).toBe(0);
    const mods = ascensionMods(0);
    expect(mods).toEqual({ hpScale: 1, dmgScale: 1, extraElite: false, frayThreshold: 0, frayPierces: false, restHeal: 0.3 });
    const intent = { kind: 'attack' as const, amount: 7 };
    expect(scaleIntent(intent, 1)).toBe(intent); // same object, no float trip
  });

  it('both-confirm: mismatched votes block START_RUN; agreement sets the level', () => {
    const s0 = initialState(42, { p1: 'vess', p2: 'bram' });
    let s = reduce(s0, { type: 'SET_ASCENSION', player: 'p1', level: 2 });
    expect(s.ascension).toBe(0); // p2 hasn't confirmed
    expect(() => reduce(s, { type: 'START_RUN', seed: 42 })).toThrow(/agree/);
    s = reduce(s, { type: 'SET_ASCENSION', player: 'p2', level: 2 });
    expect(s.ascension).toBe(2);
    s = reduce(s, { type: 'START_RUN', seed: 42 });
    expect(s.ascension).toBe(2);
    expect(s.phase).toBe('map');
  });

  it('A1/A2 scale enemy HP and intents multiplicatively on the anchor (same rng draws)', () => {
    const at = (level: number): GameState => {
      const s0 = initialState(42, { p1: 'vess', p2: 'bram' });
      let s = reduce(s0, { type: 'SET_ASCENSION', player: 'p1', level });
      s = reduce(s, { type: 'SET_ASCENSION', player: 'p2', level });
      s = reduce(s, { type: 'START_RUN', seed: 42 });
      const node = pickableNodes(s.map)[0];
      s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
      s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
      return s;
    };
    const a0 = at(0);
    const a2 = at(2);
    expect(a2.combat!.enemies.length).toBe(a0.combat!.enemies.length);
    for (let i = 0; i < a0.combat!.enemies.length; i++) {
      const base = a0.combat!.enemies[i];
      const asc = a2.combat!.enemies[i];
      expect(asc.maxHp).toBe(Math.round(base.maxHp * 1.1)); // A1
      if (base.intent.kind === 'attack' && asc.intent.kind === 'attack') {
        expect(asc.intent.amount).toBe(Math.round(base.intent.amount * 1.1)); // A2
      }
    }
  });

  it('A3 adds a third elite to the act map; A0 keeps exactly two', () => {
    const eliteCount = (level: number): number => {
      const s0 = initialState(42, { p1: 'vess', p2: 'bram' });
      let s = reduce(s0, { type: 'SET_ASCENSION', player: 'p1', level });
      s = reduce(s, { type: 'SET_ASCENSION', player: 'p2', level });
      s = reduce(s, { type: 'START_RUN', seed: 42 });
      return s.map.nodes.filter((n) => n.kind === 'elite').length;
    };
    expect(eliteCount(0)).toBe(2);
    expect(eliteCount(3)).toBe(3);
  });

  it('A4: spending the pool to exactly 0 frays; A0 does not', () => {
    const steadyAtThreadOne = (ascension: number): GameState => {
      let s = combatState();
      s.ascension = ascension;
      s.thread = 1;
      s.combat!.threadActions = [{ player: 'p1', kind: 'steady' }];
      return ready(s);
    };
    expect(steadyAtThreadOne(0).log.some((e) => e.e === 'fray')).toBe(false);
    expect(steadyAtThreadOne(4).log.some((e) => e.e === 'fray')).toBe(true);
  });

  it('A5 trims the rest-site heal to 20% (act-transition heal untouched)', () => {
    const healAt = (ascension: number): number => {
      let s = startedRun();
      s = structuredClone(s);
      s.ascension = ascension;
      s.phase = 'rest';
      s.rest = { chosen: { p1: null, p2: null }, upgradePicked: { p1: false, p2: false }, wedding: null };
      s.players.p1.hp = 10;
      const before = s.players.p1.hp;
      s = reduce(s, { type: 'REST_CHOOSE', player: 'p1', option: 'rest' });
      return s.players.p1.hp - before;
    };
    const maxHp = 68; // vess
    expect(healAt(0)).toBe(Math.floor(maxHp * 0.3));
    expect(healAt(5)).toBe(Math.floor(maxHp * 0.2));
  });
});

describe('S4.1 gold telemetry', () => {
  it('combat wins attribute earned gold by source and into the act split', () => {
    let s = combatState();
    for (const e of s.combat!.enemies) e.hp = 0;
    s = ready(s);
    expect(s.phase).toBe('reward');
    expect(s.telemetry.goldEarnedBySource.combat).toBeGreaterThan(0);
    expect(s.telemetry.actStats[1].goldEarned).toBe(s.telemetry.goldEarnedBySource.combat);
  });

  it('shop buys land in per-player spend categories', () => {
    let s = enterShop(startedRun());
    s.gold = 500;
    // a known shop-legal (non-starter) card
    s.shop!.items.push({ id: 'card1', kind: 'card', forPlayer: 'p1', refId: 'hollow_seam', price: 60, sold: false });
    s = reduce(s, { type: 'SHOP_BUY', player: 'p1', itemId: 'card1' });
    expect(s.telemetry.goldSpentByCategory.p1.cards).toBe(60);
    expect(s.telemetry.actStats[1].goldSpent).toBe(60);
  });

  it('goldResidual is stamped at run end', () => {
    let s = combatState();
    s.gold = 123;
    s.players.p1.hp = 1;
    s.players.p2.hp = 1;
    s.players.p1.fallen = true;
    s.players.p2.fallen = true;
    s = ready(s);
    expect(s.phase).toBe('game_over');
    expect(s.telemetry.goldResidual).toBe(123);
  });
});
