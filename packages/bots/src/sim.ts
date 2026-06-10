// Bot simulation + balance telemetry (§11, §13): runs paired bots through the
// real server/WS protocol until N combats have been played, then prints the
// telemetry summary. Usage: node dist/sim.js [minCombats]
//
// Design target check: links fire on 40–60% of played cards in a coordinated game.

process.env.PORT = process.env.PORT ?? '0';

import { server } from '@threadbound/server';
import { Bot, RunResult } from './bot';

const MIN_COMBATS = Number(process.argv[2] ?? 50);
const RUN_TIMEOUT_MS = 120_000;

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
    return ra; // both bots see the same authoritative telemetry
  } finally {
    a.ws.close();
    b.ws.close();
  }
}

async function main(): Promise<void> {
  await new Promise<void>((r) => (server.listening ? r() : server.once('listening', () => r())));
  const url = `ws://localhost:${port()}`;
  console.log(`sim: bots connecting to ${url}`);

  const results: RunResult[] = [];
  let combats = 0;
  let runs = 0;
  while (combats < MIN_COMBATS && runs < MIN_COMBATS * 2) {
    runs++;
    try {
      const r = await playRun(url);
      results.push(r);
      const runCombats = r.combatsWon + (r.outcome === 'game_over' && r.telemetry.turns > 0 ? 1 : 0);
      combats += Math.max(runCombats, 1);
      console.log(
        `run ${runs}: ${r.outcome} at node ${r.nodeIndex} — combats won ${r.combatsWon}, ` +
        `turns ${r.telemetry.turns}, cards ${r.telemetry.cardsPlayed}, links ${r.telemetry.linksFired}`,
      );
    } catch (err) {
      console.error(`run ${runs}: FAILED — ${err}`);
      process.exitCode = 1;
      break;
    }
  }

  // ---- telemetry summary (§13) ----
  const sum = <T>(f: (r: RunResult) => number) => results.reduce((acc, r) => acc + f(r), 0);
  const victories = results.filter((r) => r.outcome === 'victory').length;
  const cards = sum((r) => r.telemetry.cardsPlayed);
  const links = sum((r) => r.telemetry.linksFired);
  const resonances = sum((r) => r.telemetry.resonances);
  const damageByTag: Record<string, number> = {};
  const resonanceTags: Record<string, number> = {};
  for (const r of results) {
    for (const [tag, dmg] of Object.entries(r.telemetry.damageByTag)) damageByTag[tag] = (damageByTag[tag] ?? 0) + dmg;
    for (const [tag, n] of Object.entries(r.telemetry.resonanceTagCounts)) resonanceTags[tag] = (resonanceTags[tag] ?? 0) + n;
  }
  const linkRate = cards ? ((100 * links) / cards) : 0;

  console.log('\n================ TELEMETRY SUMMARY ================');
  console.log(`runs: ${results.length}  |  full-run win rate: ${((100 * victories) / Math.max(1, results.length)).toFixed(0)}%`);
  console.log(`combats played: ~${combats}  |  combats won: ${sum((r) => r.combatsWon)}`);
  console.log(`turns: ${sum((r) => r.telemetry.turns)}  |  cards played: ${cards}`);
  console.log(`link-fire rate: ${linkRate.toFixed(1)}% of played cards  (design target 40–60%, §11)`);
  console.log(`Resonance ignitions: ${resonances}`);
  console.log(`Resonance streak tag diversity (§13.2): ${JSON.stringify(resonanceTags)}`);
  console.log(`damage by tag: ${JSON.stringify(damageByTag)}`);
  if (linkRate < 40 || linkRate > 60) {
    console.log(`NOTE: link-fire rate is outside the 40–60% design band — tuning flag (§13).`);
  }
  console.log('===================================================');
  server.close();
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
