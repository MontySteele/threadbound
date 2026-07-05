// Bot simulation + M2 telemetry gates (M2 Part C): paired bots play full runs
// through the real server/WS protocol. Usage: node dist/sim.js [runs]
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

process.env.PORT = process.env.PORT ?? '0';
process.env.PERSIST = ''; // sims never persist rooms
// S6.2: bot runs finish in seconds, so a battery creates rooms far faster
// than any human IP legitimately could — lift the harness's own limit
process.env.TB_ROOM_RATE = process.env.TB_ROOM_RATE ?? '100000';

import { server } from '@threadbound/server';
import { PT1_ENEMY_HP_SCALE, PT1_ENEMY_DMG_SCALE, PlayerId, CARDS, ALL_RELICS } from '@threadbound/engine';
import { Bot, RunResult } from './bot';

const RUNS = Number(process.argv[2] ?? 50);
const BASE_SEED = Number(process.env.SEED ?? 1000); // fixed seed set → reproducible gates
// Comfort-pass checklist item 2: rites + L7 maps lengthen runs, and a timeout
// mid-battery poisons the win-rate read — env-overridable for long batteries
const RUN_TIMEOUT_MS = Math.max(10_000, Number(process.env.TB_RUN_TIMEOUT_MS ?? 300_000) || 300_000);

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

function port(): number {
  const addr = server.address();
  if (typeof addr === 'object' && addr) return addr.port;
  throw new Error('server not listening');
}

async function playRun(url: string, runSeed: number): Promise<RunResult> {
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

interface Gate {
  name: string;
  value: string;
  pass: boolean;
}

async function main(): Promise<void> {
  await new Promise<void>((r) => (server.listening ? r() : server.once('listening', () => r())));
  const url = `ws://localhost:${port()}`;
  console.log(`sim: bots connecting to ${url}, ${RUNS} runs, seed set ${BASE_SEED}+ (engine + policy seeded; socket timing still jitters slightly)`);
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

  const results: RunResult[] = [];
  // Comfort pass: bounded-concurrency pool (TB_SIM_CONC, default 8). Each run
  // is its own room + seeds, so runs are independent; aggregation is
  // order-independent. Sequential behavior: TB_SIM_CONC=1.
  const CONC = Math.max(1, Number(process.env.TB_SIM_CONC ?? 8) || 8);
  let nextRun = 1;
  let failed = false;
  async function worker(): Promise<void> {
    while (!failed) {
      const run = nextRun++;
      if (run > RUNS) return;
      try {
        const r = await playRun(url, BASE_SEED + run);
        results.push(r);
        console.log(
          `run ${run}: ${r.outcome} in act ${r.act} — combats won ${r.combatsWon}, ` +
          `turns ${r.telemetry.turns}, cards ${r.telemetry.cardsPlayed}, links ${r.telemetry.linksFired}`,
        );
      } catch (err) {
        console.error(`run ${run}: FAILED — ${err}`);
        process.exitCode = 1;
        failed = true;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, RUNS) }, () => worker()));

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

  // S14-R1: the win-rate band binds vb at A0 on the DEFAULT topology only —
  // the 25–35/≤40 bands were calibrated to draft-v1 bots that no longer
  // exist. Mirrors and braid rows are reported, not banded; human data
  // rules at the next playtest (OQ#14).
  const KNOT = process.env.TB_KNOTWORK === '1';
  const r1Banded = PAIR === 'vb' && ASCEND === 0 && !KNOT;
  const gates: Gate[] = [
    r1Banded
      ? { name: 'vb win rate 40–55% at A0 default topology (S14-R1)', value: `${winRate.toFixed(0)}%`, pass: winRate >= 40 && winRate <= 55 }
      : { name: `win rate (reported, not banded — S14-R1: ${PAIR}${KNOT ? ' braid' : ''} A${ASCEND})`, value: `${winRate.toFixed(0)}%`, pass: true },
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
    console.log(`S11.2 escalation calibration: ${line} — last/first ratio ${ratio.toFixed(2)} (gate >=2 needs steepening if unmet)`);
  }
  console.log('---------------- GATES ----------------');
  let allPass = true;
  for (const g of gates) {
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.name}  →  ${g.value}`);
    if (!g.pass) allPass = false;
  }
  console.log(allPass ? 'ALL GATES PASS' : 'GATES PENDING PART A RECALIBRATION — do not tune off this number before the human-uplift bands exist (M3 Part A)');
  console.log('===============================================================');
  server.close();
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
