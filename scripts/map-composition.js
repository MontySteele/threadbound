// Experiment: map composition vs LAYERS. Run with TB_MAP_LAYERS=N.
// Reports per act: mean event nodes on map, mean max-events-on-one-path
// (routing ceiling), mean nodes per path, and rest/treasure supply.
const { generateActMap } = require('../packages/engine/dist/map.js');

const N = 1000;
const layers = process.env.TB_MAP_LAYERS ?? '6';

function maxKindOnPath(map, kind) {
  // DP over edges: best count of `kind` reachable ending at each node
  const best = new Map();
  const nodes = map.nodes;
  const byLayer = [...nodes].sort((a, b) => a.layer - b.layer);
  for (const n of byLayer) {
    const self = n.kind === kind ? 1 : 0;
    if (n.layer === 0) best.set(n.id, self);
  }
  for (const n of byLayer) {
    const b = best.get(n.id);
    if (b === undefined) continue;
    for (const e of n.edges) {
      const t = nodes.find((x) => x.id === e);
      const val = b + (t.kind === kind ? 1 : 0);
      if ((best.get(e) ?? -1) < val) best.set(e, val);
    }
  }
  let max = 0;
  for (const n of nodes) if (n.edges.length === 0) max = Math.max(max, best.get(n.id) ?? 0);
  return max;
}

for (const act of [1, 2]) {
  let ev = 0, evPath = 0, rests = 0, treas = 0, combats = 0, elites = 0, total = 0;
  let rng = 42;
  for (let i = 0; i < N; i++) {
    const r = generateActMap(rng + i * 7919, act, false, false);
    const m = r.map;
    ev += m.nodes.filter((n) => n.kind === 'event').length;
    rests += m.nodes.filter((n) => n.kind === 'rest').length;
    treas += m.nodes.filter((n) => n.kind === 'treasure').length;
    combats += m.nodes.filter((n) => n.kind === 'combat').length;
    elites += m.nodes.filter((n) => n.kind === 'elite').length;
    total += m.nodes.length;
    evPath += maxKindOnPath(m, 'event');
  }
  console.log(
    `LAYERS=${layers} act ${act}: nodes/map ${(total / N).toFixed(1)} | events/map ${(ev / N).toFixed(2)} | ` +
    `max events on one path ${(evPath / N).toFixed(2)} | rests/map ${(rests / N).toFixed(2)} | ` +
    `treasure/map ${(treas / N).toFixed(2)} | combats/map ${(combats / N).toFixed(2)} | elites ${(elites / N).toFixed(1)}`
  );
}
