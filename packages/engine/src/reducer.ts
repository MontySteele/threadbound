// The authoritative reducer (§11): reduce(state, action) -> state. Pure —
// clones the input, mutates the clone, returns it. Throws IllegalAction on
// invalid intents (the server converts these into error messages).

import {
  Action, CardInstance, CharacterId, GameState, IllegalAction, PlayerId, PlayerState, Telemetry,
} from './types';
import { CARDS, STARTER_DECKS, cardsForCharacter } from './content/cards';
import { ENCOUNTERS, M1_MAP } from './content/encounters';
import { EVENTS } from './content/events';
import { effectiveDef, findInstance, otherPlayer, resolveTurn, startCombat, startTurn } from './combat';
import { rngInt } from './rng';
import { maybeSayWitness, sayWitness } from './witness-draw';

export const STARTING_HP: Record<CharacterId, number> = { vess: 68, bram: 78 };

export function initialState(seed: number, characters: Record<PlayerId, CharacterId>): GameState {
  const mkPlayer = (id: PlayerId): PlayerState => {
    const character = characters[id];
    const deck: CardInstance[] = STARTER_DECKS[character].map((defId, i) => ({
      instanceId: `${id}_${defId}_${i}`,
      defId,
    }));
    return {
      id, character,
      hp: STARTING_HP[character], maxHp: STARTING_HP[character],
      block: 0, energy: 3, energyMax: 3, momentum: 0,
      statuses: { weak: 0, vulnerable: 0, frayed: 0 },
      powers: [],
      deck, draw: [], hand: [], discard: [], exhaust: [], combatCards: [],
      covetCharges: 1, // §8
      ready: false, pendingFray: 0, pulseBonus: 0,
    };
  };
  return {
    version: 1,
    seed,
    rng: seed >>> 0,
    phase: 'lobby',
    nodeIndex: -1,
    thread: 6,
    threadMax: 10, // §5
    rebraidUsed: false,
    players: { p1: mkPlayer('p1'), p2: mkPlayer('p2') },
    combat: null, reward: null, event: null, rest: null,
    advanceReady: { p1: false, p2: false },
    witnessSaid: [],
    log: [],
    telemetry: emptyTelemetry(),
  };
}

export function emptyTelemetry(): Telemetry {
  return { cardsPlayed: 0, linksFired: 0, resonances: 0, resonanceTagCounts: {}, damageByTag: {}, turns: 0 };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new IllegalAction(msg);
}

/** Planning energy budget: 3 + base-effect energy of this player's staged cards. */
function energyBudget(state: GameState, pid: PlayerId): { budget: number; spent: number } {
  const p = state.players[pid];
  let budget = p.energyMax;
  let spent = 0;
  for (const slot of state.combat!.chain) {
    if (slot.owner !== pid) continue;
    const def = effectiveDef(findInstance(p, slot.cardInstanceId)!);
    spent += def.cost;
    for (const eff of def.base) if (eff.op === 'energy') budget += eff.amount;
  }
  return { budget, spent };
}

function syncEnergyDisplay(state: GameState): void {
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const { budget, spent } = energyBudget(state, pid);
    state.players[pid].energy = budget - spent;
  }
}

export function reduce(prev: GameState, action: Action): GameState {
  const state: GameState = structuredClone(prev);
  state.log = [];
  apply(state, action);
  return state;
}

function apply(state: GameState, action: Action): void {
  switch (action.type) {
    case 'START_RUN': {
      assert(state.phase === 'lobby', 'run already started');
      const fresh = initialState(action.seed, {
        p1: state.players.p1.character,
        p2: state.players.p2.character,
      });
      Object.assign(state, fresh, { log: state.log });
      state.nodeIndex = 0;
      enterNode(state);
      return;
    }

    case 'STAGE_CARD': {
      const combat = requireCombat(state);
      const p = state.players[action.player];
      assert(!p.ready, 'unready first');
      assert(p.hand.includes(action.cardInstanceId), 'card not in hand');
      assert(!combat.chain.some((s) => s.cardInstanceId === action.cardInstanceId), 'already staged');
      assert(action.slot >= 0 && action.slot <= combat.chain.length, 'bad slot');
      const inst = findInstance(p, action.cardInstanceId)!;
      const def = effectiveDef(inst);
      if (def.needsTarget) {
        assert(action.targetId && combat.enemies.some((e) => e.id === action.targetId && e.hp > 0), 'needs living target');
      }
      const { budget, spent } = energyBudget(state, action.player);
      assert(spent + def.cost <= budget, 'not enough energy');
      combat.chain.splice(action.slot, 0, {
        cardInstanceId: action.cardInstanceId,
        owner: action.player,
        targetId: def.needsTarget ? action.targetId : undefined,
      });
      // staged cards leave the hand (visible to both on the Chain track, §2.1)
      p.hand.splice(p.hand.indexOf(action.cardInstanceId), 1);
      syncEnergyDisplay(state);
      return;
    }

    case 'UNSTAGE_CARD': {
      const combat = requireCombat(state);
      const p = state.players[action.player];
      assert(!p.ready, 'unready first');
      const idx = combat.chain.findIndex((s) => s.cardInstanceId === action.cardInstanceId);
      assert(idx >= 0, 'not staged');
      assert(combat.chain[idx].owner === action.player, 'not your card');
      const removed = combat.chain.splice(idx, 1)[0];
      p.hand.push(removed.cardInstanceId);
      const { budget, spent } = energyBudget(state, action.player);
      if (spent > budget) {
        // removing an energy-granting card would strand staged costs — refuse
        combat.chain.splice(idx, 0, removed);
        p.hand.splice(p.hand.indexOf(removed.cardInstanceId), 1);
        throw new IllegalAction('unstage other cards first (energy)');
      }
      syncEnergyDisplay(state);
      return;
    }

    case 'REORDER': {
      const combat = requireCombat(state);
      assert(!state.players[action.player].ready, 'unready first');
      const idx = combat.chain.findIndex((s) => s.cardInstanceId === action.cardInstanceId);
      assert(idx >= 0, 'not staged');
      assert(combat.chain[idx].owner === action.player, 'you may reorder only your own cards');
      assert(action.slot >= 0 && action.slot < combat.chain.length, 'bad slot');
      const [slot] = combat.chain.splice(idx, 1);
      combat.chain.splice(action.slot, 0, slot);
      return;
    }

    case 'DECLARE_THREAD': {
      const combat = requireCombat(state);
      const p = state.players[action.player];
      assert(!p.ready, 'unready first');
      assert(combat.threadActions.length < 10, 'too many declared thread actions');
      if (action.kind === 'sever') {
        assert(action.targetId && combat.enemies.some((e) => e.id === action.targetId && e.hp > 0), 'sever needs a living enemy');
      }
      if (action.kind === 'reclaim') {
        const partner = state.players[otherPlayer(action.player)];
        assert(action.targetId && partner.discard.includes(action.targetId), "reclaim needs a card in your partner's discard");
      }
      combat.threadActions.push({ player: action.player, kind: action.kind, targetId: action.targetId });
      return;
    }

    case 'UNDECLARE_THREAD': {
      const combat = requireCombat(state);
      assert(!state.players[action.player].ready, 'unready first');
      const idx = combat.threadActions.findIndex((t) => t.player === action.player && t.kind === action.kind);
      assert(idx >= 0, 'not declared');
      combat.threadActions.splice(idx, 1);
      return;
    }

    case 'SET_READY': {
      requireCombat(state);
      state.players[action.player].ready = action.ready;
      if (state.players.p1.ready && state.players.p2.ready) {
        resolveTurn(state);
        afterResolution(state);
      }
      return;
    }

    case 'REWARD_PICK': {
      assert(state.phase === 'reward' && state.reward, 'not in reward');
      const reward = state.reward!;
      assert(reward.picked[action.player] === null, 'already picked');
      if (action.pick !== 'skip') {
        assert(reward.sets[action.player].includes(action.pick), 'not in your reward set');
        addCardToDeck(state, action.player, action.pick);
      }
      reward.picked[action.player] = action.pick;
      return;
    }

    case 'COVET_PICK': {
      assert(state.phase === 'reward' && state.reward, 'not in reward');
      const reward = state.reward!;
      const p = state.players[action.player];
      const partner = otherPlayer(action.player);
      assert(reward.picked[partner] !== null, 'wait for your partner to pick first'); // §8
      assert(reward.coveted[action.player] === null, 'already decided');
      if (action.pick !== 'pass') {
        assert(p.covetCharges > 0, 'no Covet charges');
        assert(reward.sets[partner].includes(action.pick), "not in your partner's set");
        assert(reward.picked[partner] !== action.pick, 'your partner took that one');
        p.covetCharges--;
        addCardToDeck(state, action.player, action.pick);
        sayWitness(state, 'covet_pick');
      }
      reward.coveted[action.player] = action.pick;
      return;
    }

    case 'EVENT_CHOOSE': {
      assert(state.phase === 'event' && state.event, 'not in event');
      const ev = state.event!;
      assert(ev.chosen === null, 'already chosen');
      assert(action.player === ev.chooser, 'this choice is not yours to make'); // §8 crossed choices
      const def = EVENTS[ev.eventId];
      const opt = def.options.find((o) => o.id === action.optionId);
      assert(opt, 'no such option');
      ev.chosen = opt.id;
      ev.resultText = opt.resultText;
      const subject = state.players[ev.subject];
      for (const eff of opt.effects) {
        switch (eff.op) {
          case 'heal':
            subject.hp = Math.min(subject.maxHp, subject.hp + eff.amount);
            break;
          case 'loseHp':
            subject.hp = Math.max(0, subject.hp - eff.amount);
            break;
          case 'gainCard': {
            const pool = cardsForCharacter(subject.character).filter((c) => c.rarity === 'uncommon');
            const r = rngInt(state.rng, pool.length);
            state.rng = r.state;
            addCardToDeck(state, ev.subject, pool[r.value].id);
            state.log.push({ e: 'info', detail: `${ev.subject} gains ${pool[r.value].name}.` });
            break;
          }
          case 'pendingFray':
            subject.pendingFray += eff.amount;
            break;
          case 'nothing':
            break;
        }
      }
      state.log.push({ e: 'witness', line: opt.witness });
      if (subject.hp <= 0) gameOver(state);
      return;
    }

    case 'REST_CHOOSE': {
      assert(state.phase === 'rest' && state.rest, 'not at a rest site');
      const rest = state.rest!;
      assert(rest.chosen[action.player] === null, 'already chosen');
      const p = state.players[action.player];
      switch (action.option) {
        case 'rest':
          p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.3));
          break;
        case 'barter': // §8: gain 1 Covet charge instead of resting
          p.covetCharges = Math.min(2, p.covetCharges + 1);
          break;
        case 'rebraid': // §8: permanently +1 max Thread, once per run
          assert(!state.rebraidUsed, 'the Thread has already been re-braided this run');
          state.rebraidUsed = true;
          state.threadMax++;
          break;
      }
      rest.chosen[action.player] = action.option;
      return;
    }

    case 'ADVANCE': {
      assert(['reward', 'event', 'rest', 'map'].includes(state.phase), 'cannot advance now');
      if (state.phase === 'reward') {
        const r = state.reward!;
        assert(r.picked.p1 !== null && r.picked.p2 !== null, 'both players must pick first');
      }
      if (state.phase === 'event') assert(state.event!.chosen !== null, 'choose first');
      if (state.phase === 'rest') {
        assert(state.rest!.chosen[action.player] !== null, 'choose first');
      }
      state.advanceReady[action.player] = true;
      if (state.advanceReady.p1 && state.advanceReady.p2) {
        // a player who never explicitly coveted implicitly passes
        if (state.reward) {
          if (state.reward.coveted.p1 === null) state.reward.coveted.p1 = 'pass';
          if (state.reward.coveted.p2 === null) state.reward.coveted.p2 = 'pass';
        }
        state.advanceReady = { p1: false, p2: false };
        state.reward = null;
        state.event = null;
        state.rest = null;
        state.nodeIndex++;
        if (state.nodeIndex >= M1_MAP.length) {
          state.phase = 'victory';
        } else {
          enterNode(state);
        }
      }
      return;
    }
  }
}

function requireCombat(state: GameState) {
  assert(state.phase === 'combat' && state.combat, 'not in combat');
  return state.combat!;
}

function addCardToDeck(state: GameState, pid: PlayerId, defId: string): void {
  const p = state.players[pid];
  assert(CARDS[defId], 'unknown card');
  p.deck.push({ instanceId: `${pid}_${defId}_${p.deck.length}_n${state.nodeIndex}`, defId });
}

function enterNode(state: GameState): void {
  const node = M1_MAP[state.nodeIndex];
  switch (node.kind) {
    case 'combat':
    case 'elite': {
      const enc = ENCOUNTERS[node.encounterId!];
      startCombat(state, enc.enemies);
      if (node.kind === 'elite') sayWitness(state, 'elite_mourner_intro');
      else maybeSayWitness(state, 'combat_start', 25); // §13.3
      syncEnergyDisplay(state);
      return;
    }
    case 'event': {
      const def = EVENTS[node.eventId!];
      const r = rngInt(state.rng, 2);
      state.rng = r.state;
      const subject: PlayerId = r.value === 0 ? 'p1' : 'p2';
      state.event = {
        eventId: def.id,
        subject,
        chooser: def.crossed ? otherPlayer(subject) : subject, // §8 crossed choices
        chosen: null,
      };
      state.phase = 'event';
      return;
    }
    case 'rest':
      state.rest = { chosen: { p1: null, p2: null } };
      state.phase = 'rest';
      sayWitness(state, 'rest_site');
      return;
  }
}

function afterResolution(state: GameState): void {
  // deaths first (§13.3: the Witness always remarks on deaths)
  if (state.players.p1.hp <= 0 || state.players.p2.hp <= 0) {
    gameOver(state);
    return;
  }
  const combat = state.combat!;
  if (combat.enemies.every((e) => e.hp <= 0)) {
    const node = M1_MAP[state.nodeIndex];
    maybeSayWitness(state, 'combat_victory', 25);
    if (node.kind === 'elite') {
      // §8: +1 Covet charge per elite defeated, max 2 held
      state.players.p1.covetCharges = Math.min(2, state.players.p1.covetCharges + 1);
      state.players.p2.covetCharges = Math.min(2, state.players.p2.covetCharges + 1);
    }
    endCombatCleanup(state);
    if (state.nodeIndex === M1_MAP.length - 1) {
      state.phase = 'victory';
      return;
    }
    state.reward = {
      sets: { p1: rollRewardSet(state, 'p1'), p2: rollRewardSet(state, 'p2') },
      picked: { p1: null, p2: null },
      coveted: { p1: null, p2: null },
    };
    state.phase = 'reward';
    return;
  }
  startTurn(state);
  syncEnergyDisplay(state);
}

function endCombatCleanup(state: GameState): void {
  state.combat = null;
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.hand = []; p.draw = []; p.discard = []; p.exhaust = [];
    p.combatCards = []; // Echoes exhaust at end of combat (§5)
    p.block = 0; p.momentum = 0; p.powers = []; p.ready = false; p.pulseBonus = 0;
    p.energy = p.energyMax;
    p.statuses = { weak: 0, vulnerable: 0, frayed: 0 };
  }
}

function gameOver(state: GameState): void {
  sayWitness(state, 'player_death');
  endCombatCleanup(state);
  state.phase = 'game_over';
}

/** §8: each combat offers each player a set of 3 from their own pool. */
function rollRewardSet(state: GameState, pid: PlayerId): string[] {
  const pool = cardsForCharacter(state.players[pid].character);
  const out: string[] = [];
  let guard = 0;
  while (out.length < 3 && guard++ < 100) {
    const rar = rngInt(state.rng, 100);
    state.rng = rar.state;
    const rarity = rar.value < 60 ? 'common' : rar.value < 90 ? 'uncommon' : 'rare';
    const sub = pool.filter((c) => c.rarity === rarity && !out.includes(c.id));
    if (sub.length === 0) continue;
    const pick = rngInt(state.rng, sub.length);
    state.rng = pick.state;
    out.push(sub[pick.value].id);
  }
  return out;
}
