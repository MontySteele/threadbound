// Property/fuzz tests (§11), M2 scope: full runs across branching maps, shops,
// rests (upgrades/wedding), treasure, acts and the finale. Invariants checked
// every step; every sequence replays to identical state hashes.

import { describe, expect, it } from 'vitest';
import { Action, GameState, IllegalAction, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { hashState } from '../src/hash';
import { effectiveDef, findInstance } from '../src/combat';
import { pickableNodes } from '../src/map';
import { EVENTS } from '../src/content/registry';
import { nextRng, rngInt } from '../src/rng';

const SEQUENCES = Number(process.env.FUZZ_SEQUENCES ?? 120);
const MAX_ACTIONS = 2500;

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

function randomAction(state: GameState, die: Die): Action | null {
  const pid: PlayerId = die.pick(['p1', 'p2']);
  const p = state.players[pid];
  switch (state.phase) {
    case 'map': {
      const options = pickableNodes(state.map);
      if (options.length === 0) return null;
      // mostly agree (lowest id), sometimes disagree to fuzz the mismatch path
      const nodeId = die.chance(0.85) ? Math.min(...options) : die.pick(options);
      return { type: 'NODE_PICK', player: pid, nodeId };
    }
    case 'combat': {
      const combat = state.combat!;
      const living = combat.enemies.filter((e) => e.hp > 0);
      const targetable = living.filter((e) => !e.untargetable);
      const roll = die.int(100);
      if (p.fallen) return { type: 'SET_READY', player: pid, ready: true };
      if (roll < 40 && p.hand.length > 0 && !p.ready) {
        const cardInstanceId = die.pick(p.hand);
        const def = effectiveDef(findInstance(p, cardInstanceId)!);
        return {
          type: 'STAGE_CARD', player: pid, cardInstanceId,
          slot: die.int(combat.chain.length + 1),
          targetId: def.needsTarget && targetable.length ? die.pick(targetable).id : undefined,
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
      if (r.picked[pid] === null && r.sets[pid].length > 0) {
        return { type: 'REWARD_PICK', player: pid, pick: die.chance(0.3) ? 'skip' : die.pick(r.sets[pid]) };
      }
      const partner: PlayerId = pid === 'p1' ? 'p2' : 'p1';
      if (r.coveted[pid] === null && r.picked[partner] !== null && r.sets[partner].length > 0 && die.chance(0.4)) {
        return { type: 'COVET_PICK', player: pid, pick: die.chance(0.5) ? 'pass' : die.pick(r.sets[partner]) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    case 'event': {
      const ev = state.event!;
      if (ev.chosen === null) {
        const options = EVENTS[ev.eventId].options.map((o) => o.id);
        return { type: 'EVENT_CHOOSE', player: die.chance(0.9) ? ev.chooser : pid, optionId: die.pick(options) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    case 'rest': {
      const rest = state.rest!;
      if (rest.chosen[pid] === null) {
        return { type: 'REST_CHOOSE', player: pid, option: die.pick(['rest', 'barter', 'rebraid', 'upgrade'] as const) };
      }
      if (rest.chosen[pid] === 'upgrade' && !rest.upgradePicked[pid]) {
        const candidates = p.deck.filter((c) => !c.upgraded);
        if (candidates.length > 0) return { type: 'UPGRADE_PICK', player: pid, cardInstanceId: die.pick(candidates).instanceId };
      }
      if (die.chance(0.1) && p.deck.length > 0) {
        return { type: 'WEDDING_PICK', player: pid, cardInstanceId: die.pick(p.deck).instanceId };
      }
      if (state.rest!.wedding && die.chance(0.3)) return { type: 'WEDDING_CONFIRM', player: pid };
      return { type: 'ADVANCE', player: pid };
    }
    case 'shop': {
      const shop = state.shop!;
      const unsold = shop.items.filter((i) => !i.sold);
      if (unsold.length > 0 && die.chance(0.5)) {
        const item = die.pick(unsold);
        if (item.kind === 'removal') {
          if (p.deck.length > 0) {
            return { type: 'SHOP_REMOVE', player: pid, itemId: item.id, cardInstanceId: die.pick(p.deck).instanceId };
          }
        } else {
          return { type: 'SHOP_BUY', player: pid, itemId: item.id };
        }
      }
      return { type: 'ADVANCE', player: pid };
    }
    default:
      return null; // lobby/terminal
  }
}

function checkInvariants(state: GameState, seed: number, step: number): void {
  const ctx = `seed=${seed} step=${step}`;
  expect(state.thread, `${ctx} thread>=0`).toBeGreaterThanOrEqual(0);
  expect(state.thread, `${ctx} thread<=max`).toBeLessThanOrEqual(state.threadMax);
  expect(state.gold, `${ctx} gold>=0`).toBeGreaterThanOrEqual(0);
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    expect(p.hp, `${ctx} hp>=0`).toBeGreaterThanOrEqual(0);
    expect(p.hp, `${ctx} hp<=max`).toBeLessThanOrEqual(p.maxHp);
    expect(p.block, `${ctx} block>=0`).toBeGreaterThanOrEqual(0);
    expect(p.energy, `${ctx} energy>=0`).toBeGreaterThanOrEqual(0);
    expect(p.kindled, `${ctx} kindled>=0`).toBeGreaterThanOrEqual(0);
    expect(p.momentum, `${ctx} momentum>=0`).toBeGreaterThanOrEqual(0);
    expect(p.covetCharges).toBeGreaterThanOrEqual(0);
    expect(p.covetCharges).toBeLessThanOrEqual(3);
    if (p.fallen) expect(p.hp, `${ctx} fallen at >0 hp`).toBe(0);
    if (state.phase === 'combat') {
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
    expect(state.combat.severedTurns).toBeGreaterThanOrEqual(0);
    for (const e of state.combat.enemies) {
      expect(e.hp, `${ctx} enemy hp>=0`).toBeGreaterThanOrEqual(0);
      expect(e.hex, `${ctx} hex>=0`).toBeGreaterThanOrEqual(0);
      expect(e.block).toBeGreaterThanOrEqual(0);
    }
  }
  if (state.phase === 'map') {
    expect(state.map.nodes.length).toBeGreaterThan(0);
  }
}

describe(`fuzz: ${SEQUENCES} seeded random action sequences across full runs (§11)`, () => {
  it('holds invariants and replays to identical state hashes', () => {
    let totalActions = 0;
    const phasesSeen = new Set<string>();
    for (let seed = 1; seed <= SEQUENCES; seed++) {
      const die = new Die(seed * 7919);
      let state = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      const applied: Action[] = [];
      const hashes: string[] = [hashState(state)];
      for (let step = 0; step < MAX_ACTIONS; step++) {
        phasesSeen.add(state.phase);
        const action = randomAction(state, die);
        if (!action) break;
        let next: GameState;
        try {
          next = reduce(state, action);
        } catch (err) {
          expect(err, `seed=${seed} step=${step}: non-IllegalAction throw from ${action.type}: ${err}`).toBeInstanceOf(IllegalAction);
          continue;
        }
        state = next;
        applied.push(action);
        hashes.push(hashState(state));
        checkInvariants(state, seed, step);
      }
      totalActions += applied.length;
      let replay = reduce(initialState(seed, { p1: 'vess', p2: 'bram' }), { type: 'START_RUN', seed });
      expect(hashState(replay)).toBe(hashes[0]);
      applied.forEach((action, i) => {
        replay = reduce(replay, action);
        if (hashState(replay) !== hashes[i + 1]) {
          expect.fail(`seed=${seed}: replay diverged at action ${i} (${action.type})`);
        }
      });
    }
    // the fuzzer must actually exercise the new M2 surfaces
    for (const phase of ['map', 'combat', 'reward', 'rest', 'event']) {
      expect(phasesSeen.has(phase), `fuzzer never reached ${phase}`).toBe(true);
    }
    expect(totalActions).toBeGreaterThan(SEQUENCES * 20);
  }, 600_000);
});
