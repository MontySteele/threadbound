// Bot simulation + M2 telemetry gates (M2 Part C): paired bots play full runs.
// Usage: node dist/sim.js [runs]
//
// S16.0 — TWO TRANSPORTS, one harness:
//   default        SOCKET-FREE (S16.0a): each seat's BotView is built directly
//                  from engine state in-process through the SAME pure redaction
//                  the server sends over the wire (engine redactFor); lockstep
//                  policy calls; no server, no socket, no sleeps. Deterministic
//                  per seed by construction — same seed twice → byte-identical
//                  telemetry (pinned, S16.0c). The S16-R1 instrument rule
//                  (paired same-seed reads) exists because of this path.
//   TB_SIM_SOCKET=1  the WS path (the pre-S16 instrument): real server + real
//                  websockets in this process. REMAINS the protocol/covenant
//                  instrument; the S14-R5 noise law (pooled n≥200; ±7–10
//                  win-points cross-invocation jitter per 100-run leg) governs
//                  every row read over the socket.
//   TB_SIM_SHARDS=N  (S16.0b, default cores−1): partition the seed range
//                  across forked worker processes; per-shard telemetry pools
//                  into the identical summary format (canonical run order, so
//                  N shards ≡ 1 shard byte-identically on the socket-free
//                  path — pinned). Works on both transports.
//
// Sign-off gates:
//   - vb win rate 40–55% at A0, default topology (S14-R1; the M2 ≤40% header
//     gate retired with that ruling — it was calibrated to draft-v1 bots).
//     Mirrors and braid rows REPORTED, not banded.
//   - avg player HP lost per Act 1 combat ≥ 8
//   - link-fire rate: Act 1 ≥ 30%, Act 2 within 40–60%
//   - no single tag > 50% of resonance-streak cards
//   - Hex damage share (incl. HexScaling) 25–45% (vb only, S5 gate-4)
//
// S13.1a — permanent sim knobs (the OQ#59 decomposition probes, kept). ALL
// SIM-ONLY: no production surface reads them.
//   TB_BOT_SKIP_PICKS=1  bots forgo all reward picks, covets, shop card buys
//   TB_NO_RELICS=1       grantRelic no-ops; shops stock no relics (engine-side)
//   TB_UPGRADE_ALL=1     start with every upgradeable starter upgraded (engine-side)
//   TB_BOT_PICK_CAP=N    deck-SIZE ceiling: draft normally until deck.length >=
//                        10 + N, then skip. Removals free slots back up — the
//                        cap is intentionally the dilution variable, not a pick
//                        counter. Covets and shop card buys share the gate.
//                        The constant 10 is STARTER_DECK_SIZE (pinned by test).
// S15.3 — the elite-excess routing probe (OQ#55 calibration):
//   TB_BOT_ALL_KNOTS=1   bots take every reachable knot, ladder price ignored;
//                        the ≥2 last/first pair-HP gate is read on this leg
// S13.1b/S13.6 — draft policy v2 (powers/engines +4, rare +3, a dilution term
// past deck 16) is the DEFAULT since the S13.6 D7 flip (its first clean
// battery: post-content v2 60% vs v1 50%, S13-ECONOMY-STATUS.md).
// TB_BOT_DRAFT_V2=0 restores v1 — the instrumented comparison policy for
// load-bearing rows; pre-flip batteries were v1 unless marked DRAFT_V2.
// S17 pre-audit — per-run item rows for the power-level sweep:
//   TB_SIM_ITEMS=1   emit one '##TBITEMS##{json}' machine row per run
//                    (outcome, act reached, per-seat card picks/plays by
//                    def, relics acquired) so per-item win-rate lift can be
//                    computed offline. OFF by default: the knob only ADDS
//                    rows — the canonical run lines + summary stay
//                    byte-identical, so no re-anchor is owed.

process.env.PORT = process.env.PORT ?? '0';
process.env.PERSIST = ''; // sims never persist rooms
// S6.2: bot runs finish in seconds, so a battery creates rooms far faster
// than any human IP legitimately could — lift the harness's own limit
process.env.TB_ROOM_RATE = process.env.TB_ROOM_RATE ?? '100000';

import { fork } from 'node:child_process';
import os from 'node:os';
import { PT1_ENEMY_HP_SCALE, PT1_ENEMY_DMG_SCALE, PlayerId, CARDS, ALL_RELICS, SOLO_WITNESS, witnessPoolLines } from '@threadbound/engine';
import { Bot, RunResult } from './bot';
import { playRunLocal } from './local';

// S19.1 --solo: the solo telemetry harness. One headless policy-driven
// "human seat" per run creates a SOLO room over the real WS transport; the
// SERVER's in-process SoloBotDriver holds p2 (the production solo partner,
// draft v2, etiquette overlays — the exact surface this battery measures).
// Reads are REPORTED, never banded (the S16 jitter lesson: WS rows carry
// cross-invocation noise; S14-R5 governs). Reports win%, reclaims/run,
// thread verbs/run per seat, per-pool Witness line counts, and the turn at
// which each pool exhausts (the D5 line-budget instrument).
const SOLO = process.env.TB_SIM_SOLO === '1' || process.argv.includes('--solo');
if (SOLO) process.env.TB_SIM_SOLO = '1'; // crosses shard forks intact

const RUNS = (() => {
  const n = Number(process.argv[2] ?? 50);
  return Number.isFinite(n) && n > 0 ? n : 50; // `sim.js --solo` (count omitted) → default
})();
const BASE_SEED = Number(process.env.SEED ?? 1000); // fixed seed set → reproducible gates
// S16.0b sharding: a forked child plays run indices OFFSET+1..OFFSET+RUNS of
// the parent's battery — seeds stay BASE_SEED+index, so the pooled seed set
// is identical to an unsharded battery's
const RUN_OFFSET = Number(process.env.TB_SIM_RUN_OFFSET ?? 0) || 0;
const SHARD_CHILD = process.env.TB_SIM_SHARD_CHILD; // set ⇒ emit machine rows, no summary
// Comfort-pass checklist item 2: rites + L7 maps lengthen runs, and a timeout
// mid-battery poisons the win-rate read — env-overridable for long batteries
// (WS transport only: the socket-free path is deterministic and cannot hang
// on scheduling; it stall-guards loudly instead).
const RUN_TIMEOUT_MS = Math.max(10_000, Number(process.env.TB_RUN_TIMEOUT_MS ?? 300_000) || 300_000);

// S16.0a transport switch: socket-free is the default instrument; the wire
// is the escape hatch (protocol/covenant rows, the one-time parity bridge)
const SOCKET = process.env.TB_SIM_SOCKET === '1';

// S16.0b: shard count — default cores−1 (the doc's ruling); TB_SIM_SHARDS=1
// keeps the battery in-process. Children never re-shard.
const SHARDS = (() => {
  if (SHARD_CHILD !== undefined) return 1;
  const raw = process.env.TB_SIM_SHARDS;
  // S19.1: --solo defaults to one process — the WS run pool (TB_SIM_CONC)
  // is already concurrent, and one server per battery keeps the report simple
  if (SOLO && (raw === undefined || raw === '')) return 1;
  const n = raw !== undefined && raw !== '' ? Number(raw) : Math.max(1, os.cpus().length - 1);
  return Math.max(1, Math.min(Number.isFinite(n) ? Math.floor(n) : 1, Math.max(1, RUNS)));
})();

/** S16.0a: envFlag with the server's exact semantics (server/src/lib.ts) —
 *  the socket-free path must not import the server (importing it binds a
 *  port), but the flags that cross START_RUN must read identically. */
function envFlag(name: string, def = false): boolean {
  const v = process.env[name];
  if (v === undefined) return def;
  return !['', '0', 'false', 'off', 'no'].includes(v.trim().toLowerCase());
}

// S3.5 character-balance battery: PAIR=vb (default) | vv | bb
const PAIR = (process.env.PAIR ?? 'vb').toLowerCase();
const CHAR = { v: 'vess', b: 'bram' } as const;
const PAIR_CHARS = {
  p1: CHAR[(PAIR[0] === 'b' ? 'b' : 'v')],
  p2: CHAR[(PAIR[1] === 'b' ? 'b' : 'v')],
};

// S4.4: ASCEND=N selects the ascension level for the battery (default A0 —
// which must reproduce pre-S4 behavior exactly; no new gates this sprint)
const ASCEND = Math.max(0, Math.min(5, Number(process.env.ASCEND ?? 0) || 0));

// S7.7: TB_BOT_SEEK_EVENTS=1 — bots prefer reachable event nodes over the
// lowest-id rule so the S7.8 battery can measure birth-rite timing.
// SIM-ONLY, default off; no production surface reads this.
const SEEK_EVENTS = process.env.TB_BOT_SEEK_EVENTS === '1';
// S7.8 gate-5 sim accommodation: flagged batteries only — bots occasionally
// Reclaim so engagement is measurable (S6.2 precedent; never in production)
const RECLAIM_NUDGE = process.env.TB_RITES === '1';
// S13.1a/b knobs (header above) — threaded into BotPolicy per seat
const SKIP_PICKS = process.env.TB_BOT_SKIP_PICKS === '1';
const PICK_CAP = process.env.TB_BOT_PICK_CAP !== undefined && process.env.TB_BOT_PICK_CAP !== ''
  ? Math.max(0, Number(process.env.TB_BOT_PICK_CAP) || 0)
  : undefined;
const DRAFT_V2 = process.env.TB_BOT_DRAFT_V2 !== '0'; // S13.6: default ON (D7 flip)
const ALL_KNOTS = process.env.TB_BOT_ALL_KNOTS === '1'; // S15.3 probe

// the flags that cross START_RUN (server: envFlag; socket-free: same reader)
const FLAGS = { tracks: envFlag('TB_TRACKS'), rites: envFlag('TB_RITES'), knotwork: envFlag('TB_KNOTWORK') };
const KNOT = FLAGS.knotwork;

/** one battery entry: run index (1-based over the whole battery) + result */
interface Played {
  run: number;
  result: RunResult;
}

const RESULT_MARK = '##TBRESULT##'; // shard child → parent machine row
const ITEMS_MARK = '##TBITEMS##'; // TB_SIM_ITEMS=1 per-run item row (S17 pre-audit)
const ITEMS = process.env.TB_SIM_ITEMS === '1';

/** S17 pre-audit machine row: everything the per-item lift analysis needs
 *  from one run, straight out of the S14.1 B23 telemetry (no engine change).
 *  Cards are per-seat [p1, p2] so mixed pairs split by character offline. */
function itemsLine(p: Played): string {
  const t = p.result.telemetry;
  const seatCell = (cell: Record<PlayerId, number> | undefined): [number, number] =>
    [cell?.p1 ?? 0, cell?.p2 ?? 0];
  const cards: Record<string, [number, number]> = {};
  for (const [id, cell] of Object.entries(t.cards?.picks ?? {})) cards[id] = seatCell(cell);
  const plays: Record<string, [number, number]> = {};
  for (const [id, cell] of Object.entries(t.cards?.plays ?? {})) plays[id] = seatCell(cell);
  return `${ITEMS_MARK}${JSON.stringify({
    run: p.run,
    outcome: p.result.outcome,
    act: p.result.act,
    characters: p.result.characters,
    cards,
    plays,
    relics: Object.keys(t.relicSources ?? {}).sort(),
  })}`;
}

function runLine(p: Played): string {
  const r = p.result;
  return (
    `run ${p.run}: ${r.outcome} in act ${r.act} — combats won ${r.combatsWon}, ` +
    `turns ${r.telemetry.turns}, cards ${r.telemetry.cardsPlayed}, links ${r.telemetry.linksFired}`
  );
}

// ---------------------------------------------------------------------------
// WS transport (TB_SIM_SOCKET=1) — the pre-S16 instrument, kept verbatim
// ---------------------------------------------------------------------------

async function playRunWs(url: string, runSeed: number): Promise<RunResult> {
  let code = '';
  const knobs = { skipPicks: SKIP_PICKS, pickCap: PICK_CAP, allKnots: ALL_KNOTS, draftV2: DRAFT_V2 };
  const a = new Bot(url, { create: true, onCode: (c) => (code = c), seed: runSeed * 3 + 1, startSeed: runSeed, characters: PAIR_CHARS, ascension: ASCEND, seekEvents: SEEK_EVENTS, reclaimNudge: RECLAIM_NUDGE, ...knobs });
  await new Promise((r) => setTimeout(r, 150));
  const b = new Bot(url, { joinCode: code, seed: runSeed * 3 + 2, ascension: ASCEND, seekEvents: SEEK_EVENTS, reclaimNudge: RECLAIM_NUDGE, ...knobs });
  const timeout = new Promise<RunResult>((_, rej) =>
    setTimeout(() => rej(new Error('run timed out')), RUN_TIMEOUT_MS),
  );
  try {
    const [ra] = await Promise.all([Promise.race([a.done, timeout]), Promise.race([b.done, timeout])]);
    return ra;
  } finally {
    a.ws.close();
    b.ws.close();
  }
}

/** S19.1: one solo run — a single headless bot holds the HUMAN seat (p1)
 *  and creates a solo room; the server seats its in-process SoloBotDriver
 *  at p2 (botSpeed 'instant'). lockstep off: the solo partner is a
 *  non-lockstep peer (the S1 solo.test.ts construction). The human seat
 *  carries NO sim-only knobs (no reclaimNudge/seekEvents/skipPicks) so
 *  every reclaim in the report is attributable to a production policy. */
async function playRunSolo(url: string, runSeed: number): Promise<RunResult> {
  const a = new Bot(url, {
    createSolo: true, seed: runSeed * 3 + 1, startSeed: runSeed,
    characters: PAIR_CHARS, ascension: ASCEND, lockstep: false,
    draftV2: DRAFT_V2, trackSolo: true,
  });
  const timeout = new Promise<RunResult>((_, rej) =>
    setTimeout(() => rej(new Error('run timed out')), RUN_TIMEOUT_MS),
  );
  try {
    return await Promise.race([a.done, timeout]);
  } finally {
    a.ws.close();
  }
}

async function playAllWs(printLive: boolean): Promise<Played[]> {
  // the server import BOOTS a listening server — deliberately confined to the
  // WS transport (S16.0a: the socket-free path never touches it)
  const { server } = await import('@threadbound/server');
  await new Promise<void>((r) => (server.listening ? r() : server.once('listening', () => r())));
  const addr = server.address();
  if (typeof addr !== 'object' || !addr) throw new Error('server not listening');
  const url = `ws://localhost:${addr.port}`;
  console.log(`sim: bots connecting to ${url} (engine + policy seeded; socket timing still jitters slightly — S14-R5 governs)`);

  const played: Played[] = [];
  // Comfort pass: bounded-concurrency pool (TB_SIM_CONC, default 8). Each run
  // is its own room + seeds, so runs are independent; aggregation is
  // order-independent (results are pooled in canonical run order regardless).
  const CONC = Math.max(1, Number(process.env.TB_SIM_CONC ?? 8) || 8);
  let nextRun = 1;
  let failed = false;
  async function worker(): Promise<void> {
    while (!failed) {
      const n = nextRun++;
      if (n > RUNS) return;
      const run = RUN_OFFSET + n;
      try {
        const result = SOLO ? await playRunSolo(url, BASE_SEED + run) : await playRunWs(url, BASE_SEED + run);
        const p = { run, result };
        played.push(p);
        if (printLive) console.log(runLine(p));
      } catch (err) {
        console.error(`run ${run}: FAILED — ${err}`);
        process.exitCode = 1;
        failed = true;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, RUNS) }, () => worker()));
  server.close();
  return played;
}

// ---------------------------------------------------------------------------
// Socket-free transport (S16.0a) — deterministic, sequential in-process
// ---------------------------------------------------------------------------

function playAllLocal(printLive: boolean): Played[] {
  const played: Played[] = [];
  for (let n = 1; n <= RUNS; n++) {
    const run = RUN_OFFSET + n;
    try {
      const result = playRunLocal({
        seed: BASE_SEED + run,
        characters: PAIR_CHARS,
        ascension: ASCEND,
        flags: FLAGS,
        policy: {
          seekEvents: SEEK_EVENTS, reclaimNudge: RECLAIM_NUDGE,
          skipPicks: SKIP_PICKS, pickCap: PICK_CAP, allKnots: ALL_KNOTS, draftV2: DRAFT_V2,
        },
      });
      const p = { run, result };
      played.push(p);
      if (printLive) console.log(runLine(p));
    } catch (err) {
      console.error(`run ${run}: FAILED — ${err}`);
      process.exitCode = 1;
      break; // deterministic instrument: fail fast and loudly
    }
  }
  return played;
}

// ---------------------------------------------------------------------------
// Sharding (S16.0b): fork this script per shard; pool machine rows
// ---------------------------------------------------------------------------

/** contiguous partition of RUNS across SHARDS: shard i plays `counts[i]`
 *  runs starting at 1-based offset `offsets[i]` (exported-by-test shape) */
export function shardPlan(runs: number, shards: number): { offset: number; count: number }[] {
  const per = Math.floor(runs / shards);
  const extra = runs % shards;
  const plan: { offset: number; count: number }[] = [];
  let at = 0;
  for (let i = 0; i < shards; i++) {
    const count = per + (i < extra ? 1 : 0);
    plan.push({ offset: at, count });
    at += count;
  }
  return plan;
}

async function playAllSharded(): Promise<Played[]> {
  const plan = shardPlan(RUNS, SHARDS);
  const pooled: Played[] = [];
  let done = 0;
  const jobs = plan.map((shard, i) => new Promise<void>((resolve, reject) => {
    if (shard.count === 0) return resolve();
    const child = fork(__filename, [String(shard.count)], {
      env: {
        ...process.env,
        TB_SIM_SHARD_CHILD: String(i),
        TB_SIM_RUN_OFFSET: String(RUN_OFFSET + shard.offset),
        TB_SIM_SHARDS: '1',
      },
      stdio: ['ignore', 'pipe', 'inherit', 'ipc'],
    });
    let buf = '';
    child.stdout!.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.startsWith(RESULT_MARK)) {
          pooled.push(JSON.parse(line.slice(RESULT_MARK.length)) as Played);
          if (++done % 25 === 0) process.stderr.write(`sim: progress ${done}/${RUNS} runs pooled\n`);
        }
        // anything else a child prints on stdout is dropped — the parent owns
        // the canonical output (run lines + summary in pooled run order)
      }
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        process.exitCode = 1;
        reject(new Error(`shard ${i} exited ${code}`));
      } else resolve();
    });
    child.on('error', reject);
  }));
  const settled = await Promise.allSettled(jobs);
  for (const s of settled) {
    if (s.status === 'rejected') console.error(String(s.reason));
  }
  return pooled;
}

// ---------------------------------------------------------------------------
// Summary (M2 Part C) — one function over the pooled battery, transport- and
// shard-agnostic: identical format everywhere (S16.0b's aggregation contract)
// ---------------------------------------------------------------------------

interface Gate {
  name: string;
  value: string;
  pass: boolean;
}

export function printSummary(results: RunResult[]): void {
  const sum = (f: (r: RunResult) => number) => results.reduce((acc, r) => acc + f(r), 0);
  const victories = results.filter((r) => r.outcome === 'victory').length;
  const winRate = (100 * victories) / Math.max(1, results.length);
  const cards = sum((r) => r.telemetry.cardsPlayed);
  const links = sum((r) => r.telemetry.linksFired);
  const resonances = sum((r) => r.telemetry.resonances);

  const damageByTag: Record<string, number> = {};
  const resonanceTags: Record<string, number> = {};
  const actAgg: Record<number, { cards: number; links: number; combats: number; hpLost: number }> = {};
  for (const r of results) {
    for (const [tag, dmg] of Object.entries(r.telemetry.damageByTag)) damageByTag[tag] = (damageByTag[tag] ?? 0) + dmg;
    for (const [tag, n] of Object.entries(r.telemetry.resonanceTagCounts)) resonanceTags[tag] = (resonanceTags[tag] ?? 0) + n;
    for (const [act, s] of Object.entries(r.telemetry.actStats)) {
      const a = (actAgg[Number(act)] ??= { cards: 0, links: 0, combats: 0, hpLost: 0 });
      a.cards += s.cardsPlayed; a.links += s.linksFired; a.combats += s.combats; a.hpLost += s.hpLost;
    }
  }

  const detonations = sum((r) => r.telemetry.detonationEvents ?? 0);
  const detonatedStacks = sum((r) => r.telemetry.detonatedStacks);
  const totalDamage = Object.values(damageByTag).reduce((a, b) => a + b, 0);
  const hexShare = totalDamage ? (100 * ((damageByTag.Hex ?? 0) + (damageByTag.HexScaling ?? 0))) / totalDamage : 0;
  const act1 = actAgg[1] ?? { cards: 0, links: 0, combats: 1, hpLost: 0 };
  const act2 = actAgg[2] ?? { cards: 0, links: 0, combats: 0, hpLost: 0 };
  const act1LinkRate = act1.cards ? (100 * act1.links) / act1.cards : 0;
  const act2LinkRate = act2.cards ? (100 * act2.links) / act2.cards : 0;
  // HP lost per act-1 combat is per PLAYER-pair (both players' loss summed by engine)
  const hpPerA1Combat = act1.combats ? act1.hpLost / act1.combats : 0;
  const totalResTags = Object.values(resonanceTags).reduce((a, b) => a + b, 0);
  const maxResTagShare = totalResTags ? Math.max(...Object.values(resonanceTags)) / totalResTags : 0;

  // S14-R1 as re-derived by S18 (ruled 2026-07-06, stop-and-report): the
  // win-rate band binds vb at A0 on the BRAID — the shipped topology
  // (render.yaml runs TB_KNOTWORK=1; S15 recalibrated on it; the S18-D3
  // target band is its number). The default-topology row is the flag-off
  // fallback lane generator: REPORTED, not banded (its 40–55 band broke as
  // a side effect of the D3 dose ratified on the shipped map — anchors
  // banked in docs/S18-STATUS.md Part 8 for delta reads). Mirrors likewise
  // reported; human data rules at the next playtest (OQ#14).
  // S19.1: --solo rows are NEVER banded — a different pair of policies over
  // a jittery transport; the pre-sprint solo anchor is a loose sanity read
  const r1Banded = PAIR === 'vb' && ASCEND === 0 && KNOT && !SOLO;
  const gates: Gate[] = [
    r1Banded
      ? { name: 'vb win rate 45–55% at A0 braid (S14-R1 as re-derived by S18-D3)', value: `${winRate.toFixed(0)}%`, pass: winRate >= 45 && winRate <= 55 }
      : { name: `win rate (reported, not banded — S14-R1/S18: ${PAIR}${KNOT ? ' braid' : ' default'} A${ASCEND})`, value: `${winRate.toFixed(0)}%`, pass: true },
    { name: 'avg HP lost per Act 1 combat ≥ 8', value: hpPerA1Combat.toFixed(1), pass: hpPerA1Combat >= 8 },
    { name: 'Act 1 link-fire ≥ 30%', value: `${act1LinkRate.toFixed(1)}%`, pass: act1LinkRate >= 30 },
    {
      name: 'Act 2 link-fire 40–60%',
      value: act2.cards ? `${act2LinkRate.toFixed(1)}%` : 'n/a (no Act 2 reached)',
      pass: act2.cards > 0 && act2LinkRate >= 40 && act2LinkRate <= 60,
    },
    { name: 'no tag > 50% of resonance streaks', value: `${(100 * maxResTagShare).toFixed(0)}%`, pass: maxResTagShare <= 0.5 },
    // 20-30 was guessed against the pre-§14.10 starter (no detonating Hatpin).
    // Widened per the review pass with burst texture verified healthy (avg
    // 3.12 stacks/detonation); re-derive honestly in Part A.
    // S5 designer amendment (2026-07-01, gate 4): the band gates PAIR=vb
    // only — mirror pairs' shares are structural (a hex mirror's damage is
    // hex-flavored by construction) and read as telemetry, not gates.
    PAIR === 'vb'
      ? { name: 'Hex damage share 25–45% (vb gate, §14.10 + S5)', value: `${hexShare.toFixed(1)}%`, pass: hexShare >= 25 && hexShare <= 45 }
      : { name: `Hex damage share (telemetry only for ${PAIR}, S5 gate-4 amendment)`, value: `${hexShare.toFixed(1)}%`, pass: true },
  ];

  console.log('\n================ TELEMETRY SUMMARY (M2 Part C) ================');
  console.log(`runs: ${results.length}  |  victories: ${victories} (${winRate.toFixed(0)}%)  |  combats won: ${sum((r) => r.combatsWon)}`);
  console.log(`furthest acts: ${JSON.stringify(results.reduce((m, r) => ((m[r.act] = (m[r.act] ?? 0) + 1), m), {} as Record<number, number>))}`);
  console.log(`turns: ${sum((r) => r.telemetry.turns)}  |  cards played: ${cards}  |  overall link-fire: ${cards ? ((100 * links) / cards).toFixed(1) : 0}%`);
  console.log(`act 1: ${act1.combats} combats, link-fire ${act1LinkRate.toFixed(1)}%, HP lost/combat ${hpPerA1Combat.toFixed(1)}`);
  console.log(`act 2: ${act2.combats} combats, link-fire ${act2LinkRate.toFixed(1)}%`);
  // Comfort pass: per-encounter difficulty attribution. Sorted by pair HP
  // lost per combat; !! flags entries > 2x the mean of encounters with >= 5
  // samples (the S10a battery gate-4 read).
  {
    const enc: Record<string, { combats: number; hpLost: number }> = {};
    for (const r of results) {
      for (const [id, s] of Object.entries(r.telemetry.encounterStats ?? {})) {
        const e = (enc[id] ??= { combats: 0, hpLost: 0 });
        e.combats += s.combats; e.hpLost += s.hpLost;
      }
    }
    const rows = Object.entries(enc)
      .map(([id, s]) => ({ id, combats: s.combats, per: s.combats ? s.hpLost / s.combats : 0 }))
      .sort((a, b) => b.per - a.per);
    const sampled = rows.filter((r) => r.combats >= 5);
    const mean = sampled.length ? sampled.reduce((a, r) => a + r.per, 0) / sampled.length : 0;
    console.log('---------------- HP LOST BY ENCOUNTER (pair HP / combat) ----------------');
    for (const r of rows) {
      const flag = r.combats >= 5 && mean > 0 && r.per > 2 * mean ? '  !! outlier' : '';
      console.log(`  ${r.id.padEnd(24)} n=${String(r.combats).padStart(3)}  hp/combat ${r.per.toFixed(1)}${flag}`);
    }
    if (mean > 0) console.log(`  (mean over n>=5 encounters: ${mean.toFixed(1)})`);
  }
  // ---- S14.1 (B23) per-card attribution ------------------------------------
  // The "dead cards / never-bought relics" instrument: pooled play counts,
  // picks, and winning-deck presence per card def (pair totals; per-seat kept
  // in the raw telemetry), plus relic acquisition sources. Machine-greppable
  // rows so shard logs pool without re-running.
  let acquisitions = 0; // S16.0d (B22): every addCardToDeck channel
  {
    const plays: Record<string, number> = {};
    const picks: Record<string, number> = {};
    const winDecks: Record<string, number> = {};
    const relicSrc: Record<string, number> = {};
    const relicSeen: Record<string, number> = {};
    for (const r of results) {
      const c = r.telemetry.cards;
      for (const [id, cell] of Object.entries(c?.plays ?? {})) plays[id] = (plays[id] ?? 0) + cell.p1 + cell.p2;
      for (const [id, cell] of Object.entries(c?.picks ?? {})) picks[id] = (picks[id] ?? 0) + cell.p1 + cell.p2;
      for (const [id, cell] of Object.entries(c?.winningDeck ?? {})) winDecks[id] = (winDecks[id] ?? 0) + (cell.p1 + cell.p2 > 0 ? 1 : 0);
      for (const [id, src] of Object.entries(r.telemetry.relicSources ?? {})) {
        relicSrc[src] = (relicSrc[src] ?? 0) + 1;
        relicSeen[id] = (relicSeen[id] ?? 0) + 1;
      }
    }
    acquisitions = Object.values(picks).reduce((a, b) => a + b, 0);
    // every def with any activity gets one row (union: a picked-never-played
    // card must still appear)
    const ids = [...new Set([...Object.keys(plays), ...Object.keys(picks), ...Object.keys(winDecks)])]
      .sort((a, b) => (plays[b] ?? 0) - (plays[a] ?? 0));
    if (ids.length > 0) {
      console.log('---------------- S14.1 PER-CARD ATTRIBUTION (B23) ----------------');
      const brief = (xs: string[]) => xs.map((id) => `${id}(${plays[id] ?? 0})`).join(', ');
      console.log(`top-10 by plays: ${brief(ids.slice(0, 10))}`);
      console.log(`bottom-10 by plays: ${brief(ids.slice(-10))}`);
      // the full pooled table, one row per def (grep '^  card ' to pool
      // shard logs without re-running)
      for (const id of ids) {
        console.log(`  card ${id.padEnd(24)} plays ${String(plays[id] ?? 0).padStart(4)} picks ${String(picks[id] ?? 0).padStart(3)} winning-decks ${winDecks[id] ?? 0}`);
      }
      const acquirable = Object.values(CARDS).filter((c) => !c.starterOnly && !c.riteOnly);
      const neverPicked = acquirable.filter((c) => !(picks[c.id] > 0)).map((c) => c.id);
      console.log(`never-picked cards (${neverPicked.length}/${acquirable.length} of the acquirable pool): ${neverPicked.join(', ') || 'none'}`);
      const pickedNeverPlayed = Object.keys(picks).filter((id) => !(plays[id] > 0));
      console.log(`picked-but-never-played: ${pickedNeverPlayed.join(', ') || 'none'}`);
      console.log(`relic acquisition sources: ${JSON.stringify(relicSrc)}`);
      const neverAcquired = ALL_RELICS.filter((rl) => !(relicSeen[rl.id] > 0)).map((rl) => rl.id);
      console.log(`never-acquired relics (${neverAcquired.length}/${ALL_RELICS.length}): ${neverAcquired.join(', ') || 'none'}`);
    }
  }
  console.log(`Resonance ignitions: ${resonances}  |  streak tags: ${JSON.stringify(resonanceTags)}`);
  console.log(`damage by tag: ${JSON.stringify(damageByTag)}  |  Hex share: ${hexShare.toFixed(1)}%`);
  // review-pass texture stat (NOT a gate): is Hex still bank-and-burst, or a
  // §14.10 Hatpin drip? Watch for avg hovering near 1-2.
  console.log(`detonations: ${detonations}  |  avg stacks per detonation: ${detonations ? (detonatedStacks / detonations).toFixed(2) : 'n/a'}`);

  // ---- S3.1 stats -----------------------------------------------------------
  const combats = Object.values(actAgg).reduce((a, s) => a + s.combats, 0);
  const seatChar = (pid: PlayerId): string => {
    const chars = new Set(results.map((r) => r.characters?.[pid] ?? '?'));
    return [...chars].join('/');
  };
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const dmg = sum((r) => r.telemetry.damageByPlayer[pid]);
    const blk = sum((r) => r.telemetry.blockByPlayer?.[pid] ?? 0);
    const lf = sum((r) => r.telemetry.linkFiresByPlayer?.[pid] ?? 0);
    const falls = sum((r) => r.telemetry.fallsByPlayer?.[pid] ?? 0);
    const covets = sum((r) => r.telemetry.covetsSpent[pid]);
    console.log(`${pid} (${seatChar(pid)}): damage ${dmg} | block ${blk} | link-fires ${lf} | falls ${falls} | covets taken from partner ${covets}`);
  }
  const wkPlays = sum((r) => r.telemetry.wornKnife?.plays ?? 0);
  const wkDamage = sum((r) => r.telemetry.wornKnife?.damage ?? 0);
  console.log(`Worn Knife: ${wkPlays} plays | mean damage ${wkPlays ? (wkDamage / wkPlays).toFixed(2) : 'n/a'}`);
  const threadSpent = sum((r) => r.telemetry.threadSpent ?? 0);
  const spendMix: Record<string, number> = {};
  for (const r of results) {
    for (const [k, n] of Object.entries(r.telemetry.threadSpendByKind ?? {})) spendMix[k] = (spendMix[k] ?? 0) + n;
  }
  const regenWasted = sum((r) => r.telemetry.regenWastedAtCap ?? 0);
  const forced = sum((r) => r.telemetry.forcedLinkFires ?? 0);
  const resForced = sum((r) => r.telemetry.resonancesForced ?? 0);
  console.log(
    `thread: spent/combat ${combats ? (threadSpent / combats).toFixed(2) : 'n/a'} | spend mix ${JSON.stringify(spendMix)} | ` +
    `regen wasted at cap/combat ${combats ? (regenWasted / combats).toFixed(2) : 'n/a'}`,
  );
  console.log(`forced links (Pulse): ${forced} (${links ? ((100 * forced) / links).toFixed(1) : 0}% of fires) | Resonances needing one: ${resForced}/${resonances}`);
  // S16.0d (B22): the gate-3 Reclaim band's denominator, finally emitted —
  // reclaims vs every card acquisition channel (reward picks, covets, shop
  // buys, rite vestments: everything through addCardToDeck since S14.1)
  console.log(
    `B22 reclaim ratio: ${spendMix.reclaim ?? 0} reclaims / ${acquisitions} card acquisitions = ` +
    `${acquisitions ? ((100 * (spendMix.reclaim ?? 0)) / acquisitions).toFixed(1) : 'n/a'}% (gate-3 band: <25%)`,
  );

  // ---- S4.1 gold economy ------------------------------------------------------
  const n = Math.max(1, results.length);
  const earnedBySource: Record<string, number> = {};
  let spendTotal = 0;
  let removalSpend = 0;
  for (const r of results) {
    for (const [src, g] of Object.entries(r.telemetry.goldEarnedBySource ?? {})) {
      earnedBySource[src] = (earnedBySource[src] ?? 0) + g;
    }
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const cat = r.telemetry.goldSpentByCategory?.[pid];
      if (!cat) continue;
      spendTotal += cat.cards + cat.relics + cat.removals;
      removalSpend += cat.removals;
    }
  }
  const earnedTotal = Object.values(earnedBySource).reduce((a, b) => a + b, 0);
  const residual = sum((r) => r.telemetry.goldResidual ?? 0);
  const remP1 = sum((r) => r.telemetry.removalsByPlayer?.p1 ?? 0);
  const remP2 = sum((r) => r.telemetry.removalsByPlayer?.p2 ?? 0);
  console.log(
    `gold: mean income/run ${(earnedTotal / n).toFixed(1)} (${JSON.stringify(earnedBySource)}) | mean residual ${(residual / n).toFixed(1)} | ` +
    `removals/player/run p1 ${(remP1 / n).toFixed(2)} / p2 ${(remP2 / n).toFixed(2)} | removal spend ${spendTotal ? ((100 * removalSpend) / spendTotal).toFixed(1) : 0}% of total spend`,
  );
  const ringDiscounts = sum((r) => r.telemetry.ringDiscountsFired ?? 0);
  if (ringDiscounts > 0) console.log(`Pulsekeeper's Ring discounts fired: ${ringDiscounts}`);

  // ---- S7.8 rites readouts ---------------------------------------------------
  // Printed ONLY when rites telemetry exists (TB_RITES batteries) — unflagged
  // batteries keep a byte-identical summary (aggregate-human.mjs mirrors it).
  const riteRuns = results.filter((r) => r.telemetry.rites);
  if (riteRuns.length > 0) {
    const deathCounts: Record<string, number> = {};
    let deathPicks = 0;
    const birthActs: number[] = [];
    const birthLayers: number[] = [];
    const birthPicked: Record<PlayerId, number> = { p1: 0, p2: 0 };
    let charEvents = 0;
    for (const r of riteRuns) {
      const t = r.telemetry.rites!;
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const death = t.deathPick[pid];
        if (death) { deathCounts[death] = (deathCounts[death] ?? 0) + 1; deathPicks++; }
        if (t.birthPick[pid]) birthPicked[pid]++;
        const bt = t.birthTiming[pid];
        if (bt) { birthActs.push(bt.act); birthLayers.push(bt.layer); }
        charEvents += t.characterEvents[pid] ?? 0;
      }
    }
    const median = (xs: number[]): string => {
      if (xs.length === 0) return 'n/a';
      const s = [...xs].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return String(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
    };
    // Telemetry records PICKS, not offers; each rite reaches ~50% of a seat's
    // offers (2 of the role's 4), so shares are of picks — the <10%/>60%
    // tuning thresholds (S8.1) are applied to that share and labeled FLAG.
    const dist = Object.entries(deathCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => {
        const share = (100 * count) / deathPicks;
        return `${id} ${count} (${share.toFixed(0)}%${share < 10 || share > 60 ? ' FLAG' : ''})`;
      })
      .join(', ');
    console.log('---------------- S7.8 RITES READOUTS ----------------');
    console.log(`death-rite picks: ${deathPicks} — ${dist || 'none'}  (shares of picks; FLAG = <10% or >60% tuning threshold)`);
    console.log(
      `birth picks: p1 ${birthPicked.p1}/${riteRuns.length} runs (${((100 * birthPicked.p1) / riteRuns.length).toFixed(0)}%), ` +
      `p2 ${birthPicked.p2}/${riteRuns.length} (${((100 * birthPicked.p2) / riteRuns.length).toFixed(0)}%) | ` +
      `median timing act ${median(birthActs)}, layer ${median(birthLayers)}`,
    );
    console.log(`character events taken/run: ${(charEvents / riteRuns.length).toFixed(2)}`);
    console.log(`Reclaim attempts (threadSpendByKind.reclaim): ${spendMix.reclaim ?? 0}`);
    // S9d gate 3 instrument: mean realized growth per rite across the runs
    // where it was PICKED (an axis nobody feeds is a dead archetype).
    const growthSum: Record<string, number> = {};
    const growthRuns: Record<string, number> = {};
    for (const r of riteRuns) {
      const t = r.telemetry.rites!;
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        const death = t.deathPick[pid];
        if (!death) continue;
        const cardId = death.replace(/^dr_/, 'rite_');
        growthRuns[cardId] = (growthRuns[cardId] ?? 0) + 1;
        growthSum[cardId] = (growthSum[cardId] ?? 0) + (t.growth?.[cardId] ?? 0);
      }
    }
    const growthLine = Object.entries(growthRuns)
      .sort()
      .map(([id, n]) => `${id} ${(growthSum[id] / n).toFixed(1)} (n=${n})`)
      .join(', ');
    console.log(`S9d mean realized growth/pick: ${growthLine || 'none'}`);
  }
  // S11.3 fragment-supply readout (D2 instruments): distinct eliminations
  // and bound-witness fragments per flagged run
  const truthRuns = results.filter((r) => r.telemetry.truth);
  if (truthRuns.length > 0) {
    const mean = (f: (t: NonNullable<RunResult['telemetry']['truth']>) => number): string =>
      (truthRuns.reduce((a, r) => a + f(r.telemetry.truth!), 0) / truthRuns.length).toFixed(2);
    console.log(
      `S11.3 fragment supply: distinct eliminations/run ${mean((t) => t.distinctEliminations ?? 0)}, ` +
      `bound-witness fragments/run ${mean((t) => t.boundWitnessFragments ?? 0)}, ` +
      `fragments/run ${mean((t) => t.fragmentsByPlayer.p1 + t.fragmentsByPlayer.p2)}`,
    );
    // OQ#57: the real provability instrument (target ~1 confident + 1
    // narrowed gamble at typical routing)
    console.log(
      `S11.3 questions provable/run: confident ${mean((t) => t.questionsConfident ?? 0)}, ` +
      `narrowed gambles ${mean((t) => t.questionsNarrowed ?? 0)}`,
    );
  }
  // ---- S13.1c economy telemetry -----------------------------------------------
  // Per-act pick take/skip rate per seat + per-act relic and deck growth —
  // the per-act split closes the run-length confound the S12 brief flagged
  // (winners see more screens; end-of-run counts conflate rate with length).
  {
    const acts = [...new Set(results.flatMap((r) => [
      ...Object.keys(r.telemetry.economy?.picks ?? {}),
      ...Object.keys(r.telemetry.economy?.relicsByAct ?? {}),
      ...Object.keys(r.telemetry.economy?.deckAddsByAct ?? {}),
    ]))].map(Number).sort((a, b) => a - b);
    console.log('---------------- S13.1c ECONOMY (per act) ----------------');
    for (const act of acts) {
      const seat = (pid: PlayerId): string => {
        const taken = sum((r) => r.telemetry.economy?.picks?.[act]?.[pid]?.taken ?? 0);
        const skipped = sum((r) => r.telemetry.economy?.picks?.[act]?.[pid]?.skipped ?? 0);
        const offers = taken + skipped;
        const adds = sum((r) => r.telemetry.economy?.deckAddsByAct?.[act]?.[pid] ?? 0);
        const removes = sum((r) => r.telemetry.economy?.deckRemovalsByAct?.[act]?.[pid] ?? 0);
        return `${pid} take ${offers ? ((100 * taken) / offers).toFixed(0) : 'n/a'}% (${taken}/${offers})` +
          ` deck +${(adds / n).toFixed(2)}/−${(removes / n).toFixed(2)}`;
      };
      const relics = sum((r) => r.telemetry.economy?.relicsByAct?.[act] ?? 0);
      console.log(`  act ${act}: ${seat('p1')} | ${seat('p2')} | relics/run ${(relics / n).toFixed(2)}`);
    }
  }
  // OQ#59 economy instruments: do wins ride relics or card growth? Split by
  // outcome so the winning build's shape is visible directly.
  {
    const wins = results.filter((r) => r.outcome === 'victory');
    const losses = results.filter((r) => r.outcome !== 'victory');
    const m = (rs: typeof results, f: (r: RunResult) => number): string =>
      rs.length > 0 ? (rs.reduce((a, r) => a + f(r), 0) / rs.length).toFixed(1) : 'n/a';
    console.log(
      `OQ#59 economy: relics/run wins ${m(wins, (r) => r.relicsEnd ?? 0)} vs losses ${m(losses, (r) => r.relicsEnd ?? 0)}` +
      ` | deck/run wins ${m(wins, (r) => r.deckEnd ?? 0)} vs losses ${m(losses, (r) => r.deckEnd ?? 0)}` +
      ` | combats/run wins ${m(wins, (r) => r.combatsWon)} vs losses ${m(losses, (r) => r.combatsWon)}`,
    );
  }
  // OQ#57: rite-card play rate, the real S9c gate-2 measure
  const ritePlayRuns = results.filter((r) => r.telemetry.rites?.ritePlays);
  if (ritePlayRuns.length > 0) {
    const plays = ritePlayRuns.reduce(
      (a, r) => a + r.telemetry.rites!.ritePlays!.p1 + r.telemetry.rites!.ritePlays!.p2, 0);
    const combats = ritePlayRuns.reduce((a, r) => a + r.combatsWon, 0);
    console.log(
      `S9c rite-card play rate: ${(plays / ritePlayRuns.length).toFixed(1)} plays/run` +
      ` (${combats > 0 ? (plays / combats).toFixed(2) : 'n/a'} per combat won, n=${ritePlayRuns.length} runs)`,
    );
  }

  // S11.2 calibration gate: pair HP cost per elite fight, keyed by kill
  // order — the act's LAST-killed knot must cost >=2x its first-killed.
  const byOrder: Record<number, { hp: number; n: number }> = {};
  for (const r of results) {
    for (const f of r.telemetry.eliteFights ?? []) {
      (byOrder[f.order] ??= { hp: 0, n: 0 });
      byOrder[f.order].hp += f.hpLost;
      byOrder[f.order].n++;
    }
  }
  const orders = Object.keys(byOrder).map(Number).sort((a, b) => a - b);
  if (orders.length > 0) {
    const line = orders.map((o) => `kill ${o + 1}: ${(byOrder[o].hp / byOrder[o].n).toFixed(1)} HP (n=${byOrder[o].n})`).join(' | ');
    const first = byOrder[orders[0]];
    const last = byOrder[orders[orders.length - 1]];
    const ratio = (last.hp / last.n) / Math.max(1e-9, first.hp / first.n);
    // S18-D4 (ruled 2026-07-06): the ≥2 aspiration is RE-DERIVED to a ≥1.2
    // regression floor — braid paths meet at most TWO knots per act by
    // construction (S16-STATUS Part 6), so last/first is a knot-2/knot-1
    // ratio with a structural ceiling ~1.8 even for a sub-pool of one; the
    // floor protects the escalation that exists (S16-D4's 1.08→1.2+).
    console.log(`S11.2 escalation calibration: ${line} — knot-2/knot-1 ratio ${ratio.toFixed(2)} (S18-D4 regression floor: >=1.2 on the probe leg)`);
  }
  console.log('---------------- GATES ----------------');
  let allPass = true;
  for (const g of gates) {
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.name}  →  ${g.value}`);
    if (!g.pass) allPass = false;
  }
  console.log(allPass ? 'ALL GATES PASS' : 'GATES PENDING PART A RECALIBRATION — do not tune off this number before the human-uplift bands exist (M3 Part A)');
  console.log('===============================================================');
}

// ---------------------------------------------------------------------------
// S19.1 solo report — REPORTED, not banded (presence/shape reads only)
// ---------------------------------------------------------------------------

/** median over a possibly-empty list, formatted */
function medianOf(xs: number[]): string {
  if (xs.length === 0) return 'n/a';
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return String(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

export function printSoloReport(results: RunResult[]): void {
  const n = Math.max(1, results.length);
  console.log('\n================ S19.1 SOLO BATTERY (REPORTED — WS transport, no bands; S14-R5/S16 jitter law governs) ================');
  const victories = results.filter((r) => r.outcome === 'victory').length;
  console.log(`runs: ${results.length}  |  win% ${((100 * victories) / n).toFixed(0)}%  |  human seat p1 (${PAIR_CHARS.p1}, headless sim policy) | bot seat p2 (${PAIR_CHARS.p2}, server solo driver)`);

  // thread verbs per seat per kind — the D1 attribution surface
  const verbs: Record<PlayerId, Record<string, number>> = { p1: {}, p2: {} };
  for (const r of results) {
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      for (const [kind, c] of Object.entries(r.solo?.verbs?.[pid] ?? {})) {
        verbs[pid][kind] = (verbs[pid][kind] ?? 0) + c;
      }
    }
  }
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const row = ['pulse', 'reclaim', 'sever', 'steady']
      .map((k) => `${k} ${((verbs[pid][k] ?? 0) / n).toFixed(2)}`)
      .join(' | ');
    console.log(`thread verbs/run ${pid}${pid === 'p2' ? ' (solo partner)' : ''}: ${row}`);
  }
  console.log(`bot reclaims/run: ${((verbs.p2.reclaim ?? 0) / n).toFixed(2)} (pre-S19: 0 by construction — the D1 presence read)`);

  // per-pool Witness line counts + exhaustion — the D5 line-budget instrument.
  // Pool membership is exact: witnessSaid tracks raw templates.
  console.log('---------------- WITNESS SOLO POOLS (lines/run, exhaustion) ----------------');
  for (const key of Object.keys(SOLO_WITNESS)) {
    const lines = new Set(witnessPoolLines(key));
    const size = lines.size;
    let fired = 0;
    let runsWithAny = 0;
    let exhausted = 0;
    const exhaustActs: number[] = [];
    const exhaustTurns: number[] = [];
    for (const r of results) {
      const marks = (r.solo?.witness ?? []).filter((m) => lines.has(m.t));
      fired += marks.length;
      if (marks.length > 0) runsWithAny++;
      if (marks.length >= size && size > 0) {
        exhausted++;
        exhaustActs.push(marks[marks.length - 1].act);
        exhaustTurns.push(marks[marks.length - 1].turn);
      }
    }
    console.log(
      `  pool ${key.padEnd(22)} size ${String(size).padStart(2)} | lines/run ${(fired / n).toFixed(2)} | ` +
      `runs touched ${runsWithAny}/${results.length} | EXHAUSTED in ${exhausted} runs` +
      (exhausted > 0 ? ` (median exhaust: act ${medianOf(exhaustActs)}, turn ${medianOf(exhaustTurns)})` : '') +
      (key === 'solo_greeting' || key.startsWith('hint_') ? '  [client-drawn — engine never fires it]' : ''),
    );
  }
  console.log('exhaustion law: exhausted pools go silent (never echo) — an always-fire pool exhausting before the act-2 boss is the D5 sizing failure shape');
  console.log('===============================================================');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const child = SHARD_CHILD !== undefined;
  if (!child) {
    // S16.0a/b: the transport and the shard boundary are LOUD, always — a
    // battery is uninterpretable without knowing which instrument ran it
    console.log(SOLO
      ? 'sim: mode SOLO BATTERY (S19.1) — human seat = headless sim policy, partner = SERVER SoloBotDriver over the real WS transport; every row REPORTED, never banded'
      : SOCKET
      ? 'sim: transport WEBSOCKET (TB_SIM_SOCKET=1) — the protocol/covenant instrument; S14-R5 noise law governs every row'
      : 'sim: transport SOCKET-FREE (S16.0a) — deterministic per seed; TB_SIM_SOCKET=1 restores the wire');
    console.log(`sim: ${RUNS} runs, seed set ${BASE_SEED + RUN_OFFSET + 1}..${BASE_SEED + RUN_OFFSET + RUNS}`);
    console.log(SHARDS > 1
      ? `sim: shards ${SHARDS} (TB_SIM_SHARDS; forked workers, contiguous seed partition, pooled in canonical run order)`
      : 'sim: shards 1 (in-process)');
    // S3.1 run header: a batch is uninterpretable without the difficulty on record
    // S4.4: the rung joins the scales in the header — a batch is uninterpretable without both
    console.log(`sim: enemy scales hp ${PT1_ENEMY_HP_SCALE} / dmg ${PT1_ENEMY_DMG_SCALE}  |  pair ${PAIR_CHARS.p1}/${PAIR_CHARS.p2}  |  ascension A${ASCEND}`);
    // S13.1a/b: a batch is uninterpretable without its economy knobs on record
    const knobLine = [
      SKIP_PICKS ? 'SKIP_PICKS' : null,
      PICK_CAP !== undefined ? `PICK_CAP=${PICK_CAP}` : null,
      process.env.TB_NO_RELICS === '1' ? 'NO_RELICS' : null,
      process.env.TB_UPGRADE_ALL === '1' ? 'UPGRADE_ALL' : null,
      ALL_KNOTS ? 'ALL_KNOTS' : null, // S15.3 probe leg — loud on record
      DRAFT_V2 ? null : 'DRAFT_V1', // v2 is the default; the DEVIATION is what's loud
    ].filter(Boolean).join(' ');
    console.log(`sim: economy knobs ${knobLine || '(none — base config)'}  |  draft policy ${DRAFT_V2 ? 'v2' : 'v1'}`);
    if (ITEMS) console.log('sim: TB_SIM_ITEMS=1 — per-run item rows on (S17 pre-audit; additive only)');
  }

  let played: Played[];
  if (!child && SHARDS > 1) {
    played = await playAllSharded();
  } else if (SOLO || SOCKET) {
    // S19.1: solo batteries ride the WS path by construction — the subject
    // under measurement IS the server's solo driver over the real transport
    played = await playAllWs(!child);
  } else {
    played = playAllLocal(!child);
  }

  if (child) {
    // machine rows only — the parent owns the canonical battery output.
    // stdout here is a PIPE: writes are async, and process.exit() would
    // truncate them mid-row (the bug read as "shards losing runs") — flush
    // first, then exit.
    for (const p of played.sort((a, b) => a.run - b.run)) {
      process.stdout.write(`${RESULT_MARK}${JSON.stringify(p)}\n`);
    }
    process.stdout.write('', () => process.exit(process.exitCode ?? 0));
    return;
  }

  // canonical pooled order: by run index — makes the pooled summary (and, on
  // the socket-free path, the entire stdout) independent of shard count and
  // completion timing (S16.0c: N shards ≡ 1 shard, pinned)
  played.sort((a, b) => a.run - b.run);
  if (SHARDS > 1) for (const p of played) console.log(runLine(p));
  if (ITEMS) for (const p of played) console.log(itemsLine(p)); // additive rows, canonical order
  printSummary(played.map((p) => p.result));
  if (SOLO) printSoloReport(played.map((p) => p.result));
  if (SOLO || SOCKET) {
    // the WS server may hold the loop open — flush stdout, then hard-exit
    process.stdout.write('', () => process.exit(process.exitCode ?? 0));
  }
  // socket-free: no open handles — exit naturally so piped stdout drains
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
