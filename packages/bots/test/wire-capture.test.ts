// S6.3/S6.9 gate 2 — the wire-capture covenant, as specified: serialize every
// message a client receives across flagged runs over the real websocket
// protocol, and assert no hidden string or id ever crosses. A player reading
// the websocket learns nothing their screen doesn't show.
//
// Coverage comes in two layers:
//   1. an ORGANIC full pair run (bots, real protocol, start to outcome) — the
//      honest end-to-end path; leak-free everywhere it happens to go;
//   2. a SCRIPTED pair run (real sockets, real actions; the room is teleported
//      between stages the way the engine tests do) that deterministically
//      drives the sensitive stages: clue-event fragment delivery → the Loom's
//      Eye strike-out pooling → a confirmed verdict. Bot runs rarely visit
//      clue events, so this layer is what guarantees the surface is exercised.
// Solo runs get the same leak assertions on top (the Witness-voiced partner
// channel legitimately crosses there).
//
// Hidden surface asserted absent, per frame, per viewer:
//   - the truth tuple (key, or answer-id values before the shrine),
//     boss.liveMechanics, faceAnswerId, mechanic pools and mechanic ids
//   - fragment ids (variant ids encode eliminations) and elimination keys
//   - fragment TEXT not pinned to THAT viewer's own board
//   - state.seed / state.rng while the run is live (the truth tuple and the
//     draw order are pure functions of them)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Bot } from '../src/bot';
import { FRAGMENTS } from '../../engine/src/content/truth';
import { FACES } from '../../engine/src/content/faces';
import { generateFinaleMap } from '../../engine/src/map';

process.env.PORT = '0';
process.env.PERSIST = '';

const LIVE_PHASES = ['rites', 'map', 'combat', 'reward', 'event', 'loom', 'rest', 'shop'];
const ANSWER_IDS = [
  'a_kin', 'a_hired',
  'a_paid', 'a_compelled', 'a_volunteered', 'a_fleeing', // S8.2 q_came
  'a_sexton', 'a_peal', 'a_abandoned', 'a_starved', // S8.2 q_what expansion
  'a_hunger', 'a_grief', 'a_kept', 'a_mercy', 'a_unity', // S8.2 q_why expansion
];

interface Capture {
  frames: string[]; // raw JSON per message
  states: any[]; // parsed state messages
}

function captureWs(ws: WebSocket): Capture {
  const cap: Capture = { frames: [], states: [] };
  ws.on('message', (raw) => {
    const s = raw.toString();
    cap.frames.push(s);
    const msg = JSON.parse(s);
    if (msg.type === 'state') cap.states.push(msg);
  });
  return cap;
}

function assertNoSecrets(cap: Capture, ownTexts: Set<string>, label: string): void {
  const wire = cap.frames.join('\n');
  // structural keys of the server-secret truth half
  for (const key of ['"tuple"', 'liveMechanics', 'faceAnswerId', 'mechanicPool', '"eliminates"', 'bearsOn']) {
    expect(wire.includes(key), `${label}: ${key} crossed the wire`).toBe(false);
  }
  // no fragment id ever crosses (ids encode the eliminated answer); fragment
  // text only if pinned to THIS viewer's board
  for (const f of FRAGMENTS) {
    expect(wire.includes(f.id), `${label}: fragment id ${f.id} crossed`).toBe(false);
    if (!ownTexts.has(f.text)) {
      expect(wire.includes(f.text), `${label}: unserved/partner fragment ${f.id} text crossed`).toBe(false);
    }
  }
  // mechanic ids never cross — only rendered telegraph/reveal strings do
  for (const face of FACES) {
    for (const m of face.mechanicPool) {
      expect(wire.includes(m.id), `${label}: mechanic id ${m.id} crossed`).toBe(false);
    }
  }
  // seed/rng masked on every live frame (end screens may carry the seed)
  for (const msg of cap.states) {
    if (LIVE_PHASES.includes(msg.state.phase)) {
      expect(msg.state.seed, `${label}: live seed leaked in ${msg.state.phase}`).toBe(0);
      expect(msg.state.rng, `${label}: live rng leaked in ${msg.state.phase}`).toBe(0);
    }
  }
}

/** answer ids must not appear before the shrine (sheet/struck/verdict are the
 *  first screens that legitimately show them) */
function assertNoAnswersPreLoom(cap: Capture, label: string): void {
  for (const msg of cap.states) {
    if (msg.state.phase === 'loom' || msg.state.truth?.shrine) break;
    const frame = JSON.stringify(msg);
    for (const a of ANSWER_IDS) {
      expect(frame.includes(`"${a}"`), `${label}: answer ${a} crossed pre-loom`).toBe(false);
    }
  }
}

/** Buffered ws client (the solo.test.ts pattern) for the scripted layer. */
class Client {
  ws: WebSocket;
  cap: Capture;
  private buffer: any[] = [];
  private waiters: Array<{ pred: (m: any) => boolean; res: (m: any) => void }> = [];

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.cap = captureWs(this.ws);
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

  act(action: Record<string, unknown>): void {
    this.send({ type: 'action', action });
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

describe('wire capture (S6.3 gate 2, §11 extension)', () => {
  beforeAll(() => {
    process.env.TB_TRACKS = '1';
    // review sweep: the playtest deploy ships both flags — the covenant must
    // hold over the rites phase (Vestry offers, picks, birth trio) too
    process.env.TB_RITES = '1';
  });
  afterAll(() => {
    delete process.env.TB_TRACKS;
    delete process.env.TB_RITES;
  });

  it('SCRIPTED pair run: fragment delivery, strike-out pooling and the verdict leak nothing', async () => {
    const { GameServer } = await import('@threadbound/server');
    const gs = new GameServer({ port: 0 });
    const port = await gs.listen();
    try {
      const c1 = new Client(port);
      await c1.open();
      c1.send({ type: 'create', character: 'vess' });
      const joined = await c1.next('joined');
      const c2 = new Client(port);
      await c2.open();
      c2.send({ type: 'join', code: joined.code });
      await c2.next('joined');
      c1.send({ type: 'start', seed: 20260701 });
      // review sweep: with TB_RITES on the run opens in the Vestry — the
      // picks cross the real protocol (and the covenant frames include them)
      const vestry1 = await c1.next('state', (m) => m.state.phase === 'rites');
      c1.act({ type: 'RITE_PICK', riteId: vestry1.state.ritesState.offer.p1[0] });
      const vestry2 = await c2.next('state', (m) => m.state.phase === 'rites');
      c2.act({ type: 'RITE_PICK', riteId: vestry2.state.ritesState.offer.p2[0] });
      await c1.next('state', (m) => m.state.phase === 'map');
      await c2.next('state', (m) => m.state.phase === 'map');

      const room = gs.rooms.get(joined.code)!;
      expect(room.state.truth, 'flagged run must roll a truth').toBeTruthy();

      // --- stage 1: a clue event resolves; fragments pin asymmetrically ----
      // (teleport to the event the way the engine tests do, then the REAL
      // chooser action crosses the real protocol)
      room.state.phase = 'event';
      room.state.event = { eventId: 'nt_unrung_bell', chooser: 'p2', subject: 'p2', chosen: null };
      c2.act({ type: 'EVENT_CHOOSE', optionId: 'ring' });
      await c1.next('state', (m) => m.state.truth?.board.length + m.state.truth?.partnerStubs.length > 0, 15_000);
      await c2.next('state', (m) => m.state.truth?.board.length + m.state.truth?.partnerStubs.length > 0, 15_000);
      expect(room.state.truth!.boards.p1.length).toBeGreaterThan(0);
      expect(room.state.truth!.boards.p2.length).toBeGreaterThan(0);

      // --- stage 2: the Loom's Eye — strike-outs pool over the wire --------
      room.state.map = generateFinaleMap(true);
      room.state.phase = 'map';
      (gs as any).broadcastState(room);
      c1.act({ type: 'NODE_PICK', nodeId: 0 });
      c2.act({ type: 'NODE_PICK', nodeId: 0 });
      await c1.next('state', (m) => m.state.phase === 'loom', 15_000);
      await c2.next('state', (m) => m.state.phase === 'loom', 15_000);
      expect(room.state.truth!.shrine).toBeTruthy();

      // --- stage 3: pass in silence, both confirm → the verdict crosses ----
      c1.act({ type: 'LOOM_CONFIRM', confirm: true });
      c2.act({ type: 'LOOM_CONFIRM', confirm: true });
      await c1.next('state', (m) => !!m.state.truth?.shrine?.verdict, 15_000);
      await c2.next('state', (m) => !!m.state.truth?.shrine?.verdict, 15_000);
      expect(room.state.truth!.shrine!.verdict).toBeTruthy();

      // --- the covenant, over everything either seat ever received ---------
      assertNoSecrets(c1.cap, new Set(room.state.truth!.boards.p1.map((p) => p.text)), 'scripted:p1');
      assertNoSecrets(c2.cap, new Set(room.state.truth!.boards.p2.map((p) => p.text)), 'scripted:p2');
      assertNoAnswersPreLoom(c1.cap, 'scripted:p1');
      assertNoAnswersPreLoom(c2.cap, 'scripted:p2');
      c1.ws.close();
      c2.ws.close();
    } finally {
      gs.close();
    }
  }, 60_000);

  it('ORGANIC full pair run (bots) leaks nothing to either seat', async () => {
    const { GameServer } = await import('@threadbound/server');
    const gs = new GameServer({ port: 0 });
    const port = await gs.listen();
    try {
      let code = '';
      const a = new Bot(`ws://localhost:${port}`, {
        create: true, onCode: (c) => (code = c), seed: 515 * 3 + 1, startSeed: 515,
      });
      const capA = captureWs(a.ws);
      await new Promise((r) => setTimeout(r, 150));
      const b = new Bot(`ws://localhost:${port}`, { joinCode: code, seed: 515 * 3 + 2 });
      const capB = captureWs(b.ws);
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('pair run timed out')), 120_000),
      );
      await Promise.all([Promise.race([a.done, timeout]), Promise.race([b.done, timeout])]);

      const truth = gs.rooms.get(a.code!)!.state.truth!;
      assertNoSecrets(capA, new Set(truth.boards.p1.map((p) => p.text)), 'organic:p1');
      assertNoSecrets(capB, new Set(truth.boards.p2.map((p) => p.text)), 'organic:p2');
      assertNoAnswersPreLoom(capA, 'organic:p1');
      assertNoAnswersPreLoom(capB, 'organic:p2');
      a.ws.close();
      b.ws.close();
    } finally {
      gs.close();
    }
  }, 130_000);

  it('ORGANIC solo runs leak nothing beyond the Witness channel', async () => {
    const { GameServer } = await import('@threadbound/server');
    const gs = new GameServer({ port: 0 });
    const port = await gs.listen();
    try {
      for (const seed of [66, 61]) {
        const h = new Bot(`ws://localhost:${port}`, {
          createSolo: true, seed: 4242, startSeed: seed, lockstep: false,
        });
        const cap = captureWs(h.ws);
        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('solo run timed out')), 120_000),
        );
        await Promise.race([h.done, timeout]);

        const truth = gs.rooms.get(h.code!)!.state.truth!;
        // solo (ruling 8): BOTH channels' texts legitimately reach the human —
        // the Witness voices the partner channel out loud
        const legit = new Set([
          ...truth.boards.p1.map((p) => p.text),
          ...truth.boards.p2.map((p) => p.text),
        ]);
        assertNoSecrets(cap, legit, `solo:${seed}`);
        assertNoAnswersPreLoom(cap, `solo:${seed}`);
        h.ws.close();
      }
    } finally {
      gs.close();
    }
  }, 300_000);
});
