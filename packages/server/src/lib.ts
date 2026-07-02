// Authoritative game server core (§11), factored as a library so room
// lifecycle (M3-D: eviction, persistence, keepalive) is testable without
// binding a port at import time.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Action, BotView, CharacterId, CONTENT_VERSION, GameState, IllegalAction, PlayerId,
  PT1_ENEMY_DMG_SCALE, PT1_ENEMY_HP_SCALE,
  clientTruthView, emptyTelemetry, initialState, reduce, hashState,
} from '@threadbound/engine';
import { buildSha } from './build';
import { BotSpeed, SoloBotDriver } from './solo';

/** S4.5: a browser profile's claim, sent at room join. Claims, not authority
 *  — the server clamps ascension and builds the unlock union itself.
 *  S6.3: also carries the anonymous installId and the seat's opt-in telemetry
 *  consent (the both-consent rule reads these; consent claims can only ever
 *  SUPPRESS a file, so a forged claim gains nothing). */
export interface ProfileClaim {
  unlockedCards: string[];
  ascensionUnlocked: Record<string, number>;
  installId?: string;
  telemetryConsent?: boolean;
}

export interface Seat {
  token: string;
  character: CharacterId;
  socket: WebSocket | null;
  /** S1: this seat is held by the in-process solo bot (no socket, ever) */
  bot?: boolean;
  claim?: ProfileClaim;
}

export interface FeedbackEntry {
  ts: number;
  // S6.1: feedback pooled across patches is unusable without its build
  buildSha: string;
  contentVersion: string;
  /** S6.5 record kinds: stamp = in-run feeling; bug = one-tap repro artifact;
   *  survey = end-of-run micro-survey */
  kind: 'stamp' | 'bug' | 'survey';
  /** S6.5: every record carries room + seed — "needs a seed + turn to repro"
   *  OQs become one-tap artifacts */
  room: string;
  seed: number;
  player: PlayerId;
  mood?: 'good' | 'bad' | 'note';
  /** S1.3: solo stamps must never pollute pair-calibration baselines */
  mode: 'solo' | 'pair';
  note?: string;
  // context stamp: where the feeling changed (M3 review — playtest gold)
  phase: string;
  act: number;
  turn?: number;
  node?: number;
  /** bug reports: the rest of what a repro needs */
  characters?: Record<PlayerId, CharacterId>;
  ascension?: number;
  /** survey: how was this run, 1–5 */
  rating?: number;
}

export interface Room {
  code: string;
  state: GameState;
  seats: Partial<Record<PlayerId, Seat>>;
  actionLog: Action[];
  lastActivity: number;
  /** S6.4: wall-clock run start — telemetry needs run minutes + completion rate */
  startedAt?: number;
  telemetryWritten?: boolean;
  feedback: FeedbackEntry[];
  /** nt-slice S6.8: wall-clock time at the Loom's Eye (talk proxy). Clock
   *  lives here — the engine stays deterministic. */
  loomEnteredAt?: number;
  loomResolvedAt?: number;
  /** S1: solo room — persisted so the bot survives restarts with the room */
  bot?: { seat: PlayerId; speed: BotSpeed };
}

export interface GameServerOptions {
  port: number;
  clientDist?: string;
  /** M3-A1: write per-run telemetry files for human playtest sessions */
  humanTelemetryDir?: string;
  /** S6.2/S6.5: feedback + bug reports, date-rotated JSONL (env TB_FEEDBACK_DIR) */
  feedbackDir?: string;
  /** path for graceful-restart room snapshots (M3-D) */
  persistPath?: string;
  /** S6.2 hosted hardening: concurrent-room cap (env TB_MAX_ROOMS, default 200) */
  maxRooms?: number;
  /** S6.2: room creations per client IP per minute (env TB_ROOM_RATE, default 10 —
   *  lenient enough for two players behind one NAT) */
  roomCreatesPerMin?: number;
  /** S6.2 drain flag (TB_DRAIN=1): no new rooms; existing rooms play on */
  drain?: boolean;
  /** review fix: per-room cap on stored feedback records (env TB_MAX_FEEDBACK,
   *  default 200) — a looping client was unbounded memory + disk (the same
   *  disk that holds the deploy snapshot on Render) */
  maxFeedback?: number;
  /** review fix (S6.2): which forwarding header, if any, to trust for the
   *  client IP (env TB_TRUSTED_PROXY). Default: raw socket only. */
  trustedProxy?: ProxyTrust;
  now?: () => number;
}

const HOUR = 3_600_000;
const RATE_WINDOW_MS = 60_000;

/** review fix: forwarding headers are client-supplied unless a trusted proxy
 *  set them — trusting them unconditionally let anyone mint fresh rate-limit
 *  buckets per request. `cloudflare` = behind Cloudflare (cloudflared tunnel:
 *  CF-Connecting-IP is set by the edge); `proxy` = behind exactly one trusted
 *  reverse proxy (Render): the RIGHTMOST X-Forwarded-For hop is the one OUR
 *  proxy appended — earlier hops are whatever the client claimed. */
export type ProxyTrust = 'cloudflare' | 'proxy' | 'none';

export function proxyTrustFromEnv(v: string | undefined = process.env.TB_TRUSTED_PROXY): ProxyTrust {
  return v === 'cloudflare' || v === 'proxy' ? v : 'none';
}

/** S6.2 proxy-aware client IP: behind Render's proxy or a cloudflared tunnel
 *  every socket arrives from platform edge IPs — rate limiting on the raw
 *  address would throttle everyone as one client. Which header to believe is
 *  env-driven (TB_TRUSTED_PROXY): unset means local dev, raw socket only. */
export function clientIp(req: http.IncomingMessage, trust: ProxyTrust = 'none'): string {
  if (trust === 'cloudflare') {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf) return cf.trim();
  }
  if (trust === 'proxy') {
    const xff = req.headers['x-forwarded-for'];
    const hops = (Array.isArray(xff) ? xff.join(',') : xff)?.split(',').map((h) => h.trim()).filter(Boolean) ?? [];
    // rightmost hop: appended by the one proxy we trust, not the client
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export class GameServer {
  rooms = new Map<string, Room>();
  tokenIndex = new Map<string, { room: Room; pid: PlayerId }>();
  /** runtime bot drivers by room code (never persisted; rebuilt on restore) */
  private botDrivers = new Map<string, SoloBotDriver>();
  server: http.Server;
  wss: WebSocketServer;
  private now: () => number;
  private timers: NodeJS.Timeout[] = [];
  /** S6.2 rate limit: room-create timestamps per client IP (sliding window) */
  private createTimes = new Map<string, number[]>();

  constructor(public opts: GameServerOptions) {
    this.now = opts.now ?? Date.now;
    this.server = http.createServer((req, res) => this.serveStatic(req, res));
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (socket, req) => {
      (socket as any).isAlive = true;
      socket.on('pong', () => ((socket as any).isAlive = true));
      const ctx: { room: Room | null; pid: PlayerId | null; ip: string } = { room: null, pid: null, ip: clientIp(req, this.opts.trustedProxy ?? 'none') };
      // S6.2/S6.3 lifecycle status: the client needs to know about a drain
      // window (title-screen message) and whether telemetry collection is
      // active (the consent card only appears when it is).
      this.send(socket, {
        type: 'status',
        drain: !!this.opts.drain,
        telemetryActive: !!this.opts.humanTelemetryDir,
        buildSha: buildSha(),
        contentVersion: CONTENT_VERSION,
      });
      socket.on('message', (raw) => this.handleMessage(socket, ctx, raw.toString()));
      socket.on('close', () => {
        if (ctx.room && ctx.pid) {
          const seat = ctx.room.seats[ctx.pid];
          if (seat && seat.socket === socket) seat.socket = null;
          this.broadcastPresence(ctx.room);
          // if the remaining player already wants out, their partner's exit
          // settles it (covers concede-then-disconnect ordering)
          this.waiveAbsentConcede(ctx.room);
        }
      });
    });

    // M3-D: websocket keepalive — drop peers that miss two ping windows
    const ping = setInterval(() => {
      for (const socket of this.wss.clients) {
        if ((socket as any).isAlive === false) {
          socket.terminate();
          continue;
        }
        (socket as any).isAlive = false;
        socket.ping();
      }
    }, 30_000);
    ping.unref?.();
    this.timers.push(ping);

    const evict = setInterval(() => this.evictRooms(), HOUR);
    evict.unref?.();
    this.timers.push(evict);

    // review fix: createTimes entries were only pruned on a NEW create from
    // the same IP — one-off addresses accumulated forever. Sweep the window.
    const prune = setInterval(() => this.pruneCreateTimes(), RATE_WINDOW_MS);
    prune.unref?.();
    this.timers.push(prune);

    this.restore();
  }

  listen(): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(this.opts.port, () => {
        const addr = this.server.address();
        resolve(typeof addr === 'object' && addr ? addr.port : this.opts.port);
      });
    });
  }

  close(): void {
    for (const t of this.timers) clearInterval(t);
    for (const d of this.botDrivers.values()) d.stop();
    this.botDrivers.clear();
    this.persist();
    this.server.close();
  }

  /** S1: seat the in-process solo bot. It consumes the same redacted view a
   *  remote client would and submits intents through the same reducer path. */
  private attachBot(room: Room): void {
    if (!room.bot || this.botDrivers.has(room.code)) return;
    const seat = room.bot.seat;
    const driver = new SoloBotDriver(
      seat,
      () => room.bot?.speed ?? 'paced',
      (action) => {
        (action as { player?: PlayerId }).player = seat;
        this.applyAction(room, null, action);
      },
    );
    this.botDrivers.set(room.code, driver);
  }

  private dropBot(room: Room): void {
    this.botDrivers.get(room.code)?.stop();
    this.botDrivers.delete(room.code);
  }

  // ---- room lifecycle (M2-D3 / M3-D) --------------------------------------

  /** Eviction windows by room state: a half-finished run must survive a
   *  multi-day pause (you stop Tuesday, finish Thursday). Lobbies that never
   *  started get a day; finished runs an hour after both leave; live runs a
   *  week. Persistence carries them across restarts regardless. */
  evictRooms(now = this.now()): void {
    for (const [code, room] of this.rooms) {
      const idle = now - room.lastActivity;
      const finished = room.state.phase === 'game_over' || room.state.phase === 'victory';
      const inLobby = room.state.phase === 'lobby';
      const bothClosed = !room.seats.p1?.socket && !room.seats.p2?.socket;
      const limit = finished ? HOUR : inLobby ? 24 * HOUR : 7 * 24 * HOUR;
      if ((finished ? bothClosed && idle > limit : idle > limit)) {
        for (const seat of Object.values(room.seats)) {
          if (seat) this.tokenIndex.delete(seat.token);
          seat?.socket?.close();
        }
        this.dropBot(room);
        this.rooms.delete(code);
      }
    }
  }

  /** Graceful restart (M3-D): serialize rooms + tokens; sockets reconnect via hello. */
  persist(): void {
    if (!this.opts.persistPath) return;
    const snapshot = [...this.rooms.values()].map((room) => ({
      code: room.code,
      state: room.state,
      actionLog: room.actionLog,
      lastActivity: room.lastActivity,
      startedAt: room.startedAt,
      seats: Object.fromEntries(
        Object.entries(room.seats).map(([pid, seat]) => [pid, { token: seat!.token, character: seat!.character, bot: seat!.bot, claim: seat!.claim }]),
      ),
      feedback: room.feedback,
      bot: room.bot,
    }));
    try {
      fs.writeFileSync(this.opts.persistPath, JSON.stringify({ version: 2, rooms: snapshot }));
    } catch (err) {
      console.error('persist failed', err);
    }
  }

  /** Snapshots written by older builds can predate state fields (e.g. M2-era
   *  rooms have no `concede`, no per-player telemetry). Fill the gaps with
   *  defaults so the reducer and client never read undefined. */
  private migrateState(s: GameState): GameState {
    s.concede ??= { p1: false, p2: false };
    s.advanceReady ??= { p1: false, p2: false };
    s.witnessSaid ??= [];
    s.pendingThread ??= 0;
    s.rebraidUsed ??= false;
    const fresh = emptyTelemetry();
    s.telemetry ??= fresh;
    for (const k of Object.keys(fresh) as (keyof ReturnType<typeof emptyTelemetry>)[]) {
      (s.telemetry as unknown as Record<string, unknown>)[k] ??= fresh[k];
    }
    // §14.12: pre-rework Pulse declarations (no target) have nothing to force
    if (s.combat) {
      s.combat.threadActions = s.combat.threadActions.filter((t) => t.kind !== 'pulse' || !!t.targetId);
    }
    // S4: economy/ascension fields (pre-S4 rooms)
    for (const a of Object.values(s.telemetry.actStats ?? {})) {
      a.goldEarned ??= 0;
      a.goldSpent ??= 0;
    }
    s.removalsByPlayer ??= { p1: 0, p2: 0 };
    s.ascension ??= 0;
    s.ascensionVotes ??= { p1: s.ascension, p2: s.ascension };
    s.unlockedCards ??= [];
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const pl = s.players[pid];
      pl.kindled ??= 0;
      pl.pendingFray ??= 0;
      pl.covetCharges ??= 1;
      pl.ringPulses ??= 0;
      pl.pendingStatus ??= { weak: 0, vulnerable: 0, frayed: 0 }; // OQ#46
    }
    return s;
  }

  restore(): void {
    const p = this.opts.persistPath;
    if (!p || !fs.existsSync(p)) return;
    try {
      const snapshot = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const r of snapshot.rooms ?? []) {
        const room: Room = {
          code: r.code,
          state: this.migrateState(r.state),
          actionLog: r.actionLog ?? [],
          lastActivity: r.lastActivity ?? this.now(),
          startedAt: r.startedAt,
          seats: {},
          feedback: r.feedback ?? [],
          bot: r.bot,
        };
        for (const [pid, seat] of Object.entries(r.seats ?? {}) as [PlayerId, { token: string; character: CharacterId; bot?: boolean; claim?: ProfileClaim }][]) {
          room.seats[pid] = { token: seat.token, character: seat.character, socket: null, bot: seat.bot, claim: seat.claim };
          if (!seat.bot) this.tokenIndex.set(seat.token, { room, pid });
        }
        this.rooms.set(room.code, room);
        if (room.bot) {
          // S1.1: the bot persists/restores with the room — re-seat the driver
          // and feed it the current view so a mid-combat bot picks back up
          this.attachBot(room);
          this.botDrivers.get(room.code)?.onState(this.redactFor(room.state, room.bot.seat) as BotView);
        }
      }
      console.log(`restored ${this.rooms.size} room(s) from ${p}`);
    } catch (err) {
      console.error('restore failed', err);
    }
  }

  /** S6.3 both-consent rule (RATIFIED, designer 2026-07-01): a run's
   *  telemetry file is written only if EVERY human seat opted in (solo: the
   *  one human). No one's file describes an unconsented partner. */
  private bothConsent(room: Room): boolean {
    const humans = Object.values(room.seats).filter((s): s is Seat => !!s && !s.bot);
    return humans.length > 0 && humans.every((s) => s.claim?.telemetryConsent === true);
  }

  /** S6.4: one start line per consented run, date-rotated JSONL beside the
   *  run files — aggregate-human.mjs computes started-vs-finished from it. */
  private writeStartStamp(room: Room): void {
    const dir = this.opts.humanTelemetryDir;
    if (!dir || !this.bothConsent(room)) return;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const day = new Date(this.now()).toISOString().slice(0, 10);
      fs.appendFileSync(path.join(dir, `starts-${day}.jsonl`), JSON.stringify({
        ts: this.now(),
        code: room.code,
        seed: room.state.seed,
        mode: room.bot ? 'solo' : 'pair',
        buildSha: buildSha(),
        contentVersion: CONTENT_VERSION,
        ascension: room.state.ascension ?? 0,
        characters: { p1: room.state.players.p1.character, p2: room.state.players.p2.character },
        installIds: { p1: room.seats.p1?.claim?.installId, p2: room.seats.p2?.claim?.installId },
      }) + '\n');
    } catch (err) {
      console.error('start stamp write failed', err);
    }
  }

  /** M3-A1: per-run telemetry file when a run ends, for human-uplift calibration. */
  private maybeWriteTelemetry(room: Room): void {
    const dir = this.opts.humanTelemetryDir;
    if (!dir || room.telemetryWritten) return;
    if (room.state.phase !== 'game_over' && room.state.phase !== 'victory') return;
    if (!this.bothConsent(room)) return; // S6.3: either seat opting out = no file
    room.telemetryWritten = true;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `run-${room.code}-${this.now()}.json`);
      fs.writeFileSync(file, JSON.stringify({
        code: room.code,
        // S6.1: build identity — human files are pooled across patches
        buildSha: buildSha(),
        contentVersion: CONTENT_VERSION,
        mode: room.bot ? 'solo' : 'pair', // S1.3: keep solo out of pair baselines
        // review pass: Part A data is uninterpretable without the difficulty
        // it was played at (the scales are env-overridable mid-session)
        enemyScales: { hp: PT1_ENEMY_HP_SCALE, dmg: PT1_ENEMY_DMG_SCALE },
        // S3.1 run header: seat → character, for the per-seat telemetry splits
        characters: {
          p1: room.state.players.p1.character,
          p2: room.state.players.p2.character,
        },
        // S6.3: anonymous ids so runs group without identity (bot seat: none)
        installIds: {
          p1: room.seats.p1?.claim?.installId,
          p2: room.seats.p2?.claim?.installId,
        },
        outcome: room.state.phase,
        act: room.state.map.act,
        // S6.4: wall-clock bounds → median run minutes in the aggregator
        startedAt: room.startedAt,
        endedAt: this.now(),
        // S4.4: every telemetry file carries its difficulty, scales AND rung
        ascension: room.state.ascension ?? 0,
        seed: room.state.seed,
        telemetry: room.state.telemetry,
        // nt-slice S6.8: talk proxy — seconds between shrine entry and verdict
        ...(room.loomEnteredAt && room.loomResolvedAt
          ? { secondsAtShrine: Math.round((room.loomResolvedAt - room.loomEnteredAt) / 1000) }
          : {}),
        actions: room.actionLog.length,
        feedback: room.feedback,
      }, null, 2));
      console.log(`human-session telemetry → ${file}`);
    } catch (err) {
      console.error('telemetry write failed', err);
    }
  }

  /** S6.5: the context every feedback-funnel record shares. */
  private feedbackBase(room: Room, pid: PlayerId, kind: FeedbackEntry['kind']): FeedbackEntry {
    const st = room.state;
    return {
      ts: this.now(),
      buildSha: buildSha(),
      contentVersion: CONTENT_VERSION,
      kind,
      room: room.code,
      seed: st.seed,
      player: pid,
      mode: room.bot ? 'solo' : 'pair',
      phase: st.phase,
      act: st.map.act,
      turn: st.combat?.turn,
      node: st.map.position,
    };
  }

  /** S6.2: feedback + bug reports land in their own env-driven dir,
   *  date-rotated JSONL (falls back to the telemetry dir, as before S6). */
  private writeFeedback(entry: unknown): void {
    const dir = this.opts.feedbackDir ?? this.opts.humanTelemetryDir;
    if (!dir) return;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const day = new Date(this.now()).toISOString().slice(0, 10);
      fs.appendFileSync(path.join(dir, `feedback-${day}.jsonl`), JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error('feedback write failed', err);
    }
  }

  /** review fix: a joined client could loop feedback/bug/survey messages —
   *  each grew room.feedback (memory + the persistence snapshot) and appended
   *  a JSONL line. Past the cap, nothing is stored or written. */
  private feedbackFull(room: Room, socket: WebSocket): boolean {
    if (room.feedback.length < (this.opts.maxFeedback ?? 200)) return false;
    this.send(socket, { type: 'error', message: 'the ledger is full — the Witness will hold no more notes for this run.' });
    return true;
  }

  // ---- protocol ------------------------------------------------------------

  /** S4.5: sanitize a client-sent profile claim. */
  private sanitizeClaim(raw: unknown): ProfileClaim | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const unlockedCards = Array.isArray(r.unlockedCards)
      ? (r.unlockedCards as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 2000)
      : [];
    const ascensionUnlocked: Record<string, number> = {};
    const au = r.ascensionUnlocked;
    if (au && typeof au === 'object') {
      for (const k of ['vess', 'bram']) {
        const v = Number((au as Record<string, unknown>)[k]);
        if (Number.isFinite(v)) ascensionUnlocked[k] = Math.max(0, Math.min(5, Math.floor(v)));
      }
    }
    const claim: ProfileClaim = { unlockedCards, ascensionUnlocked };
    // S6.3: anonymous id + consent ride the claim
    if (typeof r.installId === 'string' && r.installId.length >= 8) claim.installId = r.installId.slice(0, 64);
    if (r.telemetryConsent === true) claim.telemetryConsent = true;
    return claim;
  }

  /** S4.4: highest ascension this room may start at — the minimum over every
   *  HUMAN seat's claimed unlock for the character it plays. No claim = A0.
   *  Profiles are claims, not authority: this is the clamp, not a trust. */
  private maxAscension(room: Room): number {
    let max = 5;
    for (const seat of Object.values(room.seats)) {
      if (!seat || seat.bot) continue;
      max = Math.min(max, seat.claim?.ascensionUnlocked?.[seat.character] ?? 0);
    }
    return max;
  }

  /** S4.5 union rule: the run's pool is the union of both players' unlocked
   *  sets (designer ruling, 2026-06-12 session). */
  private unlockUnion(room: Room): string[] {
    const union = new Set<string>();
    for (const seat of Object.values(room.seats)) {
      for (const id of seat?.claim?.unlockedCards ?? []) union.add(id);
    }
    return [...union];
  }

  private makeCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    do {
      code = Array.from({ length: 5 }, () => letters[crypto.randomInt(letters.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  /** Hands are open information (designer ruling, OQ#22) — co-op has no
   *  hidden-hand stakes and you'd say it on voice anyway. Only the draw
   *  piles stay redacted: their ORDER is the one true unknown.
   *  nt-slice (§11 extension): truth state is replaced wholesale by the
   *  per-viewer projection — tuple, eliminations, and partner fragment text
   *  never cross the wire. */
  private redactFor(state: GameState, viewer: PlayerId): unknown {
    const clone: GameState = structuredClone(state);
    const other: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
    const counts = {
      [viewer]: { hand: clone.players[viewer].hand.length, draw: clone.players[viewer].draw.length },
      [other]: { hand: clone.players[other].hand.length, draw: clone.players[other].draw.length },
    };
    clone.players.p1.draw = [];
    clone.players.p2.draw = [];
    const truth = clone.truth ? clientTruthView(clone.truth, viewer, clone.botSeat) : undefined;
    return { ...clone, ...(truth ? { truth } : {}), counts, you: viewer };
  }

  private send(socket: WebSocket | null, msg: unknown): void {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
  }

  private broadcastState(room: Room): void {
    const hash = hashState(room.state);
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const seat = room.seats[pid];
      if (seat) this.send(seat.socket, { type: 'state', state: this.redactFor(room.state, pid), hash });
    }
    // the bot seat gets the same redacted view, in-process (S1.1)
    if (room.bot) this.botDrivers.get(room.code)?.onState(this.redactFor(room.state, room.bot.seat) as BotView);
  }

  private broadcastPresence(room: Room): void {
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
      const seat = room.seats[pid];
      const partner = room.seats[other];
      if (seat && !seat.bot) {
        this.send(seat.socket, { type: 'presence', partnerConnected: !!partner && (!!partner.bot || !!partner.socket) });
      }
    }
  }

  /** review fix: drop rate-limit entries older than the window (and empty
   *  buckets), so the per-IP map can't grow without bound. */
  pruneCreateTimes(now = this.now()): void {
    for (const [ip, times] of this.createTimes) {
      const live = times.filter((t) => now - t < RATE_WINDOW_MS);
      if (live.length === 0) this.createTimes.delete(ip);
      else if (live.length !== times.length) this.createTimes.set(ip, live);
    }
  }

  /** S6.2: sliding-window room-creation limit per client IP. */
  private allowCreate(ip: string, now = this.now()): boolean {
    const limit = this.opts.roomCreatesPerMin ?? 10;
    const times = (this.createTimes.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (times.length >= limit) {
      this.createTimes.set(ip, times);
      return false;
    }
    times.push(now);
    this.createTimes.set(ip, times);
    return true;
  }

  private handleMessage(socket: WebSocket, ctx: { room: Room | null; pid: PlayerId | null; ip?: string }, raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.send(socket, { type: 'error', message: 'bad json' });
    }

    switch (msg.type) {
      case 'create': {
        // S6.2 hosted hardening: drain window, room cap, per-IP rate limit
        if (this.opts.drain) {
          return this.send(socket, { type: 'error', message: 'the loom is being restrung — no new rooms just now. Runs in progress play on.' });
        }
        if (this.rooms.size >= (this.opts.maxRooms ?? 200)) {
          return this.send(socket, { type: 'error', message: 'the loom is full — every frame is strung. Try again in a little while.' });
        }
        if (!this.allowCreate(ctx.ip ?? 'unknown')) {
          return this.send(socket, { type: 'error', message: 'too many rooms from your address — give the loom a minute.' });
        }
        const character: CharacterId = msg.character === 'bram' ? 'bram' : 'vess';
        // S1.1: solo rooms seat the in-process bot at p2; the human picks both
        // characters at the lobby (duplicates allowed — it's a debug tool too).
        // S3.5: pair rooms may also pin p2's character (mirror-match batteries;
        // duplicates allowed for the same debug-tool reason).
        const solo = msg.solo === true;
        const pick = (v: unknown): CharacterId | null => (v === 'bram' || v === 'vess' ? v : null);
        const botCharacter: CharacterId = solo
          ? (pick(msg.botCharacter) ?? (character === 'vess' ? 'bram' : 'vess'))
          : (pick(msg.p2Character) ?? (character === 'vess' ? 'bram' : 'vess'));
        const room: Room = {
          code: this.makeCode(),
          state: initialState(crypto.randomInt(2 ** 31), { p1: character, p2: botCharacter }, solo ? 'p2' : undefined),
          seats: {},
          actionLog: [],
          lastActivity: this.now(),
          feedback: [],
        };
        this.rooms.set(room.code, room);
        const token = crypto.randomUUID();
        room.seats.p1 = { token, character, socket, claim: this.sanitizeClaim(msg.profile) };
        this.tokenIndex.set(token, { room, pid: 'p1' });
        if (solo) {
          room.seats.p2 = { token: `bot:${crypto.randomUUID()}`, character: botCharacter, socket: null, bot: true };
          room.bot = { seat: 'p2', speed: msg.botSpeed === 'instant' ? 'instant' : 'paced' };
          this.attachBot(room);
        }
        ctx.room = room;
        ctx.pid = 'p1';
        this.send(socket, { type: 'joined', token, code: room.code, playerId: 'p1', character });
        this.broadcastState(room);
        this.broadcastPresence(room);
        return;
      }

      case 'join': {
        const room = this.rooms.get(String(msg.code ?? '').toUpperCase());
        if (!room) return this.send(socket, { type: 'error', message: 'no such room' });
        if (room.seats.p2) return this.send(socket, { type: 'error', message: 'room is full' });
        const token = crypto.randomUUID();
        const character = room.state.players.p2.character;
        room.seats.p2 = { token, character, socket, claim: this.sanitizeClaim(msg.profile) };
        this.tokenIndex.set(token, { room, pid: 'p2' });
        ctx.room = room;
        ctx.pid = 'p2';
        this.send(socket, { type: 'joined', token, code: room.code, playerId: 'p2', character });
        this.broadcastState(room);
        this.broadcastPresence(room);
        return;
      }

      case 'hello': {
        const entry = this.tokenIndex.get(String(msg.token ?? ''));
        if (!entry) return this.send(socket, { type: 'error', message: 'unknown session' });
        const seat = entry.room.seats[entry.pid]!;
        if (seat.socket && seat.socket !== socket) {
          try { seat.socket.close(); } catch { /* stale socket */ }
        }
        seat.socket = socket;
        if (msg.profile) seat.claim = this.sanitizeClaim(msg.profile);
        ctx.room = entry.room;
        ctx.pid = entry.pid;
        this.send(socket, { type: 'joined', token: seat.token, code: entry.room.code, playerId: entry.pid, character: seat.character });
        this.broadcastState(entry.room);
        this.broadcastPresence(entry.room);
        return;
      }

      case 'start': {
        if (!ctx.room || !ctx.pid) return this.send(socket, { type: 'error', message: 'join a room first' });
        if (!ctx.room.seats.p1 || !ctx.room.seats.p2) return this.send(socket, { type: 'error', message: 'waiting for your partner' });
        if (ctx.room.state.phase !== 'lobby') return this.send(socket, { type: 'error', message: 'already started' });
        const seed = Number.isInteger(msg.seed) ? (msg.seed >>> 0) : crypto.randomInt(2 ** 31);
        // S4.4: re-clamp the agreed level against the seats present NOW (a
        // partner with a lower unlock may have joined after the vote)
        const allowed = this.maxAscension(ctx.room);
        const votes = ctx.room.state.ascensionVotes ?? { p1: 0, p2: 0 };
        if (votes.p1 === votes.p2 && votes.p1 > allowed) {
          for (const pid of ['p1', 'p2'] as PlayerId[]) {
            this.applyAction(ctx.room, null, { type: 'SET_ASCENSION', player: pid, level: allowed });
          }
        }
        // S4.5: pool = union of both players' unlocked sets (server-built)
        // nt-slice: TB_TRACKS gates the narrative truth system; the pure
        // engine never reads env, so the flag crosses here
        this.applyAction(ctx.room, socket, {
          type: 'START_RUN', seed,
          unlockedCards: this.unlockUnion(ctx.room),
          tracks: !!process.env.TB_TRACKS,
        });
        // S6.4: run start stamp — the completion-rate denominator (a run
        // abandoned mid-way never writes an end-of-run file). Consented only.
        if (ctx.room.state.phase !== 'lobby' && !ctx.room.startedAt) {
          ctx.room.startedAt = this.now();
          this.writeStartStamp(ctx.room);
        }
        return;
      }

      case 'leave': {
        // back out of a room (e.g., both friends created one). In lobby or on a
        // finished run the seat is freed so the room can be rejoined/evicted;
        // mid-run we only detach — the token must stay valid for reconnection.
        if (!ctx.room || !ctx.pid) return;
        const seat = ctx.room.seats[ctx.pid];
        const phase = ctx.room.state.phase;
        if (seat && (phase === 'lobby' || phase === 'game_over' || phase === 'victory')) {
          this.tokenIndex.delete(seat.token);
          delete ctx.room.seats[ctx.pid];
          // a room holding only the bot is empty — don't strand it for the GC
          const humansLeft = Object.values(ctx.room.seats).some((s) => s && !s.bot);
          if (!humansLeft) {
            this.dropBot(ctx.room);
            this.rooms.delete(ctx.room.code);
          }
        } else if (seat) {
          seat.socket = null;
        }
        const room = ctx.room;
        ctx.room = null;
        ctx.pid = null;
        this.broadcastPresence(room);
        this.send(socket, { type: 'left' });
        return;
      }

      case 'feedback': {
        // M3 review: in-the-moment stamps beat post-session recall
        if (!ctx.room || !ctx.pid) return;
        if (this.feedbackFull(ctx.room, socket)) return;
        const mood = ['good', 'bad', 'note'].includes(msg.mood) ? msg.mood : 'note';
        const entry: FeedbackEntry = {
          ...this.feedbackBase(ctx.room, ctx.pid, 'stamp'),
          mood,
          note: typeof msg.note === 'string' ? msg.note.slice(0, 500) : undefined,
        };
        ctx.room.feedback.push(entry);
        this.writeFeedback(entry);
        this.send(socket, { type: 'feedback_ack', mood });
        return;
      }

      case 'bug': {
        // S6.5 one-tap bug report: seed, turn, act, build, pair, ascension —
        // every "needs a seed + turn to repro" OQ becomes an artifact
        if (!ctx.room || !ctx.pid) return;
        if (this.feedbackFull(ctx.room, socket)) return;
        const entry: FeedbackEntry = {
          ...this.feedbackBase(ctx.room, ctx.pid, 'bug'),
          note: typeof msg.note === 'string' ? msg.note.slice(0, 2000) : undefined,
          characters: {
            p1: ctx.room.state.players.p1.character,
            p2: ctx.room.state.players.p2.character,
          },
          ascension: ctx.room.state.ascension ?? 0,
        };
        ctx.room.feedback.push(entry);
        this.writeFeedback(entry);
        this.send(socket, { type: 'bug_ack' });
        return;
      }

      case 'survey': {
        // S6.5 end-of-run micro-survey: 1–5 + optional text, never blocking
        if (!ctx.room || !ctx.pid) return;
        if (this.feedbackFull(ctx.room, socket)) return;
        const rating = Math.floor(Number(msg.rating) || 0);
        if (rating < 1 || rating > 5) return;
        const entry: FeedbackEntry = {
          ...this.feedbackBase(ctx.room, ctx.pid, 'survey'),
          rating,
          note: typeof msg.note === 'string' ? msg.note.slice(0, 500) : undefined,
        };
        ctx.room.feedback.push(entry);
        this.writeFeedback(entry);
        this.send(socket, { type: 'survey_ack' });
        return;
      }

      case 'profile': {
        // S6.3: the settings consent toggle re-sends the claim mid-session —
        // the seat's stored claim must follow it or both-consent reads stale
        if (!ctx.room || !ctx.pid) return;
        const seat = ctx.room.seats[ctx.pid];
        if (seat && !seat.bot) seat.claim = this.sanitizeClaim(msg.profile);
        return;
      }

      case 'botspeed': {
        // S1.2: settings toggle — paced (default) / instant (testing)
        if (!ctx.room?.bot) return;
        ctx.room.bot.speed = msg.speed === 'instant' ? 'instant' : 'paced';
        this.send(socket, { type: 'botspeed_ack', speed: ctx.room.bot.speed });
        return;
      }

      case 'action': {
        if (!ctx.room || !ctx.pid) return this.send(socket, { type: 'error', message: 'join a room first' });
        const action = msg.action as Action;
        if (!action || typeof action.type !== 'string') return this.send(socket, { type: 'error', message: 'bad action' });
        if (action.type === 'START_RUN') return this.send(socket, { type: 'error', message: 'use start' });
        // S4.4: ascension votes are clamped to the room's unlocked max —
        // profiles are claims, the server never trusts them
        if (action.type === 'SET_ASCENSION') {
          const lvl = Number((action as { level?: unknown }).level ?? 0);
          (action as { level: number }).level = Math.max(0, Math.min(Number.isFinite(lvl) ? Math.floor(lvl) : 0, this.maxAscension(ctx.room)));
        }
        (action as any).player = ctx.pid;
        this.applyAction(ctx.room, socket, action);
        if (action.type === 'CONCEDE') this.waiveAbsentConcede(ctx.room);
        return;
      }

      default:
        this.send(socket, { type: 'error', message: `unknown message type ${msg.type}` });
    }
  }

  /** An absent partner can't consent to abandoning — don't trap the player
   *  who remains. Checked after any CONCEDE and after any disconnect, so
   *  both orderings settle. The waiver lands as a normal action, so the
   *  action log still replays (§11). */
  private waiveAbsentConcede(room: Room): void {
    if (['lobby', 'game_over', 'victory'].includes(room.state.phase)) return;
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
      if (!room.state.concede[pid] || room.state.concede[other]) continue;
      const seat = room.seats[other];
      const absent = !seat || (!seat.bot && !seat.socket);
      if (absent) {
        this.applyAction(room, null, { type: 'CONCEDE', player: other, confirm: true });
        return;
      }
    }
  }

  private applyAction(room: Room, sender: WebSocket | null, action: Action): void {
    room.lastActivity = this.now();
    try {
      room.state = reduce(room.state, action);
      room.actionLog.push(action);
      // nt-slice S6.8: stamp shrine entry/verdict for time-at-shrine telemetry
      if (room.state.phase === 'loom' && !room.loomEnteredAt) room.loomEnteredAt = this.now();
      if (room.loomEnteredAt && !room.loomResolvedAt && room.state.truth?.shrine?.verdict) {
        room.loomResolvedAt = this.now();
      }
      this.broadcastState(room);
      this.maybeWriteTelemetry(room);
      if (room.bot && (room.state.phase === 'game_over' || room.state.phase === 'victory')) {
        this.dropBot(room); // terminal rooms can't restart; stop the timers
      }
    } catch (err) {
      if (err instanceof IllegalAction) {
        this.send(sender, { type: 'error', message: err.message });
      } else {
        console.error('engine error', err, action);
        this.send(sender, { type: 'error', message: 'internal engine error' });
      }
    }
  }

  // ---- static client -------------------------------------------------------

  private serveStatic(req: http.IncomingMessage, res: http.ServerResponse): void {
    const urlPathRaw = (req.url ?? '/').split('?')[0];
    if (urlPathRaw === '/data-note') {
      // S6.3: the plain-language data note, linked from the consent card and
      // the title footer — a relative path so every origin serves its own
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(DATA_NOTE_HTML.replace('%BUILD%', `${CONTENT_VERSION} · ${buildSha()}`));
      return;
    }
    const MIME: Record<string, string> = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json',
      '.woff2': 'font/woff2',
    };
    const dist = this.opts.clientDist ?? path.resolve(__dirname, '../../client/dist');
    const urlPath = (req.url ?? '/').split('?')[0];
    let file = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('Threadbound server is running. Build the client (npm run build -w @threadbound/client) to serve the UI.');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }
}

/** S6.3 data note — served at /data-note, written for players, not lawyers. */
const DATA_NOTE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Threadbound — data note</title>
<style>body{background:#14110f;color:#d8d2c8;font:16px/1.6 Georgia,serif;max-width:620px;margin:40px auto;padding:0 16px}
h1{color:#d4af6f;font-size:1.4em}h2{color:#d4af6f;font-size:1.05em}a{color:#d4af6f}</style></head><body>
<h1>Threadbound — what we collect (and what we never do)</h1>
<p>Threadbound can record <b>anonymous gameplay statistics</b> to help balance
the game. This is <b>opt-in</b>: nothing is recorded unless you say yes, and
in a two-player run <b>both players</b> must have said yes — otherwise no
file is written at all.</p>
<h2>If you opt in, a finished run records</h2>
<ul>
<li>gameplay statistics (cards played, damage, HP lost, thread spent, gold, outcome)</li>
<li>the run's seed and difficulty settings</li>
<li>the game's build version</li>
<li>a random anonymous id stored in your browser — it groups your runs
    together, nothing more. Clearing your browser data makes a new one;
    it never follows you across devices.</li>
</ul>
<h2>Never collected</h2>
<ul>
<li>names, emails, accounts (there are none)</li>
<li>chat or voice (the game has none)</li>
<li>anything you type — except feedback or bug-report text you explicitly send</li>
</ul>
<p>You can change your choice any time in the in-game settings (the ♪ menu).</p>
<p style="opacity:.6">build %BUILD%</p>
</body></html>`;
