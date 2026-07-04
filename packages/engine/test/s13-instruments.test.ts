// S13.1 instruments: the OQ#59 decomposition probes as permanent sim knobs
// (S13.1a), draft policy v2 behind TB_BOT_DRAFT_V2 (S13.1b, default OFF —
// D7), and the economy telemetry (S13.1c). All knobs are SIM-ONLY: no
// production surface sets them; the engine reads them via the guarded
// envScale/startGold pattern so browser hosts never touch process.env.

import { afterEach, describe, expect, it } from 'vitest';
import { BotPolicy, BotView, STARTER_DECK_SIZE } from '../src/bot-policy';
import { STARTER_DECKS } from '../src/content/cards';
import { CARDS } from '../src/content/registry';
import { GameState, PlayerId } from '../src/types';
import { generateShop, initialState, reduce } from '../src/reducer';

afterEach(() => {
  delete process.env.TB_NO_RELICS;
  delete process.env.TB_UPGRADE_ALL;
});

/** A run-started state with a crafted reward screen for p1. */
function rewardState(seed: number, set: string[]): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  const s: GameState = reduce(s0, { type: 'START_RUN', seed });
  s.phase = 'reward';
  s.reward = {
    sets: { p1: set, p2: [] },
    picked: { p1: null, p2: 'skip' },
    coveted: { p1: null, p2: null },
    gold: 0,
  };
  return s;
}

function asView(s: GameState, you: PlayerId = 'p1'): BotView {
  const counts = { p1: { hand: 0, draw: 0 }, p2: { hand: 0, draw: 0 } };
  return { ...s, you, counts } as BotView;
}

/** Pad p1's deck to `size` with legal non-starter cards. */
function padDeck(s: GameState, size: number): void {
  const p = s.players.p1;
  while (p.deck.length < size) {
    p.deck.push({ instanceId: `pad_${p.deck.length}`, defId: 'needlework' });
  }
}

describe('S13.1a — pick-cap anchor pin', () => {
  it('STARTER_DECK_SIZE is the true starter size (a starter-deck change must not silently skew the sweep)', () => {
    expect(STARTER_DECKS.vess.length).toBe(STARTER_DECK_SIZE);
    expect(STARTER_DECKS.bram.length).toBe(STARTER_DECK_SIZE);
    expect(STARTER_DECK_SIZE).toBe(10);
  });
});

describe('S13.1a — TB_BOT_SKIP_PICKS (policy: skipPicks)', () => {
  it('always skips the reward pick', () => {
    const s = rewardState(11, ['inheritance', 'withering']);
    const policy = new BotPolicy({ mode: 'sim', seed: 7, skipPicks: true });
    expect(policy.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'skip' });
  });

  it('never covets', () => {
    const s = rewardState(11, []);
    s.reward!.sets = { p1: [], p2: ['rendcall', 'haymaker'] };
    s.reward!.picked = { p1: 'skip', p2: 'rendcall' };
    const policy = new BotPolicy({ mode: 'sim', seed: 7, skipPicks: true });
    // with covet closed, the only remaining reward move is ADVANCE
    expect(policy.decide(asView(s))).toEqual({ type: 'ADVANCE', player: 'p1' });
  });

  it('never buys shop cards', () => {
    const s = rewardState(11, []);
    s.phase = 'shop';
    s.reward = null;
    // withering scores 6 for vess (link +3, heavy Hex +2, cost ≤2 +1) — a
    // buy the base policy takes at the ≥5 bar
    s.shop = { items: [{ id: 'item0', kind: 'card', forPlayer: 'p1', refId: 'withering', price: 45, sold: false }] };
    const base = new BotPolicy({ mode: 'sim', seed: 7 });
    expect(base.decide(asView(s))).toEqual({ type: 'SHOP_BUY', player: 'p1', itemId: 'item0' });
    const skip = new BotPolicy({ mode: 'sim', seed: 7, skipPicks: true });
    expect(skip.decide(asView(s))).toEqual({ type: 'ADVANCE', player: 'p1' });
  });
});

describe('S13.1a — TB_BOT_PICK_CAP (policy: pickCap, a deck-SIZE ceiling)', () => {
  it('drafts normally below the ceiling, skips at it', () => {
    const s = rewardState(11, ['inheritance']);
    const below = new BotPolicy({ mode: 'sim', seed: 7, pickCap: 4 });
    expect(below.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    padDeck(s, STARTER_DECK_SIZE + 4);
    const at = new BotPolicy({ mode: 'sim', seed: 7, pickCap: 4 });
    expect(at.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'skip' });
  });

  it('removals free slots back up (the cap reads deck size, not picks taken)', () => {
    const s = rewardState(11, ['inheritance']);
    padDeck(s, STARTER_DECK_SIZE + 4);
    s.players.p1.deck.splice(0, 1); // a removal
    const policy = new BotPolicy({ mode: 'sim', seed: 7, pickCap: 4 });
    expect(policy.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
  });

  it('shop card buys share the gate', () => {
    const s = rewardState(11, []);
    s.phase = 'shop';
    s.reward = null;
    s.shop = { items: [{ id: 'item0', kind: 'card', forPlayer: 'p1', refId: 'withering', price: 45, sold: false }] };
    padDeck(s, STARTER_DECK_SIZE + 4);
    const policy = new BotPolicy({ mode: 'sim', seed: 7, pickCap: 4 });
    expect(policy.decide(asView(s))).toEqual({ type: 'ADVANCE', player: 'p1' });
  });
});

describe('S13.1a — TB_NO_RELICS / TB_UPGRADE_ALL (engine knobs)', () => {
  it('TB_NO_RELICS: shops stock no relics and grantRelic no-ops', () => {
    process.env.TB_NO_RELICS = '1';
    const s0 = initialState(21, { p1: 'vess', p2: 'bram' });
    const s: GameState = reduce(s0, { type: 'START_RUN', seed: 21 });
    const shop = generateShop(s);
    expect(shop.items.filter((i) => i.kind === 'relic')).toEqual([]);
    // a relic reaching grantRelic (here via SHOP_BUY) is never granted
    s.phase = 'shop';
    s.shop = { items: [{ id: 'item0', kind: 'relic', refId: 'wedding_knife', price: 10, sold: false }] };
    const after = reduce(s, { type: 'SHOP_BUY', player: 'p1', itemId: 'item0' });
    expect(after.players.p1.relics).toEqual([]);
    expect(after.players.p2.relics).toEqual([]);
  });

  it('TB_UPGRADE_ALL: every upgradeable starter begins upgraded', () => {
    process.env.TB_UPGRADE_ALL = '1';
    const s = initialState(21, { p1: 'vess', p2: 'bram' });
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      for (const c of s.players[pid].deck) {
        expect(!!c.upgraded, c.defId).toBe(!!CARDS[c.defId].upgrade);
      }
    }
    delete process.env.TB_UPGRADE_ALL;
    const plain = initialState(21, { p1: 'vess', p2: 'bram' });
    for (const c of plain.players.p1.deck) expect(c.upgraded).toBeUndefined();
  });
});

describe('S13.1b — draft policy v2 (TB_BOT_DRAFT_V2, default OFF)', () => {
  it('v1 is byte-identical without the flag (unbroken_line stays undervalued)', () => {
    // v1: unbroken_line scores 2 (rare +1, cost ≤2 +1) vs quickening 4
    // (link +3, cost ≤2 +1) — the power rare loses the slot
    const s = rewardState(31, ['quickening', 'unbroken_line']);
    const v1 = new BotPolicy({ mode: 'sim', seed: 7 });
    expect(v1.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'quickening' });
  });

  it('v2 learns powers/engines (+4) and rares (+3): unbroken_line wins the slot', () => {
    const s = rewardState(31, ['quickening', 'unbroken_line']);
    const v2 = new BotPolicy({ mode: 'sim', seed: 7, draftV2: true });
    expect(v2.decide(asView(s))).toEqual({ type: 'REWARD_PICK', player: 'p1', pick: 'unbroken_line' });
  });

  it('v2 dilution term: the take-rate falls as the deck grows past 16', () => {
    let takenSmall = 0;
    let takenBig = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const small = rewardState(seed, ['unbroken_line']);
      const vSmall = new BotPolicy({ mode: 'sim', seed, draftV2: true });
      if ((vSmall.decide(asView(small)) as { pick: string }).pick !== 'skip') takenSmall++;
      const big = rewardState(seed, ['unbroken_line']);
      padDeck(big, 31); // score 8 − (31−16)×0.4 = 2 → below the ≥3 bar
      const vBig = new BotPolicy({ mode: 'sim', seed, draftV2: true });
      if ((vBig.decide(asView(big)) as { pick: string }).pick !== 'skip') takenBig++;
    }
    expect(takenSmall).toBe(40); // score 8 clears the bar every time
    expect(takenBig).toBeLessThan(takenSmall); // past the knee, only the coin-flip branch takes
  });
});

describe('S13.1c — economy telemetry', () => {
  it('REWARD_PICK records the take/skip decision per act per seat', () => {
    const s = rewardState(41, ['inheritance']);
    const took = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'inheritance' });
    expect(took.telemetry.economy.picks[1].p1).toEqual({ taken: 1, skipped: 0 });
    expect(took.telemetry.economy.deckAddsByAct[1].p1).toBe(1);
    const skipped = reduce(s, { type: 'REWARD_PICK', player: 'p1', pick: 'skip' });
    expect(skipped.telemetry.economy.picks[1].p1).toEqual({ taken: 0, skipped: 1 });
    expect(skipped.telemetry.economy.deckAddsByAct[1]).toBeUndefined();
  });

  it('relic grants land in relicsByAct', () => {
    const s = rewardState(41, []);
    s.phase = 'shop';
    s.reward = null;
    s.shop = { items: [{ id: 'item0', kind: 'relic', refId: 'wedding_knife', price: 10, sold: false }] };
    const after = reduce(s, { type: 'SHOP_BUY', player: 'p1', itemId: 'item0' });
    expect(after.telemetry.economy.relicsByAct[1]).toBe(1);
  });

  it('shop removals land in deckRemovalsByAct', () => {
    const s = rewardState(41, []);
    s.phase = 'shop';
    s.reward = null;
    s.gold = 500;
    s.shop = { items: [{ id: 'item0', kind: 'removal', forPlayer: 'p1', price: 0, sold: false }] };
    const starter = s.players.p1.deck[0];
    const after = reduce(s, { type: 'SHOP_REMOVE', player: 'p1', itemId: 'item0', cardInstanceId: starter.instanceId });
    expect(after.telemetry.economy.deckRemovalsByAct[1].p1).toBe(1);
  });
});
