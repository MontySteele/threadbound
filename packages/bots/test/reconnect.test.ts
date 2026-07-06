// Integration: reconnection over the real WS protocol (§11) — a dropped
// connection + hello(token) restores the seat with no state loss.

import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';

/** Buffers every incoming message so awaited matches can never be missed. */
class Client {
  ws: WebSocket;
  private buffer: any[] = [];
  private waiters: Array<{ pred: (m: any) => boolean; res: (m: any) => void }> = [];

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const wi = this.waiters.findIndex((w) => w.pred(msg));
      if (wi >= 0) this.waiters.splice(wi, 1)[0].res(msg);
      else this.buffer.push(msg);
    });
  }

  open(): Promise<void> {
    return new Promise((r) => this.ws.on('open', () => r()));
  }

  send(msg: unknown): void {
    this.ws.send(JSON.stringify(msg));
  }

  next(type: string, pred: (m: any) => boolean = () => true): Promise<any> {
    const match = (m: any) => m.type === type && pred(m);
    const bi = this.buffer.findIndex(match);
    if (bi >= 0) return Promise.resolve(this.buffer.splice(bi, 1)[0]);
    return new Promise((res) => this.waiters.push({ pred: match, res }));
  }
}

describe('reconnection (§11)', () => {
  it('refresh/drop + hello(token) rejoins with identical state', async () => {
    process.env.PORT = '0'; // must be set before the server module loads
    process.env.PERSIST = '';
    // S20.1 suite audit: this test asserts reconnection MECHANICS against the
    // flag-off baseline (no vestry phase; the harness never picks a rite).
    // The flags default ON now — the baseline is pinned, not assumed.
    process.env.TB_RITES = '0';
    process.env.TB_TRACKS = '0';
    process.env.TB_KNOTWORK = '0';
    const { server } = await import('@threadbound/server');
    await new Promise<void>((r) => (server.listening ? r() : server.once('listening', () => r())));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    const a = new Client(port);
    await a.open();
    a.send({ type: 'create', character: 'vess' });
    const joinedA = await a.next('joined');

    const b = new Client(port);
    await b.open();
    b.send({ type: 'join', code: joinedA.code });
    const joinedB = await b.next('joined');
    expect(joinedB.playerId).toBe('p2');

    a.send({ type: 'start' });
    // M2: runs open at the map — both players pick the same layer-0 node
    const mapState = await a.next('state', (m) => m.state.phase === 'map');
    const entry = mapState.state.map.nodes.filter((n: any) => n.layer === 0)[0].id;
    a.send({ type: 'action', action: { type: 'NODE_PICK', nodeId: entry } });
    b.send({ type: 'action', action: { type: 'NODE_PICK', nodeId: entry } });
    const stateA = await a.next('state', (m) => m.state.phase === 'combat');

    // p1 stages a card, then drops mid-planning
    const hand = stateA.state.players.p1.hand;
    const enemies = stateA.state.combat.enemies;
    a.send({
      type: 'action',
      action: { type: 'STAGE_CARD', cardInstanceId: hand[0], slot: 0, targetId: enemies[0].id },
    });
    const staged = await a.next('state', (m) => m.state.combat?.chain.length === 1);
    const hashBefore = staged.hash;
    a.ws.close();
    await new Promise((r) => setTimeout(r, 100));

    // reconnect with the session token — full state restored, chain intact
    const a2 = new Client(port);
    await a2.open();
    a2.send({ type: 'hello', token: joinedA.token });
    const rejoined = await a2.next('joined');
    expect(rejoined.playerId).toBe('p1');
    const restored = await a2.next('state');
    expect(restored.hash).toBe(hashBefore); // no state loss
    expect(restored.state.combat.chain.length).toBe(1);

    // the restored seat can still act
    a2.send({ type: 'action', action: { type: 'SET_READY', ready: true } });
    const readied = await a2.next('state', (m) => m.state.players.p1.ready);
    expect(readied.state.players.p1.ready).toBe(true);

    a2.ws.close();
    b.ws.close();
    server.close();
  }, 15000);
});
