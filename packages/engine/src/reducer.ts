// The authoritative reducer (§11): reduce(state, action) -> state. Pure —
// clones the input, mutates the clone, returns it. Throws IllegalAction on
// invalid intents. M2: branching maps, shops, treasure, relics, upgrades,
// Wedding Knife, acts + finale, Fallen/revival.

import {
  Action, CardDef, CardInstance, CharacterId, EnemyIntent, EventDef, EventEffectOp,
  EventOptionDef, EventStageDef, GameState, GoldSource, IllegalAction,
  MapNode, PlayerId, PlayerState, Rarity, RestOption, Telemetry,
} from './types';
import { CARDS, ENEMIES, EVENTS, ALL_RELICS, RELICS_BY_ID, LOCKED_CARDS } from './content/registry';
import { STARTER_DECKS, cardsForCharacter, neutralCards } from './content/cards';
import { ENCOUNTERS } from './content/encounters';
import {
  computeLinksFired, effectiveDef, emptyActStats, findInstance, hasPassive, otherPlayer,
  resolveTurn, runHooks, startCombat, startTurn,
} from './combat';
import { ASCENSION_MAX, ascensionMods, scaleIntent } from './ascension';
import { generateActMap, generateFinaleMap, pickableNodes } from './map';
import { FRAGMENTS_BY_ID, rollTruth, serveBoundWitness, serveFragments } from './content/truth';
import { rollLiveMechanics } from './content/faces';
import { RITES_BY_ID, unlockedRites } from './content/rites';
import { ANSWERS_BY_ID, QUESTIONS, QUESTIONS_BY_ID, answersFor } from './content/questions';
import { rngInt } from './rng';
import { maybeSayWitness, sayWitness } from './witness-draw';

export const STARTING_HP: Record<CharacterId, number> = { vess: 68, bram: 78 };

/** Comfort-pass sweep knob, hardened to the registry envScale contract: the
 *  pure engine must survive envless hosts (browser), and a typo'd value must
 *  not start every run at NaN gold (which silently bricks the whole economy —
 *  SHOP_BUY's `gold >= price` is never true again). */
const startGold = (): number => {
  if (typeof process !== 'undefined' && process.env && process.env.TB_START_GOLD) {
    const v = Number(process.env.TB_START_GOLD);
    if (Number.isFinite(v) && v >= 0) return v;
  }
  return 100;
};

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
    map: { act: 1, nodes: [], position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 },
    gold: startGold(), // PT3 designer ruling: 40 too low for first-shop agency (was 40); env knob: sweep experiments
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
      // S8.7 voice arc: codex fill % keys Witness register selection. Stored
      // only when nonzero — absent = 0, so zero/absent runs serialize (and
      // hash) byte-identically to pre-S8.7 states (golden covenant).
      {
        const codexPct = Math.max(0, Math.min(100, Math.floor(action.codexPct ?? 0)));
        if (codexPct > 0) state.codexPct = codexPct;
        // S11.4 flywheel hook: proven answers open codex-keyed event doors
        if (action.codexProven && action.codexProven.length > 0) {
          state.codexProven = [...action.codexProven];
        }
      }
      const gen = generateActMap(
        state.rng, 1, ascensionMods(ascension).extraElite, !!action.tracks, [],
        action.rites ? [state.players.p1.character, state.players.p2.character] : [],
      );
      state.rng = gen.rng;
      state.map = gen.map;
      // nt-slice: the truth roll happens LAST in START_RUN so the unflagged
      // rng stream is untouched (S6.0 covenant — flag off ⇒ pre-slice states)
      if (action.tracks) {
        state.tracks = true;
        const truthRoll = rollTruth(state.rng);
        state.rng = truthRoll.state;
        // the boss wears the q_what answer; its live mechanics roll now so
        // the whole run replays from the seed (S6.5)
        const mechs = rollLiveMechanics(truthRoll.value.q_what, state.rng);
        state.rng = mechs.state;
        state.truth = {
          tuple: truthRoll.value,
          boards: { p1: [], p2: [] },
          shrine: null,
          boss: { faceAnswerId: truthRoll.value.q_what, liveMechanics: mechs.value },
          reveals: { bossFace: false, bossMechanic: false, openingIntent: false },
          seenClueEvents: [],
        };
        state.telemetry.truth = {
          clueEventsOffered: 0,
          clueEventsTaken: 0,
          fragmentsByPlayer: { p1: 0, p2: 0 },
          boardOpensByAct: {},
          sheetEdits: 0,
          struckAtShrine: 0,
          autoCompleted: 0,
          outcome: null,
          stake: null,
          codexWrites: null,
        };
      }
      // S7.2: the rites roll happens after the truth roll (both LAST) so
      // unflagged and tracks-only rng streams are untouched (flag covenant)
      if (action.rites) {
        state.rites = true;
        const offer: Record<PlayerId, string[]> = { p1: [], p2: [] };
        for (const pid of ['p1', 'p2'] as PlayerId[]) {
          // S9a: the offer draws from the UNLOCKED pool (union of both
          // profiles' claims). Everything is seeded unlocked tonight, so the
          // stream matches pre-S9a; a pool under 2 falls back to the full
          // set — a claim must never brick the mandatory offer.
          const pool = unlockedRites(state.players[pid].character, 'death', action.riteUnlocks);
          // seeded 2-of-4: draw twice without replacement (Neow-class variance)
          const first = rngInt(state.rng, pool.length);
          state.rng = first.state;
          const rest = pool.filter((_, i) => i !== first.value);
          const second = rngInt(state.rng, rest.length);
          state.rng = second.state;
          offer[pid] = [pool[first.value], rest[second.value]];
        }
        state.ritesState = {
          offer,
          ...(action.riteUnlocks ? { unlocks: action.riteUnlocks } : {}),
          progress: { p1: 0, p2: 0 },
          seenEvents: [],
          birthChoice: null,
          birthPicked: { p1: false, p2: false },
        };
        // S9d.2: run tallies feed the grower rites. Authoritative (hashed)
        // state, created ONLY on rites runs so unflagged shape and goldens
        // hold by construction.
        state.tallies = {
          detonations: 0, falls: 0, boundKills: { p1: 0, p2: 0 },
          threadSpent: 0, kindledConsumed: 0, linksFired: 0,
          momentumSpent: 0, resonances: 0, seenStep: {},
        };
        state.telemetry.rites = {
          deathPick: { p1: null, p2: null },
          birthPick: { p1: null, p2: null },
          characterEvents: { p1: 0, p2: 0 },
          birthTiming: { p1: null, p2: null },
          growth: {},
        };
      }
      state.phase = action.rites ? 'rites' : 'map';
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
        // S7.6 (OQ#38, ruled): the partner's exhaust joins their discard as a source
        assert(
          action.targetId && (partner.discard.includes(action.targetId) || partner.exhaust.includes(action.targetId)),
          "reclaim needs a card in your partner's discard or exhaust",
        );
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

    case 'RITE_PICK': {
      const rs = state.ritesState;
      assert(state.rites && rs, 'no rites this run');
      const rite = RITES_BY_ID[action.riteId];
      assert(rite, 'no such rite');
      const p = state.players[action.player];
      if (state.phase === 'rites') {
        // S7.2/S8.0: the death pick — the vestment card joins the deck
        assert(rite.kind === 'death', 'the first rite is a death rite');
        assert(rs.offer?.[action.player]?.includes(rite.id), 'that vestment was not offered');
        assert(!(p.rites ?? []).some((id) => RITES_BY_ID[id]?.kind === 'death'), 'already vested');
        (p.rites ??= []).push(rite.id);
        addCardToDeck(state, action.player, rite.cardId!);
        if (state.telemetry.rites) state.telemetry.rites.deathPick[action.player] = rite.id;
        // S8.7: pooled acknowledgment (rites-flagged runs only, so the extra
        // rng draw never touches an unflagged stream)
        sayWitness(state, 'rite_death_pick', { rite: rite.name });
        const bothVested = (['p1', 'p2'] as PlayerId[]).every((pid) =>
          (state.players[pid].rites ?? []).some((id) => RITES_BY_ID[id]?.kind === 'death'));
        if (bothVested) {
          rs.offer = null;
          state.phase = 'map';
        }
        return;
      }
      // S7.4: the birth pick, immediately at the event screen
      assert(rs.birthChoice === action.player, 'no rite is owed to you here');
      assert(rite.kind === 'birth' && rite.role === p.character, 'that rite is not yours to take');
      // S9a: the trio is the UNLOCKED trio (union read-path; all unlocked today)
      assert(unlockedRites(p.character, 'birth', rs.unlocks).includes(rite.id), 'that rite is not yet yours to take');
      assert(!rs.birthPicked[action.player], 'already reborn');
      (p.rites ??= []).push(rite.id);
      rs.birthPicked[action.player] = true;
      rs.birthChoice = null;
      if (state.telemetry.rites) {
        state.telemetry.rites.birthPick[action.player] = rite.id;
        const node = state.map.nodes.find((n) => n.id === state.map.position);
        state.telemetry.rites.birthTiming[action.player] = { act: state.map.act, layer: node?.layer ?? -1 };
      }
      // held reveal (§5b): a line that only makes sense later — S8.7 pool
      sayWitness(state, 'rite_birth_arrival', { rite: rite.name });
      return;
    }

    case 'EVENT_CHOOSE': {
      assert(state.phase === 'event' && state.event, 'not in event');
      const ev = state.event!;
      assert(ev.chosen === null, 'already chosen');
      assert(action.player === ev.chooser, 'this choice is not yours to make');
      const def = EVENTS[ev.eventId];
      // S11.4: the choice addresses the CURRENT stage (existing events are
      // 1-stage; stagePath stays absent and nothing changes for them)
      const stage = eventStageAt(def, ev.stagePath ?? []);
      const opt = stage.options.find((o) => o.id === action.optionId);
      assert(opt, 'no such option');
      assert(eventOptionAvailable(state, ev.subject, opt), 'that door is not open to you');
      const subject = state.players[ev.subject];
      for (const eff of opt.effects) applyEventEffect(state, subject, eff);
      if (opt.effects.length > 0) {
        (ev.pot ??= []).push(...opt.effects.filter((e) => e.op !== 'nothing'));
      }
      state.log.push({ e: 'witness', line: opt.witness });
      if (eventOptionDeepens(state, opt)) {
        // press on: the event deepens; the pot stays visible; nobody has
        // "chosen" until a terminal option ends it (max 3 stages, CI-held).
        // Unflagged runs never take this branch (S11.5): the same option
        // terminates below with its original effects and resultText.
        (ev.stagePath ??= []).push(opt.id);
        return;
      }
      ev.chosen = opt.id;
      ev.resultText = opt.resultText;
      // the delta line: exactly what changed, generated from applied ops
      ev.deltaLine = eventDeltaLine(ev.pot ?? opt.effects);
      // S2.1: a crossed choice the bot made FOR the human gets its own gloat
      if (state.botSeat && def.crossed && action.player === state.botSeat) {
        sayWitness(state, 'crossed_choice_made');
      }
      // S7.3/S7.4: a character event pays its ACTOR 1 birth-rite progress;
      // at 2 the mirror sacrament arrives, immediately, at this screen
      const rs = state.ritesState;
      if (def.character && rs) {
        rs.progress[ev.subject]++;
        if (state.telemetry.rites) state.telemetry.rites.characterEvents[ev.subject]++;
        if (rs.progress[ev.subject] >= 2 && !rs.birthPicked[ev.subject] && rs.birthChoice === null) {
          rs.birthChoice = ev.subject;
          // S9c.4 (D10-B): acknowledge that a choice exists and is theirs —
          // zero explanation of stakes or economy. Single-line pool +
          // no-repeat = once per run; rites-flagged runs only.
          sayWitness(state, 'rite_birth_pick');
        }
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

    case 'BOARD_OPENED': {
      // telemetry only (is the log used?) — no rules effect, flagged runs only
      const tt = state.telemetry.truth;
      if (tt) tt.boardOpensByAct[state.map.act] = (tt.boardOpensByAct[state.map.act] ?? 0) + 1;
      return;
    }

    case 'LOOM_SHEET_SET': {
      assert(state.phase === 'loom' && state.truth?.shrine, 'not at the Loom’s Eye');
      const shrine = state.truth!.shrine!;
      assert(shrine.verdict === null, 'the loom has already spoken');
      assert(QUESTIONS_BY_ID[action.questionId], 'no such question');
      if (action.answerId !== null) {
        assert(ANSWERS_BY_ID[action.answerId]?.questionId === action.questionId, 'answer does not fit the question');
        assert(!shrine.struck[action.questionId]?.[action.answerId], 'that answer is struck out');
      }
      if (shrine.sheet[action.questionId] === action.answerId) return;
      shrine.sheet[action.questionId] = action.answerId;
      // one shared sheet (ruling 3): any edit reopens BOTH confirmations
      shrine.confirmed = { p1: false, p2: false };
      if (state.telemetry.truth) state.telemetry.truth.sheetEdits++;
      return;
    }

    case 'LOOM_CONFIRM': {
      assert(state.phase === 'loom' && state.truth?.shrine, 'not at the Loom’s Eye');
      const shrine = state.truth!.shrine!;
      assert(shrine.verdict === null, 'the loom has already spoken');
      shrine.confirmed[action.player] = action.confirm;
      // solo: the Witness speaks with the human's voice at the shrine
      if (state.botSeat && action.player !== state.botSeat) {
        shrine.confirmed[state.botSeat] = action.confirm;
      }
      if (shrine.confirmed.p1 && shrine.confirmed.p2) resolveLoomVerdict(state);
      return;
    }

    case 'ADVANCE': {
      // S7.4: the mirror sacrament is picked HERE, at the event screen —
      // the owing seat cannot advance until it chooses
      if (state.phase === 'event' && state.ritesState?.birthChoice === action.player) {
        throw new IllegalAction('the loom holds its breath — choose your rite');
      }
      assert(['reward', 'event', 'rest', 'shop', 'loom'].includes(state.phase), 'cannot advance now');
      if (state.phase === 'loom') {
        assert(state.truth?.shrine?.verdict, 'the loom has not spoken yet');
        // solo: the bot follows the human out of the shrine
        if (state.botSeat && action.player !== state.botSeat) {
          state.advanceReady[state.botSeat] = true;
        }
      }
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

function randomUnownedRelic(state: GameState, exclude?: ReadonlySet<string>): string | null {
  // S9b.1-1: `exclude` covers relics already stocked in the SAME shop —
  // ownership alone let the second shop slot duplicate the first.
  const owned = new Set([...state.players.p1.relics, ...state.players.p2.relics]);
  if (exclude) for (const id of exclude) owned.add(id);
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

/** nt-slice S6.5: server-side intent prose for the rest-site boon line. */
function describeIntent(it: EnemyIntent): string {
  switch (it.kind) {
    case 'attack': return `${it.amount}${it.times && it.times > 1 ? `×${it.times}` : ''} damage`;
    case 'attack_all': return `${it.amount} damage to BOTH of you`;
    case 'attack_momentum': return `${it.base}+ damage, growing with Momentum`;
    case 'attack_drain': return `${it.amount} damage and a drain of ${it.threadDrain} Thread`;
    case 'attack_fray': return `${it.amount} damage and Fray on you both`;
    case 'block': return `${it.amount} Block`;
    case 'block_all': return `${it.amount} Block across its line`;
    case 'buff_strength': return `+${it.amount} Strength`;
    case 'buff_strength_all': return `+${it.amount} Strength to its line`;
    case 'debuff_weak': return `${it.amount} Weak`;
    case 'debuff_vulnerable': return `${it.amount} Vulnerable`;
    case 'sever': return 'a severing of its binding';
    case 'read_chain': return `a reading of your Chain — Fray if you Resonate, ${it.amount}×2 damage if you hold back`; // S10a
  }
}

/** nt-slice S6.4: the shrine's coveted stake — rarity-weighted TOWARD rares
 *  (rare 3× / common 1×; inverse of drop weighting), never uniform, so the
 *  wager never decouples from confidence (ruling 1). Relics are binary
 *  rare/common today; the spec's rare-3×/uncommon-2× maps to this pending a
 *  rarity tier (S6 designer question 1). */
function stakeRelic(state: GameState): string | null {
  const owned = new Set([...state.players.p1.relics, ...state.players.p2.relics]);
  const pool = ALL_RELICS.filter((r) => !owned.has(r.id) && !r.passives?.includes('wedding_knife'));
  if (pool.length === 0) return null;
  const weighted = pool.flatMap((rel) => (rel.rare ? [rel, rel, rel] : [rel]));
  const r = rngInt(state.rng, weighted.length);
  state.rng = r.state;
  return weighted[r.value].id;
}

/** nt-slice S6.4: both confirmed — the loom answers. The verdict is stated
 *  completely here, before the boss node unlocks. */
function resolveLoomVerdict(state: GameState): void {
  const truth = state.truth!;
  const shrine = truth.shrine!;
  const verdict: Record<string, 'true' | 'false' | 'blank'> = {};
  for (const q of QUESTIONS) {
    const asserted = shrine.sheet[q.id];
    verdict[q.id] = asserted === null ? 'blank' : asserted === truth.tuple[q.id] ? 'true' : 'false';
  }
  shrine.verdict = verdict;
  shrine.stakeLost = Object.values(verdict).includes('false');
  if (state.telemetry.truth) {
    state.telemetry.truth.outcome = { ...verdict };
    state.telemetry.truth.stake = {
      relicId: shrine.stakeRelicId,
      rare: !!(shrine.stakeRelicId && RELICS_BY_ID[shrine.stakeRelicId]?.rare),
      lost: shrine.stakeLost,
    };
    // spec S6.8 'codex writes' — mirror the client codex rule so the
    // behavioral pass can see meta-progress without reading browser storage
    const codex = { truths: [] as string[], eliminations: [] as string[] };
    for (const q of QUESTIONS) {
      const asserted = shrine.sheet[q.id];
      if (!asserted) continue;
      (verdict[q.id] === 'true' ? codex.truths : codex.eliminations).push(asserted);
    }
    state.telemetry.truth.codexWrites = codex;
  }

  for (const q of QUESTIONS) {
    const line =
      verdict[q.id] === 'blank' ? `“${q.text}” — left unspoken.`
      : verdict[q.id] === 'true' ? `“${q.text}” — ${ANSWERS_BY_ID[shrine.sheet[q.id]!].text} TRUE.`
      : `“${q.text}” — falsely named. The loom does not forgive the naming.`;
    state.log.push({ e: 'info', detail: line });
    if (verdict[q.id] !== 'true') continue;
    // every TRUE assertion pays its linked reveal (ruling 2)
    switch (QUESTIONS_BY_ID[q.id].payoff) {
      case 'bossFace': truth.reveals.bossFace = true; break;
      case 'bossMechanic': truth.reveals.bossMechanic = true; break;
      case 'healEach':
        for (const pid of ['p1', 'p2'] as PlayerId[]) {
          const p = state.players[pid];
          p.hp = Math.min(p.maxHp, p.hp + 6);
        }
        state.log.push({ e: 'info', detail: 'The loom mends what it recognizes — both heal 6.' });
        break;
      case 'covetEach':
        // S8.2 PROVISIONAL — DESIGNER QUESTION: q_came named true → each
        // player gains 1 Covet charge (motive-flavored: the loom answers the
        // reason you came by sharpening what you may claim on the way down).
        // Cap-respecting via covetMax. Alternatives for the S8.8 sign-off:
        // flat gold, a stake-rarity nudge, or a motive-keyed relic pool.
        for (const pid of ['p1', 'p2'] as PlayerId[]) {
          const p = state.players[pid];
          p.covetCharges = Math.min(covetMax(p), p.covetCharges + 1);
        }
        state.log.push({ e: 'info', detail: 'The loom knows why you came — and leans the shrine’s hunger toward you. Each of you gains a Covet charge.' });
        break;
    }
  }

  if (shrine.stakeLost) {
    // no in-run consolation (ruling 4); the codex still advances client-side
    state.log.push({ e: 'info', detail: 'The stake unravels. The shrine keeps what was coveted.' });
  } else if (shrine.stakeRelicId) {
    const ownerRoll = rngInt(state.rng, 2);
    state.rng = ownerRoll.state;
    grantRelic(state, ownerRoll.value === 0 ? 'p1' : 'p2', shrine.stakeRelicId);
  }
  if (Object.values(verdict).every((v) => v === 'true')) {
    truth.reveals.openingIntent = true;
    // S8.2: the completion boon requires ALL FOUR questions named true
    state.log.push({ e: 'info', detail: 'All four named true. The loom shows you the first moment of the last fight.' });
  }
}

/** S11.4: the stage an event currently stands at, derived by walking the
 *  chosen-option path (backward-compatible: existing events are the single
 *  stage at path []). */
export function eventStageAt(def: EventDef, stagePath: readonly string[] = []): EventStageDef {
  let stage: EventStageDef = { prose: def.prose, options: def.options };
  for (const optId of stagePath) {
    const opt = stage.options.find((o) => o.id === optId);
    if (!opt?.next) break; // malformed path degrades to the last valid stage
    stage = opt.next;
  }
  return stage;
}

/** S11.5: the deep grammar is LIVE only where a flag is. The stage data
 *  ships on the defs (removing events from the unflagged pool would change
 *  the plain shuffle's rng consumption — the deeper covenant), so the gate
 *  is behavioral: unflagged runs neither render nor walk the deep doors. */
export function deepEventsOpen(state: GameState): boolean {
  return !!(state.tracks || state.rites);
}

/** S11.5: does choosing this option deepen the event HERE? An unflagged
 *  'pay' terminates exactly as it did before its extension (same effects,
 *  zero rng — the golden covenant's teeth). Shared by reducer, client,
 *  bots, and the fuzz driver. */
export function eventOptionDeepens(state: GameState, opt: EventOptionDef): boolean {
  return !!opt.next && deepEventsOpen(state);
}

/** S11.4: is a state-keyed option open? Every clause of `requires` must
 *  hold; optionless events pass trivially. Shared by the reducer's assert
 *  and the client's render (unmet options never render — R6). */
export function eventOptionAvailable(state: GameState, subjectId: PlayerId, opt: EventOptionDef): boolean {
  const req = opt.requires;
  if (!req) return true;
  // S11.5: keyed doors are deep grammar — unflagged runs never see them,
  // even when the clause itself would hold (codexProven can be claimed on
  // any run; the DOOR only exists where the grammar is live)
  if (!deepEventsOpen(state)) return false;
  const subject = state.players[subjectId];
  if (req.thread !== undefined && state.thread < req.thread) return false;
  if (req.gold !== undefined && state.gold < req.gold) return false;
  if (req.hpAtMost !== undefined && subject.hp > req.hpAtMost) return false;
  if (req.hpAtLeast !== undefined && subject.hp < req.hpAtLeast) return false;
  if (req.tagCount !== undefined) {
    const n = subject.deck.filter((c) => CARDS[c.defId]?.tag === req.tagCount!.tag).length;
    if (n < req.tagCount.n) return false;
  }
  if (req.character !== undefined
    && state.players.p1.character !== req.character
    && state.players.p2.character !== req.character) return false;
  if (req.codexProven !== undefined && !(state.codexProven ?? []).includes(req.codexProven)) return false;
  return true;
}

/** S11.4 delta line: one generated sentence of what changed, from the ops
 *  that were APPLIED (pot + final stage). Secret riders are not ops, so
 *  bundle secrecy holds by omission (R6). */
export function eventDeltaLine(effects: readonly EventEffectOp[]): string {
  const parts = effects.map(eventEffectClause).filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Nothing changed hands.';
}

/** S11.4 effect stubs: the same generator renders option-button stubs
 *  ("-2 HP · +10 gold") — never hand-authored. */
export function eventEffectClause(eff: EventEffectOp): string {
  switch (eff.op) {
    case 'heal': return `+${eff.amount} HP`;
    case 'loseHp': return `−${eff.amount} HP`;
    case 'maxHp': return `${eff.amount >= 0 ? '+' : '−'}${Math.abs(eff.amount)} max HP`;
    case 'gainCard': return `gain a ${eff.pool} card`;
    case 'gainRelic': return 'gain a relic';
    case 'gold': return `${eff.amount >= 0 ? '+' : '−'}${Math.abs(eff.amount)} gold`;
    case 'covetCharge': return `+${eff.amount} Covet`;
    case 'pendingFray': return 'Fray at the next fight';
    case 'thread': return `+${eff.amount} Thread at the next fight`;
    case 'upgradeRandom': return 'a card upgrades';
    case 'removeRandomStarter': return 'a starter card removed';
    case 'fragments': return 'threads for the Tapestries';
    case 'fragment': return 'a thread for your Tapestry';
    case 'nothing': return '';
  }
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
    case 'fragments': {
      // nt-slice S6.2: asymmetric clue delivery. Fragment A pins to the
      // actor's Tapestry, B to the partner's. Rendered text only ever lands
      // on the owning player's board — never the shared log (ruling 5); the
      // elimination mapping stays inside content/truth.ts (§11 extension).
      if (!state.truth || !state.event) break;
      const actor = state.event.subject;
      // S11.3 dedup rung 0: both boards' pins steer the pick toward fresh
      // eliminations (one supply ledger, moved once)
      const pinnedIds = [...state.truth.boards.p1, ...state.truth.boards.p2].map((b) => b.fragmentId);
      const served = serveFragments(state.event.eventId, state.truth.tuple, state.rng, pinnedIds);
      state.rng = served.state;
      const pins: Array<[PlayerId, typeof served.a]> = [
        [actor, served.a],
        [otherPlayer(actor), served.b],
      ];
      const tt = state.telemetry.truth;
      if (tt) tt.clueEventsTaken++;
      for (const [pid, fragment] of pins) {
        if (!fragment) continue;
        state.truth.boards[pid].push({
          fragmentId: fragment.id,
          eventId: fragment.eventId,
          act: state.map.act,
          questionId: fragment.bearsOn,
          text: fragment.text,
        });
        if (tt) tt.fragmentsByPlayer[pid]++;
      }
      state.log.push({ e: 'info', detail: 'Threads pull loose and pin to your Tapestries.' });
      break;
    }
    case 'fragment': {
      // S11.5 codex doors: one thread, served from the WHOLE pool through
      // the bound-witness channel (S11.3's single supply ledger — truth-
      // consistent, dedup-preferred, never the same fragment twice), pinned
      // to the door's ACTOR. Rites-only runs open the door for its other
      // effects; with no truth there is nothing to serve and NO rng moves.
      if (!state.truth || !state.event) break;
      const actor = state.event.subject;
      const pinnedIds = [...state.truth.boards.p1, ...state.truth.boards.p2].map((b) => b.fragmentId);
      const served = serveBoundWitness(state.truth.tuple, state.rng, pinnedIds);
      state.rng = served.state;
      if (served.fragment) {
        state.truth.boards[actor].push({
          fragmentId: served.fragment.id,
          eventId: served.fragment.eventId,
          act: state.map.act,
          questionId: served.fragment.bearsOn,
          text: served.fragment.text,
        });
        if (state.telemetry.truth) state.telemetry.truth.fragmentsByPlayer[actor]++;
        state.log.push({ e: 'info', detail: 'A thread pulls loose and pins to your Tapestry.' });
      }
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
      const encStats = (state.telemetry.encounterStats ??= {});
      const encEntry = (encStats[node.encounterId!] ??= { combats: 0, hpLost: 0 });
      encEntry.combats++;
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
      if (def.clue && state.telemetry.truth) state.telemetry.truth.clueEventsOffered++;
      // a visited clue event never re-enters a later act's pool — a scene
      // must not replay with a different fragment (2026-07-01 ruling)
      if (def.clue && state.truth && !(state.truth.seenClueEvents ??= []).includes(def.id)) {
        state.truth.seenClueEvents.push(def.id);
      }
      // S7.3: same dedup for character events (no double-crediting progress)
      if (def.character && state.ritesState && !state.ritesState.seenEvents.includes(def.id)) {
        state.ritesState.seenEvents.push(def.id);
      }
      // S8.4: same dedup for rare events (the wrong-way event never repeats
      // within a run). Rare events exist only in flagged pools, so this key
      // never appears on unflagged runs (flag-off state stays byte-identical).
      if (def.rare && !(state.seenRareEvents ??= []).includes(def.id)) {
        state.seenRareEvents.push(def.id);
      }
      const r = rngInt(state.rng, 2);
      state.rng = r.state;
      // character events are ABOUT that character: the subject roll is still
      // consumed (rng parity), but the matching seat is the actor (S7.3).
      // MIRROR pairs (both seats the same character): keep the rolled
      // subject, or one seat could never earn birth-rite progress.
      let subject: PlayerId = r.value === 0 ? 'p1' : 'p2';
      if (def.character && state.players.p1.character !== state.players.p2.character) {
        subject = state.players.p1.character === def.character ? 'p1' : 'p2';
      }
      state.event = {
        eventId: def.id,
        subject,
        chooser: def.crossed ? otherPlayer(subject) : subject,
        chosen: null,
      };
      state.phase = 'event';
      return;
    }
    case 'loom': {
      // nt-slice S6.4: the Loom's Eye. Stake revealed BEFORE commitment
      // (ruling 1); both boards pool into strike-outs NOW (ruling 6 — this
      // is where eliminations materialize); over-collected questions arrive
      // pre-filled (auto-completion, earned).
      const truth = state.truth!;
      const struck: Record<string, Record<string, { eventId: string; holder: PlayerId }[]>> = {};
      for (const q of QUESTIONS) struck[q.id] = {};
      for (const holder of ['p1', 'p2'] as PlayerId[]) {
        for (const pin of truth.boards[holder]) {
          const def = FRAGMENTS_BY_ID[pin.fragmentId];
          if (!def) continue;
          for (const answerId of def.eliminates) {
            (struck[def.bearsOn][answerId] ??= []).push({ eventId: pin.eventId, holder });
          }
        }
      }
      const sheet: Record<string, string | null> = {};
      for (const q of QUESTIONS) {
        const open = answersFor(q.id).filter((a) => !struck[q.id][a.id]);
        // all-but-one struck → the last answer stands, pre-asserted (the
        // routing paid for it); players may still return it to unspoken
        sheet[q.id] = open.length === 1 ? open[0].id : null;
      }
      const tt = state.telemetry.truth;
      if (tt) {
        tt.struckAtShrine = Object.values(struck).reduce((sum, byAns) => sum + Object.keys(byAns).length, 0);
        tt.autoCompleted = Object.values(sheet).filter((v) => v !== null).length;
      }
      truth.shrine = {
        stakeRelicId: stakeRelic(state),
        sheet,
        struck,
        confirmed: { p1: false, p2: false },
        verdict: null,
        stakeLost: false,
      };
      state.phase = 'loom';
      state.log.push({ e: 'info', detail: 'The Loom’s Eye opens. The shrine covets — and it is listening.' });
      return;
    }
    case 'rest':
      state.rest = { chosen: { p1: null, p2: null }, upgradePicked: { p1: false, p2: false }, wedding: null };
      state.phase = 'rest';
      sayWitness(state, 'rest_site');
      // nt-slice S6.5: the all-true completion boon — the full opening turn,
      // shown at the pre-boss rest (the flagged boss always opens at script 0)
      if (state.truth?.reveals.openingIntent && state.map.act === 3) {
        const bossDef = ENEMIES[ENCOUNTERS['finale_boss'].enemies[0]];
        const opening = scaleIntent(bossDef.script[0], ascensionMods(state.ascension).dmgScale);
        state.log.push({
          e: 'info',
          detail: `The loom's boon — you have seen this moment: it opens with ${describeIntent(opening)}. Its hidden workings first stir on turns 3 and 5.`,
        });
      }
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
    const gen = generateActMap(
      state.rng, 2, ascensionMods(state.ascension).extraElite, !!state.tracks,
      [...(state.truth?.seenClueEvents ?? []), ...(state.ritesState?.seenEvents ?? []), ...(state.seenRareEvents ?? [])],
      state.rites ? [state.players.p1.character, state.players.p2.character] : [],
    );
    state.rng = gen.rng;
    state.map = gen.map;
    state.phase = 'map';
    sayWitness(state, 'act2_start');
  } else if (state.map.act === 2) {
    healBetweenActs(state);
    state.map = generateFinaleMap(!!state.tracks);
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
    if (node.kind === 'elite') {
      // S11.2: the knot is cut — remaining snarls this act tighten. The
      // calibration instrument records the kill ORDER and what the fight
      // cost (comfort-pass per-encounter telemetry, keyed by order).
      (state.telemetry.eliteFights ??= []).push({
        act: state.map.act,
        order: state.map.knotsCut ?? 0,
        hpLost: state.combat?.hpLostThisCombat ?? 0,
        won: true,
      });
      state.map.knotsCut = (state.map.knotsCut ?? 0) + 1;
      // S11.3 bound witness: the knot pays a guaranteed fragment — combat
      // paying narrative, on-lore (the Witness reads what the enemy was).
      // Flagged runs only (truth exists), served through the standard
      // channel machinery with dedup rung 0.
      if (state.truth) {
        const pinnedIds = [...state.truth.boards.p1, ...state.truth.boards.p2].map((b) => b.fragmentId);
        const served = serveBoundWitness(state.truth.tuple, state.rng, pinnedIds);
        state.rng = served.state;
        if (served.fragment) {
          const ownerRoll = rngInt(state.rng, 2);
          state.rng = ownerRoll.state;
          const owner: PlayerId = ownerRoll.value === 0 ? 'p1' : 'p2';
          state.truth.boards[owner].push({
            fragmentId: served.fragment.id,
            eventId: served.fragment.eventId,
            act: state.map.act,
            questionId: served.fragment.bearsOn,
            text: served.fragment.text,
          });
          const tt = state.telemetry.truth;
          if (tt) {
            tt.fragmentsByPlayer[owner]++;
            tt.boundWitnessFragments = (tt.boundWitnessFragments ?? 0) + 1;
            const all = new Set<string>();
            for (const pid of ['p1', 'p2'] as PlayerId[]) {
              for (const b of state.truth.boards[pid]) {
                for (const a of FRAGMENTS_BY_ID[b.fragmentId]?.eliminates ?? []) all.add(a);
              }
            }
            tt.distinctEliminations = all.size;
          }
          state.log.push({ e: 'info', detail: 'The Witness reads what the enemy was — a thread pins to the Tapestry.' });
          sayWitness(state, 'bound_witness');
        }
      }
    }
    if (node.kind === 'elite' || node.kind === 'boss') {
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const p = state.players[pid];
        p.covetCharges = Math.min(covetMax(p), p.covetCharges + 1); // §8: +1 per elite
      }
      const r = randomUnownedRelic(state);
      if (r) {
        // S11.6: the scouted pin is the truth ("the cards never lie" applies
        // to node faces too). The roll above is KEPT for byte-identical rng
        // consumption; its value is used when the pin is absent (unflagged,
        // boss nodes) or already owned by then (bought since — the one
        // honest staleness, rare and fallback-covered).
        const pin = node.kind === 'elite' && (state.tracks || state.rites) ? node.scoutRelicId : undefined;
        const pinFree = pin !== undefined
          && !state.players.p1.relics.includes(pin) && !state.players.p2.relics.includes(pin);
        const granted = pinFree ? pin : r;
        const ownerRoll = rngInt(state.rng, 2);
        state.rng = ownerRoll.state;
        grantRelic(state, ownerRoll.value === 0 ? 'p1' : 'p2', granted);
        relic = granted;
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

// exported for the S9b.1-1 seed-sweep test (distinct relic slots)
export function generateShop(state: GameState) {
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
  const stocked = new Set<string>();
  for (let i = 0; i < 2; i++) {
    const relic = randomUnownedRelic(state, stocked);
    if (relic) {
      stocked.add(relic);
      items.push({ id: `item${n++}`, kind: 'relic', refId: relic, price: price(140, 41), sold: false });
    }
  }
  // S4.2: the removal service never sells out — one always-present row per
  // player; the live price is removalPrice(state, player), shown per player
  // (and the partner's, too: the negotiation is the point).
  items.push({ id: `item${n++}`, kind: 'removal', forPlayer: 'p1', price: 0, sold: false });
  items.push({ id: `item${n++}`, kind: 'removal', forPlayer: 'p2', price: 0, sold: false });
  return { items };
}
