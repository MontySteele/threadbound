// Headless bot client (§11): speaks the real WebSocket protocol, plays full
// M2 runs (branching maps, shops, rests, both acts + finale). The decision
// policy itself lives in the engine (bot-policy.ts) so the server's
// in-process solo partner shares it (S1); this class is just the transport:
// socket, watchdog, run bookkeeping.

import WebSocket from 'ws';
import { Action, BotPolicy, BotView, CharacterId, PlayerId, Telemetry } from '@threadbound/engine';

export interface RunResult {
  outcome: 'victory' | 'game_over';
  act: number;
  combatsWon: number;
  /** S3.1 run header: seat → character, so per-seat splits stay interpretable */
  characters: Record<PlayerId, CharacterId>;
  telemetry: Telemetry;
}

export class Bot {
  ws: WebSocket;
  policy: BotPolicy;
  you: PlayerId | null = null;
  token: string | null = null;
  code: string | null = null;
  errors = 0;
  private startedRun = false;
  private lastView: BotView | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private resolve!: (r: RunResult) => void;
  done: Promise<RunResult>;

  constructor(url: string, private opts: {
    create?: boolean; joinCode?: string; onCode?: (code: string) => void;
    seed?: number; startSeed?: number;
    /** S1: create a solo room — the server seats its in-process bot at p2 */
    createSolo?: boolean;
    /** off when partnering a non-lockstep peer (the solo bot stages eagerly) */
    lockstep?: boolean;
  }) {
    this.policy = new BotPolicy({ seed: opts.seed, lockstep: opts.lockstep });
    this.done = new Promise((res) => (this.resolve = res));
    this.ws = new WebSocket(url);
    this.ws.on('open', () => {
      if (opts.createSolo) {
        this.send({ type: 'create', character: 'vess', solo: true, botCharacter: 'bram', botSpeed: 'instant' });
      } else if (opts.create) {
        this.send({ type: 'create', character: 'vess' });
      } else {
        this.send({ type: 'join', code: opts.joinCode });
      }
    });
    this.ws.on('message', (raw) => this.onMessage(JSON.parse(raw.toString())));
  }

  private send(msg: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
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
        if (msg.partnerConnected && (this.opts.create || this.opts.createSolo) && !this.startedRun) {
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

  private decide(view: BotView): void {
    const action = this.policy.decide(view);
    if (view.phase === 'victory' || view.phase === 'game_over') {
      if (this.watchdog) clearInterval(this.watchdog);
      this.resolve({
        outcome: view.phase,
        act: view.map.act,
        combatsWon: this.policy.combatsWon,
        characters: { p1: view.players.p1.character, p2: view.players.p2.character },
        telemetry: view.telemetry,
      });
      this.ws.close();
      return;
    }
    if (action) this.send({ type: 'action', action: action as Action });
  }
}
