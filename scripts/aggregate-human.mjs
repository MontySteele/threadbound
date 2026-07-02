#!/usr/bin/env node
// S6.4: aggregate a directory of per-run human telemetry files into the SAME
// summary the sim harness prints (packages/bots/src/sim.ts — the format is
// mirrored line-for-line, including the gate readout, so every existing band
// can be checked against human data directly; sim.ts runs inside the bots
// workspace against a live server, so the printer is mirrored here rather
// than imported). Groups by buildSha (S6.1 — human data pools across
// patches), plus human-only lines: runs/installId, completion rate, median
// run minutes.
//
// Usage: node scripts/aggregate-human.mjs <telemetry-dir> [--pair vb|vv|bb]
//        [--ascension N] [--mode pair|solo|all]

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!dir || !fs.existsSync(dir)) {
  console.error('usage: node scripts/aggregate-human.mjs <telemetry-dir> [--pair vb|vv|bb] [--ascension N] [--mode pair|solo|all]');
  process.exit(1);
}
const PAIR = flag('pair');            // filter: vb | vv | bb (order-insensitive)
const ASCEND = flag('ascension');     // filter: rung
const MODE = flag('mode') ?? 'all';   // pair | solo | all

const pairOf = (r) => {
  const c = [r.characters?.p1?.[0] ?? '?', r.characters?.p2?.[0] ?? '?'].sort();
  return c.join(''); // 'bv' for vess/bram in either order, 'vv', 'bb'
};
const wantPair = PAIR ? [...PAIR].sort().join('') : null;

// ---- load -------------------------------------------------------------------
const runs = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith('run-') || !f.endsWith('.json')) continue;
  try {
    runs.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  } catch {
    console.error(`skipping unreadable ${f}`);
  }
}
const startLines = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith('starts-') || !f.endsWith('.jsonl')) continue;
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { startLines.push(JSON.parse(line)); } catch { /* torn line */ }
  }
}
// review fix: a mid-run consent opt-out appends { kind: 'retract' } — the
// retracted start must leave the completion-rate denominator (S6.3: the
// residual record no longer counts as a consented run)
const retracted = new Set(startLines.filter((l) => l.kind === 'retract').map((l) => `${l.code}:${l.seed}`));
const starts = startLines.filter((l) => l.kind !== 'retract' && !retracted.has(`${l.code}:${l.seed}`));

const keep = (r) =>
  (MODE === 'all' || (r.mode ?? 'pair') === MODE) &&
  (!wantPair || pairOf(r) === wantPair) &&
  (ASCEND === undefined || (r.ascension ?? 0) === Number(ASCEND));

const filtered = runs.filter(keep);
if (filtered.length === 0) {
  console.log(`no matching runs in ${dir} (${runs.length} total on disk)`);
  process.exit(0);
}

// ---- group by buildSha (S6.1: the default grouping) ---------------------------
const groups = new Map();
for (const r of filtered) {
  const key = r.buildSha ?? 'unstamped';
  (groups.get(key) ?? groups.set(key, []).get(key)).push(r);
}

const sum = (rs, f) => rs.reduce((acc, r) => acc + (f(r) ?? 0), 0);
const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

for (const [sha, results] of [...groups.entries()].sort()) {
  const t = (r) => r.telemetry ?? {};
  const contentVersions = [...new Set(results.map((r) => r.contentVersion ?? '?'))].join('/');
  const scaleSet = [...new Set(results.map((r) => `${r.enemyScales?.hp ?? '?'}/${r.enemyScales?.dmg ?? '?'}`))].join(', ');
  const rungs = [...new Set(results.map((r) => `A${r.ascension ?? 0}`))].join('/');
  const pairs = [...new Set(results.map((r) => `${r.characters?.p1 ?? '?'}/${r.characters?.p2 ?? '?'}`))].join(', ');

  const victories = results.filter((r) => r.outcome === 'victory').length;
  const winRate = (100 * victories) / results.length;
  const cards = sum(results, (r) => t(r).cardsPlayed);
  const links = sum(results, (r) => t(r).linksFired);
  const resonances = sum(results, (r) => t(r).resonances);

  const damageByTag = {};
  const resonanceTags = {};
  const actAgg = {};
  for (const r of results) {
    for (const [tag, dmg] of Object.entries(t(r).damageByTag ?? {})) damageByTag[tag] = (damageByTag[tag] ?? 0) + dmg;
    for (const [tag, n] of Object.entries(t(r).resonanceTagCounts ?? {})) resonanceTags[tag] = (resonanceTags[tag] ?? 0) + n;
    for (const [act, s] of Object.entries(t(r).actStats ?? {})) {
      const a = (actAgg[Number(act)] ??= { cards: 0, links: 0, combats: 0, hpLost: 0 });
      a.cards += s.cardsPlayed; a.links += s.linksFired; a.combats += s.combats; a.hpLost += s.hpLost;
    }
  }

  const detonations = sum(results, (r) => t(r).detonationEvents);
  const detonatedStacks = sum(results, (r) => t(r).detonatedStacks);
  const totalDamage = Object.values(damageByTag).reduce((a, b) => a + b, 0);
  const hexShare = totalDamage ? (100 * ((damageByTag.Hex ?? 0) + (damageByTag.HexScaling ?? 0))) / totalDamage : 0;
  const act1 = actAgg[1] ?? { cards: 0, links: 0, combats: 1, hpLost: 0 };
  const act2 = actAgg[2] ?? { cards: 0, links: 0, combats: 0, hpLost: 0 };
  const act1LinkRate = act1.cards ? (100 * act1.links) / act1.cards : 0;
  const act2LinkRate = act2.cards ? (100 * act2.links) / act2.cards : 0;
  const hpPerA1Combat = act1.combats ? act1.hpLost / act1.combats : 0;
  const totalResTags = Object.values(resonanceTags).reduce((a, b) => a + b, 0);
  const maxResTagShare = totalResTags ? Math.max(...Object.values(resonanceTags)) / totalResTags : 0;

  // the sim's gates, verbatim. review fix: the Hex band gates ONLY data
  // filtered to --pair vb (S5 gate-4 amendment, sim.ts) — unfiltered human
  // data mixes pairs, so its Hex share reads as telemetry, not a gate.
  const hexGated = wantPair === 'bv';
  const gates = [
    { name: 'full-run bot win rate ≤ 40%', value: `${winRate.toFixed(0)}%`, pass: winRate <= 40 },
    { name: 'avg HP lost per Act 1 combat ≥ 8', value: hpPerA1Combat.toFixed(1), pass: hpPerA1Combat >= 8 },
    { name: 'Act 1 link-fire ≥ 30%', value: `${act1LinkRate.toFixed(1)}%`, pass: act1LinkRate >= 30 },
    {
      name: 'Act 2 link-fire 40–60%',
      value: act2.cards ? `${act2LinkRate.toFixed(1)}%` : 'n/a (no Act 2 reached)',
      pass: act2.cards > 0 && act2LinkRate >= 40 && act2LinkRate <= 60,
    },
    { name: 'no tag > 50% of resonance streaks', value: `${(100 * maxResTagShare).toFixed(0)}%`, pass: maxResTagShare <= 0.5 },
    hexGated
      ? { name: 'Hex damage share 25–45% (vb gate, §14.10 + S5)', value: `${hexShare.toFixed(1)}%`, pass: hexShare >= 25 && hexShare <= 45 }
      : { name: `Hex damage share (telemetry only for ${PAIR ?? 'mixed pairs'}, S5 gate-4 amendment)`, value: `${hexShare.toFixed(1)}%`, pass: true },
  ];

  console.log(`\n======== HUMAN TELEMETRY — build ${sha} (content ${contentVersions}) ========`);
  console.log(`filters: pair ${PAIR ?? 'all'} | ascension ${ASCEND ?? 'all'} | mode ${MODE}  |  scales ${scaleSet}  |  rungs ${rungs}  |  pairs ${pairs}`);
  console.log('---------------- TELEMETRY SUMMARY (M2 Part C format) ----------------');
  console.log(`runs: ${results.length}  |  victories: ${victories} (${winRate.toFixed(0)}%)  |  combats fought: ${Object.values(actAgg).reduce((a, s) => a + s.combats, 0)}`);
  console.log(`furthest acts: ${JSON.stringify(results.reduce((m, r) => ((m[r.act] = (m[r.act] ?? 0) + 1), m), {}))}`);
  console.log(`turns: ${sum(results, (r) => t(r).turns)}  |  cards played: ${cards}  |  overall link-fire: ${cards ? ((100 * links) / cards).toFixed(1) : 0}%`);
  console.log(`act 1: ${act1.combats} combats, link-fire ${act1LinkRate.toFixed(1)}%, HP lost/combat ${hpPerA1Combat.toFixed(1)}`);
  console.log(`act 2: ${act2.combats} combats, link-fire ${act2LinkRate.toFixed(1)}%`);
  // Comfort pass mirror (review sweep): per-encounter difficulty attribution,
  // same table as sim.ts incl. the >2x-mean outlier flag (the S10a gate-4
  // read). Printed only when files carry encounterStats — pre-comfort files
  // keep their summary byte-identical.
  {
    const enc = {};
    for (const r of results) {
      for (const [id, s] of Object.entries(t(r).encounterStats ?? {})) {
        const e = (enc[id] ??= { combats: 0, hpLost: 0 });
        e.combats += s.combats; e.hpLost += s.hpLost;
      }
    }
    const rows = Object.entries(enc)
      .map(([id, s]) => ({ id, combats: s.combats, per: s.combats ? s.hpLost / s.combats : 0 }))
      .sort((a, b) => b.per - a.per);
    if (rows.length > 0) {
      const sampled = rows.filter((r) => r.combats >= 5);
      const mean = sampled.length ? sampled.reduce((a, r) => a + r.per, 0) / sampled.length : 0;
      console.log('---------------- HP LOST BY ENCOUNTER (pair HP / combat) ----------------');
      for (const r of rows) {
        const outlier = r.combats >= 5 && mean > 0 && r.per > 2 * mean ? '  !! outlier' : '';
        console.log(`  ${r.id.padEnd(24)} n=${String(r.combats).padStart(3)}  hp/combat ${r.per.toFixed(1)}${outlier}`);
      }
      if (mean > 0) console.log(`  (mean over n>=5 encounters: ${mean.toFixed(1)})`);
    }
  }
  console.log(`Resonance ignitions: ${resonances}  |  streak tags: ${JSON.stringify(resonanceTags)}`);
  console.log(`damage by tag: ${JSON.stringify(damageByTag)}  |  Hex share: ${hexShare.toFixed(1)}%`);
  console.log(`detonations: ${detonations}  |  avg stacks per detonation: ${detonations ? (detonatedStacks / detonations).toFixed(2) : 'n/a'}`);

  // ---- S3.1 per-seat stats ----------------------------------------------------
  const combats = Object.values(actAgg).reduce((a, s) => a + s.combats, 0);
  for (const pid of ['p1', 'p2']) {
    const chars = [...new Set(results.map((r) => r.characters?.[pid] ?? '?'))].join('/');
    const dmg = sum(results, (r) => t(r).damageByPlayer?.[pid]);
    const blk = sum(results, (r) => t(r).blockByPlayer?.[pid]);
    const lf = sum(results, (r) => t(r).linkFiresByPlayer?.[pid]);
    const falls = sum(results, (r) => t(r).fallsByPlayer?.[pid]);
    const covets = sum(results, (r) => t(r).covetsSpent?.[pid]);
    console.log(`${pid} (${chars}): damage ${dmg} | block ${blk} | link-fires ${lf} | falls ${falls} | covets taken from partner ${covets}`);
  }
  const wkPlays = sum(results, (r) => t(r).wornKnife?.plays);
  const wkDamage = sum(results, (r) => t(r).wornKnife?.damage);
  console.log(`Worn Knife: ${wkPlays} plays | mean damage ${wkPlays ? (wkDamage / wkPlays).toFixed(2) : 'n/a'}`);
  const threadSpent = sum(results, (r) => t(r).threadSpent);
  const spendMix = {};
  for (const r of results) {
    for (const [k, n] of Object.entries(t(r).threadSpendByKind ?? {})) spendMix[k] = (spendMix[k] ?? 0) + n;
  }
  const regenWasted = sum(results, (r) => t(r).regenWastedAtCap);
  const forced = sum(results, (r) => t(r).forcedLinkFires);
  const resForced = sum(results, (r) => t(r).resonancesForced);
  console.log(
    `thread: spent/combat ${combats ? (threadSpent / combats).toFixed(2) : 'n/a'} | spend mix ${JSON.stringify(spendMix)} | ` +
    `regen wasted at cap/combat ${combats ? (regenWasted / combats).toFixed(2) : 'n/a'}`,
  );
  console.log(`forced links (Pulse): ${forced} (${links ? ((100 * forced) / links).toFixed(1) : 0}% of fires) | Resonances needing one: ${resForced}/${resonances}`);

  // ---- S4.1 gold economy --------------------------------------------------------
  const n = Math.max(1, results.length);
  const earnedBySource = {};
  let spendTotal = 0;
  let removalSpend = 0;
  for (const r of results) {
    for (const [src, g] of Object.entries(t(r).goldEarnedBySource ?? {})) earnedBySource[src] = (earnedBySource[src] ?? 0) + g;
    for (const pid of ['p1', 'p2']) {
      const cat = t(r).goldSpentByCategory?.[pid];
      if (!cat) continue;
      spendTotal += cat.cards + cat.relics + cat.removals;
      removalSpend += cat.removals;
    }
  }
  const earnedTotal = Object.values(earnedBySource).reduce((a, b) => a + b, 0);
  const residual = sum(results, (r) => t(r).goldResidual);
  const remP1 = sum(results, (r) => t(r).removalsByPlayer?.p1);
  const remP2 = sum(results, (r) => t(r).removalsByPlayer?.p2);
  console.log(
    `gold: mean income/run ${(earnedTotal / n).toFixed(1)} (${JSON.stringify(earnedBySource)}) | mean residual ${(residual / n).toFixed(1)} | ` +
    `removals/player/run p1 ${(remP1 / n).toFixed(2)} / p2 ${(remP2 / n).toFixed(2)} | removal spend ${spendTotal ? ((100 * removalSpend) / spendTotal).toFixed(1) : 0}% of total spend`,
  );
  const ringDiscounts = sum(results, (r) => t(r).ringDiscountsFired);
  if (ringDiscounts > 0) console.log(`Pulsekeeper's Ring discounts fired: ${ringDiscounts}`);

  // ---- S7.8 rites readouts (review sweep: mirrored from sim.ts) -------------------
  // The playtest deploy ships TB_RITES=1, so human files carry telemetry.rites
  // — the death-pick shares (<10%/>60% S8.1 tuning flags), birth pick rate +
  // timing (the gate-4 arbitration data), and reclaim attempts must be
  // readable from human data. Unflagged files keep a byte-identical summary.
  const riteRuns = results.filter((r) => t(r).rites);
  if (riteRuns.length > 0) {
    const deathCounts = {};
    let deathPicks = 0;
    const birthActs = [];
    const birthLayers = [];
    const birthPicked = { p1: 0, p2: 0 };
    let charEvents = 0;
    for (const r of riteRuns) {
      const rt = t(r).rites;
      for (const pid of ['p1', 'p2']) {
        const death = rt.deathPick?.[pid];
        if (death) { deathCounts[death] = (deathCounts[death] ?? 0) + 1; deathPicks++; }
        if (rt.birthPick?.[pid]) birthPicked[pid]++;
        const bt = rt.birthTiming?.[pid];
        if (bt) { birthActs.push(bt.act); birthLayers.push(bt.layer); }
        charEvents += rt.characterEvents?.[pid] ?? 0;
      }
    }
    const medianOf = (xs) => {
      if (xs.length === 0) return 'n/a';
      const s = [...xs].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return String(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
    };
    const riteDist = Object.entries(deathCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => {
        const share = (100 * count) / deathPicks;
        return `${id} ${count} (${share.toFixed(0)}%${share < 10 || share > 60 ? ' FLAG' : ''})`;
      })
      .join(', ');
    console.log('---------------- S7.8 RITES READOUTS ----------------');
    console.log(`death-rite picks: ${deathPicks} — ${riteDist || 'none'}  (shares of picks; FLAG = <10% or >60% tuning threshold)`);
    console.log(
      `birth picks: p1 ${birthPicked.p1}/${riteRuns.length} runs (${((100 * birthPicked.p1) / riteRuns.length).toFixed(0)}%), ` +
      `p2 ${birthPicked.p2}/${riteRuns.length} (${((100 * birthPicked.p2) / riteRuns.length).toFixed(0)}%) | ` +
      `median timing act ${medianOf(birthActs)}, layer ${medianOf(birthLayers)}`,
    );
    console.log(`character events taken/run: ${(charEvents / riteRuns.length).toFixed(2)}`);
    console.log(`Reclaim attempts (threadSpendByKind.reclaim): ${spendMix.reclaim ?? 0}`);
  }

  // ---- S6.4 human-only lines ------------------------------------------------------
  const installRuns = new Map();
  for (const r of results) {
    for (const id of new Set(Object.values(r.installIds ?? {}).filter(Boolean))) {
      installRuns.set(id, (installRuns.get(id) ?? 0) + 1);
    }
  }
  const dist = {};
  for (const c of installRuns.values()) dist[c] = (dist[c] ?? 0) + 1;
  const distStr = Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${v} install(s)×${k} run(s)`).join(' · ');
  // start stamps carry mode/ascension/characters, so the same filters apply
  const startCount = starts.filter((s) => (s.buildSha ?? 'unstamped') === sha && keep(s)).length;
  const minutes = results
    .filter((r) => r.startedAt && r.endedAt)
    .map((r) => (r.endedAt - r.startedAt) / 60000);
  const med = median(minutes);
  console.log('---------------- HUMAN-ONLY (S6.4) ----------------');
  console.log(`installs: ${installRuns.size}  |  runs per install: ${distStr || 'n/a (unstamped files)'}`);
  // review fix: Math.max(startCount, results.length) silently floored the
  // rate at 100% when start stamps were missing — say "unknown" instead
  if (startCount < results.length) {
    console.log(`completion: ${results.length} finished / ${startCount} started — WARNING: start stamps missing for some runs, completion rate unknown`);
  } else {
    console.log(`completion: ${results.length} finished / ${startCount} started (${(100 * results.length / startCount).toFixed(0)}%)`);
  }
  console.log(`median run minutes: ${med === null ? 'n/a (no wall-clock stamps)' : med.toFixed(1)}  (${minutes.length}/${results.length} runs stamped)`);

  console.log('---------------- GATES ----------------');
  let allPass = true;
  for (const g of gates) {
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.name}  →  ${g.value}`);
    if (!g.pass) allPass = false;
  }
  console.log(allPass ? 'ALL GATES PASS' : 'GATES ARE BOT BANDS — human reads calibrate them (M3 Part A), not the reverse');
  console.log('=======================================================================');
}
