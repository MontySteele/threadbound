// S22.2 (D2) — the completion claim through the real WS protocol: the
// pct-100 coherence clamp, the HOST convention (the host's claim opens the
// floor; the partner rides), the mid-run claim refresh authoring
// CODEX_COMPLETE, and the server-authored-only guard on that action.

import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { GameServer, GameServerOptions } from '../src/lib';

// lifecycle mechanics, flag-off baseline pinned explicitly (S20.1 audit
// convention): rites/tracks off means a started run opens on the MAP, so
// an at-start completion claim manifests the Eye immediately.
process.env.TB_RITES = '0';
process.env.TB_TRACKS = '0';

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
  constructor(port: number) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}`);
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

const settle = () => new Promise((r) => setTimeout(r, 60));

const claim = (extra: Record<string, unknown> = {}) => ({ unlockedCards: [], ascensionUnlocked: {}, ...extra });
const completeClaim = (extra: Record<string, unknown> = {}) =>
  claim({ codexPct: 100, codexComplete: true, ...extra });

describe('S22.2 — the completion claim (host convention + clamps)', () => {
  it('coherence clamp: codexComplete is dropped unless the same claim reads codexPct 100', async () => {
    const { gs, port } = await mkServer();
    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess', profile: claim({ codexPct: 93, codexComplete: true, codexDeclared: 'a_fifth_debt' }) });
    const joined = await a.nextOf('joined');
    const room = gs.rooms.get(joined.code)!;
    expect(room.seats.p1!.claim?.codexComplete).toBeUndefined();
    expect(room.seats.p1!.claim?.codexDeclared).toBeUndefined();
    a.send({ type: 'profile', profile: completeClaim({ codexDeclared: 'a_fifth_debt' }) });
    await settle();
    expect(room.seats.p1!.claim?.codexComplete).toBe(true);
    expect(room.seats.p1!.claim?.codexDeclared).toBe('a_fifth_debt');
  });

  it("host convention: the PARTNER's complete codex does not open the floor; the host's does", async () => {
    const { gs, port } = await mkServer();
    const host = new Client(port);
    await host.open();
    host.send({ type: 'create', character: 'vess', profile: claim() });
    const joined = await host.nextOf('joined');
    const partner = new Client(port);
    await partner.open();
    partner.send({ type: 'join', code: joined.code, profile: completeClaim() });
    await partner.nextOf('joined');
    host.send({ type: 'start', seed: 7 });
    await settle();
    const room = gs.rooms.get(joined.code)!;
    expect(room.state.phase).toBe('map'); // partner claim opens nothing
    expect(room.state.codexComplete).toBeUndefined();
    // the HOST's refreshed claim mid-run manifests the Eye this run
    host.send({ type: 'profile', profile: completeClaim() });
    await settle();
    expect(room.state.codexComplete).toBe(true);
    expect(room.state.phase).toBe('eye');
  });

  it('an at-start host completion claim halts the first landing; a declared one opens act 4 quietly', async () => {
    const { gs, port } = await mkServer();
    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess', solo: true, botCharacter: 'bram', botSpeed: 'instant', profile: completeClaim() });
    const joined = await a.nextOf('joined');
    a.send({ type: 'start', seed: 9 });
    await settle();
    expect(gs.rooms.get(joined.code)!.state.phase).toBe('eye');

    const b = new Client(port);
    await b.open();
    b.send({ type: 'create', character: 'vess', solo: true, botCharacter: 'bram', botSpeed: 'instant', profile: completeClaim({ codexDeclared: 'a_fifth_grief' }) });
    const joinedB = await b.nextOf('joined');
    b.send({ type: 'start', seed: 9 });
    await settle();
    const st = gs.rooms.get(joinedB.code)!.state;
    expect(st.phase).toBe('map');
    expect(st.act4Open).toBe(true);
    expect(st.codexDeclared).toBe('a_fifth_grief');
  });

  it('CODEX_COMPLETE is server-authored only — a socket sending it is refused', async () => {
    const { gs, port } = await mkServer();
    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess', solo: true, botCharacter: 'bram', botSpeed: 'instant', profile: claim() });
    const joined = await a.nextOf('joined');
    a.send({ type: 'start', seed: 11 });
    await settle();
    a.send({ type: 'action', action: { type: 'CODEX_COMPLETE' } });
    const err = await a.nextOf('error');
    expect(err.message).toContain('claim');
    expect(gs.rooms.get(joined.code)!.state.codexComplete).toBeUndefined();
  });
});
