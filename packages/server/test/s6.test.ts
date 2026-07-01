// S6.2 hosted hardening: proxy-aware client IPs, per-IP room-creation rate
// limit, concurrent-room cap, drain flag — through the real WS protocol.
// S6.3: the both-consent rule — a run's telemetry file exists only when
// every human seat opted in.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { initialState } from '@threadbound/engine';
import { GameServer, GameServerOptions, Room, clientIp } from '../src/lib';

const servers: GameServer[] = [];
const clients: Client[] = [];

async function mkServer(opts: Partial<GameServerOptions> = {}): Promise<{ gs: GameServer; port: number }> {
  const gs = new GameServer({ port: 0, ...opts });
  servers.push(gs);
  const port = await gs.listen();
  return { gs, port };
}

class Client {
  ws: WebSocket;
  private queue: any[] = [];
  private waiters: ((m: any) => void)[] = [];
  constructor(port: number, headers?: Record<string, string>) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers });
    this.ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      const w = this.waiters.shift();
      if (w) w(m);
      else this.queue.push(m);
    });
    clients.push(this);
  }
  next(): Promise<any> {
    const m = this.queue.shift();
    if (m) return Promise.resolve(m);
    return new Promise((r) => this.waiters.push(r));
  }
  async nextOf(type: string): Promise<any> {
    for (;;) {
      const m = await this.next();
      if (m.type === type) return m;
    }
  }
  send(m: unknown): void {
    this.ws.send(JSON.stringify(m));
  }
  open(): Promise<void> {
    return new Promise((r) => (this.ws.readyState === WebSocket.OPEN ? r() : this.ws.once('open', () => r())));
  }
}

afterEach(() => {
  for (const c of clients.splice(0)) c.ws.close();
  for (const s of servers.splice(0)) s.close();
});

describe('both-consent telemetry rule (S6.3, ratified 2026-07-01)', () => {
  const finishedRoom = (code: string, consents: { p1?: boolean; p2?: boolean }, solo = false): Room => {
    const state = initialState(1, { p1: 'vess', p2: 'bram' }, solo ? 'p2' : undefined);
    state.phase = 'game_over';
    const claim = (c?: boolean) => ({ unlockedCards: [], ascensionUnlocked: {}, installId: `install-${code}-${c}`, telemetryConsent: c });
    return {
      code,
      state,
      actionLog: [],
      lastActivity: Date.now(),
      feedback: [],
      seats: {
        p1: { token: `t_${code}_1`, character: 'vess', socket: null, claim: claim(consents.p1) },
        p2: solo
          ? { token: `bot:${code}`, character: 'bram', socket: null, bot: true }
          : { token: `t_${code}_2`, character: 'bram', socket: null, claim: claim(consents.p2) },
      },
      ...(solo ? { bot: { seat: 'p2' as const, speed: 'instant' as const } } : {}),
    };
  };
  const runFiles = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith('run-')) : []);

  it('writes a file only when BOTH seats consented; solo needs the one human', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-s6-'));
    const { gs } = await mkServer({ humanTelemetryDir: dir });
    const write = (room: Room) => (gs as any).maybeWriteTelemetry(room);

    write(finishedRoom('NOCON', {}));
    write(finishedRoom('ONECN', { p1: true }));
    write(finishedRoom('DECLN', { p1: true, p2: false }));
    expect(runFiles(dir)).toEqual([]); // either seat missing/opting out = no file

    write(finishedRoom('BOTHC', { p1: true, p2: true }));
    expect(runFiles(dir).length).toBe(1);
    write(finishedRoom('SOLOC', { p1: true }, true));
    expect(runFiles(dir).length).toBe(2);
    write(finishedRoom('SOLON', {}, true));
    expect(runFiles(dir).length).toBe(2); // solo human didn't consent

    // S6.1/S6.3: files carry build identity + anonymous ids, never tokens
    const file = runFiles(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
      .find((j) => j.code === 'BOTHC')!;
    expect(file.buildSha).toBeTruthy();
    expect(file.contentVersion).toBeTruthy();
    expect(file.installIds.p1).toBe('install-BOTHC-true');
    expect(JSON.stringify(file)).not.toContain('t_BOTHC_1');
  });

  it('a mid-session consent change updates the seat claim via the profile message', async () => {
    const { gs, port } = await mkServer();
    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess', profile: { unlockedCards: [], ascensionUnlocked: {}, installId: 'install-mid-1', telemetryConsent: true } });
    const joined = await a.nextOf('joined');
    const room = gs.rooms.get(joined.code)!;
    expect(room.seats.p1!.claim?.telemetryConsent).toBe(true);
    a.send({ type: 'profile', profile: { unlockedCards: [], ascensionUnlocked: {}, installId: 'install-mid-1' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(room.seats.p1!.claim?.telemetryConsent).toBeUndefined(); // opted out
  });
});

describe('proxy-aware client IP (S6.2)', () => {
  const req = (headers: http.IncomingHttpHeaders, remote?: string): http.IncomingMessage =>
    ({ headers, socket: { remoteAddress: remote } } as unknown as http.IncomingMessage);

  it('prefers CF-Connecting-IP, then first X-Forwarded-For hop, then the raw socket', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' }, '9.9.9.9'))).toBe('1.2.3.4');
    expect(clientIp(req({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }, '9.9.9.9'))).toBe('5.6.7.8');
    expect(clientIp(req({}, '9.9.9.9'))).toBe('9.9.9.9');
    expect(clientIp(req({}))).toBe('unknown');
  });
});

describe('room-creation rate limit (S6.2)', () => {
  it('limits creates per client IP and keeps distinct IPs independent', async () => {
    const { port } = await mkServer({ roomCreatesPerMin: 2 });
    const a = new Client(port, { 'cf-connecting-ip': '1.2.3.4' });
    await a.open();
    a.send({ type: 'create', character: 'vess' });
    expect((await a.nextOf('joined')).playerId).toBe('p1');
    a.send({ type: 'create', character: 'vess' });
    await a.nextOf('joined');
    a.send({ type: 'create', character: 'vess' });
    const err = await a.nextOf('error');
    expect(err.message).toMatch(/too many rooms/);
    // a different edge-reported IP is a different client — not throttled
    const b = new Client(port, { 'cf-connecting-ip': '4.3.2.1' });
    await b.open();
    b.send({ type: 'create', character: 'bram' });
    expect((await b.nextOf('joined')).playerId).toBe('p1');
  });
});

describe('concurrent-room cap (S6.2)', () => {
  it('refuses creates past TB_MAX_ROOMS with a friendly error; joins still work', async () => {
    const { port } = await mkServer({ maxRooms: 1 });
    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess' });
    const joined = await a.nextOf('joined');
    a.send({ type: 'create', character: 'vess' });
    expect((await a.nextOf('error')).message).toMatch(/loom is full/);
    const b = new Client(port);
    await b.open();
    b.send({ type: 'join', code: joined.code });
    expect((await b.nextOf('joined')).playerId).toBe('p2');
  });
});

describe('drain flag (S6.2)', () => {
  it('declares drain in the status message, blocks new rooms, and lets an existing room play on', async () => {
    const { gs, port } = await mkServer();
    const a = new Client(port);
    await a.open();
    expect((await a.nextOf('status')).drain).toBe(false);
    a.send({ type: 'create', character: 'vess' });
    const joined = await a.nextOf('joined');

    gs.opts.drain = true; // the restrung window opens

    const b = new Client(port);
    await b.open();
    expect((await b.nextOf('status')).drain).toBe(true);
    b.send({ type: 'create', character: 'vess' });
    expect((await b.nextOf('error')).message).toMatch(/being restrung/);

    // the existing room is untouched: p2 joins and the run starts
    b.send({ type: 'join', code: joined.code });
    expect((await b.nextOf('joined')).playerId).toBe('p2');
    b.send({ type: 'start', seed: 7 });
    let st = await b.nextOf('state'); // the join-time lobby broadcast may land first
    while (st.state.phase === 'lobby') st = await b.nextOf('state');
    expect(st.state.phase).toBe('map');

    // reconnection (hello) also survives a drain window
    const a2 = new Client(port);
    await a2.open();
    a2.send({ type: 'hello', token: joined.token });
    expect((await a2.nextOf('joined')).playerId).toBe('p1');
  });
});
