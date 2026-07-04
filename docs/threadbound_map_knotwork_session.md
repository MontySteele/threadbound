# Threadbound — Map Design Session: Knotwork

Status: DESIGN DOC (no implementation). The deferred map-graph
overhaul's trigger ("slice/Rites verdict") has been pulled by the
2026-07 friend sessions plus the designer rulings recorded here. This
doc is the input to the deeper session the designer called for; its
decision list gates any sprint work.

## 0. Ruled inputs (binding on every option below)

- **R1 (designer, this session):** fixed number of elites per act;
  the variety lives in HOW you arrive at them.
- **R2 (designer, this session):** events go deeper than A-or-B.
  Mechanical impact is directly shown — players must know what they
  actually got — but events themselves carry more stages and higher
  risk/reward.
- **R3 (designer, this session):** elite-heavy routing needs a real
  downside; "always fight elites" must not be an auto-win line.
- **R4:** run length is banked as right (D8-A). Combat count per run
  holds roughly constant through any redesign.
- **R5:** L7/E32 and the event-queue weights are load-bearing for
  birth-rite arrival (D6/D7). Any topology change re-runs that math.
- **R6:** bundle secrecy and the held reveal stand. "Impact directly
  shown" applies to visible effects (gold, HP, cards, Thread);
  birth-rite pips and 70%-register strings stay hidden riders.
- **R7:** legibility-before-numbers; supply-before-pool-size;
  DMG to endanger / HP-down to shorten / never gold.

## 1. Diagnosis (grounded in map.ts / reducer.ts as of main)

The current act map is a 7-layer DAG of 2–3 lanes with |Δlane| ≤ 1
edges. Elites pin to lane 0 (layers 2–4), the shop pins to the last
lane, treasure to lane 1, and the generator's own comment calls rest
and treasure "pacing, not routing." At 2–3 lanes, nearly every node is
reachable from nearly everywhere: no pick forecloses anything, so the
map plays as a per-layer menu. Spire-style maps create planning by
width — committing three layers early to reach a distant shop. Ours
has the vote without the stakes: NODE_PICK already requires both
players to match, tracks a mismatchStreak, and the Witness "enjoys the
bickering" — but almost every payoff is pair-shared (card sets for
both, pooled gold, shared rests), so interests align and the
negotiation machinery idles. Events compound this: option buttons
render the label only; consequences surface after the pick (the
oath-ring confusion, verbatim, from the sessions).

## 2. Principles

- **P1. The map is the dyad's third conversation.** Combat is
  set-up/payoff talk; the shrine is deduction talk; the map should be
  WANT talk. Design for divergent wants, not just scarce information.
- **P2. A branch matters only if it forecloses.**
- **P3. The three currencies (deck power / narrative / resources)
  must price each other**, not merely compete for layer slots.
- **P4. Danger is the price of greed** (R3): the strongest routing
  line should be the scariest, not the safest.

## 3. The direction: Knotwork

The map is drawn as what the lore says it is — the weave. Elites are
**knots**: places where the weave snarled, fixed in number and visible
from the act's start (R1). Paths are threads that approach, avoid, or
pass through them. Staged in two parts so the expensive move is gated
on evidence.

### 3a. Elites as anchors (R1 + R3) — stage 1, current topology

- **Fixed count, visible from layer 0.** Elite positions render on the
  act map immediately (they already generate deterministically); the
  pair plans around them from the first pick.
- **Arrival variety.** Generation guarantees ≥2 distinct approach
  paths per knot with different composition (one through events, one
  through fights — the composition CI in §5 enforces it). Arriving is
  a route choice, not a lane accident.
- **The snarl escalation (R3).** Each elite killed this act tightens
  the remaining knots: +HP/+DMG per prior kill (order env-knobbed,
  TB_ELITE_ESCALATION, battery-tuned). First elite = current tuning;
  greed prices itself. Thematically: cutting a snarl pulls the weave
  tighter everywhere else.
- **Reward table rework.** Elites currently pay gold + relic. Add the
  **bound witness**: a guaranteed fragment on kill — combat paying
  narrative, on-lore (the Witness reads what the enemy was). Sizing
  note: this raises fragment supply, so it lands WITH the tapestry
  supply conversation (dedup rung 0), not beside it — one supply
  ledger, moved once.
- **Optionality preserved.** No mandatory elites in stage 1; the
  knot-as-crossing role arrives in stage 2.

### 3b. Event depth (R2) — stage 1, the event grammar v2

Current grammar: prose → N labeled options → resultText + effects.
Extensions, all backward-compatible (existing events are 1-stage):

- **Stages.** An option may lead to another stage instead of ending
  the event: press-on / walk-away structure, stakes escalating per
  stage, with the pot visible. Two to three stages max; the wager
  shape (leave with what you hold vs. risk it deeper) is the point.
- **Visible stakes (R2 + R6).** Option buttons show their visible
  mechanical effects as effect stubs ("−2 HP · gain a common card" /
  "+10 gold"), rendered from the effects array — no hand-authored
  drift. Secret riders (pips, register strings) simply don't render:
  the held reveal explains nothing, and now the visible economy
  finally explains everything else.
- **The delta line.** After resolution, one line states exactly what
  changed, generated from applied effects. Kills the oath-ring class
  of confusion at the root.
- **State-keyed options.** Options may gate on run state: Thread
  level, gold, HP, deck composition (e.g. ≥N Hex cards), who stands
  at the door (character — machinery exists), and — the flywheel
  hook — **codex knowledge**: an option that only appears when the
  profile codex has proven a given answer. Meta-knowledge opening
  in-run doors makes the codex legible as power, feeding D3-C's
  "make progress louder" without touching completion criteria.
- **Per-seat address.** Build on the crossed-events machinery
  (chooser/subject split already ships): deeper events can stage the
  two seats differently — one decides, one holds the stake — which is
  divergent-wants pressure (P1) inside a single node.
- **Risk ceiling.** Higher risk/reward is licensed (R2): top-stage
  outcomes may reach relic-or-HP-chunk scale. Every event's worst
  line stays run-survivable by construction (no uncapped loss ops);
  the composition CI (§5) counts high-stakes events per act.

### 3c. Asymmetric scouting — stage 1, cheap, feeds the vote

Nodes show different faces per seat, reusing the ruling-5 machinery
(text never crosses screens): Vess's seat reads which question an
upcoming clue event bears on; Bram's seat reads an elite's reward
relic; occasional nodes are scouted by one seat only ("a door meant
for you"). Zero topology change, zero D6 impact; manufactures the
"what do you see on your side?" exchange the vote mechanic has been
waiting for. Survives any stage-2 topology, so it is not throwaway.

### 3d. The braid (stage 2, gated on stage 1's human read)

The act map becomes two warp strands crossing at the knots. The pair
walks one strand at a time; **the only way to cross the weave is
through a snarl** — fighting a knot grants the crossing (plus its
reward table). Strand affinity is currency-keyed (a truth-leaning
strand and a power-leaning strand — cleaner than character-keying for
solo play and less railroading). Commitment (P2) becomes structural:
a crossing declined is 2–3 layers of the other strand's texture
foregone. R1 lands fully here — fixed knots, and arrival variety IS
the strand choice. Costs, stated plainly: generator rewrite, bot
routing/event-seek rework, full D6/D7 re-battery, golden regens
(loud), and a railroading risk that the composition CI must bound
(minimum node-kind diversity per strand per act).

## 4. What this does to the three currencies

Fights and elites still pay power — but elites now also pay truth
(bound witness) at an escalating danger price (R3). Events still pay
truth — but now also carry the run's biggest visible gambles (R2),
priced in the power currencies (HP, Thread, gold). Rests and
treasures stop being free: the toll-door rest variant (heals ONE
seat, chosen) and Covet-style one-of-two treasure make the pacing
nodes the cheapest source of bickering on the map. Every node kind
now touches at least two currencies; the layer-slot opportunity cost
stops being the only price (P3).

## 5. Substrate and sequencing

1. **map-composition.js CI first** (the deferred spec's core, trigger
   now pulled): generation-time assertions — exact elite count, ≥2
   distinct approach paths per knot, ≥1 shop / ≥2 character-event
   chances per seat per act, high-stakes-event count bounds, strand
   diversity minimums (stage 2). Lands before any generator change so
   every subsequent map commit is provable.
2. **Stage 1** on current topology: 3a (anchors, escalation, reward
   table) + 3b (event grammar v2 + retrofit pass over existing
   events) + 3c (scouting) + the pacing-node variants (§4). Sprint
   doc in house format once this session's decision list is ruled.
3. **Stage 2** (the braid) gated on stage 1's stranger-cohort read:
   if anchors + deep events + scouting make the CURRENT map negotiate
   well, the braid is an act-identity upgrade we schedule; if the map
   still idles, the braid is the fix and we know it's load-bearing.

Verification implications, priced now: elite escalation and reward
changes are balance commits (batteries before/after, all pairs);
event grammar changes need flag-off parity attention (new stage
machinery must not shift unflagged rng); D6/D7 re-battery at every
stage; run-length gate (R4) reads on every battery.

## 6. Decision list (designer rules; nothing below implements first)

1. **Name the frame:** "Knotwork" (elites-as-knots, map-as-weave) —
   accept as canon vocabulary or re-name.
2. **Snarl escalation shape:** flat per-kill (+X% HP/DMG each) vs
   steepening (+X, +2X…). Recommend flat first (legibility).
3. **Bound-witness fragment:** approve elites paying narrative, and
   whether it ships with tapestry dedup rung 0 as one supply ledger
   (recommended) or waits for the D2 stranger read.
4. **Event grammar v2 scope:** approve stages + visible stakes +
   delta line + state-keyed options as the grammar; rule separately
   on codex-keyed options (flywheel hook — biggest upside, biggest
   authoring cost).
5. **Retrofit depth:** how many existing events get the multi-stage
   treatment in stage 1 (recommend: 2 per act as flagship "deep"
   events + all events get visible stakes + delta line).
6. **Toll-door rest + Covet treasure:** approve the pacing-node
   variants, or hold for stage 2.
7. **Strand keying (stage 2):** currency-keyed (recommended) vs
   character-keyed.
8. **Stage-2 gate:** ratify that the braid waits on the stage-1
   stranger read (or overrule and design it into the next sprint).
