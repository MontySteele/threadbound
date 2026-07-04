// OQ#57 instruments: the REAL measures behind two proxied gates —
// "questions provable/run" (S11.3 band) and "rite-card play rate"
// (S9c gate 2). Telemetry-only: hashes and goldens are untouched
// (hashState excludes telemetry).

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat } from '../src/combat';
import { FRAGMENTS } from '../src/content/truth';
import { RITE_CARDS } from '../src/content/rites';

describe('OQ#57: questions provable/run (written at run end)', () => {
  it('a fully-pinned board reads every question confident; an empty board reads none', () => {
    const s0 = initialState(67, { p1: 'vess', p2: 'bram' });
    let s = reduce(s0, { type: 'START_RUN', seed: 67, tracks: true });
    // pin EVERY truth-consistent fragment — the deducibility covenant
    // guarantees each question's false answers are all eliminable
    const tuple = s.truth!.tuple;
    for (const f of FRAGMENTS.filter((f) => !f.eliminates.includes(tuple[f.bearsOn]))) {
      s.truth!.boards.p1.push({
        fragmentId: f.id, eventId: f.eventId, act: 1, questionId: f.bearsOn, text: f.text,
      });
    }
    // concede routes through gameOver — the instrument writes there
    s = reduce(s, { type: 'CONCEDE', player: 'p1', confirm: true });
    s = reduce(s, { type: 'CONCEDE', player: 'p2', confirm: true });
    expect(s.phase).toBe('game_over');
    expect(s.telemetry.truth!.questionsConfident).toBe(4);
    expect(s.telemetry.truth!.questionsNarrowed).toBe(0);

    const e0 = initialState(68, { p1: 'vess', p2: 'bram' });
    let e = reduce(e0, { type: 'START_RUN', seed: 68, tracks: true });
    e = reduce(e, { type: 'CONCEDE', player: 'p1', confirm: true });
    e = reduce(e, { type: 'CONCEDE', player: 'p2', confirm: true });
    expect(e.telemetry.truth!.questionsConfident).toBe(0);
  });
});

describe('OQ#57: rite-card play rate', () => {
  it('playing a rite card bumps ritePlays for its seat (rites runs only)', () => {
    const s0 = initialState(71, { p1: 'vess', p2: 'bram' });
    const s: GameState = reduce(s0, { type: 'START_RUN', seed: 71, rites: true });
    startCombat(s, ['cinder_husk']);
    const riteCard = RITE_CARDS[0];
    const p = s.players.p1;
    const instanceId = 'test_rite_play';
    p.deck.push({ instanceId, defId: riteCard.id });
    p.hand = [instanceId];
    let t = reduce(s, {
      type: 'STAGE_CARD', player: 'p1', cardInstanceId: instanceId, slot: 0,
      ...(riteCard.needsTarget ? { targetId: s.combat!.enemies[0].id } : {}),
    });
    t = reduce(t, { type: 'SET_READY', player: 'p1', ready: true });
    t = reduce(t, { type: 'SET_READY', player: 'p2', ready: true });
    expect(t.telemetry.rites!.ritePlays!.p1).toBe(1);
    expect(t.telemetry.rites!.ritePlays!.p2 ?? 0).toBe(0);
  });
});
