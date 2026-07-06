// S17 8a (ratified 2026-07-06) — the demoted four's owed mutations, plus the
// one piece of new machinery they needed: Frayed Line's odd-turn cadence
// (Hook.oddTurnsOnly, checked against CombatState.turn at fire time).

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { startCombat, startTurn } from '../src/combat';
import { CARDS } from '../src/content/registry';
import { POWERS } from '../src/content/powers';

function fresh(seed: number): GameState {
  return reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
}

describe('S17 8a — the demoted four mutate again', () => {
  it('all four carry their ratified mutations, each backed by a registered power', () => {
    for (const [id, power] of [
      ['aftershock', 'faultline'],
      ['stokers_due', 'stokers_advance'],
      ['selvage', 'raw_edge'],
      ['unbroken_line', 'frayed_line'],
    ] as const) {
      const def = CARDS[id];
      expect(def.mutation, id).toBeTruthy();
      expect(JSON.stringify(def.mutation!.base), id).toContain(power);
      expect(POWERS[power], power).toBeTruthy();
    }
  });

  it('Frayed Line pays on odd turns only (turns count from 1)', () => {
    const s = fresh(17);
    startCombat(s, ['gravewax_husk']);
    for (const e of s.combat!.enemies) { e.hp = 500; e.maxHp = 500; }
    s.players.p1.powers.push('frayed_line');
    // startCombat already began turn 1 (before the power existed), so the
    // observed window is turns 2–5. Regen is +2/turn when neither seat is
    // fallen; the Line adds +1 on odd turns. Draining the pool before each
    // start isolates the delta.
    expect(s.combat!.turn).toBe(1);
    const deltas: number[] = [];
    for (let t = 2; t <= 5; t++) {
      s.thread = 0;
      startTurn(s);
      expect(s.combat!.turn).toBe(t);
      deltas.push(s.thread);
    }
    expect(deltas).toEqual([2, 3, 2, 3]);
  });
});
