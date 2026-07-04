// S11 Wave A — snarl escalation (S11.2) and the bound witness + tapestry
// dedup rung 0 (S11.3).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { escalationFactor, startCombat } from '../src/combat';
import { ENCOUNTERS, ENCOUNTER_POOLS } from '../src/content/encounters';
import { FRAGMENTS, rollTruth, serveBoundWitness, serveFragments } from '../src/content/truth';

describe('S11.2 snarl escalation', () => {
  it('the ladder is STEEP (ruling 2): +10/+30/+60 cumulative, clamped', () => {
    expect(escalationFactor(0)).toBe(0);
    expect(escalationFactor(1)).toBeCloseTo(0.10);
    expect(escalationFactor(2)).toBeCloseTo(0.30);
    expect(escalationFactor(3)).toBeCloseTo(0.60);
    expect(escalationFactor(9)).toBeCloseTo(0.60); // clamps at the top rung
  });

  it('cutting a knot tightens the remaining ones: elite HP and DMG scale by the ladder', () => {
    const eliteEnc = ENCOUNTERS[ENCOUNTER_POOLS[1].elite[0]];
    const spawn = (knotsCut: number): GameState => {
      const s0 = initialState(5, { p1: 'vess', p2: 'bram' });
      const s = reduce(s0, { type: 'START_RUN', seed: 5 });
      s.map.knotsCut = knotsCut;
      startCombat(s, eliteEnc.enemies);
      return s;
    };
    const base = spawn(0).combat!.enemies[0];
    const tightened = spawn(1).combat!.enemies[0];
    expect(tightened.maxHp).toBe(Math.round(base.maxHp * 1.1));
    const secondCut = spawn(2).combat!.enemies[0];
    expect(secondCut.maxHp).toBe(Math.round(base.maxHp * 1.3));
    // DMG side: attack intents carry the same factor
    if (base.intent.kind === 'attack' && secondCut.intent.kind === 'attack') {
      expect(secondCut.intent.amount).toBe(Math.round(base.intent.amount * 1.3));
    }
    // the escalation is carried for per-turn intent rescaling
    expect(spawn(2).combat!.escalation).toBeCloseTo(0.30);
    expect(spawn(0).combat!.escalation).toBeUndefined(); // factor 0 = absent (byte-equal shape)
  });

  it('non-elite combats never escalate', () => {
    const s0 = initialState(5, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 5 });
    s.map.knotsCut = 3;
    startCombat(s, ENCOUNTERS[ENCOUNTER_POOLS[1].easy[0]].enemies);
    expect(s.combat!.escalation).toBeUndefined();
  });
});

describe('S11.3 bound witness + tapestry dedup rung 0', () => {
  const tuple = rollTruth(99).value;

  it('serveBoundWitness never serves a fragment that eliminates the true answer', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { fragment } = serveBoundWitness(tuple, seed);
      expect(fragment).toBeTruthy();
      for (const a of fragment!.eliminates) {
        expect(tuple[fragment!.bearsOn]).not.toBe(a);
      }
    }
  });

  it('dedup rung 0: pinned eliminations steer the pick toward fresh ones', () => {
    // pin every fragment eliminating one specific answer; the next serve
    // must prefer a variant eliminating something else
    const consistent = FRAGMENTS.filter((f) => !f.eliminates.includes(tuple[f.bearsOn]));
    const firstElim = consistent[0].eliminates[0];
    const pinned = consistent.filter((f) => f.eliminates.includes(firstElim)).map((f) => f.id);
    for (let seed = 1; seed <= 100; seed++) {
      const { fragment } = serveBoundWitness(tuple, seed, pinned);
      expect(fragment).toBeTruthy();
      expect(fragment!.eliminates.some((a) => a !== firstElim)).toBe(true);
    }
  });

  it('serveFragments prefers fresh eliminations and falls back to duplicates only when exhausted', () => {
    // find a clue event with fragments; pin all-but-one of its actor-channel
    // eliminations and check the pick lands on the fresh one
    const byEvent = new Map<string, typeof FRAGMENTS>();
    for (const f of FRAGMENTS) {
      if (f.eliminates.includes(tuple[f.bearsOn])) continue;
      const list = byEvent.get(f.eventId) ?? [];
      list.push(f);
      byEvent.set(f.eventId, list);
    }
    const [eventId, frags] = [...byEvent.entries()].find(([, fs]) => fs.filter((f) => f.channel === 'actor').length >= 2)!;
    const actors = frags.filter((f) => f.channel === 'actor');
    const fresh = actors[actors.length - 1];
    const pinned = actors.filter((f) => f.id !== fresh.id).map((f) => f.id);
    for (let seed = 1; seed <= 50; seed++) {
      const { a } = serveFragments(eventId, tuple, seed, pinned);
      expect(a?.id).toBe(fresh.id);
    }
    // exhausted: every actor variant pinned → still serves (a duplicate)
    const allPinned = actors.map((f) => f.id);
    const { a } = serveFragments(eventId, tuple, 7, allPinned);
    expect(a).toBeTruthy();
  });
});
