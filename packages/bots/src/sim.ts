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

import { server } from '@threadbound/server';
import { Bot, RunResult } from './bot';

const RUNS = Number(process.argv[2] ?? 50);
const RUN_TIMEOUT_MS = 300_000;

function port(): number {
  const addr = server.address();
  if (typeof addr === 'object' && addr) return addr.port;
  throw new Error('server not listening');
}

async function playRun(url: string): Promise<RunResult> {
  let code = '';
  const a = new Bot(url, { create: true, onCode: (c) => (code = c) });
  await new Promise((r) => setTimeout(r, 150));
  const b = new Bot(url, { joinCode: code });
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
  console.log(`sim: bots connecting to ${url}, ${RUNS} runs`);

  const results: RunResult[] = [];
  for (let run = 1; run <= RUNS; run++) {
    try {
      const r = await playRun(url);
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
    { name: 'Hex damage share 20–30%', value: `${hexShare.toFixed(1)}%`, pass: hexShare >= 20 && hexShare <= 30 },
  ];

  console.log('\n================ TELEMETRY SUMMARY (M2 Part C) ================');
  console.log(`runs: ${results.length}  |  victories: ${victories} (${winRate.toFixed(0)}%)  |  combats won: ${sum((r) => r.combatsWon)}`);
  console.log(`furthest acts: ${JSON.stringify(results.reduce((m, r) => ((m[r.act] = (m[r.act] ?? 0) + 1), m), {} as Record<number, number>))}`);
  console.log(`turns: ${sum((r) => r.telemetry.turns)}  |  cards played: ${cards}  |  overall link-fire: ${cards ? ((100 * links) / cards).toFixed(1) : 0}%`);
  console.log(`act 1: ${act1.combats} combats, link-fire ${act1LinkRate.toFixed(1)}%, HP lost/combat ${hpPerA1Combat.toFixed(1)}`);
  console.log(`act 2: ${act2.combats} combats, link-fire ${act2LinkRate.toFixed(1)}%`);
  console.log(`Resonance ignitions: ${resonances}  |  streak tags: ${JSON.stringify(resonanceTags)}`);
  console.log(`damage by tag: ${JSON.stringify(damageByTag)}  |  Hex share: ${hexShare.toFixed(1)}%`);
  console.log('---------------- GATES ----------------');
  let allPass = true;
  for (const g of gates) {
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.name}  →  ${g.value}`);
    if (!g.pass) allPass = false;
  }
  console.log(allPass ? 'ALL GATES PASS' : 'GATES FAILING — tune per M2 Part C order of operations');
  console.log('===============================================================');
  server.close();
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
