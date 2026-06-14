// The authoritative reducer (§11): reduce(state, action) -> state. Pure —
// clones the input, mutates the clone, returns it. Throws IllegalAction on
// invalid intents. M2: branching maps, shops, treasure, relics, upgrades,
// Wedding Knife, acts + finale, Fallen/revival.

import {
  Action, CardDef, CardInstance, CharacterId, GameState, GoldSource, IllegalAction, MapNode,
  PlayerId, PlayerState, Rarity, RestOption, Telemetry,
} from './types';
import { CARDS, ENEMIES, EVENTS, ALL_RELICS, RELICS_BY_ID, LOCKED_CARDS } from './content/registry';
import { STARTER_DECKS, cardsForCharacter, neutralCards } from './content/cards';
import { ENCOUNTERS } from './content/encounters';
import {
  computeLinksFired, effectiveDef, emptyActStats, findInstance, hasPassive, otherPlayer,
  resolveTurn, runHooks, startCombat, startTurn,
} from './combat';
import { ASCENSION_MAX, ascensionMods } from './ascension';
import { generateActMap, generateFinaleMap, pickableNodes } from './map';
import { rngInt } from './rng';
import { maybeSayWitness, sayWitness } from './witness-draw';

export const STARTING_HP: Record<CharacterId, number> = { vess: 68, bram: 78 };

export function initialState(seed: number, characters: Record<PlayerId, CharacterId>, botSeat?: PlayerId): GameState {
  const mkPlayer = (id: PlayerId): PlayerState => {
    const character = characters[id];
    const deck: CardInstance[] = STARTER_DECKS[character].map((defId, i) => ({
      instanceId: `${id}_${defId}_${i}`,
      defId,
    }));
    return {
      id, character,
      hp: STARTING_HP[character], maxHp: STARTING_HP[character],
      block: 0, energy: 3, energyMax: 3, kindled: 0, momentum: 0,
      fallen: false,
      statuses: { weak: 0, vulnerable: 0, frayed: 0 },
      pendingStatus: { weak: 0, vulnerable: 0, frayed: 0 }, // OQ#46
      powers: [], relics: [],
      deck, draw: [], hand: [], discard: [], exhaust: [], combatCards: [],
      covetCharges: 1,
      ready: false, pendingFray: 0,
      ringPulses: 0,
    };
  };
  return {
    version: 2,
    seed,
    rng: seed >>> 0,
    phase: 'lobby',
    ...(botSeat ? { botSeat } : {}),
    map: { act: 1, nodes: [], position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0 },
    gold: 100, // PT3 designer ruling: 40 too low for first-shop agency (was 40)
    removalsByPlayer: { p1: 0, p2: 0 },
    ascension: 0,
    ascensionVotes: { p1: 0, p2: 0 },
    unlockedCards: [],
    pendingThread: 0,
    thread: 6,
    threadMax: 10,
    rebraidUsed: false,
    players: { p1: mkPlayer('p1'), p2: mkPlayer('p2') },
    combat: null, reward: null, event: null, rest: null, shop: null,
    advanceReady: { p1: false, p2: false },
    concede: { p1: false, p2: false },
    witnessSaid: [],
    log: [],
    telemetry: emptyTelemetry(),
  };
}

export function emptyTelemetry(): Telemetry {
  return {
    cardsPlayed: 0, linksFired: 0, resonances: 0,
    resonanceTagCounts: {}, damageByTag: {},
    damageByPlayer: { p1: 0, p2: 0 },
    detonatedStacks: 0,
    detonationEvents: 0,
    covetsSpent: { p1: 0, p2: 0 },
    biggestTurn: { damage: 0, turn: 0, act: 0 },
    turns: 0, actStats: {},
    blockByPlayer: { p1: 0, p2: 0 },
    linkFiresByPlayer: { p1: 0, p2: 0 },
    fallsByPlayer: { p1: 0, p2: 0 },
    wornKnife: { plays: 0, damage: 0 },
    threadSpent: 0,
    threadSpendByKind: { pulse: 0, reclaim: 0, sever: 0, steady: 0 },
    regenWastedAtCap: 0,
    forcedLinkFires: 0,
    resonancesForced: 0,
    goldEarnedBySource: { combat: 0, elite: 0, boss: 0, event: 0, treasure: 0 },
    goldSpentByCategory: {
      p1: { cards: 0, relics: 0, removals: 0 },
      p2: { cards: 0, relics: 0, removals: 0 },
    },
    removalsByPlayer: { p1: 0, p2: 0 },
    goldResidual: 0,
    ringDiscountsFired: 0,
  };
}

/** S4.2 (OQ#8): a player's next removal price — 75 + 25 × removals THEY have
 *  bought this run, anywhere. Shared by reducer, bots, and the shop UI. */
export function removalPrice(state: Pick<GameState, 'removalsByPlayer'>, pid: PlayerId): number {
  return 75 + 25 * (state.removalsByPlayer?.[pid] ?? 0);
}

/** S4.1: every purse gain flows through here so source attribution and the
 *  per-act split can't drift from the actual gold. */
function earnGold(state: GameState, amount: number, source: GoldSource): void {
  state.gold += amount;
  state.telemetry.goldEarnedBySource[source] += amount;
  actStatsFor(state).goldEarned += amount;
}

function spendGold(state: GameState, pid: PlayerId, amount: number, category: 'cards' | 'relics' | 'removals'): void {
  state.gold -= amount;
  state.telemetry.goldSpentByCategory[pid][category] += amount;
  actStatsFor(state).goldSpent += amount;
}

function actStatsFor(state: GameState) {
  const act = state.map.act;
  return state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = emptyActStats());
}

/** S4.5: pool gate. Only ids in LOCKED_CARDS need unlocking; the set ships
 *  empty, so this is the identity filter until a locked set is authored. */
function cardUnlocked(state: GameState, def: CardDef): boolean {
  return !LOCKED_CARDS.has(def.id) || state.unlockedCards.includes(def.id);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new IllegalAction(msg);
}

export function reduce(prev: GameState, action: Action): GameState {
  const state: GameState = structuredClone(prev);
  state.log = [];
  apply(state, action);
  return state;
}

function covetMax(p: PlayerState): number {
  return hasPassive(p, 'covetMaxPlusOne') ? 3 : 2;
}

function apply(state: GameState, action: Action): void {
  switch (action.type) {
    case 'START_RUN': {
      assert(state.phase === 'lobby', 'run already started');
      // S4.4: both players must have landed on the same rung (default 0/0)
      assert(state.ascensionVotes.p1 === state.ascensionVotes.p2, 'agree on an ascension level first');
      const ascension = state.ascensionVotes.p1;
      const fresh = initialState(action.seed, {
        p1: state.players.p1.character,
        p2: state.players.p2.character,
      }, state.botSeat);
      Object.assign(state, fresh, { log: state.log });
      state.ascension = ascension;
      state.ascensionVotes = { p1: ascension, p2: ascension };
      state.unlockedCards = action.unlockedCards ?? [];
      const gen = generateActMap(state.rng, 1, ascensionMods(ascension).extraElite);
      state.rng = gen.rng;
      state.map = gen.map;
      state.phase = 'map';
      if (ascension > 0) state.log.push({ e: 'info', detail: `Ascension ${ascension} — the Undercroft leans in.` });
      return;
    }

    case 'SET_ASCENSION': {
      // S4.4 lobby vote, concede pattern: both must say the same number.
      assert(state.phase === 'lobby', 'ascension is chosen in the lobby');
      assert(Number.isInteger(action.level) && action.level >= 0 && action.level <= ASCENSION_MAX, 'bad ascension level');
      state.ascensionVotes[action.player] = action.level;
      // solo: the Witness follows the human's lead (S1.2 etiquette)
      if (state.botSeat && action.player !== state.botSeat) {
        state.ascensionVotes[state.botSeat] = action.level;
      }
      if (state.ascensionVotes.p1 === state.ascensionVotes.p2) {
        state.ascension = action.level;
      }
      return;
    }

    case 'NODE_PICK': {
      assert(state.phase === 'map', 'not at the map');
      const options = pickableNodes(state.map);
      assert(options.includes(action.nodeId), 'node not reachable');
      state.map.picks[action.player] = action.nodeId;
      const { p1, p2 } = state.map.picks;
      if (p1 !== null && p2 !== null) {
        if (p1 === p2) {
          state.map.position = p1;
          state.map.picks = { p1: null, p2: null };
          state.map.mismatchStreak = 0;
          enterNode(state);
        } else {
          // M2-B3: the path is a negotiation; M2-B5: the Witness enjoys the bickering
          state.map.mismatchStreak++;
          state.map.picks = { p1: null, p2: null };
          if (state.map.mismatchStreak >= 3) sayWitness(state, 'map_disagree');
          state.log.push({ e: 'info', detail: 'You pointed different ways. Pick the same door.' });
        }
      }
      return;
    }

    case 'STAGE_CARD': {
      const combat = requireCombat(state);
      const p = state.players[action.player];
      assert(!p.fallen, 'you are Fallen');
      assert(!p.ready, 'unready first');
      assert(p.hand.includes(action.cardInstanceId), 'card not in hand');
      assert(!combat.chain.some((s) => s.cardInstanceId === action.cardInstanceId), 'already staged');
      assert(action.slot >= 0 && action.slot <= combat.chain.length, 'bad slot');
      const inst = findInstance(p, action.cardInstanceId)!;
      const def = effectiveDef(inst);
      if (def.needsTarget) {
        assert(
          action.targetId &&
            combat.enemies.some((e) => e.id === action.targetId && e.hp > 0 && !e.untargetable),
          'needs a living, targetable enemy',
        );
      }
      assert(def.cost <= p.energy, 'not enough energy');
      p.energy -= def.cost;
      combat.chain.splice(action.slot, 0, {
        cardInstanceId: action.cardInstanceId,
        owner: action.player,
        targetId: def.needsTarget ? action.targetId : undefined,
      });
      p.hand.splice(p.hand.indexOf(action.cardInstanceId), 1);
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
      p.energy += effectiveDef(findInstance(p, removed.cardInstanceId)!).cost;
      // §14.12: a Pulse aimed at an unstaged card has nothing to force — drop
      // it (either player's) rather than letting it fizzle at resolution
      combat.threadActions = combat.threadActions.filter(
        (t) => !(t.kind === 'pulse' && t.targetId === action.cardInstanceId),
      );
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
      assert(!p.fallen, 'you are Fallen');
      assert(!state.players.p1.fallen && !state.players.p2.fallen, 'the Thread is slack'); // M2-A3
      assert(combat.severedTurns === 0, 'the Thread is severed'); // §6 Unraveled
      assert(!p.ready, 'unready first');
      assert(combat.threadActions.length < 10, 'too many declared thread actions');
      if (action.kind === 'sever') {
        assert(action.targetId && combat.enemies.some((e) => e.id === action.targetId && e.hp > 0), 'sever needs a living enemy');
      }
      if (action.kind === 'pulse') {
        // §14.12: Pulse forces a staged card's dead Link. Either player may
        // Pulse either player's card; one Pulse per card is enough.
        const slot = combat.chain.find((s) => s.cardInstanceId === action.targetId);
        assert(slot, 'pulse needs a staged card');
        const def = effectiveDef(findInstance(state.players[slot.owner], slot.cardInstanceId)!);
        assert(def.link, 'that card has no Link to force');
        const fired = computeLinksFired(state, combat.chain);
        assert(!fired[combat.chain.indexOf(slot)], 'that Link already fires');
        assert(
          !combat.threadActions.some((t) => t.kind === 'pulse' && t.targetId === action.targetId),
          'already pulsed',
        );
      }
      if (action.kind === 'reclaim') {
        const partner = state.players[otherPlayer(action.player)];
        assert(action.targetId && partner.discard.includes(action.targetId), "reclaim needs a card in your partner's discard");
        // PT2: Reclaim copies (the original stays in the discard), so without
        // this guard the same card could be declared twice in one turn
        assert(
          !combat.threadActions.some((t) => t.kind === 'reclaim' && t.targetId === action.targetId),
          'already being reclaimed this turn',
        );
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
      assert(!state.players[action.player].fallen || action.ready, 'the Fallen rest');
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
      assert(reward.picked[partner] !== null, 'wait for your partner to pick first');
      assert(reward.coveted[action.player] === null, 'already decided');
      if (action.pick !== 'pass') {
        assert(p.covetCharges > 0, 'no Covet charges');
        assert(reward.sets[partner].includes(action.pick), "not in your partner's set");
        assert(reward.picked[partner] !== action.pick, 'your partner took that one');
        p.covetCharges--;
        state.telemetry.covetsSpent[action.player]++;
        addCardToDeck(state, action.player, action.pick);
        sayWitness(state, state.botSeat ? 'covet_solo' : 'covet_pick');
        runHooks(state, action.player, 'covet');
      }
      reward.coveted[action.player] = action.pick;
      return;
    }

    case 'EVENT_CHOOSE': {
      assert(state.phase === 'event' && state.event, 'not in event');
      const ev = state.event!;
      assert(ev.chosen === null, 'already chosen');
      assert(action.player === ev.chooser, 'this choice is not yours to make');
      const def = EVENTS[ev.eventId];
      const opt = def.options.find((o) => o.id === action.optionId);
      assert(opt, 'no such option');
      ev.chosen = opt.id;
      ev.resultText = opt.resultText;
      const subject = state.players[ev.subject];
      for (const eff of opt.effects) applyEventEffect(state, subject, eff);
      state.log.push({ e: 'witness', line: opt.witness });
      // S2.1: a crossed choice the bot made FOR the human gets its own gloat
      if (state.botSeat && def.crossed && action.player === state.botSeat) {
        sayWitness(state, 'crossed_choice_made');
      }
      return;
    }

    case 'REST_CHOOSE': {
      assert(state.phase === 'rest' && state.rest, 'not at a rest site');
      const rest = state.rest!;
      assert(rest.chosen[action.player] === null, 'already chosen');
      const p = state.players[action.player];
      const option: RestOption = action.option;
      switch (option) {
        case 'rest':
          // S4.4 A5 (provisional): 30% → 20% at the top rung
          p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * ascensionMods(state.ascension).restHeal));
          break;
        case 'barter':
          p.covetCharges = Math.min(covetMax(p), p.covetCharges + 1);
          break;
        case 'rebraid':
          assert(!state.rebraidUsed, 'the Thread has already been re-braided this run');
          state.rebraidUsed = true;
          state.threadMax++;
          break;
        case 'upgrade':
          assert(p.deck.some((c) => !c.upgraded && CARDS[c.defId].upgrade), 'nothing to upgrade');
          break; // must UPGRADE_PICK before advancing (M2-B6)
        case 'wedding':
          throw new IllegalAction('the Wedding Knife is used via its own picks, not a rest choice');
      }
      rest.chosen[action.player] = option;
      return;
    }

    case 'UPGRADE_PICK': {
      assert(state.phase === 'rest' && state.rest, 'not at a rest site');
      const rest = state.rest!;
      assert(rest.chosen[action.player] === 'upgrade', 'you did not choose to upgrade');
      assert(!rest.upgradePicked[action.player], 'already upgraded');
      const p = state.players[action.player];
      const inst = p.deck.find((c) => c.instanceId === action.cardInstanceId);
      assert(inst, 'no such card in your deck');
      assert(!inst.upgraded, 'already upgraded');
      assert(CARDS[inst.defId].upgrade, 'that card has no upgrade');
      inst.upgraded = true;
      rest.upgradePicked[action.player] = true;
      state.log.push({ e: 'info', detail: `${p.character} upgrades ${CARDS[inst.defId].name} — the weave tightens.` });
      return;
    }

    case 'WEDDING_PICK': {
      assert(state.phase === 'rest' && state.rest, 'not at a rest site');
      assert(
        state.players.p1.relics.includes('wedding_knife') || state.players.p2.relics.includes('wedding_knife'),
        'no one carries the Wedding Knife',
      );
      const rest = state.rest!;
      if (!rest.wedding) {
        rest.wedding = { offers: { p1: null, p2: null }, confirmed: { p1: false, p2: false }, done: false };
      }
      assert(!rest.wedding.done, 'the trade is sealed');
      const p = state.players[action.player];
      const inst = p.deck.find((c) => c.instanceId === action.cardInstanceId);
      assert(inst, 'no such card in your deck');
      assert(!CARDS[inst.defId].starterOnly, 'starter scraps are no dowry');
      rest.wedding.offers[action.player] = action.cardInstanceId;
      rest.wedding.confirmed = { p1: false, p2: false }; // changing an offer resets consent
      return;
    }

    case 'WEDDING_CONFIRM': {
      assert(state.phase === 'rest' && state.rest?.wedding, 'no trade on the table');
      const w = state.rest!.wedding!;
      assert(!w.done, 'the trade is sealed');
      assert(w.offers.p1 && w.offers.p2, 'both must offer a card first');
      w.confirmed[action.player] = true;
      if (w.confirmed.p1 && w.confirmed.p2) {
        // §7: the only permanent cross-deck flow — explicit, named, both confirmed
        const c1 = state.players.p1.deck.findIndex((c) => c.instanceId === w.offers.p1);
        const c2 = state.players.p2.deck.findIndex((c) => c.instanceId === w.offers.p2);
        assert(c1 >= 0 && c2 >= 0, 'offered cards vanished');
        const [card1] = state.players.p1.deck.splice(c1, 1);
        const [card2] = state.players.p2.deck.splice(c2, 1);
        state.players.p1.deck.push(card2);
        state.players.p2.deck.push(card1);
        w.done = true;
        state.log.push({ e: 'info', detail: `The Wedding Knife cuts: ${CARDS[card1.defId].name} for ${CARDS[card2.defId].name}. No take-backs.` });
      }
      return;
    }

    case 'SHOP_BUY': {
      assert(state.phase === 'shop' && state.shop, 'not at a shop');
      const shop = state.shop!;
      const item = shop.items.find((i) => i.id === action.itemId);
      assert(item, 'no such item');
      assert(!item.sold, 'sold out');
      assert(item.kind !== 'removal', 'use SHOP_REMOVE for the removal service');
      assert(state.gold >= item.price, 'not enough gold');
      if (item.kind === 'card') {
        assert(item.forPlayer === action.player, 'that card is cut for your partner');
        addCardToDeck(state, action.player, item.refId!);
        spendGold(state, action.player, item.price, 'cards');
      } else {
        const p = state.players[action.player];
        assert(!p.relics.includes(item.refId!) && !state.players[otherPlayer(action.player)].relics.includes(item.refId!), 'already owned');
        grantRelic(state, action.player, item.refId!);
        spendGold(state, action.player, item.price, 'relics');
      }
      item.sold = true;
      return;
    }

    case 'SHOP_REMOVE': {
      // S4.2 (OQ#8): unlimited per visit — only gold gates it. The price is
      // per player and run-persistent: 75 + 25 × their removals so far,
      // paid from the shared purse. Going small-deck is allowed; it taxes
      // the team, escalatingly.
      assert(state.phase === 'shop' && state.shop, 'not at a shop');
      const shop = state.shop!;
      const item = shop.items.find((i) => i.id === action.itemId);
      assert(item && item.kind === 'removal', 'removal unavailable');
      assert(!item.forPlayer || item.forPlayer === action.player, "that service row is your partner's");
      const price = removalPrice(state, action.player);
      assert(state.gold >= price, 'not enough gold');
      const p = state.players[action.player];
      const idx = p.deck.findIndex((c) => c.instanceId === action.cardInstanceId);
      assert(idx >= 0, 'no such card in your deck');
      assert(p.deck.length > 5, 'your deck is thin enough');
      const [removed] = p.deck.splice(idx, 1);
      state.removalsByPlayer[action.player]++;
      state.telemetry.removalsByPlayer[action.player]++;
      spendGold(state, action.player, price, 'removals');
      state.log.push({ e: 'info', detail: `${p.character} pays ${price}g to forget ${CARDS[removed.defId].name}. Next cut: ${removalPrice(state, action.player)}g.` });
      // §14.13 tone budget: one line for the 4th+ cut (no-repeat pool of one)
      if (state.removalsByPlayer[action.player] >= 4) sayWitness(state, 'removal_fourth');
      return;
    }

    case 'CONCEDE': {
      assert(!['lobby', 'game_over', 'victory'].includes(state.phase), 'nothing to concede');
      state.concede[action.player] = action.confirm;
      if (state.concede.p1 && state.concede.p2) {
        state.log.push({ e: 'info', detail: 'You set the thread down together and walk back toward the light.' });
        gameOver(state); // routes through the summary + epitaph like any death
      }
      return;
    }

    case 'ADVANCE': {
      assert(['reward', 'event', 'rest', 'shop'].includes(state.phase), 'cannot advance now');
      if (state.phase === 'reward') {
        const r = state.reward!;
        assert(r.picked.p1 !== null && r.picked.p2 !== null, 'both players must pick first');
      }
      if (state.phase === 'event') assert(state.event!.chosen !== null, 'choose first');
      if (state.phase === 'rest') {
        const rest = state.rest!;
        assert(rest.chosen[action.player] !== null, 'choose first');
        if (rest.chosen[action.player] === 'upgrade') {
          assert(rest.upgradePicked[action.player], 'pick a card to upgrade first');
        }
      }
      state.advanceReady[action.player] = true;
      if (state.advanceReady.p1 && state.advanceReady.p2) {
        if (state.reward) {
          if (state.reward.coveted.p1 === null) state.reward.coveted.p1 = 'pass';
          if (state.reward.coveted.p2 === null) state.reward.coveted.p2 = 'pass';
        }
        const wasBoss = currentNode(state)?.kind === 'boss';
        state.advanceReady = { p1: false, p2: false };
        state.reward = null;
        state.event = null;
        state.rest = null;
        state.shop = null;
        if (wasBoss) {
          advanceAct(state);
        } else {
          state.phase = 'map';
        }
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------

function requireCombat(state: GameState) {
  assert(state.phase === 'combat' && state.combat, 'not in combat');
  return state.combat!;
}

function currentNode(state: GameState): MapNode | undefined {
  return state.map.nodes.find((n) => n.id === state.map.position);
}

function addCardToDeck(state: GameState, pid: PlayerId, defId: string): void {
  const p = state.players[pid];
  assert(CARDS[defId], 'unknown card');
  assert(!CARDS[defId].starterOnly, 'starter cards cannot be acquired');
  p.deck.push({ instanceId: `${pid}_${defId}_${p.deck.length}_a${state.map.act}n${state.map.position}`, defId });
}

function grantRelic(state: GameState, pid: PlayerId, relicId: string): void {
  const p = state.players[pid];
  if (p.relics.includes(relicId)) return;
  p.relics.push(relicId);
  state.log.push({ e: 'relic', player: pid, relic: relicId });
  const def = RELICS_BY_ID[relicId];
  for (const eff of def?.onPickup ?? []) {
    // pickup grants run through the hook-op interpreter
    // (import indirection avoided: simple ops only)
    if (eff.op === 'heal') p.hp = Math.min(p.maxHp, p.hp + eff.amount);
    else if (eff.op === 'block') void 0; // block outside combat is meaningless
    else if (eff.op === 'thread') state.pendingThread += eff.amount;
    else if (eff.op === 'draw') void 0;
    else if (eff.op === 'kindled') p.kindled += eff.amount;
    else if (eff.op === 'momentum') void 0;
    else if (eff.op === 'partnerHeal') {
      const partner = state.players[otherPlayer(pid)];
      partner.hp = Math.min(partner.maxHp, partner.hp + eff.amount);
    }
  }
}

function randomUnownedRelic(state: GameState): string | null {
  const owned = new Set([...state.players.p1.relics, ...state.players.p2.relics]);
  const pool = ALL_RELICS.filter((r) => !owned.has(r.id) && !r.passives?.includes('wedding_knife'));
  const weddable = ALL_RELICS.filter((r) => !owned.has(r.id));
  const usable = pool.length > 0 ? pool.concat(weddable.filter((r) => r.passives?.includes('wedding_knife'))) : weddable;
  if (usable.length === 0) return null;
  // PT2/OQ#29: rare relics carry 1/3 weight (non-rares entered thrice)
  const weighted = usable.flatMap((rel) => (rel.rare ? [rel] : [rel, rel, rel]));
  const r = rngInt(state.rng, weighted.length);
  state.rng = r.state;
  return weighted[r.value].id;
}

function applyEventEffect(state: GameState, subject: PlayerState, eff: { op: string; [k: string]: unknown }): void {
  switch (eff.op) {
    case 'heal':
      subject.hp = Math.min(subject.maxHp, subject.hp + (eff.amount as number));
      break;
    case 'loseHp':
      // M2-A3 ruling: events wound, never kill
      subject.hp = Math.max(1, subject.hp - (eff.amount as number));
      break;
    case 'maxHp':
      subject.maxHp = Math.max(10, subject.maxHp + (eff.amount as number));
      subject.hp = Math.max(1, Math.min(subject.maxHp, subject.hp + Math.max(0, eff.amount as number)));
      break;
    case 'gainCard': {
      const pool = [...cardsForCharacter(subject.character), ...neutralCards()]
        .filter((c) => c.rarity === (eff.pool as Rarity) && cardUnlocked(state, c));
      if (pool.length === 0) break;
      const r = rngInt(state.rng, pool.length);
      state.rng = r.state;
      addCardToDeck(state, subject.id, pool[r.value].id);
      state.log.push({ e: 'info', detail: `${subject.id} gains ${pool[r.value].name}.` });
      break;
    }
    case 'gainRelic': {
      const relic = randomUnownedRelic(state);
      if (relic) grantRelic(state, subject.id, relic);
      break;
    }
    case 'gold': {
      const amt = eff.amount as number;
      // S4.1: only gains get source attribution; event losses just drain the
      // purse (they're shared misfortune, not a spend category)
      if (amt > 0) earnGold(state, amt, 'event');
      else state.gold = Math.max(0, state.gold + amt);
      break;
    }
    case 'covetCharge':
      subject.covetCharges = Math.min(covetMax(subject), subject.covetCharges + (eff.amount as number));
      break;
    case 'pendingFray':
      subject.pendingFray += eff.amount as number;
      break;
    case 'thread':
      state.pendingThread += eff.amount as number;
      break;
    case 'upgradeRandom': {
      const candidates = subject.deck.filter((c) => !c.upgraded && CARDS[c.defId].upgrade);
      if (candidates.length === 0) break;
      const r = rngInt(state.rng, candidates.length);
      state.rng = r.state;
      candidates[r.value].upgraded = true;
      state.log.push({ e: 'info', detail: `${CARDS[candidates[r.value].defId].name} is upgraded.` });
      break;
    }
    case 'removeRandomStarter': {
      const starters = subject.deck.filter((c) => CARDS[c.defId].starterOnly);
      if (starters.length === 0) break;
      const r = rngInt(state.rng, starters.length);
      state.rng = r.state;
      const removed = starters[r.value];
      subject.deck.splice(subject.deck.findIndex((c) => c.instanceId === removed.instanceId), 1);
      state.log.push({ e: 'info', detail: `${CARDS[removed.defId].name} unravels and is gone.` });
      break;
    }
    case 'nothing':
      break;
  }
}

// ---------------------------------------------------------------------------
// Node entry / act flow
// ---------------------------------------------------------------------------

function enterNode(state: GameState): void {
  const node = currentNode(state)!;
  switch (node.kind) {
    case 'combat':
    case 'elite':
    case 'boss': {
      const enc = ENCOUNTERS[node.encounterId!];
      startCombat(state, enc.enemies);
      if (state.pendingThread > 0) {
        state.thread = Math.min(state.threadMax, state.thread + state.pendingThread);
        state.pendingThread = 0;
      }
      if (enc.id === 'a1_elite_mourner') sayWitness(state, 'elite_mourner_intro');
      else if (node.kind !== 'combat') sayWitness(state, 'combat_start');
      // solo profile is chattier (S2.1); co-op keeps the sparse 25%
      else maybeSayWitness(state, 'combat_start', state.botSeat ? 40 : 25);
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
        chooser: def.crossed ? otherPlayer(subject) : subject,
        chosen: null,
      };
      state.phase = 'event';
      return;
    }
    case 'rest':
      state.rest = { chosen: { p1: null, p2: null }, upgradePicked: { p1: false, p2: false }, wedding: null };
      state.phase = 'rest';
      sayWitness(state, 'rest_site');
      return;
    case 'shop':
      state.shop = generateShop(state);
      state.phase = 'shop';
      sayWitness(state, 'shop');
      return;
    case 'treasure': {
      // instant spoils, shown on the reward screen with no card sets
      const goldRoll = rngInt(state.rng, 21);
      state.rng = goldRoll.state;
      const gold = 30 + goldRoll.value;
      earnGold(state, gold, 'treasure');
      const relic = randomUnownedRelic(state);
      const ownerRoll = rngInt(state.rng, 2);
      state.rng = ownerRoll.state;
      const owner: PlayerId = ownerRoll.value === 0 ? 'p1' : 'p2';
      if (relic) grantRelic(state, owner, relic);
      state.reward = {
        sets: { p1: [], p2: [] },
        picked: { p1: 'skip', p2: 'skip' },
        coveted: { p1: 'pass', p2: 'pass' },
        gold,
        relic: relic ?? undefined,
      };
      state.phase = 'reward';
      return;
    }
  }
}

/** §14.9 (Playtest-1 ruling): one free rest's worth of healing between acts —
 *  30%, same as a rest site. Tune later; removable as an ascension modifier. */
function healBetweenActs(state: GameState): void {
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.3));
  }
  state.log.push({ e: 'info', detail: 'You bind your wounds on the way down — both heal 30%.' });
}

function advanceAct(state: GameState): void {
  if (state.map.act === 1) {
    healBetweenActs(state);
    const gen = generateActMap(state.rng, 2, ascensionMods(state.ascension).extraElite);
    state.rng = gen.rng;
    state.map = gen.map;
    state.phase = 'map';
    sayWitness(state, 'act2_start');
  } else if (state.map.act === 2) {
    healBetweenActs(state);
    state.map = generateFinaleMap();
    state.phase = 'map';
    sayWitness(state, 'finale_start');
  } else {
    state.phase = 'victory';
    state.telemetry.goldResidual = state.gold; // S4.1
    sayWitness(state, state.botSeat ? 'solo_victory' : 'victory_screen');
  }
}

// ---------------------------------------------------------------------------
// Post-resolution flow
// ---------------------------------------------------------------------------

function afterResolution(state: GameState): void {
  const combat = state.combat!;
  // M2-A3: the run ends only when BOTH are down
  if (state.players.p1.fallen && state.players.p2.fallen) {
    gameOver(state);
    return;
  }
  if (combat.enemies.every((e) => e.hp <= 0)) {
    const node = currentNode(state)!;
    maybeSayWitness(state, 'combat_victory', state.botSeat ? 40 : 25);

    // M2-A3: the survivor carries the Fallen out — revive at 1 HP
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const p = state.players[pid];
      if (p.fallen) {
        p.fallen = false;
        p.hp = 1;
        state.log.push({ e: 'revived', player: pid });
        sayWitness(state, state.botSeat ? 'revive_either' : 'revival');
      }
    }

    const goldRoll = rngInt(state.rng, 16);
    state.rng = goldRoll.state;
    const gold =
      node.kind === 'boss' ? 70 + goldRoll.value
      : node.kind === 'elite' ? 45 + goldRoll.value
      : 20 + goldRoll.value;
    earnGold(state, gold, node.kind as GoldSource);

    let relic: string | undefined;
    if (node.kind === 'elite' || node.kind === 'boss') {
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const p = state.players[pid];
        p.covetCharges = Math.min(covetMax(p), p.covetCharges + 1); // §8: +1 per elite
      }
      const r = randomUnownedRelic(state);
      if (r) {
        const ownerRoll = rngInt(state.rng, 2);
        state.rng = ownerRoll.state;
        grantRelic(state, ownerRoll.value === 0 ? 'p1' : 'p2', r);
        relic = r;
      }
    }

    endCombatCleanup(state);

    if (state.map.act === 3 && node.kind === 'boss') {
      // The Unraveled is down. The braid holds.
      advanceAct(state);
      return;
    }

    state.reward = {
      sets: { p1: rollRewardSet(state, 'p1'), p2: rollRewardSet(state, 'p2') },
      picked: { p1: null, p2: null },
      coveted: { p1: null, p2: null },
      gold,
      relic,
    };
    state.phase = 'reward';
    return;
  }
  startTurn(state);
}

function endCombatCleanup(state: GameState): void {
  state.combat = null;
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.hand = []; p.draw = []; p.discard = []; p.exhaust = [];
    p.combatCards = [];
    p.block = 0; p.momentum = 0; p.kindled = 0; p.powers = []; p.ready = false;
    p.energy = p.energyMax;
    p.fallen = false;
    p.statuses = { weak: 0, vulnerable: 0, frayed: 0 };
    p.pendingStatus = { weak: 0, vulnerable: 0, frayed: 0 }; // OQ#46
  }
}

function gameOver(state: GameState): void {
  sayWitness(state, state.botSeat ? 'solo_defeat' : 'player_death');
  endCombatCleanup(state);
  state.phase = 'game_over';
  state.telemetry.goldResidual = state.gold; // S4.1
}

/** §8: reward sets of 3 from your own pool; M2-B1 adds a neutral splash. */
function rollRewardSet(state: GameState, pid: PlayerId): string[] {
  const character = cardsForCharacter(state.players[pid].character);
  const neutrals = neutralCards();
  const out: string[] = [];
  let guard = 0;
  while (out.length < 3 && guard++ < 100) {
    const rar = rngInt(state.rng, 100);
    state.rng = rar.state;
    const rarity: Rarity = rar.value < 60 ? 'common' : rar.value < 90 ? 'uncommon' : 'rare';
    const neutralRoll = rngInt(state.rng, 100);
    state.rng = neutralRoll.state;
    // S4.5: the pool is gated by the run's unlock union (identity until a
    // locked set is authored — LOCKED_CARDS ships empty)
    const pool = (neutralRoll.value < 18 ? neutrals : character)
      .filter((c) => c.rarity === rarity && !out.includes(c.id) && cardUnlocked(state, c));
    if (pool.length === 0) continue;
    const pick = rngInt(state.rng, pool.length);
    state.rng = pick.state;
    out.push(pool[pick.value].id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shop (M2-B4)
// ---------------------------------------------------------------------------

function generateShop(state: GameState) {
  const items: GameState['shop'] extends infer _ ? import('./types').ShopItem[] : never = [];
  let n = 0;
  const price = (base: number, spread: number): number => {
    const r = rngInt(state.rng, spread);
    state.rng = r.state;
    return base + r.value;
  };
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const set = rollRewardSet(state, pid);
    for (const defId of set) {
      const rarity = CARDS[defId].rarity;
      items.push({
        id: `item${n++}`,
        kind: 'card',
        forPlayer: pid,
        refId: defId,
        price: rarity === 'rare' ? price(135, 31) : rarity === 'uncommon' ? price(68, 15) : price(45, 11),
        sold: false,
      });
    }
  }
  for (let i = 0; i < 2; i++) {
    const relic = randomUnownedRelic(state);
    if (relic) items.push({ id: `item${n++}`, kind: 'relic', refId: relic, price: price(140, 41), sold: false });
  }
  // S4.2: the removal service never sells out — one always-present row per
  // player; the live price is removalPrice(state, player), shown per player
  // (and the partner's, too: the negotiation is the point).
  items.push({ id: `item${n++}`, kind: 'removal', forPlayer: 'p1', price: 0, sold: false });
  items.push({ id: `item${n++}`, kind: 'removal', forPlayer: 'p2', price: 0, sold: false });
  return { items };
}
