// Authoritative game server core (§11), factored as a library so room
// lifecycle (M3-D: eviction, persistence, keepalive) is testable without
// binding a port at import time.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Action, BotView, CharacterId, GameState, IllegalAction, PlayerId,
  PT1_ENEMY_DMG_SCALE, PT1_ENEMY_HP_SCALE,
  emptyTelemetry, initialState, reduce, hashState,
} from '@threadbound/engine';
import { BotSpeed, SoloBotDriver } from './solo';

export interface Seat {
  token: string;
  character: CharacterId;
  socket: WebSocket | null;
  /** S1: this seat is held by the in-process solo bot (no socket, ever) */
  bot?: boolean;
}

export interface FeedbackEntry {
  ts: number;
  player: PlayerId;
  mood: 'good' | 'bad' | 'note';
  /** S1.3: solo stamps must never pollute pair-calibration baselines */
  mode: 'solo' | 'pair';
  note?: string;
  // context stamp: where the feeling changed (M3 review — playtest gold)
  phase: string;
  act: number;
  turn?: number;
  node?: number;
}

export interface Room {
  code: string;
  state: GameState;
  seats: Partial<Record<PlayerId, Seat>>;
  actionLog: Action[];
  lastActivity: number;
  telemetryWritten?: boolean;
  feedback: FeedbackEntry[];
  /** S1: solo room — persisted so the bot survives restarts with the room */
  bot?: { seat: PlayerId; speed: BotSpeed };
}

export interface GameServerOptions {
  port: number;
  clientDist?: string;
  /** M3-A1: write per-run telemetry files for human playtest sessions */
  humanTelemetryDir?: string;
  /** path for graceful-restart room snapshots (M3-D) */
  persistPath?: string;
  now?: () => number;
}

const HOUR = 3_600_000;

export class GameServer {
  rooms = new Map<string, Room>();
  tokenIndex = new Map<string, { room: Room; pid: PlayerId }>();
  /** runtime bot drivers by room code (never persisted; rebuilt on restore) */
  private botDrivers = new Map<string, SoloBotDriver>();
  server: http.Server;
  wss: WebSocketServer;
  private now: () => number;
  private timers: NodeJS.Timeout[] = [];

  constructor(public opts: GameServerOptions) {
    this.now = opts.now ?? Date.now;
    this.server = http.createServer((req, res) => this.serveStatic(req, res));
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (socket) => {
      (socket as any).isAlive = true;
      socket.on('pong', () => ((socket as any).isAlive = true));
      const ctx: { room: Room | null; pid: PlayerId | null } = { room: null, pid: null };
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
      seats: Object.fromEntries(
        Object.entries(room.seats).map(([pid, seat]) => [pid, { token: seat!.token, character: seat!.character, bot: seat!.bot }]),
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
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const pl = s.players[pid];
      pl.kindled ??= 0;
      pl.pendingFray ??= 0;
      pl.covetCharges ??= 1;
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
          seats: {},
          feedback: r.feedback ?? [],
          bot: r.bot,
        };
        for (const [pid, seat] of Object.entries(r.seats ?? {}) as [PlayerId, { token: string; character: CharacterId; bot?: boolean }][]) {
          room.seats[pid] = { token: seat.token, character: seat.character, socket: null, bot: seat.bot };
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

  /** M3-A1: per-run telemetry file when a run ends, for human-uplift calibration. */
  private maybeWriteTelemetry(room: Room): void {
    const dir = this.opts.humanTelemetryDir;
    if (!dir || room.telemetryWritten) return;
    if (room.state.phase !== 'game_over' && room.state.phase !== 'victory') return;
    room.telemetryWritten = true;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `run-${room.code}-${this.now()}.json`);
      fs.writeFileSync(file, JSON.stringify({
        code: room.code,
        mode: room.bot ? 'solo' : 'pair', // S1.3: keep solo out of pair baselines
        // review pass: Part A data is uninterpretable without the difficulty
        // it was played at (the scales are env-overridable mid-session)
        enemyScales: { hp: PT1_ENEMY_HP_SCALE, dmg: PT1_ENEMY_DMG_SCALE },
        // S3.1 run header: seat → character, for the per-seat telemetry splits
        characters: {
          p1: room.state.players.p1.character,
          p2: room.state.players.p2.character,
        },
        outcome: room.state.phase,
        act: room.state.map.act,
        seed: room.state.seed,
        telemetry: room.state.telemetry,
        actions: room.actionLog.length,
        feedback: room.feedback,
      }, null, 2));
      console.log(`human-session telemetry → ${file}`);
    } catch (err) {
      console.error('telemetry write failed', err);
    }
  }

  // ---- protocol ------------------------------------------------------------

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
   *  piles stay redacted: their ORDER is the one true unknown. */
  private redactFor(state: GameState, viewer: PlayerId): unknown {
    const clone: GameState = structuredClone(state);
    const other: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
    const counts = {
      [viewer]: { hand: clone.players[viewer].hand.length, draw: clone.players[viewer].draw.length },
      [other]: { hand: clone.players[other].hand.length, draw: clone.players[other].draw.length },
    };
    clone.players.p1.draw = [];
    clone.players.p2.draw = [];
    return { ...clone, counts, you: viewer };
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

  private handleMessage(socket: WebSocket, ctx: { room: Room | null; pid: PlayerId | null }, raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.send(socket, { type: 'error', message: 'bad json' });
    }

    switch (msg.type) {
      case 'create': {
        const character: CharacterId = msg.character === 'bram' ? 'bram' : 'vess';
        // S1.1: solo rooms seat the in-process bot at p2; the human picks both
        // characters at the lobby (duplicates allowed — it's a debug tool too)
        const solo = msg.solo === true;
        const botCharacter: CharacterId = solo
          ? (msg.botCharacter === 'bram' || msg.botCharacter === 'vess' ? msg.botCharacter : character === 'vess' ? 'bram' : 'vess')
          : character === 'vess' ? 'bram' : 'vess';
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
        room.seats.p1 = { token, character, socket };
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
        room.seats.p2 = { token, character, socket };
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
        this.applyAction(ctx.room, socket, { type: 'START_RUN', seed });
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
        const mood = ['good', 'bad', 'note'].includes(msg.mood) ? msg.mood : 'note';
        const st = ctx.room.state;
        const entry: FeedbackEntry = {
          ts: this.now(),
          player: ctx.pid,
          mood,
          mode: ctx.room.bot ? 'solo' : 'pair',
          note: typeof msg.note === 'string' ? msg.note.slice(0, 500) : undefined,
          phase: st.phase,
          act: st.map.act,
          turn: st.combat?.turn,
          node: st.map.position,
        };
        ctx.room.feedback.push(entry);
        const dir = this.opts.humanTelemetryDir;
        if (dir) {
          try {
            fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(path.join(dir, `feedback-${ctx.room.code}.jsonl`), JSON.stringify(entry) + '\n');
          } catch (err) {
            console.error('feedback write failed', err);
          }
        }
        this.send(socket, { type: 'feedback_ack', mood });
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
