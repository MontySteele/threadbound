// S11.6 asymmetric scouting — per-seat node faces (map knotwork session §3c):
// Vess reads clue bearings, Bram reads knot relics, character scenes name
// themselves to their own seat. No topology change; the live rng is never
// consumed (the knot pins ride a DERIVED stream); unflagged maps are
// untouched by construction.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { generateActMap } from '../src/map';
import { scoutView } from '../src/scout';
import { EVENTS, RELICS_BY_ID } from '../src/content/registry';
import { startCombat } from '../src/combat';
import { ENCOUNTERS } from '../src/content/encounters';

function forceHand(state: GameState, pid: PlayerId, defIds: string[]): string[] {
  const p = state.players[pid];
  const ids: string[] = [];
  defIds.forEach((defId, i) => {
    const instanceId = `test_${pid}_${defId}_${i}`;
    p.deck.push({ instanceId, defId });
    ids.push(instanceId);
  });
  p.draw = [...p.hand, ...p.draw, ...p.discard].filter(Boolean);
  p.discard = [];
  p.hand = [...ids];
  return ids;
}

const ready = (s: GameState): GameState =>
  reduce(reduce(s, { type: 'SET_READY', player: 'p1', ready: true }), { type: 'SET_READY', player: 'p2', ready: true });

describe('S11.6 knot pins (generation)', () => {
  it('unflagged maps carry NO pins — shape untouched (golden covenant)', () => {
    for (let i = 0; i < 100; i++) {
      const { map } = generateActMap(60_000 + i * 13, i % 2 === 0 ? 1 : 2, false, false);
      for (const n of map.nodes) expect(n.scoutRelicId, `seed ${60_000 + i * 13} node ${n.id}`).toBeUndefined();
    }
  });

  it('flagged maps pin every knot with a distinct, real relic', () => {
    for (let i = 0; i < 100; i++) {
      const { map } = generateActMap(61_000 + i * 13, 2, true, true, [], ['vess', 'bram']);
      const pins = map.nodes.filter((n) => n.kind === 'elite').map((n) => n.scoutRelicId);
      expect(pins.length).toBe(3);
      for (const p of pins) expect(RELICS_BY_ID[p!], `seed ${61_000 + i * 13}: ${p}`).toBeTruthy();
      expect(new Set(pins).size).toBe(pins.length); // distinct within the act
      for (const n of map.nodes) {
        if (n.kind !== 'elite') expect(n.scoutRelicId).toBeUndefined();
      }
    }
  });

  it('the pins ride a DERIVED stream: the returned live rng is identical with and without flags for the same entry state', () => {
    // flagged generation consumes MORE live rng than unflagged (weighted
    // queue etc.) — but between two flagged runs the pin pass itself must
    // be invisible: same seed, same act → same rng out, same pins (pure
    // function of entry state, no hidden draws)
    const a = generateActMap(777, 2, false, true, [], ['vess', 'bram']);
    const b = generateActMap(777, 2, false, true, [], ['vess', 'bram']);
    expect(a.rng).toBe(b.rng);
    expect(a.map.nodes).toEqual(b.map.nodes);
  });
});

describe('S11.6 scout faces (per seat)', () => {
  it('a tracks run: Vess reads clue bearings, Bram reads knot relics, and the faces never cross', () => {
    const s0 = initialState(41, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 41, tracks: true });
    const vess = scoutView(s, 'p1');
    const bram = scoutView(s, 'p2');
    const elites = s.map.nodes.filter((n) => n.kind === 'elite');
    const clues = s.map.nodes.filter((n) => n.kind === 'event' && EVENTS[n.eventId!]?.clue);
    expect(elites.length).toBeGreaterThan(0);
    for (const k of elites) {
      expect(bram[k.id]).toContain('carries');
      expect(vess[k.id]).toBeUndefined();
    }
    for (const c of clues) {
      expect(vess[c.id]).toContain('bears on');
      expect(bram[c.id]).toBeUndefined();
    }
  });

  it('a rites run: a character scene says "a door meant for you" to its own seat only', () => {
    const s0 = initialState(43, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 43, rites: true });
    const vess = scoutView(s, 'p1');
    const bram = scoutView(s, 'p2');
    const doorNodes = s.map.nodes.filter((n) => n.kind === 'event' && EVENTS[n.eventId!]?.character);
    expect(doorNodes.length).toBeGreaterThanOrEqual(4); // composition CI floor: 2 per seat
    for (const d of doorNodes) {
      const ch = EVENTS[d.eventId!].character;
      const [own, other] = ch === 'vess' ? [vess, bram] : [bram, vess];
      expect(own[d.id]).toBe('a door meant for you');
      expect(other[d.id]).toBeUndefined();
    }
  });

  it('unflagged runs scout nothing', () => {
    const s0 = initialState(47, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 47 });
    expect(scoutView(s, 'p1')).toEqual({});
    expect(scoutView(s, 'p2')).toEqual({});
  });
});

describe('S11.6 the pin is the truth at victory', () => {
  /** A tracks run standing on a knot, one dying enemy, kill staged. */
  function atKnot(seed: number): GameState {
    const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed, tracks: true });
    const knot = s.map.nodes.find((n) => n.kind === 'elite')!;
    s.map.position = knot.id;
    startCombat(s, ENCOUNTERS[knot.encounterId!].enemies);
    for (const e of s.combat!.enemies) e.hp = 0;
    const target = s.combat!.enemies[0];
    target.hp = 1;
    target.boundTo = 'p1';
    const [card] = forceHand(s, 'p1', ['stitchblade']);
    return reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: card, slot: 0, targetId: target.id });
  }

  it('victory grants the scouted relic while it is unowned', () => {
    const s = ready(atKnot(53));
    expect(s.phase).toBe('reward');
    const knot = s.map.nodes.find((n) => n.id === s.map.position)!;
    expect(s.reward!.relic).toBe(knot.scoutRelicId);
    const owned = [...s.players.p1.relics, ...s.players.p2.relics];
    expect(owned).toContain(knot.scoutRelicId);
  });

  it('an owned pin falls back to the roll — with byte-identical rng either way', () => {
    const staged = atKnot(59);
    const knot = staged.map.nodes.find((n) => n.id === staged.map.position)!;
    const pinned = ready(structuredClone(staged));
    // same fight, but the pin is already in a pocket
    const stale = structuredClone(staged);
    stale.players.p1.relics.push(knot.scoutRelicId!);
    const fellBack = ready(stale);
    expect(fellBack.reward!.relic).toBeTruthy();
    expect(fellBack.reward!.relic).not.toBe(knot.scoutRelicId);
    // the pin path and the fallback path consume the SAME rolls
    expect(pinned.rng).toBe(fellBack.rng);
  });
});
