// S11 Wave A — snarl escalation (S11.2) and the bound witness + tapestry
// dedup rung 0 (S11.3).

import { afterEach, describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { eventOptionAvailable, initialState, reduce } from '../src/reducer';
import { EVENTS } from '../src/content/registry';
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

describe('S11.4 event grammar v2', () => {
  const DEEP: import('../src/types').EventDef = {
    id: 'test_deep', name: 'The Test Door', act: 0, crossed: false,
    prose: 'A door. It hums.',
    options: [
      {
        id: 'walk', label: 'Walk away', resultText: 'You keep your hands.', witness: 'Sensible.',
        effects: [{ op: 'gold', amount: 5 }],
      },
      {
        id: 'press', label: 'Press on', resultText: '', witness: 'Oh, do.',
        effects: [{ op: 'gold', amount: 10 }],
        next: {
          prose: 'Deeper. The hum has teeth.',
          options: [
            {
              id: 'leave', label: 'Leave with the pot', resultText: 'You leave, heavier.', witness: 'Hm.',
              effects: [],
            },
            {
              id: 'deeper', label: 'The desperate door', resultText: 'It takes and gives.', witness: 'There it is.',
              effects: [{ op: 'loseHp', amount: 4 }, { op: 'gainCard', pool: 'uncommon' }],
              requires: { hpAtMost: 30 },
            },
            {
              id: 'codex_door', label: 'Speak the proven name', resultText: 'The door knows you know.', witness: 'Clever.',
              effects: [{ op: 'gainRelic' }],
              requires: { codexProven: 'a_peal' },
            },
          ],
        },
      },
    ],
  };

  function eventState(codexProven?: string[]): GameState {
    const s0 = initialState(3, { p1: 'vess', p2: 'bram' });
    const s = reduce(s0, { type: 'START_RUN', seed: 3, ...(codexProven ? { codexProven } : {}) });
    (EVENTS as Record<string, typeof DEEP>)[DEEP.id] = DEEP;
    s.phase = 'event';
    s.event = { eventId: DEEP.id, chooser: 'p1', subject: 'p1', chosen: null };
    return s;
  }
  afterEach(() => { delete (EVENTS as Record<string, unknown>)['test_deep']; });

  it('press-on carries the pot, deepens the stage, and the delta line lands at the end', () => {
    let s = eventState();
    const goldBefore = s.gold;
    s = reduce(s, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'press' });
    expect(s.event!.chosen).toBeNull(); // not over — it deepened
    expect(s.event!.stagePath).toEqual(['press']);
    expect(s.event!.pot).toEqual([{ op: 'gold', amount: 10 }]);
    expect(s.gold).toBe(goldBefore + 10); // effects land as you go
    s = reduce(s, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'leave' });
    expect(s.event!.chosen).toBe('leave');
    expect(s.event!.deltaLine).toBe('+10 gold');
  });

  it('state-keyed options gate at the reducer: the desperate door needs low HP', () => {
    const s = eventState();
    let deep = reduce(s, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'press' });
    expect(() => reduce(deep, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'deeper' })).toThrow();
    deep.players.p1.hp = 20;
    deep = reduce(deep, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'deeper' });
    expect(deep.event!.chosen).toBe('deeper');
    expect(deep.event!.deltaLine).toContain('−4 HP');
    expect(deep.event!.deltaLine).toContain('uncommon card');
  });

  it('codex-keyed doors: proven answers open them; nothing else does', () => {
    const closed = reduce(eventState(), { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'press' });
    expect(eventOptionAvailable(closed, 'p1', DEEP.options[1].next!.options[2])).toBe(false);
    const open = reduce(eventState(['a_peal']), { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'press' });
    expect(eventOptionAvailable(open, 'p1', DEEP.options[1].next!.options[2])).toBe(true);
    expect(() => reduce(open, { type: 'EVENT_CHOOSE', player: 'p1', optionId: 'codex_door' })).not.toThrow();
  });

  it('flag-off parity: no shipped event carries stages or keys yet (rng untouched by construction)', () => {
    for (const e of Object.values(EVENTS)) {
      for (const o of e.options) {
        expect(o.next, `${e.id}/${o.id}`).toBeUndefined();
        expect(o.requires, `${e.id}/${o.id}`).toBeUndefined();
      }
    }
  });
});
