// S11.1 — standalone composition CI (the vitest twin lives in
// packages/engine/test/map-composition.test.ts; this runner is for CI
// pipelines and quick local sweeps). Replaces the old TB_MAP_LAYERS
// experiment script of the same name (git history keeps it).
// Exit 1 on any violation.
// Usage: node scripts/map-composition.js [N-seeds-per-config]
const { generateActMap } = require('../packages/engine/dist/map.js');
const { measureAct, compositionViolations } = require('../packages/engine/dist/map-composition.js');
const { EVENTS } = require('../packages/engine/dist/content/registry.js');

const N = Number(process.argv[2] ?? 300);
const CHARS = ['vess', 'bram'];
// S11.5: armed PER ACT (both ruled flags sit in act 2)
const highStakesFor = (act) =>
  Object.values(EVENTS).some((e) => e.highStakes && (e.act === act || e.act === 0));

let bad = 0;
for (const [act, extra] of [[1, false], [2, false], [1, true], [2, true]]) {
  const label = `act${act}${extra ? '+extraElite' : ''}`;
  let violations = 0;
  const tally = { elites: 0, shops: 0, treasures: 0, events: 0 };
  for (let i = 0; i < N; i++) {
    const { map } = generateActMap(90_000 + i * 13, act, extra, true, [], CHARS);
    const c = measureAct(map);
    tally.elites += c.eliteCount;
    tally.shops += c.shops;
    tally.treasures += c.treasures;
    tally.events += map.nodes.filter((n) => n.kind === 'event').length;
    const v = compositionViolations(c, extra ? 3 : 2, { charactersInRun: CHARS, highStakesContentExists: highStakesFor(act) });
    if (v.length) {
      violations += v.length;
      if (violations <= 3) console.error(`  ${label} seed ${90_000 + i * 13}: ${v.join(' | ')}`);
    }
  }
  console.log(
    `${label}: ${violations === 0 ? 'PASS' : `FAIL (${violations} violations)`} — ` +
    `avg elites ${(tally.elites / N).toFixed(1)}, shops ${(tally.shops / N).toFixed(2)}, ` +
    `treasures ${(tally.treasures / N).toFixed(2)}, events ${(tally.events / N).toFixed(2)}`,
  );
  if (violations > 0) bad++;
}
process.exit(bad > 0 ? 1 : 0);
