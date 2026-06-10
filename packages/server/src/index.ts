// Authoritative game server (§11): Node + ws. Clients send intents; the server
// validates them against the engine reducer and broadcasts resulting state.
// Rooms via 5-letter codes; session tokens enable reconnection (state is fully
// server-held, so a refresh or dropped connection costs nothing).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Action, CharacterId, GameState, IllegalAction, PlayerId,
  initialState, reduce, hashState,
} from '@threadbound/engine';

interface Seat {
  token: string;
  character: CharacterId;
  socket: WebSocket | null;
}

interface Room {
  code: string;
  state: GameState;
  seats: Partial<Record<PlayerId, Seat>>;
  actionLog: Action[]; // replay/debug record (§11 determinism)
  lastActivity: number;
}

const rooms = new Map<string, Room>();
const tokenIndex = new Map<string, { room: Room; pid: PlayerId }>();

// M2-D3: rooms don't live forever. Evict after 24h idle, or 1h after the game
// ended with both sockets closed; clean the token index with them.
const HOUR = 3_600_000;
function evictRooms(now = Date.now()): void {
  for (const [code, room] of rooms) {
    const idle = now - room.lastActivity;
    const finished = room.state.phase === 'game_over' || room.state.phase === 'victory';
    const bothClosed = !room.seats.p1?.socket && !room.seats.p2?.socket;
    if (idle > 24 * HOUR || (finished && bothClosed && idle > HOUR)) {
      for (const seat of Object.values(room.seats)) {
        if (seat) tokenIndex.delete(seat.token);
        seat?.socket?.close();
      }
      rooms.delete(code);
    }
  }
}
const evictTimer = setInterval(evictRooms, HOUR);
evictTimer.unref?.();

function makeCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O — they read as 1/0
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => letters[crypto.randomInt(letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ---------------------------------------------------------------------------
// Per-player redaction: your partner's staged cards are public (§2.1), their
// hand is not; draw-pile order is hidden from everyone.
// ---------------------------------------------------------------------------

function redactFor(state: GameState, viewer: PlayerId): unknown {
  const clone: GameState = structuredClone(state);
  const other: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const counts = {
    [viewer]: { hand: clone.players[viewer].hand.length, draw: clone.players[viewer].draw.length },
    [other]: { hand: clone.players[other].hand.length, draw: clone.players[other].draw.length },
  };
  clone.players[other].hand = [];
  clone.players.p1.draw = [];
  clone.players.p2.draw = [];
  return { ...clone, counts, you: viewer };
}

function send(socket: WebSocket | null, msg: unknown): void {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
}

function broadcastState(room: Room): void {
  const hash = hashState(room.state);
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const seat = room.seats[pid];
    if (seat) send(seat.socket, { type: 'state', state: redactFor(room.state, pid), hash });
  }
}

function broadcastPresence(room: Room): void {
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const other: PlayerId = pid === 'p1' ? 'p2' : 'p1';
    const seat = room.seats[pid];
    if (seat) send(seat.socket, { type: 'presence', partnerConnected: !!room.seats[other]?.socket });
  }
}

function handleMessage(socket: WebSocket, ctx: { room: Room | null; pid: PlayerId | null }, raw: string): void {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return send(socket, { type: 'error', message: 'bad json' });
  }

  switch (msg.type) {
    case 'create': {
      const character: CharacterId = msg.character === 'bram' ? 'bram' : 'vess';
      const room: Room = {
        code: makeCode(),
        state: initialState(crypto.randomInt(2 ** 31), { p1: character, p2: character === 'vess' ? 'bram' : 'vess' }),
        seats: {},
        actionLog: [],
        lastActivity: Date.now(),
      };
      rooms.set(room.code, room);
      const token = crypto.randomUUID();
      room.seats.p1 = { token, character, socket };
      tokenIndex.set(token, { room, pid: 'p1' });
      ctx.room = room;
      ctx.pid = 'p1';
      send(socket, { type: 'joined', token, code: room.code, playerId: 'p1', character });
      broadcastState(room);
      broadcastPresence(room);
      return;
    }

    case 'join': {
      const room = rooms.get(String(msg.code ?? '').toUpperCase());
      if (!room) return send(socket, { type: 'error', message: 'no such room' });
      if (room.seats.p2) return send(socket, { type: 'error', message: 'room is full' });
      const token = crypto.randomUUID();
      const character = room.state.players.p2.character;
      room.seats.p2 = { token, character, socket };
      tokenIndex.set(token, { room, pid: 'p2' });
      ctx.room = room;
      ctx.pid = 'p2';
      send(socket, { type: 'joined', token, code: room.code, playerId: 'p2', character });
      broadcastState(room);
      broadcastPresence(room);
      return;
    }

    case 'hello': {
      // reconnection: token → seat; full state restored from the server (§11)
      const entry = tokenIndex.get(String(msg.token ?? ''));
      if (!entry) return send(socket, { type: 'error', message: 'unknown session' });
      const seat = entry.room.seats[entry.pid]!;
      if (seat.socket && seat.socket !== socket) {
        try { seat.socket.close(); } catch { /* stale socket */ }
      }
      seat.socket = socket;
      ctx.room = entry.room;
      ctx.pid = entry.pid;
      send(socket, { type: 'joined', token: seat.token, code: entry.room.code, playerId: entry.pid, character: seat.character });
      broadcastState(entry.room);
      broadcastPresence(entry.room);
      return;
    }

    case 'start': {
      if (!ctx.room || !ctx.pid) return send(socket, { type: 'error', message: 'join a room first' });
      if (!ctx.room.seats.p1 || !ctx.room.seats.p2) return send(socket, { type: 'error', message: 'waiting for your partner' });
      if (ctx.room.state.phase !== 'lobby') return send(socket, { type: 'error', message: 'already started' });
      applyAction(ctx.room, socket, { type: 'START_RUN', seed: crypto.randomInt(2 ** 31) });
      return;
    }

    case 'action': {
      if (!ctx.room || !ctx.pid) return send(socket, { type: 'error', message: 'join a room first' });
      const action = msg.action as Action;
      if (!action || typeof action.type !== 'string') return send(socket, { type: 'error', message: 'bad action' });
      if (action.type === 'START_RUN') return send(socket, { type: 'error', message: 'use start' });
      // identity is server-assigned: a client can only ever act as itself
      (action as any).player = ctx.pid;
      applyAction(ctx.room, socket, action);
      return;
    }

    default:
      send(socket, { type: 'error', message: `unknown message type ${msg.type}` });
  }
}

function applyAction(room: Room, sender: WebSocket, action: Action): void {
  room.lastActivity = Date.now();
  try {
    room.state = reduce(room.state, action);
    room.actionLog.push(action);
    broadcastState(room);
  } catch (err) {
    if (err instanceof IllegalAction) {
      send(sender, { type: 'error', message: err.message });
    } else {
      console.error('engine error', err, action);
      send(sender, { type: 'error', message: 'internal engine error' });
    }
  }
}

// ---------------------------------------------------------------------------
// HTTP: serve the built client bundle (static) + WS upgrade on the same port.
// ---------------------------------------------------------------------------

const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0];
  let file = path.join(CLIENT_DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(CLIENT_DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(CLIENT_DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Threadbound server is running. Build the client (npm run build -w @threadbound/client) to serve the UI.');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (socket) => {
  const ctx: { room: Room | null; pid: PlayerId | null } = { room: null, pid: null };
  socket.on('message', (raw) => handleMessage(socket, ctx, raw.toString()));
  socket.on('close', () => {
    if (ctx.room && ctx.pid) {
      const seat = ctx.room.seats[ctx.pid];
      if (seat && seat.socket === socket) seat.socket = null;
      broadcastPresence(ctx.room);
    }
  });
});

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : PORT;
  console.log(`Threadbound server listening on http://localhost:${port}`);
});

// exported so the bot simulation can run against the real server in-process
export { server };

