// Property/fuzz tests (§11): seeded random action sequences asserting
// invariants, with full deterministic replay verified by state hash.

import { describe, expect, it } from 'vitest';
import { Action, GameState, IllegalAction, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { effectiveDef, findInstance } from '../src/combat';
import { nextRng, rngInt } from '../src/rng';

const SEQUENCES = Number(process.env.FUZZ_SEQUENCES ?? 400);
const MAX_ACTIONS = 600;

class Die {
  constructor(private s: number) {}
  int(n: number): number {
    const r = rngInt(this.s, n);
    this.s = r.state;
    return r.value;
  }
  chance(p: number): boolean {
    const r = nextRng(this.s);
    this.s = r.state;
    return r.value < p;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
}

/** Generate a plausible (mostly legal, occasionally illegal) action. */
function randomAction(state: GameState, die: Die): Action | null {
  const pid: PlayerId = die.pick(['p1', 'p2']);
  const p = state.players[pid];
  switch (state.phase) {
    case 'combat': {
      const combat = state.combat!;
      const living = combat.enemies.filter((e) => e.hp > 0);
      const roll = die.int(100);
      if (roll < 40 && p.hand.length > 0 && !p.ready) {
        const cardInstanceId = die.pick(p.hand);
        const def = effectiveDef(findInstance(p, cardInstanceId)!);
        return {
          type: 'STAGE_CARD', player: pid, cardInstanceId,
          slot: die.int(combat.chain.length + 1),
          targetId: def.needsTarget && living.length ? die.pick(living).id : undefined,
        };
      }
      if (roll < 48 && combat.chain.length > 0 && !p.ready) {
        return { type: 'UNSTAGE_CARD', player: pid, cardInstanceId: die.pick(combat.chain).cardInstanceId };
      }
      if (roll < 54 && combat.chain.length > 0 && !p.ready) {
        return { type: 'REORDER', player: pid, cardInstanceId: die.pick(combat.chain).cardInstanceId, slot: die.int(combat.chain.length) };
      }
      if (roll < 64 && !p.ready) {
        const kind = die.pick(['pulse', 'reclaim', 'sever', 'steady'] as const);
        const partner = state.players[pid === 'p1' ? 'p2' : 'p1'];
        const targetId =
          kind === 'sever' && living.length ? die.pick(living).id
          : kind === 'reclaim' && partner.discard.length ? die.pick(partner.discard)
          : undefined;
        return { type: 'DECLARE_THREAD', player: pid, kind, targetId };
      }
      return { type: 'SET_READY', player: pid, ready: !p.ready || die.chance(0.2) };
    }
    case 'reward': {
      const r = state.reward!;
      if (r.picked[pid] === null) {
        const set = r.sets[pid];
        return { type: 'REWARD_PICK', player: pid, pick: die.chance(0.3) ? 'skip' : die.pick(set) };
      }
      const partner: PlayerId = pid === 'p1' ? 'p2' : 'p1';
      if (r.coveted[pid] === null && r.picked[partner] !== null && die.chance(0.4)) {
        return { type: 'COVET_PICK', player: pid, pick: die.chance(0.5) ? 'pass' : die.pick(r.sets[partner]) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    case 'event': {
      const ev = state.event!;
      if (ev.chosen === null) {
        return { type: 'EVENT_CHOOSE', player: die.chance(0.9) ? ev.chooser : pid, optionId: die.pick(['take', 'leave', 'drink', 'refuse']) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    case 'rest': {
      if (state.rest!.chosen[pid] === null) {
        return { type: 'REST_CHOOSE', player: pid, option: die.pick(['rest', 'barter', 'rebraid'] as const) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    default:
      return null; // terminal
  }
}

function checkInvariants(state: GameState, seed: number, step: number): void {
  const ctx = `seed=${seed} step=${step}`;
  expect(state.thread, `${ctx} thread>=0`).toBeGreaterThanOrEqual(0);
  expect(state.thread, `${ctx} thread<=max`).toBeLessThanOrEqual(state.threadMax);
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    expect(p.hp, `${ctx} hp>=0`).toBeGreaterThanOrEqual(0);
    expect(p.hp, `${ctx} hp<=max`).toBeLessThanOrEqual(p.maxHp);
    expect(p.block, `${ctx} block>=0`).toBeGreaterThanOrEqual(0);
    expect(p.energy, `${ctx} energy>=0`).toBeGreaterThanOrEqual(0);
    expect(p.momentum, `${ctx} momentum>=0`).toBeGreaterThanOrEqual(0);
    expect(p.covetCharges).toBeGreaterThanOrEqual(0);
    expect(p.covetCharges).toBeLessThanOrEqual(2);
    if (state.phase === 'combat') {
      // zone conservation: every card instance is in exactly one zone
      const zones = [
        ...p.hand, ...p.draw, ...p.discard, ...p.exhaust,
        ...state.combat!.chain.filter((s) => s.owner === pid).map((s) => s.cardInstanceId),
      ];
      expect(new Set(zones).size, `${ctx} ${pid} duplicate instance across zones`).toBe(zones.length);
      const known = new Set([...p.deck, ...p.combatCards].map((c) => c.instanceId));
      for (const id of zones) expect(known.has(id), `${ctx} unknown instance ${id}`).toBe(true);
    }
  }
  if (state.combat) {
    for (const e of state.combat.enemies) {
      expect(e.hp, `${ctx} enemy hp>=0`).toBeGreaterThanOrEqual(0);
      expect(e.hex, `${ctx} hex>=0`).toBeGreaterThanOrEqual(0);
      expect(e.block).toBeGreaterThanOrEqual(0);
    }
  }
}

describe(`fuzz: ${SEQUENCES} seeded random action sequences (§11)`, () => {
  it('holds invariants and replays to identical state hashes', () => {
    let totalActions = 0;
    for (let seed = 1; seed <= SEQUENCES; seed++) {
      const die = new Die(seed * 7919);
      let state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < MAX_ACTIONS; step++) {
        const action = randomAction(state, die);
        if (!action) break;
        let next: GameState;
        try {
          next = reduce(state, action);
        } catch (err) {
          expect(err, `seed=${seed} step=${step}: non-IllegalAction throw: ${err}`).toBeInstanceOf(IllegalAction);
          continue; // rejected intents must leave state untouched (reduce clones)
        }
        state = next;
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      totalActions += applied.length;
      // deterministic replay (§11): identical (state, action) sequence → identical hashes
      let replay = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      expect(hashState(replay)).toBe(hashes[0]);
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=${seed}: replay diverged at action ${i} (${action.type})`);
        }
      });
    }
    expect(totalActions).toBeGreaterThan(SEQUENCES * 10);
  }, 300_000);
});
