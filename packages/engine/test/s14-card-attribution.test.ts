// S14.1 (sweep B23): per-card attribution — plays, picks, winning-deck
// presence, relic acquisition source. Telemetry-only: hashes and goldens
// are untouched (hashState excludes telemetry).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';
import { CARDS } from '../src/content/cards';

function freshRun(seed: number): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  return reduce(s0, { type: 'START_RUN', seed });
}

describe('S14.1 per-card attribution (B23)', () => {
  it('playing a card bumps plays for its def and seat (starters included)', () => {
    const s = freshRun(141);
    startCombat(s, ['cinder_husk']);
    const p = s.players.p1;
    const instanceId = p.hand[0];
    const defId = p.deck.find((c) => c.instanceId === instanceId)!.defId;
    let t = reduce(s, {
      type: 'STAGE_CARD', player: 'p1', cardInstanceId: instanceId, slot: 0,
      ...(CARDS[defId].needsTarget ? { targetId: s.combat!.enemies[0].id } : {}),
    });
    t = reduce(t, { type: 'SET_READY', player: 'p1', ready: true });
    t = reduce(t, { type: 'SET_READY', player: 'p2', ready: true });
    expect(t.telemetry.cards.plays[defId].p1).toBe(1);
    expect(t.telemetry.cards.plays[defId].p2 ?? 0).toBe(0);
  });

  it('every deck join counts a pick for the def and seat (shop channel)', () => {
    const s = freshRun(142);
    s.phase = 'shop';
    s.gold = 999;
    s.shop = { items: [{ id: 'item0', kind: 'card', forPlayer: 'p1', refId: 'withering', price: 45, sold: false }] };
    const t = reduce(s, { type: 'SHOP_BUY', player: 'p1', itemId: 'item0' });
    expect(t.telemetry.cards.picks.withering.p1).toBe(1);
    expect(t.telemetry.economy.deckAddsByAct[1].p1).toBe(1); // S13.1c agrees
  });

  it('a relic grant records its acquisition source', () => {
    const s = freshRun(143);
    s.phase = 'shop';
    s.gold = 999;
    s.shop = { items: [{ id: 'item0', kind: 'relic', refId: 'wedding_knife', price: 10, sold: false }] };
    const t = reduce(s, { type: 'SHOP_BUY', player: 'p1', itemId: 'item0' });
    expect(t.telemetry.relicSources.wedding_knife).toBe('shop');
  });

  it('a defeat writes no winning deck (victory-only instrument)', () => {
    const s = freshRun(144);
    let t = reduce(s, { type: 'CONCEDE', player: 'p1', confirm: true });
    t = reduce(t, { type: 'CONCEDE', player: 'p2', confirm: true });
    expect(t.phase).toBe('game_over');
    expect(Object.keys(t.telemetry.cards.winningDeck)).toHaveLength(0);
  });
});
