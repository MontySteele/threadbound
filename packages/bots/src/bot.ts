// Headless bot client (§11): speaks the real WebSocket protocol, plays full
// M2 runs (branching maps, shops, rests, both acts + finale). The decision
// policy itself lives in the engine (bot-policy.ts) so the server's
// in-process solo partner shares it (S1); this class is just the transport:
// socket, watchdog, run bookkeeping.

import WebSocket from 'ws';
import { Action, BotPolicy, BotView, CharacterId, PlayerId, Telemetry } from '@threadbound/engine';

/** S19.1 --solo battery instrument: one Witness line as it landed — the raw
 *  template (what witnessSaid tracks; pool membership is exact-matchable),
 *  stamped with the run position it arrived at. `turn` is the run's
 *  cumulative turn count (telemetry.turns), `act` the map act. */
export interface WitnessMark {
  t: string;
  act: number;
  turn: number;
}

export interface RunResult {
  outcome: 'victory' | 'game_over';
  act: number;
  combatsWon: number;
  /** S3.1 run header: seat → character, so per-seat splits stay interpretable */
  characters: Record<PlayerId, CharacterId>;
  /** OQ#59 economy instruments: end-of-run relic count and deck size
   *  (pair totals) — reads whether wins ride relics or card growth */
  relicsEnd: number;
  deckEnd: number;
  telemetry: Telemetry;
  /** S19.1: present only when the transport tracked it (trackSolo) — the
   *  solo battery's measurement surface. `verbs` counts thread_action log
   *  events per seat per kind (reclaims/run, thread verbs/run); `witness`
   *  is the pool timeline (per-pool counts + exhaustion turn). Additive:
   *  canonical pair batteries never populate it. */
  solo?: {
    verbs: Record<PlayerId, Record<string, number>>;
    witness: WitnessMark[];
  };
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
  /** S19.1: witnessSaid entries already recorded into the timeline */
  private witnessSeen = 0;
  private witnessTimeline: WitnessMark[] = [];
  private watchdog: NodeJS.Timeout | null = null;
  private resolve!: (r: RunResult) => void;
  done: Promise<RunResult>;

  private partnerOn = false;

  constructor(url: string, private opts: {
    create?: boolean; joinCode?: string; onCode?: (code: string) => void;
    seed?: number; startSeed?: number;
    /** S1: create a solo room — the server seats its in-process bot at p2 */
    createSolo?: boolean;
    /** S3.5 battery: pin both seats' characters (default vess/bram) */
    characters?: Record<PlayerId, CharacterId>;
    /** off when partnering a non-lockstep peer (the solo bot stages eagerly) */
    lockstep?: boolean;
    /** S7.7 sim-only knob (TB_BOT_SEEK_EVENTS): prefer event nodes on the map */
    seekEvents?: boolean;
    reclaimNudge?: boolean;
    /** S13.1a sim-only knobs: skip all card acquisition / deck-size ceiling */
    skipPicks?: boolean;
    pickCap?: number;
    /** S15.3 sim-only knob (TB_BOT_ALL_KNOTS): the elite-excess routing probe */
    allKnots?: boolean;
    /** S13.1b: draft policy v2 — the DEFAULT since the S13.6 D7 flip;
     *  false = v1, the instrumented comparison policy */
    draftV2?: boolean;
    /** S4.4 ASCEND=N battery: vote this level in the lobby. The bot claims a
     *  matching profile (profiles are claims; the server clamps to them). */
    ascension?: number;
    /** S19.1 --solo battery: record the Witness pool timeline + thread-verb
     *  counts into RunResult.solo. Off for canonical pair batteries. */
    trackSolo?: boolean;
  }) {
    this.policy = new BotPolicy({
      seed: opts.seed, lockstep: opts.lockstep, seekEvents: opts.seekEvents, reclaimNudge: opts.reclaimNudge,
      skipPicks: opts.skipPicks, pickCap: opts.pickCap, allKnots: opts.allKnots, draftV2: opts.draftV2,
    });
    this.done = new Promise((res) => (this.resolve = res));
    this.ws = new WebSocket(url);
    this.ws.on('open', () => {
      const chars = opts.characters ?? { p1: 'vess', p2: 'bram' };
      const profile = opts.ascension
        ? { unlockedCards: [], ascensionUnlocked: { vess: opts.ascension, bram: opts.ascension } }
        : undefined;
      if (opts.createSolo) {
        this.send({ type: 'create', character: chars.p1, solo: true, botCharacter: chars.p2, botSpeed: 'instant', profile });
      } else if (opts.create) {
        this.send({ type: 'create', character: chars.p1, p2Character: chars.p2, profile });
      } else {
        this.send({ type: 'join', code: opts.joinCode, profile });
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
        this.partnerOn = !!msg.partnerConnected;
        // S4.4: with an ascension target the start moves to the lobby state
        // handler — it must wait for both votes to land first
        if (msg.partnerConnected && (this.opts.create || this.opts.createSolo) && !this.startedRun && !this.opts.ascension) {
          this.startedRun = true;
          this.send({ type: 'start', seed: this.opts.startSeed });
        }
        return;
      case 'state':
        this.lastView = msg.state as BotView;
        if (this.opts.trackSolo) this.trackWitness(this.lastView);
        this.armWatchdog();
        this.decide(this.lastView);
        return;
      case 'error':
        this.errors++;
        return; // the watchdog re-decides from the last state
    }
  }

  /** S19.1: witnessSaid is append-only (no-repeat-within-run keys on raw
   *  templates), so new entries since the last state message are exactly
   *  the lines that just landed — stamp them with where the run was. */
  private trackWitness(view: BotView): void {
    const said = view.witnessSaid ?? [];
    for (let i = this.witnessSeen; i < said.length; i++) {
      this.witnessTimeline.push({ t: said[i], act: view.map.act, turn: view.telemetry.turns });
    }
    this.witnessSeen = said.length;
  }

  private armWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      if (this.lastView) this.decide(this.lastView);
    }, 300);
    this.watchdog.unref?.();
  }

  private decide(view: BotView): void {
    // S4.4 lobby flow for ASCEND batteries — S7.7 (OQ#44): the rung is
    // host-only now; the host votes and the server mirrors it to the other
    // seat, so the joiner just waits for the mirrored vote to land
    if (view.phase === 'lobby' && this.opts.ascension) {
      const isHost = this.opts.create || this.opts.createSolo;
      if (!isHost) return;
      const lvl = this.opts.ascension;
      const votes = view.ascensionVotes ?? { p1: 0, p2: 0 };
      if (this.you && votes[this.you] !== lvl) {
        this.send({ type: 'action', action: { type: 'SET_ASCENSION', level: lvl } });
        return;
      }
      if (!this.startedRun && this.partnerOn && votes.p1 === lvl && votes.p2 === lvl) {
        this.startedRun = true;
        this.send({ type: 'start', seed: this.opts.startSeed });
      }
      return;
    }
    const action = this.policy.decide(view);
    if (view.phase === 'victory' || view.phase === 'game_over') {
      if (this.watchdog) clearInterval(this.watchdog);
      let solo: RunResult['solo'];
      if (this.opts.trackSolo) {
        const verbs: Record<PlayerId, Record<string, number>> = { p1: {}, p2: {} };
        for (const e of view.log) {
          if (e.e === 'thread_action') verbs[e.player][e.kind] = (verbs[e.player][e.kind] ?? 0) + 1;
        }
        solo = { verbs, witness: this.witnessTimeline };
      }
      this.resolve({
        outcome: view.phase,
        act: view.map.act,
        combatsWon: this.policy.combatsWon,
        characters: { p1: view.players.p1.character, p2: view.players.p2.character },
        relicsEnd: view.players.p1.relics.length + view.players.p2.relics.length,
        deckEnd: view.players.p1.deck.length + view.players.p2.deck.length,
        telemetry: view.telemetry,
        solo,
      });
      this.ws.close();
      return;
    }
    if (action) this.send({ type: 'action', action: action as Action });
  }
}
