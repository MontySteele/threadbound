// Bot simulation + M2 telemetry gates (M2 Part C): paired bots play full runs
// through the real server/WS protocol. Usage: node dist/sim.js [runs]
//
// Sign-off gates (50-run sim, greedy policy):
//   - full-run bot win rate ≤ 40%
//   - avg player HP lost per Act 1 combat ≥ 8
//   - link-fire rate: Act 1 ≥ 30%, Act 2 within 40–60%
//   - no single tag > 50% of resonance-streak cards
//   - Hex damage share (incl. HexScaling) 20–30%

process.env.PORT = process.env.PORT ?? '0';
process.env.PERSIST = ''; // sims never persist rooms

import { server } from '@threadbound/server';
import { PT1_ENEMY_HP_SCALE, PT1_ENEMY_DMG_SCALE, PlayerId } from '@threadbound/engine';
import { Bot, RunResult } from './bot';

const RUNS = Number(process.argv[2] ?? 50);
const BASE_SEED = Number(process.env.SEED ?? 1000); // fixed seed set → reproducible gates
const RUN_TIMEOUT_MS = 300_000;

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

function port(): number {
  const addr = server.address();
  if (typeof addr === 'object' && addr) return addr.port;
  throw new Error('server not listening');
}

async function playRun(url: string, runSeed: number): Promise<RunResult> {
  let code = '';
  const a = new Bot(url, { create: true, onCode: (c) => (code = c), seed: runSeed * 3 + 1, startSeed: runSeed, characters: PAIR_CHARS, ascension: ASCEND });
  await new Promise((r) => setTimeout(r, 150));
  const b = new Bot(url, { joinCode: code, seed: runSeed * 3 + 2, ascension: ASCEND });
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

  const results: RunResult[] = [];
  for (let run = 1; run <= RUNS; run++) {
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
      break;
    }
  }

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

  const gates: Gate[] = [
    { name: 'full-run bot win rate ≤ 40%', value: `${winRate.toFixed(0)}%`, pass: winRate <= 40 },
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
