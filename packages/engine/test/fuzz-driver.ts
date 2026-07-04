// Shared fuzz driver (§11): the seeded random-action walker and invariant
// suite used by fuzz.test.ts and the tracks covenant tests. Not a test file.

import { expect } from 'vitest';
import { Action, GameState, PlayerId } from '../src/types';
import { effectiveDef, findInstance } from '../src/combat';
import { pickableNodes } from '../src/map';
import { EVENTS } from '../src/content/registry';
import { eventStageAt } from '../src/reducer';
import { QUESTIONS, answersFor } from '../src/content/questions';
import { ritesFor } from '../src/content/rites';
import { nextRng, rngInt } from '../src/rng';

export class Die {
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

export function randomAction(state: GameState, die: Die): Action | null {
  const pid: PlayerId = die.pick(['p1', 'p2']);
  const p = state.players[pid];
  switch (state.phase) {
    case 'rites': {
      // S7.2 (flagged fuzz): don a vestment from the offer
      const offer = state.ritesState?.offer?.[pid];
      if (!offer || offer.length === 0) return null;
      return { type: 'RITE_PICK', player: pid, riteId: die.pick(offer) };
    }
    case 'map': {
      const options = pickableNodes(state.map);
      if (options.length === 0) return null;
      // mostly agree (lowest id), sometimes disagree to fuzz the mismatch path
      const nodeId = die.chance(0.85) ? Math.min(...options) : die.pick(options);
      return { type: 'NODE_PICK', player: pid, nodeId };
    }
    case 'combat': {
      if (die.chance(0.002)) return { type: 'CONCEDE', player: pid, confirm: die.chance(0.7) };
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
          // S7.6: exhaust joins the discard as a Reclaim source
          : kind === 'reclaim' && (partner.discard.length || partner.exhaust.length)
            ? die.pick([...partner.discard, ...partner.exhaust])
          // §14.12: Pulse targets a staged card (often illegal — that's the point)
          : kind === 'pulse' && combat.chain.length ? die.pick(combat.chain).cardInstanceId
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
      // S7.4 (flagged fuzz): a birth pick owed here blocks ADVANCE — usually
      // pick it, sometimes poke the guard with an ADVANCE (must throw)
      if (state.ritesState?.birthChoice === pid && die.chance(0.8)) {
        const pool = ritesFor(state.players[pid].character, 'birth').map((r) => r.id);
        return { type: 'RITE_PICK', player: pid, riteId: die.pick(pool) };
      }
      const ev = state.event!;
      if (ev.chosen === null) {
        // S11.5: address the CURRENT stage (unflagged runs never deepen, so
        // stagePath stays absent and this is the same array — die
        // consumption is byte-identical there). Keyed options may still be
        // picked and must throw: the fuzzer pokes that guard on purpose.
        const options = eventStageAt(EVENTS[ev.eventId], ev.stagePath ?? []).options.map((o) => o.id);
        return { type: 'EVENT_CHOOSE', player: die.chance(0.9) ? ev.chooser : pid, optionId: die.pick(options) };
      }
      return { type: 'ADVANCE', player: pid };
    }
    case 'rest': {
      const rest = state.rest!;
      // S11.7 toll door (flagged maps only — this branch never fires
      // unflagged, so unflagged die consumption is untouched). Random seat
      // votes: mismatches exercise the reset; matches pay the toll.
      if (rest.toll) {
        if (rest.toll.healed === null) {
          return { type: 'TOLL_PICK', player: pid, seat: die.pick(['p1', 'p2'] as const) };
        }
        return { type: 'ADVANCE', player: pid };
      }
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
    case 'covet_treasure': {
      // S11.7 covet cache (flagged maps only): vote, occasionally poke the
      // seize guard (no-charge seizes must throw), advance once divided
      const ct = state.covetTreasure!;
      if (ct.taken === null) {
        return { type: 'TREASURE_PICK', player: pid, choice: die.pick(['gold', 'relic'] as const) };
      }
      if (ct.seizedBy === null && die.chance(0.4)) {
        return { type: 'TREASURE_SEIZE', player: pid };
      }
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
    case 'loom': {
      // nt-slice (flagged fuzz): random sheet edits, confirms, and the
      // post-verdict advance — illegal sets (struck answers) exercise guards
      const shrine = state.truth?.shrine;
      if (!shrine) return null;
      if (shrine.verdict) return { type: 'ADVANCE', player: pid };
      if (die.chance(0.6)) {
        const q = die.pick(QUESTIONS.map((qq) => qq.id));
        const answers = answersFor(q).map((a) => a.id);
        return {
          type: 'LOOM_SHEET_SET', player: pid, questionId: q,
          answerId: die.chance(0.3) ? null : die.pick(answers),
        };
      }
      return { type: 'LOOM_CONFIRM', player: pid, confirm: die.chance(0.8) };
    }
    default:
      return null; // lobby/terminal
  }
}

export function checkInvariants(state: GameState, seed: number, step: number): void {
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

