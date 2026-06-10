// M3-D: room GC actually evicts (injectable clock — no real timers), and
// graceful-restart persistence round-trips rooms + tokens.

import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialState } from '@threadbound/engine';
import { GameServer, Room } from '../src/lib';

const HOUR = 3_600_000;

function fakeRoom(code: string, lastActivity: number, phase: 'lobby' | 'game_over' = 'lobby'): Room {
  const state = initialState(1, { p1: 'vess', p2: 'bram' });
  state.phase = phase;
  return {
    code,
    state,
    actionLog: [],
    lastActivity,
    seats: {
      p1: { token: `tok_${code}_1`, character: 'vess', socket: null },
      p2: { token: `tok_${code}_2`, character: 'bram', socket: null },
    },
  };
}

const servers: GameServer[] = [];
function mkServer(opts: Partial<ConstructorParameters<typeof GameServer>[0]> = {}): GameServer {
  const s = new GameServer({ port: 0, ...opts });
  servers.push(s);
  return s;
}

afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

describe('room eviction (M2-D3 / M3-D)', () => {
  it('evicts idle rooms after 24h and finished rooms after 1h, cleaning tokens', () => {
    const t0 = 1_000_000_000_000;
    const gs = mkServer({ now: () => t0 });
    const fresh = fakeRoom('FRESH', t0 - HOUR);
    const stale = fakeRoom('STALE', t0 - 25 * HOUR);
    const done = fakeRoom('DONEZ', t0 - 2 * HOUR, 'game_over');
    const doneFresh = fakeRoom('DONEF', t0 - HOUR / 2, 'game_over');
    for (const r of [fresh, stale, done, doneFresh]) {
      gs.rooms.set(r.code, r);
      gs.tokenIndex.set(r.seats.p1!.token, { room: r, pid: 'p1' });
      gs.tokenIndex.set(r.seats.p2!.token, { room: r, pid: 'p2' });
    }
    gs.evictRooms(t0);
    expect([...gs.rooms.keys()].sort()).toEqual(['DONEF', 'FRESH']);
    expect(gs.tokenIndex.has(stale.seats.p1!.token)).toBe(false);
    expect(gs.tokenIndex.has(done.seats.p2!.token)).toBe(false);
    expect(gs.tokenIndex.has(fresh.seats.p1!.token)).toBe(true);
  });
});

describe('graceful restart persistence (M3-D)', () => {
  it('round-trips rooms, action logs, and session tokens through a snapshot file', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tb-')), 'rooms.json');
    const a = mkServer({ persistPath: file });
    const room = fakeRoom('SNAPS', Date.now());
    room.actionLog.push({ type: 'START_RUN', seed: 1 });
    a.rooms.set(room.code, room);
    a.tokenIndex.set(room.seats.p1!.token, { room, pid: 'p1' });
    a.persist();
    expect(fs.existsSync(file)).toBe(true);

    const b = mkServer({ persistPath: file }); // restore() runs in constructor
    const restored = b.rooms.get('SNAPS');
    expect(restored).toBeTruthy();
    expect(restored!.actionLog.length).toBe(1);
    expect(restored!.seats.p1!.token).toBe(room.seats.p1!.token);
    expect(restored!.seats.p1!.socket).toBeNull();
    const entry = b.tokenIndex.get(room.seats.p1!.token);
    expect(entry?.pid).toBe('p1');
    expect(b.rooms.get('SNAPS')!.state.phase).toBe('lobby');
  });
});
