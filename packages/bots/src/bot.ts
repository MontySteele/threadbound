// Headless bot client (§11): speaks the real WebSocket protocol, plays full
// M2 runs (branching maps, shops, rests, both acts + finale) with a greedy
// link-seeking policy. Integration test + balance telemetry source. Reads
// engine CONTENT for lookups but never computes outcomes.

import WebSocket from 'ws';
import {
  Action, CARDS, EVENTS, GameState, PlayerId, CardDef, Telemetry,
} from '@threadbound/engine';

export interface RunResult {
  outcome: 'victory' | 'game_over';
  act: number;
  combatsWon: number;
  telemetry: Telemetry;
}

interface BotView extends GameState {
  you: PlayerId;
  counts: Record<PlayerId, { hand: number; draw: number }>;
}

function defOf(view: BotView, owner: PlayerId, instanceId: string): CardDef {
  const p = view.players[owner];
  const inst =
    p.deck.find((c) => c.instanceId === instanceId) ??
    p.combatCards.find((c) => c.instanceId === instanceId);
  const def = CARDS[inst!.defId];
  if (inst!.mutated && def.mutation) return { ...def, base: def.mutation.base, link: def.mutation.link };
  if (inst!.upgraded && def.upgrade) {
    return { ...def, cost: def.upgrade.cost ?? def.cost, base: def.upgrade.base ?? def.base, link: def.upgrade.link !== undefined ? def.upgrade.link : def.link };
  }
  return def;
}

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Bot {
  ws: WebSocket;
  /** policy seed — decisions are STATE-PURE: hashed from (seed, situation,
   *  purpose), never a consumed stream, so socket timing and watchdog
   *  re-decides cannot change what the bot does in a given situation. */
  private seed = 12345;
  you: PlayerId | null = null;
  token: string | null = null;
  code: string | null = null;
  errors = 0;
  private startedRun = false;
  private pulsedTurn = -1;
  private reorderedTurn = -1;
  private reorderCount = 0;
  private combatsWon = 0;
  private lastPhase = '';
  private lastView: BotView | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private resolve!: (r: RunResult) => void;
  done: Promise<RunResult>;

  constructor(url: string, private opts: {
    create?: boolean; joinCode?: string; onCode?: (code: string) => void;
    seed?: number; startSeed?: number;
  }) {
    this.seed = opts.seed ?? 12345;
    this.done = new Promise((res) => (this.resolve = res));
    this.ws = new WebSocket(url);
    this.ws.on('open', () => {
      if (opts.create) this.send({ type: 'create', character: 'vess' });
      else this.send({ type: 'join', code: opts.joinCode });
    });
    this.ws.on('message', (raw) => this.onMessage(JSON.parse(raw.toString())));
  }

  private send(msg: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private act(action: Omit<Action, 'player'> & { player?: PlayerId }): void {
    this.send({ type: 'action', action });
  }

  private onMessage(msg: any): void {
    switch (msg.type) {
      case 'joined':
        this.you = msg.playerId;
        this.token = msg.token;
        this.code = msg.code;
        if (this.opts.onCode) this.opts.onCode(msg.code);
        return;
      case 'presence':
        if (msg.partnerConnected && this.opts.create && !this.startedRun) {
          this.startedRun = true;
          this.send({ type: 'start', seed: this.opts.startSeed });
        }
        return;
      case 'state':
        this.lastView = msg.state as BotView;
        this.armWatchdog();
        this.decide(this.lastView);
        return;
      case 'error':
        this.errors++;
        return; // the watchdog re-decides from the last state
    }
  }

  private armWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.lastView) this.decide(this.lastView);
    }, 300);
    this.watchdog.unref?.();
  }

  /** Deterministic in [0,1): same seed + situation + purpose → same roll. */
  private roll(view: BotView, purpose: string): number {
    const combat = view.combat;
    const key = [
      this.seed, purpose, view.phase, view.map.act, view.map.position,
      combat?.turn ?? -1, combat?.chain.length ?? -1,
      view.players[this.you!].hand.length, view.telemetry.cardsPlayed, view.gold,
    ].join(':');
    return hash32(key) / 4294967296;
  }

  private chance(view: BotView, p: number, purpose: string): boolean {
    return this.roll(view, purpose) < p;
  }

  private pickIdx(view: BotView, n: number, purpose: string): number {
    return Math.floor(this.roll(view, purpose) * n);
  }

  private decide(view: BotView): void {
    const you = this.you!;
    if (view.phase !== 'combat' && this.lastPhase === 'combat') this.combatsWon++;
    if (view.phase === 'game_over' && this.lastPhase === 'combat') this.combatsWon--;
    this.lastPhase = view.phase;

    switch (view.phase) {
      case 'map': {
        // both bots take the lowest-id reachable node → instant agreement (M2-B3)
        if (view.map.picks[you] === null) {
          const options = this.pickable(view);
          if (options.length > 0) this.act({ type: 'NODE_PICK', player: you, nodeId: Math.min(...options) } as Action);
        }
        return;
      }
      case 'combat':
        return this.playCombat(view);
      case 'reward':
        return this.playReward(view);
      case 'event':
        return this.playEvent(view);
      case 'rest':
        return this.playRest(view);
      case 'shop':
        return this.playShop(view);
      case 'victory':
      case 'game_over':
        if (this.watchdog) clearInterval(this.watchdog);
        this.resolve({
          outcome: view.phase as 'victory' | 'game_over',
          act: view.map.act,
          combatsWon: this.combatsWon,
          telemetry: view.telemetry,
        });
        this.ws.close();
        return;
    }
  }

  private pickable(view: BotView): number[] {
    const map = view.map;
    if (map.position === -1) return map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
    return map.nodes.find((n) => n.id === map.position)?.edges ?? [];
  }

  private playCombat(view: BotView): void {
    const you = this.you!;
    const me = view.players[you];
    if (me.ready || me.fallen) return;
    const combat = view.combat!;
    const living = combat.enemies.filter((e) => e.hp > 0);
    const targetable = living.filter((e) => !e.untargetable);
    if (living.length === 0 || targetable.length === 0) {
      this.act({ type: 'SET_READY', player: you, ready: true } as Action);
      return;
    }

    const anyFallen = view.players.p1.fallen || view.players.p2.fallen;
    const severed = combat.severedTurns > 0;

    // Lockstep planning (determinism): moves alternate by parity — p1 acts on
    // even (chain+thread) counts, p2 on odd — unless the partner has readied,
    // after which the remaining bot acts serially. Kills arrival-order noise
    // AND produces the woven interleaving the Chain wants.
    const partnerIsReady = view.players[you === 'p1' ? 'p2' : 'p1'].ready;
    const moves = combat.chain.length + combat.threadActions.length;
    const mySlot = moves % 2 === (you === 'p1' ? 0 : 1);
    if (!partnerIsReady && !mySlot) return;
    if (!anyFallen && !severed && this.pulsedTurn !== combat.turn && view.thread >= 4 && this.chance(view, 0.35, 'pulse')) {
      this.pulsedTurn = combat.turn;
      const myEnemies = targetable.filter((e) => e.boundTo === you);
      if (myEnemies.length === living.length && living.length > 1 && view.thread >= 5) {
        this.act({ type: 'DECLARE_THREAD', player: you, kind: 'sever', targetId: myEnemies[0].id } as Action);
      } else {
        this.act({ type: 'DECLARE_THREAD', player: you, kind: 'pulse' } as Action);
      }
      return;
    }

    const affordable = me.hand
      .map((id) => ({ id, def: defOf(view, you, id) }))
      .filter((c) => c.def.cost <= me.energy);
    if (affordable.length === 0) {
      // before committing: one weaving pass — REORDER an own card whose link
      // isn't firing into a slot where it would (what humans do while talking)
      if (this.reorderedTurn !== combat.turn) {
        this.reorderedTurn = combat.turn;
        this.reorderCount = 0;
      }
      if (this.reorderCount < 3 && this.tryReorder(view)) {
        this.reorderCount++;
        return;
      }
      this.act({ type: 'SET_READY', player: you, ready: true } as Action);
      return;
    }

    // The same link bookkeeping the human UI previews: where would links fire?
    const chainDefs = combat.chain.map((s) => defOf(view, s.owner, s.cardInstanceId));
    const satisfies = (def: CardDef, prevDef: CardDef | null, prevOwner: PlayerId | null, owner: PlayerId): boolean => {
      if (!def.link || !prevDef || prevOwner === null) return false;
      if (severed && prevOwner !== owner) return false;
      if (def.link.condition === 'partner') return prevOwner !== owner;
      if (def.link.condition === 'any') return true;
      return prevDef.tag === def.link.condition;
    };

    // pick best (card, position): fire own link, enable the next card's link,
    // never break a link that currently fires
    const lowHp = me.hp < me.maxHp * 0.55;
    let best: { card: typeof affordable[0]; pos: number; score: number } | null = null;
    for (const card of affordable) {
      for (let pos = 0; pos <= combat.chain.length; pos++) {
        const prevDef = pos > 0 ? chainDefs[pos - 1] : null;
        const prevOwner = pos > 0 ? combat.chain[pos - 1].owner : null;
        const fires = satisfies(card.def, prevDef, prevOwner, you) ? 2 : 0;
        let next = 0;
        if (pos < combat.chain.length) {
          const nextSlot = combat.chain[pos];
          const nextDef = chainDefs[pos];
          const firedBefore = satisfies(nextDef, prevDef, prevOwner, nextSlot.owner);
          const firesAfter = satisfies(nextDef, card.def, you, nextSlot.owner);
          if (firedBefore && !firesAfter) next = -3; // never break a firing link
          else if (!firedBefore && firesAfter) next = 1.5; // enable the next card
        }
        const guardBonus = lowHp && card.def.tag === 'Guard' ? 2.5 : 0;
        // keep the Hex→detonate axis alive even when other links outshine it
        const cardText = JSON.stringify(card.def.base) + JSON.stringify(card.def.link?.effects ?? []);
        const isVess = view.players[you].character === 'vess';
        const bigPile = targetable.some((e) => e.hex >= 4);
        const axisBonus =
          (isVess && (cardText.includes("'hex'") || cardText.includes('hexAll') || cardText.includes('doubleHex')) ? 0.9 : 0) +
          (cardText.includes('detonate') && bigPile ? 1.3 : 0) +
          (cardText.includes('damagePerHex') && targetable.some((e) => e.hex >= 3) ? 1.2 : 0);
        const score = fires + next + guardBonus + axisBonus + card.def.cost * 0.1;
        if (!best || score > best.score) best = { card, pos, score };
      }
    }
    const pick = best!.card;
    const text = JSON.stringify(pick.def);
    const hexed = [...targetable].sort((a, b) => b.hex - a.hex)[0];
    // detonators and hex-appliers converge on the same pile (the co-op axis)
    const target =
      (text.includes('detonate') && hexed) ||
      (text.includes("'hex'") && hexed && hexed.hex > 0 && hexed) ||
      targetable.find((e) => e.boundTo === you) ||
      targetable[0];
    this.act({
      type: 'STAGE_CARD', player: you, cardInstanceId: pick.id,
      slot: best!.pos, targetId: pick.def.needsTarget ? target.id : undefined,
    } as Action);
  }

  private tryReorder(view: BotView): boolean {
    const you = this.you!;
    const combat = view.combat!;
    const chain = combat.chain;
    if (chain.length < 2) return false;
    const severed = combat.severedTurns > 0;
    const defs = chain.map((s) => defOf(view, s.owner, s.cardInstanceId));
    const firesAt = (order: number[]): number => {
      let n = 0;
      for (let i = 1; i < order.length; i++) {
        const def = defs[order[i]];
        const prev = chain[order[i - 1]];
        const prevDef = defs[order[i - 1]];
        const owner = chain[order[i]].owner;
        if (!def.link) continue;
        if (severed && prev.owner !== owner) continue;
        if (def.link.condition === 'partner' ? prev.owner !== owner
          : def.link.condition === 'any' ? true
          : prevDef.tag === def.link.condition) n++;
      }
      return n;
    };
    const identity = chain.map((_, i) => i);
    const baseline = firesAt(identity);
    let best: { from: number; to: number; gain: number } | null = null;
    for (let from = 0; from < chain.length; from++) {
      if (chain[from].owner !== you) continue; // own cards only (§2.1)
      for (let to = 0; to < chain.length; to++) {
        if (to === from) continue;
        const order = identity.filter((i) => i !== from);
        order.splice(to, 0, from);
        const gain = firesAt(order) - baseline;
        if (gain > 0 && (!best || gain > best.gain)) best = { from, to, gain };
      }
    }
    if (!best) return false;
    this.act({ type: 'REORDER', player: you, cardInstanceId: chain[best.from].cardInstanceId, slot: best.to } as Action);
    return true;
  }

  /** Draft scoring: the bots are a coordination floor — they draft like a pair
   *  that wants links to fire and the Hex→detonate axis to exist. */
  private draftScore(defId: string): number {
    const you = this.you!;
    const def = CARDS[defId];
    const character = this.lastView!.players[you].character;
    let score = 0;
    if (def.link) score += 3;
    if (def.link?.condition === 'any') score += 1;
    const heavy = character === 'vess' ? 'Hex' : 'Strike';
    if (def.tag === heavy) score += 2;
    const text = JSON.stringify(def.base) + JSON.stringify(def.link?.effects ?? []);
    if (text.includes('detonate')) score += 5;
    if (text.includes("'hex'") || text.includes('hexAll')) score += character === 'vess' ? 3 : 0;
    if (text.includes('damagePerHex')) score += character === 'vess' ? 3 : 0;
    if (def.rarity === 'rare') score += 1;
    if (def.cost <= 2) score += 1;
    return score;
  }

  private playReward(view: BotView): void {
    const you = this.you!;
    const reward = view.reward!;
    const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
    if (reward.picked[you] === null && reward.sets[you].length > 0) {
      const ranked = [...reward.sets[you]].sort((a, b) => this.draftScore(b) - this.draftScore(a));
      const pick = this.draftScore(ranked[0]) >= 3 || this.chance(view, 0.5, 'draft') ? ranked[0] : 'skip';
      this.act({ type: 'REWARD_PICK', player: you, pick } as Action);
      return;
    }
    if (
      reward.coveted[you] === null && reward.picked[partner] !== null && reward.sets[partner].length > 0 &&
      view.players[you].covetCharges > 0
    ) {
      const leftovers = reward.sets[partner]
        .filter((c) => c !== reward.picked[partner])
        .sort((a, b) => this.draftScore(b) - this.draftScore(a));
      if (leftovers.length > 0 && this.draftScore(leftovers[0]) >= 4 && this.chance(view, 0.7, 'covet')) {
        this.act({ type: 'COVET_PICK', player: you, pick: leftovers[0] } as Action);
        return;
      }
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }

  private playEvent(view: BotView): void {
    const you = this.you!;
    const ev = view.event!;
    if (ev.chosen === null) {
      if (ev.chooser !== you) return;
      const options = EVENTS[ev.eventId].options;
      const opt = options[this.pickIdx(view, options.length, 'event:' + ev.eventId)];
      this.act({ type: 'EVENT_CHOOSE', player: you, optionId: opt.id } as Action);
      return;
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }

  private playRest(view: BotView): void {
    const you = this.you!;
    const rest = view.rest!;
    const me = view.players[you];
    if (rest.chosen[you] === null) {
      // heal when hurt, otherwise upgrade; sprinkle barter/rebraid
      const hurt = me.hp < me.maxHp * 0.6;
      const option = hurt ? 'rest'
        : this.chance(view, 0.85, 'rest:upgrade') ? 'upgrade'
        : this.chance(view, 0.5, 'rest:barter') ? 'barter'
        : !view.rebraidUsed && you === 'p1' ? 'rebraid' : 'rest';
      this.act({ type: 'REST_CHOOSE', player: you, option } as Action);
      return;
    }
    if (rest.chosen[you] === 'upgrade' && !rest.upgradePicked[you]) {
      const candidates = me.deck
        .filter((c) => !c.upgraded && CARDS[c.defId].upgrade)
        .sort((a, b) => {
          const widen = (defId: string): number => {
            const d = CARDS[defId];
            if (!d.upgrade?.link) return 0;
            if (d.upgrade.link.condition === 'any' && d.link?.condition !== 'any') return 2;
            if (!d.link) return 2;
            return 1;
          };
          return widen(b.defId) - widen(a.defId);
        });
      if (candidates.length > 0) {
        this.act({ type: 'UPGRADE_PICK', player: you, cardInstanceId: candidates[0].instanceId } as Action);
        return;
      }
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }

  private playShop(view: BotView): void {
    const you = this.you!;
    if (you === 'p2' && !view.advanceReady.p1) return; // deterministic serial shopping
    const shop = view.shop!;
    const affordable = shop.items.filter((i) => !i.sold && i.price <= view.gold);
    const myCard = affordable.find((i) => i.kind === 'card' && i.forPlayer === you);
    const relic = affordable.find((i) => i.kind === 'relic');
    const removal0 = affordable.find((i) => i.kind === 'removal');
    const me0 = view.players[you];
    const starter0 = me0.deck.find((c) => CARDS[c.defId].starterOnly);
    if (removal0 && starter0) {
      this.act({ type: 'SHOP_REMOVE', player: you, itemId: removal0.id, cardInstanceId: starter0.instanceId } as Action);
      return;
    }
    if (myCard && this.draftScore(myCard.refId!) >= 5) {
      this.act({ type: 'SHOP_BUY', player: you, itemId: myCard.id } as Action);
      return;
    }
    if (relic && this.chance(view, 0.4, 'shop:relic')) {
      this.act({ type: 'SHOP_BUY', player: you, itemId: relic.id } as Action);
      return;
    }
    const removal = affordable.find((i) => i.kind === 'removal');
    const me = view.players[you];
    const starter = me.deck.find((c) => CARDS[c.defId].starterOnly);
    if (removal && starter && me.deck.length > 8 && this.chance(view, 0.4, 'shop:remove')) {
      this.act({ type: 'SHOP_REMOVE', player: you, itemId: removal.id, cardInstanceId: starter.instanceId } as Action);
      return;
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }
}
