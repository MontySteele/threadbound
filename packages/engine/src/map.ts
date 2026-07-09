// Act maps: the braid (S11.8) — two currency-keyed warp strands crossing
// at the knots. Path choice is a negotiation: both players must pick the
// same next node. (The M2-B3 StS-style lane generator lived here until
// S21.5/OQ#65 deleted it — the braid is the game.)

import { MapNode, MapState } from './types';
import { rngInt, rngShuffle } from './rng';
import { ENCOUNTER_POOLS, KNOT_SUBPOOLS } from './content/encounters';
import { ALL_RELICS, MAP_EVENT_PCT, MAP_LAYERS, eventsForAct } from './content/registry';
import { CROSSING_LAYERS, CROSSING_LAYER_A3, STRAND_TARGETS, StrandId } from './content/strand-targets';

// S7.5: acts 1–2 widened L6→L7, event share 22%→32% (combat absorbs the
// delta; rest/treasure untouched). Env-overridable via TB_MAP_LAYERS /
// TB_MAP_EVENT_PCT — see content/registry.ts for the ruling.
const LAYERS = MAP_LAYERS; // + boss layer

export function generateActMap(
  rngState: number, act: 1 | 2, extraElite = false, tracks = false,
  /** gated events (clue/character) already visited — never re-offered: a
   *  scene must not replay with a different fragment or double-credit
   *  progress (2026-07-01 ruling). Unflagged runs pass nothing and
   *  eventsForAct carries no gated events anyway. */
  seenGatedEvents: readonly string[] = [],
  /** S7.3: characters in the run, when the rites flag is set — admits their
   *  character events to the pool at clue weight */
  riteCharacters: readonly string[] = [],
): { map: MapState; rng: number } {
  // S21.5 (OQ#65, ruled 2026-07-07): the LANE GENERATOR IS DELETED. It had
  // been explicit-only dead config since the S20.1 canon flip — no default
  // path reached it, no battery was owed on it, and its bands were
  // archaeology (unbanded since S18/OQ#65; the bb-lane 27.5 read was a trap
  // for anyone who found the flag). The braid is the game. Lane-era anchors
  // live in docs/archive (S18-STATUS Part 8); this signature is unchanged
  // apart from the dead knotwork flag, and the braid path's rng consumption
  // is untouched (the old branch delegated before a single roll).
  return generateBraidMap(rngState, act, extraElite, tracks, seenGatedEvents, riteCharacters);
}


/** S11.6/S11.7: scout pins + pacing variants ride a DERIVED stream — seeded
 *  off the entry rng VALUE, never consuming the live one ("no rng impact").
 *  Callers gate on flags; shared verbatim by both generator paths. */
function applyFlaggedDressing(nodes: MapNode[], rngState: number, act: number): void {
  let sRng = (rngState ^ 0x53c007e5 ^ Math.imul(act, 0x9e3779b9)) >>> 0;
  // S11.6: pin each knot's carried relic (distinct within the act); the
  // reducer prefers the pin at victory only while it is still unowned
  const pinned = new Set<string>();
  for (const n of nodes) {
    if (n.kind !== 'elite') continue;
    const pool = ALL_RELICS.filter((r) => !pinned.has(r.id));
    const roll = rngInt(sRng, pool.length);
    sRng = roll.state;
    n.scoutRelicId = pool[roll.value].id;
    pinned.add(n.scoutRelicId);
  }
  // S11.7: half the mid-map rests become toll doors, half the mid-map
  // treasures covet caches; the breath-before-boss layer never varies —
  // toll doors can never fully replace plain rests, structurally
  for (const n of nodes) {
    if (n.layer <= 0 || n.layer >= LAYERS - 1) continue;
    if (n.kind !== 'rest' && n.kind !== 'treasure') continue;
    const coin = rngInt(sRng, 2);
    sRng = coin.state;
    if (coin.value === 1) n.variant = n.kind === 'rest' ? 'toll' : 'covet';
  }
}

/** S11.8 (Wave B, TB_KNOTWORK): the braid — two currency-keyed warp strands
 *  crossing at the knots. The pair walks one strand at a time; THE ONLY WAY
 *  ACROSS THE WEAVE IS THROUGH A SNARL: taking the knot (elite) grants the
 *  crossing (either strand next layer) plus the S11.3 reward table;
 *  bypassing continues your strand. Strand composition is DATA
 *  (content/strand-targets.ts — S11.11-4 sign-off row); character doors
 *  ride BOTH strands (D6/D7: birth-rite arrival must never be
 *  strand-gated); the weave-wide high-stakes floor deals directly into the
 *  truth strand ("the run's biggest visible gambles" live with the truth
 *  texture). Strands share the breath layer; the finale is untouched. */
function generateBraidMap(
  rngState: number, act: 1 | 2, extraElite: boolean, tracks: boolean,
  seenGatedEvents: readonly string[], riteCharacters: readonly string[],
): { map: MapState; rng: number } {
  let rng = rngState;
  const pools = ENCOUNTER_POOLS[act];
  // A3's third knot gets its OWN crossing layer (S11.11-1 recommendation:
  // crossings stay scarce — pending ruling, non-blocking to start)
  const crossings = extraElite ? [...CROSSING_LAYERS, CROSSING_LAYER_A3] : [...CROSSING_LAYERS];
  const eventDefs = eventsForAct(act, tracks, riteCharacters).filter(
    (e) => !(e.clue || e.character || e.rare) || !seenGatedEvents.includes(e.id),
  );

  // ---- event dealing ------------------------------------------------------
  const charSpares: Record<string, string[]> = {};
  for (const ch of riteCharacters) {
    charSpares[ch] ??= eventDefs.filter((e) => e.character === ch).map((e) => e.id);
  }
  const dealt = new Set<string>();
  const takeChar = (ch: string): string | undefined => {
    const id = charSpares[ch]?.find((x) => !dealt.has(x));
    if (id) dealt.add(id);
    return id;
  };
  /** weighted no-repeat draw over clue/plain/rare (B6 weights), the clue
   *  weight scaled per strand — the truth strand is clue-biased */
  const drawEvent = (clueScale: number): string | undefined => {
    const pool = eventDefs.filter((e) => !e.character && !dealt.has(e.id));
    if (pool.length === 0) return undefined;
    const weights = pool.map((e) => (e.clue ? 4 * clueScale : e.rare ? 1 : 2));
    const total = weights.reduce((a, b) => a + b, 0);
    const r = rngInt(rng, total);
    rng = r.state;
    let acc = 0;
    for (let i = 0; i < pool.length; i++) {
      acc += weights[i];
      if (r.value < acc) {
        dealt.add(pool[i].id);
        return pool[i].id;
      }
    }
    return undefined;
  };
  // the weave-wide high-stakes floor ([1,3] per act, armed by content) —
  // reserved before any draw so the queue cannot double-deal it
  const hsFloor = eventDefs.find((e) => e.highStakes);
  if (hsFloor) dealt.add(hsFloor.id);

  // ---- strand fills (6 fillable slots: layers 1..5 + one widened) ---------
  type Slot = Pick<MapNode, 'kind' | 'eventId'>;
  const fillFor = (strand: StrandId): Slot[] => {
    const targets = STRAND_TARGETS[strand];
    const out: Slot[] = [];
    // one character door per SEAT per strand (spares may run dry late in a
    // run — the slot then falls back to the strand's own texture)
    for (const ch of riteCharacters) {
      const id = takeChar(ch);
      if (id) out.push({ kind: 'event', eventId: id });
    }
    if (strand === 'truth') {
      if (hsFloor) out.push({ kind: 'event', eventId: hsFloor.id });
      while (out.length < 4) {
        const id = drawEvent(targets.clueWeightScale);
        if (!id) break;
        out.push({ kind: 'event', eventId: id });
      }
      out.push({ kind: 'rest' }, { kind: 'treasure' });
      while (out.length < 6) out.push({ kind: 'combat' }); // dry-pool fallback
    } else {
      out.push({ kind: 'shop' }, { kind: 'treasure' }, { kind: 'rest' });
      while (out.length < 6) out.push({ kind: 'combat' });
    }
    return out.slice(0, 6);
  };

  const nodes: MapNode[] = [];
  let id = 0;
  const push = (n: Omit<MapNode, 'id' | 'edges'>): MapNode => {
    const node: MapNode = { id: id++, edges: [], ...n };
    nodes.push(node);
    return node;
  };
  const pickEnc = (layer: number): string => {
    const pool = layer <= 1 ? pools.easy : pools.normal;
    const r = rngInt(rng, pool.length);
    rng = r.state;
    return pool[r.value];
  };

  // layer 0: each strand opens with a combat — the FIRST map pick IS the
  // strand commitment (P2)
  push({ kind: 'combat', layer: 0, lane: 0, strand: 'truth', encounterId: pickEnc(0) });
  push({ kind: 'combat', layer: 0, lane: 2, strand: 'power', encounterId: pickEnc(0) });

  // widened layers (within-strand micro-choice survives): one non-crossing
  // mid layer per strand
  const nonCrossing = [1, 2, 3, 4, 5].filter((l) => !crossings.includes(l));
  const widen: Record<StrandId, number> = { truth: 0, power: 0 };
  for (const strand of ['truth', 'power'] as StrandId[]) {
    const r = rngInt(rng, nonCrossing.length);
    rng = r.state;
    widen[strand] = nonCrossing[r.value];
  }

  // deal each strand's fill across its slots (seeded shuffle)
  const fills: Record<StrandId, Slot[]> = { truth: [], power: [] };
  for (const strand of ['truth', 'power'] as StrandId[]) {
    const f = rngShuffle(rng, fillFor(strand));
    rng = f.state;
    fills[strand] = f.value;
  }
  const placeSlot = (strand: StrandId, layer: number, lane: number): MapNode => {
    const slot = fills[strand].shift() ?? { kind: 'combat' as const };
    return push({
      kind: slot.kind, layer, lane, strand,
      ...(slot.eventId ? { eventId: slot.eventId } : {}),
      ...(slot.kind === 'combat' ? { encounterId: pickEnc(layer) } : {}),
    });
  };

  // S14.2 (sweep B1): knots sample the pool too — same
  // sample-without-replacement as the classic path, same reasons.
  const eliteDraw = rngShuffle(rng, pools.elite);
  rng = eliteDraw.state;
  const eliteIds = eliteDraw.value;
  // S16-D4 (ruled): the FIRST crossing keeps the full-pool draw (the gentle
  // debut stands); second-and-later crossings draw from the act's harder
  // sub-pool. The sub-pool is ordered by the SAME shuffle and consumes NO
  // new rng — every non-knot draw, the debut knot, and the whole classic
  // topology are byte-identical to pre-S16. The debut's comp is skipped in
  // the sub-pool when an alternative exists (sample-without-replacement
  // habit, S14.2 B1).
  const knotEnc = (k: number): string => {
    if (k === 0) return eliteIds[0];
    const sub = eliteIds.filter((id) => KNOT_SUBPOOLS[act].includes(id));
    const later = sub.filter((id) => id !== eliteIds[0]);
    const pick = later.length > 0 ? later : sub;
    return pick[(k - 1) % pick.length];
  };
  for (let layer = 1; layer <= 5; layer++) {
    placeSlot('truth', layer, 0);
    if (widen.truth === layer) placeSlot('truth', layer, 1);
    if (crossings.includes(layer)) {
      // the knot: a crossing owned by the weave, reachable from both strands
      push({
        kind: 'elite', layer, lane: 1,
        encounterId: knotEnc(crossings.indexOf(layer)),
      });
    }
    placeSlot('power', layer, 2);
    if (widen.power === layer) placeSlot('power', layer, 3);
  }

  // the shared breath layer (always plain — S11.7 contract), then the boss
  const restA = push({ kind: 'rest', layer: LAYERS - 1, lane: 0 });
  const restB = push({ kind: 'rest', layer: LAYERS - 1, lane: 1 });
  const boss = push({ kind: 'boss', layer: LAYERS, lane: 0, encounterId: pools.boss });

  // ---- edges ----------------------------------------------------------------
  // within-strand chains; knots pull from both strands below and release
  // onto either strand above — the crossing IS the reward
  const strandAt = (strand: StrandId, layer: number): MapNode[] =>
    nodes.filter((n) => n.strand === strand && n.layer === layer);
  const knotAt = (layer: number): MapNode | undefined =>
    nodes.find((n) => n.kind === 'elite' && n.layer === layer);
  for (const n of nodes) {
    if (n === boss) continue;
    if (n.layer === LAYERS - 1) {
      n.edges = [boss.id];
      continue;
    }
    const next = n.layer + 1;
    if (next === LAYERS - 1) {
      n.edges = [restA.id, restB.id]; // strands converge at the breath
      continue;
    }
    if (n.kind === 'elite') {
      // victory grants the crossing: land on EITHER strand next layer
      n.edges = [...strandAt('truth', next), ...strandAt('power', next)].map((m) => m.id);
      continue;
    }
    const own = strandAt(n.strand!, next).map((m) => m.id);
    const knot = knotAt(next);
    n.edges = knot ? [...own, knot.id] : own;
  }

  if (tracks || riteCharacters.length > 0) {
    applyFlaggedDressing(nodes, rngState, act);
  }

  return {
    map: { act, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 },
    rng,
  };
}

/** Finale (§8): The Last Braid — rest → shop → The Unraveled. Linear.
 *  nt-slice: flagged runs get the Loom's Eye FIRST, adjacent to (never
 *  replacing) the pre-boss rest — the verdict lands before the rest so the
 *  all-true boon (opening intent) can show there, and before the boss. */
export function generateFinaleMap(tracks = false): MapState {
  const nodes: MapNode[] = tracks
    ? [
        { id: 0, kind: 'loom', edges: [1], layer: 0, lane: 0 },
        { id: 1, kind: 'rest', edges: [2], layer: 1, lane: 0 },
        { id: 2, kind: 'shop', edges: [3], layer: 2, lane: 0 },
        { id: 3, kind: 'boss', edges: [], layer: 3, lane: 0, encounterId: 'finale_boss' },
      ]
    : [
        { id: 0, kind: 'rest', edges: [1], layer: 0, lane: 0 },
        { id: 1, kind: 'shop', edges: [2], layer: 1, lane: 0 },
        { id: 2, kind: 'boss', edges: [], layer: 2, lane: 0, encounterId: 'finale_boss' },
      ];
  return { act: 3, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 };
}

/** S22.3 (D3): Act 4 — the Loom's floor. The braid's two warps converge and
 *  BRAID INTO ONE: a single-strand floor, three nodes, no choices on the map
 *  (the choosing is over; the declaration was the last fork). A fixed
 *  authored floor — no fills, no RNG beyond the encounter's own. Reachable
 *  only behind the completion gate (state.act4Open, S22.2/D2 host claim).
 *  1. The Threshold — a passage node, not a fight (the wrong-way traffic
 *     crosses the pair at last, visibly ascending).
 *  2. The Cradle — a rest node under the palette break: the dawn begins
 *     HERE, not at victory, before the hardest fight.
 *  3. The Caretaker — the encounter (S22.4). */
export function generateAct4Map(): MapState {
  const nodes: MapNode[] = [
    { id: 0, kind: 'event', edges: [1], layer: 0, lane: 0, eventId: 'act4_threshold' },
    { id: 1, kind: 'rest', edges: [2], layer: 1, lane: 0 },
    { id: 2, kind: 'boss', edges: [], layer: 2, lane: 0, encounterId: 'caretaker' },
  ];
  return { act: 4, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 };
}

/** Nodes currently pickable: layer-0 entries at position -1, else current edges. */
export function pickableNodes(map: MapState): number[] {
  if (map.position === -1) return map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
  return map.nodes.find((n) => n.id === map.position)?.edges ?? [];
}
