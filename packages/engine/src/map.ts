// Branching act maps (M2-B3): StS-style lanes, ~14 nodes, 2-3 lanes wide.
// Path choice is a negotiation: both players must pick the same next node.

import { MapNode, MapState } from './types';
import { rngInt, rngShuffle } from './rng';
import { ENCOUNTER_POOLS } from './content/encounters';
import { ALL_RELICS, MAP_EVENT_PCT, MAP_LAYERS, eventsForAct } from './content/registry';
import { CROSSING_LAYERS, CROSSING_LAYER_A3, STRAND_TARGETS, StrandId } from './content/strand-targets';
import { distinctApproaches } from './map-composition';

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
  /** S11.8 (Wave B): TB_KNOTWORK — the braid path. False keeps the current
   *  generator as the one true unflagged path (golden lock, gate 4). */
  knotwork = false,
): { map: MapState; rng: number } {
  // S11.8: branch BEFORE a single roll — the braid is a separate builder,
  // and this function stays byte-identical when the flag is off.
  if (knotwork) return generateBraidMap(rngState, act, extraElite, tracks, seenGatedEvents, riteCharacters);
  let rng = rngState;
  const nodes: MapNode[] = [];
  const pools = ENCOUNTER_POOLS[act];
  const eventDefs = eventsForAct(act, tracks, riteCharacters).filter(
    (e) => !(e.clue || e.character || e.rare) || !seenGatedEvents.includes(e.id),
  );
  const events = eventDefs.map((e) => e.id);
  let eventQueue: string[] = [];
  const nextEvent = (): string => {
    if (eventQueue.length === 0) {
      if (tracks || riteCharacters.length > 0) {
        // nt-slice S6.2 + S7.3: weighted order — clue and character events
        // carry elevated queue weight ("one economy, two payoffs"),
        // surfacing earlier among the few event nodes a run visits.
        // S8.4: rare events (the wrong-way event) carry HALF a normal
        // event's weight. Integer weights against normal=2, so the
        // half-weight slot fits at 1 — the RELATIVE weights are what
        // matter to the sampler.
        // 2026-07-02 ruling (review-sweep B6): character events 2×→4×.
        // 10 clue events at equal weight took ~62% of gated slots and
        // birth picks reached 0–10% of seats; 4× puts the two tracks at
        // rough parity (20 vs 24 weight units). This pre-spends the first
        // rung of decision-tree D6-B; if arrival is still late, the
        // ladder resumes at L8/E32.
        // Sample-without-replacement; unflagged runs keep the plain shuffle
        // (and its exact rng consumption) below — rare events never reach
        // that branch (eventsForAct gates them out unflagged).
        const pool = eventDefs.map((e) => ({ id: e.id, w: e.character ? 8 : e.clue ? 4 : e.rare ? 1 : 2 }));
        while (pool.length > 0) {
          const total = pool.reduce((sum, p) => sum + p.w, 0);
          const r = rngInt(rng, total);
          rng = r.state;
          let acc = 0;
          let idx = 0;
          for (let i = 0; i < pool.length; i++) {
            acc += pool[i].w;
            if (r.value < acc) { idx = i; break; }
          }
          eventQueue.push(pool[idx].id);
          pool.splice(idx, 1);
        }
      } else {
        const r = rngShuffle(rng, events);
        rng = r.state;
        eventQueue = r.value;
      }
    }
    return eventQueue.shift()!;
  };
  const pick = <T>(arr: T[]): T => {
    const r = rngInt(rng, arr.length);
    rng = r.state;
    return arr[r.value];
  };

  // lane counts per layer (2-3), deterministic from rng
  const laneCounts: number[] = [];
  for (let l = 0; l < LAYERS; l++) {
    const r = rngInt(rng, 2);
    rng = r.state;
    laneCounts.push(l === LAYERS - 1 ? 2 : 2 + r.value);
  }

  // exactly 2 elites per act (M2-B3), placed in layers 2-4 on distinct layers.
  // S4.4 A3: +1 elite — the remaining 2-4 layer also gets one. Same rng draws
  // as A0 (the flag adds no rolls), so lower rungs reproduce A0 maps exactly.
  const eliteLayerRoll = rngInt(rng, 3);
  rng = eliteLayerRoll.state;
  const eliteLayers = [2 + eliteLayerRoll.value, 2 + ((eliteLayerRoll.value + 1) % 3)];
  if (extraElite) eliteLayers.push(2 + ((eliteLayerRoll.value + 2) % 3));
  const eliteIds = [...pools.elite];
  // guarantee ≥1 shop and ≥1 treasure in layers 1-4
  const shopLayerRoll = rngInt(rng, 4);
  rng = shopLayerRoll.state;
  const shopLayer = 1 + shopLayerRoll.value;
  const treasureLayerRoll = rngInt(rng, 4);
  rng = treasureLayerRoll.state;
  let treasureLayer = 1 + treasureLayerRoll.value;
  // S11.1: the treasure guarantee had two leaks — 2-lane layers never placed
  // it (the old width>2 condition), and sharing the shop's layer lost lane 1
  // ordering fights on 2-lane layers. Deterministic layer shift, zero extra
  // rolls: rng consumption is unchanged, node KINDS shift (golden regen,
  // loudly, per the Wave A gate).
  if (treasureLayer === shopLayer) treasureLayer = 1 + (treasureLayer % 4);

  let id = 0;
  for (let layer = 0; layer < LAYERS; layer++) {
    for (let lane = 0; lane < laneCounts[layer]; lane++) {
      let node: MapNode;
      if (layer === LAYERS - 1) {
        node = { id, kind: 'rest', edges: [], layer, lane }; // breath before the boss
      } else if (layer === 0) {
        node = { id, kind: 'combat', edges: [], layer, lane, encounterId: pick(pools.easy) };
      } else if (eliteLayers.includes(layer) && lane === 0) {
        node = { id, kind: 'elite', edges: [], layer, lane, encounterId: eliteIds[eliteLayers.indexOf(layer) % eliteIds.length] };
      } else if (layer === shopLayer && lane === laneCounts[layer] - 1) {
        node = { id, kind: 'shop', edges: [], layer, lane };
      } else if (layer === treasureLayer && lane === 1) {
        node = { id, kind: 'treasure', edges: [], layer, lane };
      } else {
        const roll = rngInt(rng, 100);
        rng = roll.state;
        // shares: combat takes what the event share leaves below 72;
        // rest (72–85) and treasure (86–99) are pacing, not routing — fixed
        if (roll.value < 72 - MAP_EVENT_PCT) {
          node = { id, kind: 'combat', edges: [], layer, lane, encounterId: pick(layer <= 1 ? pools.easy : pools.normal) };
        } else if (roll.value < 72) {
          node = { id, kind: 'event', edges: [], layer, lane, eventId: nextEvent() };
        } else if (roll.value < 86) {
          node = { id, kind: 'rest', edges: [], layer, lane };
        } else {
          node = { id, kind: 'treasure', edges: [], layer, lane };
        }
      }
      nodes.push(node);
      id++;
    }
  }
  // ---------------------------------------------------------------------
  // S11.1 composition repairs — rng-FREE post-passes (no rolls, so rng
  // consumption is byte-identical; node kinds shift → golden regen, loud).
  // Order matters: the character-opportunity pass can convert nodes to
  // events, so the approach-diversity repair runs LAST and is gated-aware.
  // ---------------------------------------------------------------------
  const defOfEvent = (eid: string | undefined) => eventDefs.find((e) => e.id === eid);
  const gatedEvent = (n: MapNode): boolean => {
    const d = n.kind === 'event' ? defOfEvent(n.eventId) : undefined;
    return !!(d && (d.character || d.clue || d.rare));
  };
  // the treasure GUARANTEE is a count (≥1), not a position — only the last
  // treasure standing is protected from repairs
  const pinnedNode = (n: MapNode): boolean =>
    n.kind === 'shop' || n.kind === 'elite'
    || (n.kind === 'treasure' && nodes.filter((t) => t.kind === 'treasure').length <= 1);
  // S11.5: the LAST high-stakes slot may MOVE (relocation preserves the
  // scene) but never plain-deletes and never hosts another scene — the
  // composition [1,3] floor's teeth inside the repair ladder, without
  // starving approach diversity the way a hard pin would.
  const soleHighStakes = (n: MapNode): boolean =>
    n.kind === 'event' && !!defOfEvent(n.eventId)?.highStakes
    && nodes.filter((m) => m.kind === 'event' && defOfEvent(m.eventId)?.highStakes).length <= 1;
  const feederOf = (n: MapNode): MapNode | undefined =>
    nodes.find((k) => k.kind === 'elite' && k.layer === n.layer + 1) && (n.lane === 0 || n.lane === 1)
      ? nodes.find((o) => o.layer === n.layer && o.lane === (n.lane === 0 ? 1 : 0))
      : undefined;

  // Character-event opportunities (≥2 per seat per act, queue admission —
  // D6/D7 language): flagged runs only, so unflagged maps are untouched by
  // construction. Retag plain event nodes first (latest layers first — the
  // early queue already leans gated via the B6 weights); when event nodes
  // run out, convert combats, then unpinned pacing nodes. Conversions skip
  // an elite feeder whose twin is already an event (approach diversity).
  if (riteCharacters.length > 0) {
    for (const ch of riteCharacters) {
      const have = (): number =>
        nodes.filter((n) => n.kind === 'event' && defOfEvent(n.eventId)?.character === ch).length;
      const spare = eventDefs.filter(
        (e) => e.character === ch && !nodes.some((n) => n.eventId === e.id),
      );
      const byLateness = [...nodes].sort((a, b) => b.layer - a.layer);
      // pass 1: retag events (kind unchanged — diversity unaffected), taking
      // from whichever class is over-represented so the S8.4 clue:normal
      // node contract (~2:1) survives the guarantee
      for (let taken = 0; taken < 4; taken++) {
        if (have() >= 2 || spare.length === 0) break;
        const clueNodes = nodes.filter((n) => n.kind === 'event' && defOfEvent(n.eventId)?.clue);
        const plainNodes = nodes.filter((n) => n.kind === 'event' && !gatedEvent(n));
        const takeClue = clueNodes.length > 2 * Math.max(1, plainNodes.length - 1);
        const pool = takeClue ? clueNodes : plainNodes;
        const n = byLateness.find((x) => pool.includes(x));
        if (!n) break;
        n.eventId = spare.shift()!.id;
      }
      // pass 2: convert combats, then unpinned rests/treasures
      for (const kind of ['combat', 'rest', 'treasure'] as const) {
        for (const n of byLateness) {
          if (have() >= 2 || spare.length === 0) break;
          if (n.kind !== kind || n.layer === 0 || n.layer >= LAYERS - 1 || pinnedNode(n)) continue;
          n.kind = 'event';
          delete n.encounterId;
          n.eventId = spare.shift()!.id;
        }
      }
      // pass 3 (dense flagged maps only): steal a RARE slot, then a clue
      // slot — never another character's. The rare event is half-weight
      // ("a run can miss it entirely, which is the point"); the clue pool
      // reshuffles across acts. Character arrival is D6/D7 load-bearing
      // and outranks both.
      for (const steal of ['rare', 'clue'] as const) {
        for (const n of byLateness) {
          if (have() >= 2 || spare.length === 0) break;
          if (n.kind !== 'event') continue;
          const d = defOfEvent(n.eventId);
          if (!d || d.character || !d[steal]) continue;
          n.eventId = spare.shift()!.id;
        }
      }
    }
  }

  // S11.5 high-stakes guarantee (the composition [1,3] floor, armed per act
  // by content): flagged runs only — the deep doors only open there, so
  // unflagged maps are untouched by construction (golden covenant). rng-FREE
  // like the passes above. Retag the latest plain event node first (kind
  // unchanged — approach diversity unaffected); convert a combat, then
  // unpinned pacing nodes, only when no event node is free. The ceiling
  // needs no repair: two flagged defs per act and a no-repeat queue.
  if (tracks || riteCharacters.length > 0) {
    const hsSpare = eventDefs.filter(
      (e) => e.highStakes && !nodes.some((n) => n.eventId === e.id),
    );
    const hsHave = (): boolean =>
      nodes.some((n) => n.kind === 'event' && defOfEvent(n.eventId)?.highStakes);
    if (!hsHave() && hsSpare.length > 0) {
      const byLateness = [...nodes].sort((a, b) => b.layer - a.layer);
      const plain = byLateness.find(
        (n) => n.kind === 'event' && !gatedEvent(n) && n.layer > 0 && n.layer < LAYERS - 1,
      );
      let placed = false;
      if (plain) {
        plain.eventId = hsSpare[0].id;
        placed = true;
      }
      if (!placed) {
        for (const kind of ['combat', 'rest', 'treasure'] as const) {
          const n = byLateness.find(
            (x) => x.kind === kind && x.layer > 0 && x.layer < LAYERS - 1 && !pinnedNode(x),
          );
          if (n) {
            n.kind = 'event';
            delete n.encounterId;
            n.eventId = hsSpare[0].id;
            placed = true;
            break;
          }
        }
      }
      // dense gated maps (the char pass ate the rests, the sole treasure is
      // pinned, combats all sit at layer 0): steal a rare, then a clue slot
      // — the char pass's own ladder, same justifications (the rare event
      // may be missed by design; the clue pool reshuffles across acts).
      // Never a character scene (D6/D7 load-bearing).
      if (!placed) {
        for (const steal of ['rare', 'clue'] as const) {
          const n = byLateness.find((x) => {
            if (x.kind !== 'event') return false;
            const d = defOfEvent(x.eventId);
            return !!d && !d.character && !!d[steal];
          });
          if (n) {
            n.eventId = hsSpare[0].id;
            placed = true;
            break;
          }
        }
      }
    }
  }

  // Approach diversity (≥2 distinct approach compositions per knot): a path
  // through the L-1 lane-0 feeder and one through the lane-1 feeder share
  // every other node choice, so distinct FEEDER kinds guarantee distinct
  // path multisets. Pinned nodes and gated events never flip.
  // Approach diversity (≥2 distinct approach compositions per knot). When a
  // knot reads as one composition, EVERY lane-0/1 twin pair below it shares
  // a kind (distinct twins at any layer d<L give two paths differing only
  // in that twin — common parent above, lane-0 chain below). Repair ladder,
  // cheapest first; character events are D6/D7 load-bearing and are always
  // RELOCATED, never dropped; a clue slot may be sacrificed last (the clue
  // pool reshuffles across acts).
  const isEventTwinFeeder = (n: MapNode): boolean =>
    (n.lane === 0 || n.lane === 1)
    && nodes.some((k) => k.kind === 'elite' && k.layer === n.layer + 1)
    && (nodes.find((o) => o.layer === n.layer && o.lane === (n.lane === 0 ? 1 : 0))?.kind === 'event');
  const mapView = (): MapState =>
    ({ act, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 });
  const pacingFlip = (n: MapNode, awayFrom: MapNode['kind']): void => {
    n.kind = awayFrom === 'rest' ? 'treasure' : 'rest';
    delete n.encounterId;
    delete n.eventId;
  };
  /** Flip an EVENT node's kind without losing the event: its scene moves to
   *  a pacing/combat node elsewhere (event counts — and the S8.4 clue:normal
   *  node ratio — survive the repair). Falls back to a plain delete only
   *  when the map has nowhere to put it. */
  const relocateAndFlip = (target: MapNode, exclude: (MapNode | undefined)[]): boolean => {
    const byLateness = [...nodes].sort((a, b) => b.layer - a.layer);
    const home = byLateness.find(
      (n) => (n.kind === 'rest' || n.kind === 'treasure' || n.kind === 'combat')
        && !pinnedNode(n) && !isEventTwinFeeder(n)
        && n.layer > 0 && n.layer < LAYERS - 1 && !exclude.includes(n),
    );
    if (home) {
      home.kind = 'event';
      delete home.encounterId;
      home.eventId = target.eventId;
    } else if (gatedEvent(target) || soleHighStakes(target)) {
      return false; // never plain-delete a gated scene or the last high-stakes slot
    }
    pacingFlip(target, target.kind);
    return true;
  };
  for (let round = 0; round < 3; round++) {
    let dirty = false;
    for (const knot of nodes.filter((n) => n.kind === 'elite')) {
      if (distinctApproaches(mapView(), knot.id) >= 2) continue;
      let repaired = false;
      // 1) flip a flippable twin below the knot (layer 0 is fixed all-combat
      //    by design; twins there never flip). Non-event twins flip first —
      //    flipping plain events starves the S8.4 clue:normal node ratio.
      for (const allowEvents of [false, true]) {
        for (let d = knot.layer - 1; d >= 1 && !repaired; d--) {
          const t0 = nodes.find((n) => n.layer === d && n.lane === 0);
          const t1 = nodes.find((n) => n.layer === d && n.lane === 1);
          if (!t0 || !t1 || t0.kind !== t1.kind) continue;
          if (!allowEvents && t0.kind === 'event') continue;
          const flip = [t1, t0].find((f) => !pinnedNode(f) && !gatedEvent(f));
          if (flip && t0.kind === 'event') {
            if (relocateAndFlip(flip, [t0, t1])) repaired = dirty = true;
          } else if (flip) {
            pacingFlip(flip, t0.kind);
            repaired = dirty = true;
          }
        }
        if (repaired) break;
      }
      if (repaired) continue;
      // 2) relocate a gated feeder scene, then flip the vacated node
      const f1 = nodes.find((n) => n.layer === knot.layer - 1 && n.lane === 1);
      const f0 = nodes.find((n) => n.layer === knot.layer - 1 && n.lane === 0);
      const target = [f1, f0].find((f) => f && !pinnedNode(f) && f.kind === 'event');
      if (target) {
        const byLateness = [...nodes].sort((a, b) => b.layer - a.layer);
        const home = byLateness.find(
          (n) => (n.kind === 'rest' || n.kind === 'treasure' || n.kind === 'combat')
            && !pinnedNode(n) && !isEventTwinFeeder(n)
            && n.layer > 0 && n.layer < LAYERS - 1 && n !== f0 && n !== f1,
        );
        // final relocation fallback: a clue/rare slot hosts the character
        // scene (clue pool reshuffles across acts; char arrival outranks it).
        // S11.5: the LAST high-stakes slot never hosts another scene.
        const homeGated = home ?? byLateness.find((n) => {
          if (n.kind !== 'event' || n === f0 || n === f1 || soleHighStakes(n)) return false;
          const d = defOfEvent(n.eventId);
          return !!d && !d.character;
        });
        if (homeGated) {
          if (homeGated.kind !== 'event') {
            homeGated.kind = 'event';
            delete homeGated.encounterId;
          }
          homeGated.eventId = target.eventId;
          pacingFlip(target, target.kind);
          dirty = true;
          continue;
        }
        // 3) sacrifice a clue slot — never a character event, and never the
        //    last high-stakes slot (S11.5)
        const clue = [f1, f0].find((f) => {
          const d = f && f.kind === 'event' ? defOfEvent(f.eventId) : undefined;
          return f && !pinnedNode(f) && !soleHighStakes(f) && d && !d.character;
        });
        if (clue) {
          pacingFlip(clue, clue.kind);
          dirty = true;
        }
      }
      // 4) the SWAP rung (S11.5): every twin below the knot is a protected
      //    scene (character events + the last high-stakes slot can fill a
      //    narrow map wall to wall). Swap one event twin with a pacing or
      //    combat node from ANOTHER layer: every kind's count is preserved
      //    (the treasure and high-stakes guarantees are counts, not
      //    positions), the scene survives at its new address, and the twin
      //    pair gains a distinct kind.
      if (distinctApproaches(mapView(), knot.id) < 2) {
        for (let d = knot.layer - 1; d >= 1; d--) {
          const t0 = nodes.find((n) => n.layer === d && n.lane === 0);
          const t1 = nodes.find((n) => n.layer === d && n.lane === 1);
          if (!t0 || !t1 || t0.kind !== 'event' || t1.kind !== 'event') continue;
          const partner = [...nodes].sort((a, b) => b.layer - a.layer).find(
            (n) => (n.kind === 'rest' || n.kind === 'treasure' || n.kind === 'combat')
              && n.layer > 0 && n.layer < LAYERS - 1 && n.layer !== d,
          );
          if (!partner) continue;
          const twin = t1; // lane-0 chains feed the knots; move the lane-1 scene
          const movedEvent = twin.eventId;
          twin.kind = partner.kind;
          if (partner.encounterId !== undefined) twin.encounterId = partner.encounterId;
          delete twin.eventId;
          partner.kind = 'event';
          delete partner.encounterId;
          partner.eventId = movedEvent;
          dirty = true;
          break;
        }
      }
    }
    if (!dirty) break;
  }

  // S11.6/S11.7 derived-stream dressing (scout pins + pacing variants),
  // shared verbatim with the S11.8 braid path.
  if (tracks || riteCharacters.length > 0) {
    applyFlaggedDressing(nodes, rngState, act);
  }

  // boss layer
  const bossId = id;
  nodes.push({ id: bossId, kind: 'boss', edges: [], layer: LAYERS, lane: 0, encounterId: pools.boss });

  // edges: connect each node to next-layer nodes with |lane delta| <= 1
  for (const node of nodes) {
    if (node.id === bossId) continue;
    const nextLayer = nodes.filter((n) => n.layer === node.layer + 1);
    if (nextLayer.length === 0) continue;
    if (node.layer === LAYERS - 1) {
      node.edges = [bossId];
      continue;
    }
    node.edges = nextLayer
      .filter((n) => Math.abs(n.lane - node.lane) <= 1)
      .map((n) => n.id);
    if (node.edges.length === 0) node.edges = [nextLayer[0].id];
  }

  return {
    map: { act, nodes, position: -1, picks: { p1: null, p2: null }, mismatchStreak: 0, knotsCut: 0 },
    rng,
  };
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

  const eliteIds = [...pools.elite];
  for (let layer = 1; layer <= 5; layer++) {
    placeSlot('truth', layer, 0);
    if (widen.truth === layer) placeSlot('truth', layer, 1);
    if (crossings.includes(layer)) {
      // the knot: a crossing owned by the weave, reachable from both strands
      push({
        kind: 'elite', layer, lane: 1,
        encounterId: eliteIds[crossings.indexOf(layer) % eliteIds.length],
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

/** Nodes currently pickable: layer-0 entries at position -1, else current edges. */
export function pickableNodes(map: MapState): number[] {
  if (map.position === -1) return map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
  return map.nodes.find((n) => n.id === map.position)?.edges ?? [];
}
