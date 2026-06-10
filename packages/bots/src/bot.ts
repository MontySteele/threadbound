// Headless bot client (§11): speaks the real WebSocket protocol, plays full
// runs with a greedy link-seeking policy. Used as integration test + balance
// telemetry source. It reads engine CONTENT for card text lookups but never
// computes outcomes — like any client, it only sends intents.

import WebSocket from 'ws';
import {
  Action, CARDS, EVENTS, GameState, PlayerId, CardDef, Telemetry,
} from '@threadbound/engine';

export interface RunResult {
  outcome: 'victory' | 'game_over';
  nodeIndex: number;
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
  return def;
}

export class Bot {
  ws: WebSocket;
  you: PlayerId | null = null;
  token: string | null = null;
  code: string | null = null;
  private startedRun = false;
  private pulsedTurn = -1;
  private combatsWon = 0;
  private lastPhase = '';
  private resolve!: (r: RunResult) => void;
  done: Promise<RunResult>;

  constructor(url: string, private opts: { create?: boolean; joinCode?: string; onCode?: (code: string) => void }) {
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
          this.send({ type: 'start' });
        }
        return;
      case 'state':
        this.onState(msg.state as BotView);
        return;
      case 'error':
        // rejected intent — the watchdog will re-decide from the last state
        this.errors++;
        return;
    }
  }

  errors = 0;
  private lastView: BotView | null = null;
  private watchdog: NodeJS.Timeout | null = null;

  /** Re-decide periodically so a rejected intent or missed beat can't deadlock the run. */
  private armWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.lastView) this.decide(this.lastView);
    }, 300);
    this.watchdog.unref?.();
  }

  private onState(view: BotView): void {
    this.lastView = view;
    this.armWatchdog();
    this.decide(view);
  }

  private decide(view: BotView): void {
    const you = this.you!;
    if (view.phase !== 'combat' && this.lastPhase === 'combat') this.combatsWon++;
    if (view.phase === 'game_over' && this.lastPhase === 'combat') this.combatsWon--; // lost, not won
    this.lastPhase = view.phase;

    switch (view.phase) {
      case 'combat':
        return this.playCombat(view);
      case 'reward':
        return this.playReward(view);
      case 'event':
        return this.playEvent(view);
      case 'rest': {
        if (view.rest!.chosen[you] === null) {
          const opt = Math.random() < 0.5 ? 'rest' : Math.random() < 0.5 ? 'barter' : 'rebraid';
          this.act({ type: 'REST_CHOOSE', player: you, option: opt } as Action);
        } else if (!view.advanceReady[you]) {
          this.act({ type: 'ADVANCE', player: you } as Action);
        }
        return;
      }
      case 'victory':
      case 'game_over':
        if (this.watchdog) clearInterval(this.watchdog);
        this.resolve({
          outcome: view.phase as 'victory' | 'game_over',
          nodeIndex: view.nodeIndex,
          combatsWon: this.combatsWon,
          telemetry: view.telemetry,
        });
        this.ws.close();
        return;
    }
  }

  private playCombat(view: BotView): void {
    const you = this.you!;
    const me = view.players[you];
    if (me.ready) return;
    const combat = view.combat!;
    const living = combat.enemies.filter((e) => e.hp > 0);
    if (living.length === 0) return;

    // one Thread flourish per turn, before readying (§5)
    if (this.pulsedTurn !== combat.turn && view.thread >= 4 && Math.random() < 0.35) {
      this.pulsedTurn = combat.turn;
      const myEnemies = living.filter((e) => e.boundTo === you);
      if (myEnemies.length === living.length && living.length > 1 && view.thread >= 5) {
        this.act({ type: 'DECLARE_THREAD', player: you, kind: 'sever', targetId: myEnemies[0].id } as Action);
      } else {
        this.act({ type: 'DECLARE_THREAD', player: you, kind: 'pulse' } as Action);
      }
      return;
    }

    // greedy link-seeking staging: append the best affordable card to the end
    const affordable = me.hand
      .map((id) => ({ id, def: defOf(view, you, id) }))
      .filter((c) => c.def.cost <= me.energy);
    if (affordable.length === 0) {
      this.act({ type: 'SET_READY', player: you, ready: true } as Action);
      return;
    }
    const last = combat.chain[combat.chain.length - 1];
    const lastDef = last ? defOf(view, last.owner, last.cardInstanceId) : null;
    const linkFires = (def: CardDef): boolean => {
      if (!def.link || !last || !lastDef) return false;
      if (def.link.condition === 'any') return true;
      if (def.link.condition === 'partner') return last.owner !== you;
      return lastDef.tag === def.link.condition;
    };
    // prefer a firing link; then a card whose tag feeds another affordable
    // card's link (set-up for the next stage); then highest cost
    const feeds = (def: CardDef): number =>
      affordable.some((o) => o.def !== def && o.def.link &&
        (o.def.link.condition === def.tag || o.def.link.condition === 'any')) ? 1 : 0;
    affordable.sort((a, b) => {
      const fa = linkFires(a.def) ? 1 : 0;
      const fb = linkFires(b.def) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      const sa = feeds(a.def);
      const sb = feeds(b.def);
      if (sa !== sb) return sb - sa;
      return b.def.cost - a.def.cost;
    });
    const pick = affordable[0];
    // target: most-Hexed enemy for detonators, else the enemy bound to us, else first
    const detonator = JSON.stringify(pick.def).includes('detonate');
    const target =
      (detonator && [...living].sort((a, b) => b.hex - a.hex)[0]) ||
      living.find((e) => e.boundTo === you) ||
      living[0];
    this.act({
      type: 'STAGE_CARD', player: you, cardInstanceId: pick.id,
      slot: combat.chain.length, targetId: pick.def.needsTarget ? target.id : undefined,
    } as Action);
  }

  private playReward(view: BotView): void {
    const you = this.you!;
    const reward = view.reward!;
    const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
    if (reward.picked[you] === null) {
      const pick = Math.random() < 0.2 ? 'skip' : reward.sets[you][Math.floor(Math.random() * 3)];
      this.act({ type: 'REWARD_PICK', player: you, pick } as Action);
      return;
    }
    if (
      reward.coveted[you] === null && reward.picked[partner] !== null &&
      view.players[you].covetCharges > 0 && Math.random() < 0.3
    ) {
      const leftovers = reward.sets[partner].filter((c) => c !== reward.picked[partner]);
      this.act({ type: 'COVET_PICK', player: you, pick: leftovers[0] ?? 'pass' } as Action);
      return;
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }

  private playEvent(view: BotView): void {
    const you = this.you!;
    const ev = view.event!;
    if (ev.chosen === null) {
      if (ev.chooser !== you) return;
      const options = EVENTS[ev.eventId].options;
      const opt = options[Math.floor(Math.random() * options.length)];
      this.act({ type: 'EVENT_CHOOSE', player: you, optionId: opt.id } as Action);
      return;
    }
    if (!view.advanceReady[you]) this.act({ type: 'ADVANCE', player: you } as Action);
  }
}
