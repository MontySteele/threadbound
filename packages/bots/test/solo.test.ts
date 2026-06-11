// S1.3 — solo mode integration over the PUBLIC protocol (§11):
//   1. a headless human (the sim policy, lockstep off) completes a full solo
//      run against the server's in-process bot at ?botspeed=instant pace;
//   2. the in-process transport keeps the replay invariant — the room's
//      action log (bot intents included) reduces to the identical state hash;
//   3. a solo room persists and restores WITH its bot: same hash, and the
//      restored bot still plays.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { Action, GameState, hashState, initialState, reduce } from '@threadbound/engine';
import { Bot } from '../src/bot';

process.env.PORT = '0';
process.env.PERSIST = '';

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

  next(type: string, pred: (m: any) => boolean = () => true, timeoutMs = 10_000): Promise<any> {
    const match = (m: any) => m.type === type && pred(m);
    const bi = this.buffer.findIndex(match);
    if (bi >= 0) return Promise.resolve(this.buffer.splice(bi, 1)[0]);
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error(`timed out waiting for ${type}`)), timeoutMs);
      this.waiters.push({ pred: match, res: (m) => { clearTimeout(timer); res(m); } });
    });
  }
}

describe('solo mode (S1)', () => {
  it('a human seat completes a full run against the in-process bot, and the action log replays to the same hash', async () => {
    const { GameServer } = await import('@threadbound/server');
    const gs = new GameServer({ port: 0 });
    const port = await gs.listen();
    try {
      // the headless "designer": sim policy, lockstep off (the solo bot stages
      // eagerly rather than alternating slots)
      const human = new Bot(`ws://localhost:${port}`, {
        createSolo: true, seed: 4242, startSeed: 99, lockstep: false,
      });
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('solo run timed out')), 240_000),
      );
      const result = await Promise.race([human.done, timeout]);
      expect(['victory', 'game_over']).toContain(result.outcome);
      expect(result.telemetry.cardsPlayed).toBeGreaterThan(0);

      const room = gs.rooms.get(human.code!)!;
      expect(room.bot?.seat).toBe('p2');
      expect(room.state.botSeat).toBe('p2');
      // both seats contributed cards — the bot actually played
      const botStaged = room.actionLog.filter(
        (a) => a.type === 'STAGE_CARD' && (a as { player?: string }).player === 'p2',
      );
      expect(botStaged.length).toBeGreaterThan(0);

      // determinism: in-process intents replay like any client's (§11)
      let replay: GameState = initialState(0, {
        p1: room.seats.p1!.character,
        p2: room.seats.p2!.character,
      }, 'p2');
      for (const action of room.actionLog) replay = reduce(replay, action as Action);
      expect(hashState(replay)).toBe(hashState(room.state));
    } finally {
      gs.close();
    }
  }, 250_000);

  it('a solo room persists and restores with its bot (reconnect-with-bot)', async () => {
    const { GameServer } = await import('@threadbound/server');
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tb-solo-')), 'rooms.json');

    const a = new GameServer({ port: 0, persistPath: file });
    const portA = await a.listen();
    const c1 = new Client(portA);
    await c1.open();
    c1.send({ type: 'create', character: 'vess', solo: true, botCharacter: 'bram', botSpeed: 'instant' });
    const joined = await c1.next('joined');
    expect(joined.playerId).toBe('p1');
    c1.send({ type: 'start', seed: 7 });
    const mapState = await c1.next('state', (m) => m.state.phase === 'map');
    expect(mapState.state.botSeat).toBe('p2');

    // the human navigates; the bot follows the pick (S1.2)
    const entry = mapState.state.map.nodes.filter((n: any) => n.layer === 0)[0].id;
    c1.send({ type: 'action', action: { type: 'NODE_PICK', nodeId: entry } });
    await c1.next('state', (m) => m.state.phase === 'combat', 15_000);

    // wait for the bot to go quiet (it stages eagerly, then waits for us),
    // then snapshot the last state we saw
    let last = await c1.next('state');
    for (;;) {
      try {
        last = await c1.next('state', () => true, 800);
      } catch {
        break; // quiet — the bot is waiting on the human
      }
    }
    expect(last.state.combat.chain.some((s: any) => s.owner === 'p2')).toBe(true); // bot staged early
    const hashBefore = last.hash;

    c1.ws.close();
    a.close(); // persists rooms + bot

    const b = new GameServer({ port: 0, persistPath: file });
    const portB = await b.listen();
    try {
      const c2 = new Client(portB);
      await c2.open();
      c2.send({ type: 'hello', token: joined.token });
      const rejoined = await c2.next('joined');
      expect(rejoined.playerId).toBe('p1');
      const restored = await c2.next('state');
      expect(restored.hash).toBe(hashBefore); // no state loss, bot chain intact
      expect(b.rooms.get(joined.code)?.bot?.seat).toBe('p2');

      // the restored bot still plays: ready up → it finishes its pass,
      // readies after us, and the turn resolves
      c2.send({ type: 'action', action: { type: 'SET_READY', ready: true } });
      const resolved = await c2.next(
        'state',
        (m) => m.state.phase !== 'combat' || m.state.combat.turn >= 2,
        20_000,
      );
      expect(resolved).toBeTruthy();
      c2.ws.close();
    } finally {
      b.close();
    }
  }, 60_000);
});
