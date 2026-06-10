// Authoritative game server core (§11), factored as a library so room
// lifecycle (M3-D: eviction, persistence, keepalive) is testable without
// binding a port at import time.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Action, CharacterId, GameState, IllegalAction, PlayerId,
  initialState, reduce, hashState,
} from '@threadbound/engine';

export interface Seat {
  token: string;
  character: CharacterId;
  socket: WebSocket | null;
}

export interface FeedbackEntry {
  ts: number;
  player: PlayerId;
  mood: 'good' | 'bad' | 'note';
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
    this.persist();
    this.server.close();
  }

  // ---- room lifecycle (M2-D3 / M3-D) --------------------------------------

  evictRooms(now = this.now()): void {
    for (const [code, room] of this.rooms) {
      const idle = now - room.lastActivity;
      const finished = room.state.phase === 'game_over' || room.state.phase === 'victory';
      const bothClosed = !room.seats.p1?.socket && !room.seats.p2?.socket;
      if (idle > 24 * HOUR || (finished && bothClosed && idle > HOUR)) {
        for (const seat of Object.values(room.seats)) {
          if (seat) this.tokenIndex.delete(seat.token);
          seat?.socket?.close();
        }
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
        Object.entries(room.seats).map(([pid, seat]) => [pid, { token: seat!.token, character: seat!.character }]),
      ),
      feedback: room.feedback,
    }));
    try {
      fs.writeFileSync(this.opts.persistPath, JSON.stringify({ version: 2, rooms: snapshot }));
    } catch (err) {
      console.error('persist failed', err);
    }
  }

  restore(): void {
    const p = this.opts.persistPath;
    if (!p || !fs.existsSync(p)) return;
    try {
      const snapshot = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const r of snapshot.rooms ?? []) {
        const room: Room = {
          code: r.code,
          state: r.state,
          actionLog: r.actionLog ?? [],
          lastActivity: r.lastActivity ?? this.now(),
          seats: {},
          feedback: r.feedback ?? [],
        };
        for (const [pid, seat] of Object.entries(r.seats ?? {}) as [PlayerId, { token: string; character: CharacterId }][]) {
          room.seats[pid] = { token: seat.token, character: seat.character, socket: null };
          this.tokenIndex.set(seat.token, { room, pid });
        }
        this.rooms.set(room.code, room);
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
  }

  private broadcastPresence(room: Room): void {
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
      const seat = room.seats[pid];
      if (seat) this.send(seat.socket, { type: 'presence', partnerConnected: !!room.seats[other]?.socket });
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
        const room: Room = {
          code: this.makeCode(),
          state: initialState(crypto.randomInt(2 ** 31), { p1: character, p2: character === 'vess' ? 'bram' : 'vess' }),
          seats: {},
          actionLog: [],
          lastActivity: this.now(),
          feedback: [],
        };
        this.rooms.set(room.code, room);
        const token = crypto.randomUUID();
        room.seats.p1 = { token, character, socket };
        this.tokenIndex.set(token, { room, pid: 'p1' });
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

      case 'feedback': {
        // M3 review: in-the-moment stamps beat post-session recall
        if (!ctx.room || !ctx.pid) return;
        const mood = ['good', 'bad', 'note'].includes(msg.mood) ? msg.mood : 'note';
        const st = ctx.room.state;
        const entry: FeedbackEntry = {
          ts: this.now(),
          player: ctx.pid,
          mood,
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

      case 'action': {
        if (!ctx.room || !ctx.pid) return this.send(socket, { type: 'error', message: 'join a room first' });
        const action = msg.action as Action;
        if (!action || typeof action.type !== 'string') return this.send(socket, { type: 'error', message: 'bad action' });
        if (action.type === 'START_RUN') return this.send(socket, { type: 'error', message: 'use start' });
        (action as any).player = ctx.pid;
        this.applyAction(ctx.room, socket, action);
        return;
      }

      default:
        this.send(socket, { type: 'error', message: `unknown message type ${msg.type}` });
    }
  }

  private applyAction(room: Room, sender: WebSocket, action: Action): void {
    room.lastActivity = this.now();
    try {
      room.state = reduce(room.state, action);
      room.actionLog.push(action);
      this.broadcastState(room);
      this.maybeWriteTelemetry(room);
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
