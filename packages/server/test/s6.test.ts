// S6.2 hosted hardening: proxy-aware client IPs, per-IP room-creation rate
// limit, concurrent-room cap, drain flag — through the real WS protocol.

import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { GameServer, GameServerOptions, clientIp } from '../src/lib';

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
