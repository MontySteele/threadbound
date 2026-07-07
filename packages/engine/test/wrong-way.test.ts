// S8.4 — the wrong-way event: rare-pool covenants.
//
// 1. It never appears in unflagged pools or maps (the plain shuffle and its
//    rng consumption are untouched — the golden covenant locks that too).
// 2. It appears, RARELY, in flagged pools (tracks OR rites) — below normal
//    weight, so a run can miss it entirely.
// 3. Dedup holds: seen once, never re-offered (seenGatedEvents exclusion).
// 4. Clue/character events keep their 2:1 weight vs normal events after the
//    weight-table doubling (4:2:1 — relative weights are the contract).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { generateActMap } from '../src/map';
import { eventsForAct } from '../src/content/registry';
import { WRONG_WAY_EVENTS } from '../src/content/wrong-way';

const WW = WRONG_WAY_EVENTS[0];

/** Teleport a run onto a single-node map holding the given event. */
function atEvent(s: GameState, eventId: string): GameState {
  s = structuredClone(s);
  s.phase = 'map';
  s.map = {
    act: s.map.act, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0,
    nodes: [{ id: 0, kind: 'event', eventId, edges: [], layer: 0, lane: 0 }],
  };
  const n = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: 0 });
  return reduce(n, { type: 'NODE_PICK', player: 'p2', nodeId: 0 });
}

describe('the wrong-way event (S8.4)', () => {
  it('shape covenant: act 0, uncrossed, rare, texture-sized consequences', () => {
    expect(WRONG_WAY_EVENTS.length).toBe(1);
    expect(WW.act).toBe(0);
    expect(WW.crossed).toBe(false);
    expect(WW.rare).toBe(true);
    expect(WW.clue).toBeFalsy();
    expect(WW.character).toBeFalsy();
    expect(WW.options.map((o) => o.id)).toEqual(['watch', 'reach']);
    // texture, not economy: every numeric consequence stays small
    for (const opt of WW.options) {
      for (const eff of opt.effects) {
        if ('amount' in eff) expect(Math.abs(eff.amount), `${opt.id}: ${eff.op}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('pool gating: absent unflagged; present under tracks OR rites', () => {
    for (const act of [1, 2] as const) {
      expect(eventsForAct(act, false).some((e) => e.rare)).toBe(false);
      expect(eventsForAct(act, true).some((e) => e.id === WW.id)).toBe(true);
      expect(eventsForAct(act, false, ['vess']).some((e) => e.id === WW.id)).toBe(true);
    }
  });

  it('never appears in unflagged maps', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { map } = generateActMap(seed, 1, false, false);
      expect(map.nodes.some((n) => n.eventId === WW.id)).toBe(false);
    }
  });

  it('appears rarely in flagged maps — missable, below normal weight; clue stays 2:1 vs normal', () => {
    const pool = eventsForAct(1, true);
    const normals = pool.filter((e) => !e.clue && !e.rare).map((e) => e.id);
    const clues = pool.filter((e) => e.clue).map((e) => e.id);
    const counts: Record<string, number> = {};
    const SEEDS = 400;
    let mapsWithWw = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { map } = generateActMap(seed, 1, false, true);
      let sawWw = false;
      for (const n of map.nodes) {
        if (!n.eventId) continue;
        counts[n.eventId] = (counts[n.eventId] ?? 0) + 1;
        if (n.eventId === WW.id) sawWw = true;
      }
      if (sawWw) mapsWithWw++;
    }
    const avg = (ids: string[]): number => ids.reduce((s, id) => s + (counts[id] ?? 0), 0) / ids.length;
    const avgNormal = avg(normals);
    const avgClue = avg(clues);
    const wwCount = counts[WW.id] ?? 0;
    // present, but a run can miss it entirely
    expect(mapsWithWw).toBeGreaterThan(0);
    expect(mapsWithWw).toBeLessThan(SEEDS / 2);
    // below normal weight (0.5x nominal; allow sampling noise)
    expect(wwCount).toBeLessThan(avgNormal * 0.8);
    // the clue-elevation contract survives (floor unchanged). The old 2.9
    // ceiling was a LANE-era read of the flat B6 weight table; the braid
    // deals the truth strand clue-scaled BY DESIGN (S11.11-4
    // clueWeightScale), and the braid read is ~3.6 — ceiling re-banked
    // descriptively in the S21.5 (OQ#65) suite audit, elevation still
    // bounded (a runaway table would blow past it).
    expect(avgClue / avgNormal).toBeGreaterThan(1.4);
    expect(avgClue / avgNormal).toBeLessThan(4.5);
  });

  it('dedup: a seen wrong-way event never re-enters a later map pool', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { map } = generateActMap(seed, 2, false, true, [WW.id]);
      expect(map.nodes.some((n) => n.eventId === WW.id)).toBe(false);
    }
  });

  it('resolution: seen recorded on flagged runs; both consequences land small', () => {
    const off = reduce(initialState(5, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 5 });
    expect(off.seenRareEvents).toBeUndefined();

    let s = reduce(initialState(5, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed: 5, tracks: true });
    s.players.p1.hp -= 5;
    s.players.p2.hp -= 5;
    s = atEvent(s, WW.id);
    expect(s.phase).toBe('event');
    expect(s.seenRareEvents).toEqual([WW.id]);
    const subject = s.event!.subject;
    const hpBefore = s.players[subject].hp;
    const watched = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'watch' });
    expect(watched.players[subject].hp).toBe(hpBefore + 2);
    const reached = reduce(s, { type: 'EVENT_CHOOSE', player: s.event!.chooser, optionId: 'reach' });
    expect(reached.players[subject].hp).toBe(hpBefore - 2);
    expect(reached.pendingThread).toBe(1);
  });
});
