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
    // S14-R1: the 40–55 band is a BOT instrument (vb, A0, default topology);
    // human win rates are reported, never banded — human data RULES the
    // bands (OQ#14), not the reverse. The old ≤40% M2 gate retired with R1.
    { name: 'win rate (human — reported, not banded; S21-R1 wires are bot tripwires, OQ#14)', value: `${winRate.toFixed(0)}%`, pass: true },
    { name: 'avg HP lost per Act 1 combat ≥ 8', value: hpPerA1Combat.toFixed(1), pass: hpPerA1Combat >= 8 },
    { name: 'Act 1 link-fire ≥ 30%', value: `${act1LinkRate.toFixed(1)}%`, pass: act1LinkRate >= 30 },
    {
      name: 'Act 2 link-fire 40–60%',
      value: act2.cards ? `${act2LinkRate.toFixed(1)}%` : 'n/a (no Act 2 reached)',
      pass: act2.cards > 0 && act2LinkRate >= 40 && act2LinkRate <= 60,
    },
    { name: 'no tag > 50% of resonance streaks', value: `${(100 * maxResTagShare).toFixed(0)}%`, pass: maxResTagShare <= 0.5 },
    // S21.2 row 2c: the 25–45 band was a lane-era read, retired at S20-R1;
    // the re-derived 46.3±8 wire is a BOT tripwire on the canonical board.
    // Human hex share is telemetry on every pair — reported with the
    // anchor for reference.
    hexGated
      ? { name: 'Hex damage share (human vb — reported; S21-R1 bot anchor 46.3)', value: `${hexShare.toFixed(1)}%`, pass: true }
      : { name: `Hex damage share (telemetry only for ${PAIR ?? 'mixed pairs'}, S5 gate-4 amendment)`, value: `${hexShare.toFixed(1)}%`, pass: true },
  ];

  console.log(`\n======== HUMAN TELEMETRY — build ${sha} (content ${contentVersions}) ========`);
  console.log(`filters: pair ${PAIR ?? 'all'} | ascension ${ASCEND ?? 'all'} | mode ${MODE}  |  scales ${scaleSet}  |  rungs ${rungs}  |  pairs ${pairs}`);
  console.log('---------------- TELEMETRY SUMMARY (M2 Part C format) ----------------');
  console.log(`runs: ${results.length}  |  victories: ${victories} (${winRate.toFixed(0)}%)  |  combats fought: ${Object.values(actAgg).reduce((a, s) => a + s.combats, 0)}`);
  console.log(`furthest acts: ${JSON.stringify(results.reduce((m, r) => ((m[r.act] = (m[r.act] ?? 0) + 1), m), {}))}`);
  console.log(`turns: ${sum(results, (r) => t(r).turns)}  |  cards played: ${cards}  |  overall link-fire: ${cards ? ((100 * links) / cards).toFixed(1) : 0}%`);
  console.log(`act 1: ${act1.combats} combats, link-fire ${act1LinkRate.toFixed(1)}%, HP lost/combat ${hpPerA1Combat.toFixed(1)}`);
  // S21.2 mirror (2e): HP/combat by act, the act-death profile, and act-3
  // lethality — the 2f filing routes the FIRST HUMAN lethality read through
  // this aggregator, so the canonical lines exist here from S21 forward.
  // Human rows are REPORTED, never banded (OQ#14: human data rules bands,
  // not the reverse).
  {
    const act3 = actAgg[3] ?? { cards: 0, links: 0, combats: 0, hpLost: 0 };
    const act3LinkRate = act3.cards ? (100 * act3.links) / act3.cards : 0;
    console.log(`act 2: ${act2.combats} combats, link-fire ${act2LinkRate.toFixed(1)}%, HP lost/combat ${act2.combats ? (act2.hpLost / act2.combats).toFixed(1) : 'n/a'}`);
    console.log(`act 3: ${act3.combats} combats, link-fire ${act3.cards ? `${act3LinkRate.toFixed(1)}%` : 'n/a'}, HP lost/combat ${act3.combats ? (act3.hpLost / act3.combats).toFixed(1) : 'n/a'}`);
    const diedIn = (act) => results.filter((r) => r.outcome !== 'victory' && r.act === act).length;
    const arrivals3 = results.filter((r) => r.act >= 3).length;
    console.log(
      `act deaths: a1 ${((100 * diedIn(1)) / results.length).toFixed(1)}% a2 ${((100 * diedIn(2)) / results.length).toFixed(1)}% of ${results.length} runs | ` +
      `act-3 lethality: ${diedIn(3)} of ${arrivals3} arrivals = ${arrivals3 ? ((100 * diedIn(3)) / arrivals3).toFixed(1) : 'n/a'}% ` +
      `(human read — the 2f/S18-D3 texture question reads HERE first)`,
    );
  }
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
  // ---- S14.1 (B23) per-card attribution (mirrored from sim.ts; prints only
  // when files carry telemetry.cards, so pre-S14 files keep their exact
  // summary). No CARDS/ALL_RELICS registry here (the engine isn't imported),
  // so the never-lists are sim-only — human files read out activity rows.
  {
    const plays = {};
    const picks = {};
    const winDecks = {};
    const relicSrc = {};
    for (const r of results) {
      const c = t(r).cards;
      for (const [id, cell] of Object.entries(c?.plays ?? {})) plays[id] = (plays[id] ?? 0) + (cell.p1 ?? 0) + (cell.p2 ?? 0);
      for (const [id, cell] of Object.entries(c?.picks ?? {})) picks[id] = (picks[id] ?? 0) + (cell.p1 ?? 0) + (cell.p2 ?? 0);
      for (const [id, cell] of Object.entries(c?.winningDeck ?? {})) winDecks[id] = (winDecks[id] ?? 0) + ((cell.p1 ?? 0) + (cell.p2 ?? 0) > 0 ? 1 : 0);
      for (const src of Object.values(t(r).relicSources ?? {})) relicSrc[src] = (relicSrc[src] ?? 0) + 1;
    }
    const ids = [...new Set([...Object.keys(plays), ...Object.keys(picks), ...Object.keys(winDecks)])]
      .sort((a, b) => (plays[b] ?? 0) - (plays[a] ?? 0));
    if (ids.length > 0) {
      console.log('---------------- S14.1 PER-CARD ATTRIBUTION (B23) ----------------');
      const brief = (xs) => xs.map((id) => `${id}(${plays[id] ?? 0})`).join(', ');
      console.log(`top-10 by plays: ${brief(ids.slice(0, 10))}`);
      console.log(`bottom-10 by plays: ${brief(ids.slice(-10))}`);
      for (const id of ids) {
        console.log(`  card ${id.padEnd(24)} plays ${String(plays[id] ?? 0).padStart(4)} picks ${String(picks[id] ?? 0).padStart(3)} winning-decks ${winDecks[id] ?? 0}`);
      }
      const pickedNeverPlayed = Object.keys(picks).filter((id) => !(plays[id] > 0));
      console.log(`picked-but-never-played: ${pickedNeverPlayed.join(', ') || 'none'}`);
      console.log(`relic acquisition sources: ${JSON.stringify(relicSrc)}`);
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
  // S16.0d (B22): the gate-3 Reclaim band's denominator — reclaims vs every
  // card acquisition channel (telemetry.cards.picks counts them all since
  // S14.1; pre-S14 files simply read 0 acquisitions → n/a, no back-guessing)
  {
    const acquisitions = results.reduce((a, r) => {
      const cells = Object.values(t(r).cards?.picks ?? {});
      return a + cells.reduce((s, cell) => s + (cell.p1 ?? 0) + (cell.p2 ?? 0), 0);
    }, 0);
    console.log(
      `B22 reclaim ratio: ${spendMix.reclaim ?? 0} reclaims / ${acquisitions} card acquisitions = ` +
      `${acquisitions ? ((100 * (spendMix.reclaim ?? 0)) / acquisitions).toFixed(1) : 'n/a'}% (gate-3 band: <25%)`,
    );
  }

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

  // ---- S13.1c economy (mirrored from sim.ts; prints only when the telemetry
  // exists, so pre-S13 files keep their exact summary) -----------------------------
  const ecoRuns = results.filter((r) => t(r).economy);
  if (ecoRuns.length > 0) {
    const nEco = Math.max(1, ecoRuns.length);
    const esum = (f) => ecoRuns.reduce((a, r) => a + f(t(r).economy), 0);
    const acts = [...new Set(ecoRuns.flatMap((r) => [
      ...Object.keys(t(r).economy.picks ?? {}),
      ...Object.keys(t(r).economy.relicsByAct ?? {}),
      ...Object.keys(t(r).economy.deckAddsByAct ?? {}),
    ]))].map(Number).sort((a, b) => a - b);
    console.log('---------------- S13.1c ECONOMY (per act) ----------------');
    for (const act of acts) {
      const seat = (pid) => {
        const taken = esum((e) => e.picks?.[act]?.[pid]?.taken ?? 0);
        const skipped = esum((e) => e.picks?.[act]?.[pid]?.skipped ?? 0);
        const offers = taken + skipped;
        const adds = esum((e) => e.deckAddsByAct?.[act]?.[pid] ?? 0);
        const removes = esum((e) => e.deckRemovalsByAct?.[act]?.[pid] ?? 0);
        return `${pid} take ${offers ? ((100 * taken) / offers).toFixed(0) : 'n/a'}% (${taken}/${offers})` +
          ` deck +${(adds / nEco).toFixed(2)}/−${(removes / nEco).toFixed(2)}`;
      };
      const relics = esum((e) => e.relicsByAct?.[act] ?? 0);
      console.log(`  act ${act}: ${seat('p1')} | ${seat('p2')} | relics/run ${(relics / nEco).toFixed(2)}`);
    }
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
