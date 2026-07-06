# Threadbound — Sprint S11: Knotwork (Waves A + B)

Purpose: implement the map redesign ruled in
docs/archive/threadbound_map_knotwork_session.md. Two waves in one doc
(S9a/S10a stacked-build precedent): Wave A reworks composition, elites,
and the event grammar on the CURRENT topology; Wave B replaces the
topology with the braid. Per ruling S11.0-8 Wave B is NOT gated on a
human read — it is sequenced after Wave A's batteries only because it
builds on Wave A's CI and grammar.

Branch: `s11-knotwork`, from main after S9b (playtest response) and
S9c (feel slice: rite magnitude/identity + Resonance rungs i–ii) have
landed — the map read is only clean if rites and Resonance already
land. Hard scope rule: map generation, event grammar, elite
tuning/rewards, and their CI/batteries ONLY. No rite changes, no
question/answer changes beyond the single supply ledger in S11.3, no
Act 4. Balance and bugfix commits separate; content via
enumerate→propose→sign-off; golden regens only when forced, loudly.

## S11.0 Rulings (designer, 2026-07-02, recorded verbatim-adjacent)

1. **"Knotwork" is canon vocabulary** (elites = knots/snarls; the map
   = the weave).
2. **Snarl escalation is STEEP** — steepening shape, calibrated so
   that taking an excess of elites must cost HP. Overrules the doc's
   flat-first recommendation.
3. **Bound witness approved** (elites pay a guaranteed fragment on
   kill), shipping WITH tapestry dedup rung 0 as one supply ledger.
4. **Event grammar v2 approved in full**: stages, visible stakes,
   delta line, state-keyed options INCLUDING codex-keyed options.
5. **Retrofit depth: 2 deep events per act** as the first pass;
   remaining retrofits scheduled to a later content sprint.
6. **Toll-door rest + Covet-style treasure approved to try.**
7. **Strands are currency-keyed** (truth strand / power strand).
8. **The braid ships now** — no stranger-cohort gate.

---

## WAVE A — composition on current topology

### S11.1 Composition CI substrate (`scripts/map-composition.js`)

Generation-time assertions run over N seeded maps per config
(vitest + standalone script for CI):
- exact elite count per act (2; 3 at A3 extraElite);
- ≥2 distinct approach paths per knot with differing composition
  (path multiset of node kinds must differ);
- ≥1 shop, ≥1 treasure, ≥2 character-event OPPORTUNITIES per seat
  per act (queue admission, not guaranteed visits — D6/D7 language);
- high-stakes-event count per act within [1, 3];
- (Wave B adds) per-strand node-kind diversity minimums and
  character-events-on-both-strands.
Lands first; every later generator commit is provable against it.

### S11.2 Elites as anchors + the snarl escalation

- Elite nodes render on the act map from layer 0 (positions already
  generate deterministically; this is client + one map-state field).
- **Escalation (ruling 2, steepening):** after each elite KILLED this
  act, all remaining elites gain a growing increment. First-pass
  numbers (provisional, sign-off row): kill 1 → remaining +10% HP
  +10% DMG; kill 2 → additional +20/+20 (total +30/+30); kill 3
  (A3) → additional +30/+30 (total +60/+60). Env knob
  TB_ELITE_ESCALATION scales the increment ladder.
- **Calibration gate (ruling 2's teeth):** per-encounter HP telemetry
  (comfort-pass instrument) must show the act's LAST-killed elite
  costing ≥2× the pair-HP loss of its first-killed elite across the
  battery, at every pair. If a strong pair can clear all knots
  without meaningful HP payment, steepen and re-run before sign-off.
- Boss/act structure untouched; DMG-to-endanger convention governs
  which half of the increment leads if rebalancing is needed.

### S11.3 Elite reward table + the single supply ledger

- Rework: gold + relic (current) → gold + relic + **bound witness**
  (one fragment, served through the standard channel machinery).
- Same commit-series lands **tapestry dedup rung 0**: serveFragments
  prefers variants whose elimination is not already pinned to either
  board; falls back to duplicates only when exhausted. One supply
  ledger, moved once (ruling 3).
- Battery readout gains: distinct eliminations/run, questions
  provable/run (target: ~1 confident + 1 narrowed gamble at typical
  routing — the shrine is a real scene every run; the codex pace, not
  the run, owns completion).
- Fragment-supply telemetry keys added so the stranger cohort's D2
  read has instruments.

### S11.4 Event grammar v2 (ruling 4)

Engine (types + reducer, backward-compatible — existing events are
1-stage):
- `EventOptionDef.next?: EventStageDef` — press-on/walk-away, max 3
  stages, pot carried in event state and VISIBLE.
- **Effect stubs:** option buttons render visible mechanical effects
  generated from the effects array (never hand-authored). Secret
  riders (birth pips, register strings) have no stub — bundle secrecy
  by omission (R6).
- **Delta line:** post-resolution, one generated line of what changed.
- **State-keyed options:** `requires?` clauses over Thread, gold, HP,
  deck composition (tag counts), actor character (exists), and
  **codex knowledge** (profile has proven answer X). Codex-keyed
  options are the flywheel hook: meta-knowledge opens in-run doors.
- Flag-off parity: the grammar machinery is data-driven; unflagged
  runs contain no multi-stage or keyed events in their pools, so rng
  consumption is untouched. rng-consumption tests extend to prove it.

### S11.5 Retrofit + new deep events (ruling 5: 2 per act)

Sign-off table required before authoring (enumerate→propose→sign-off):
propose 2 events per act for the deep treatment (existing events
extended, or one extension + one new per act), each with stage tree,
stake ladder, worst-line survivability note, and any codex-keyed
option named. ALL existing events receive effect stubs + delta line
(that is rendering, not content — no sign-off needed). Remaining deep
retrofits: scheduled, later content sprint (ruling 5).

### S11.6 Asymmetric scouting

Per-seat node faces via the ruling-5 text-never-crosses-screens
machinery: Vess's seat reads a clue event's bearing question; Bram's
seat reads an elite's relic; rare one-seat-only scouted nodes ("a
door meant for you" — existence-naming, held-reveal-compatible).
Client + a per-seat projection field; no topology or rng impact.

### S11.7 Pacing-node variants (ruling 6)

- **Toll-door rest:** a rest variant healing ONE seat, chosen by
  vote-match like NODE_PICK (the negotiation is the point). Appears
  alongside, never fully replacing, plain rests (composition CI
  bounds the mix).
- **Covet treasure:** treasure offers one-of-two, resolved through
  the existing Covet machinery.

### Wave A gates

1. Full suite + composition CI green.
2. Batteries (pooled shards, all pairs, A0 + A2): win rates within
   ±6 pts of the post-S9c baseline UNLESS the escalation calibration
   gate demanded the drift — name it if so.
3. Run-length telemetry inside the 60–75 min human band's bot proxy
   (R4).
4. Escalation calibration gate (S11.2) passed.
5. Fragment telemetry shows the S11.3 target band.
6. Flag-off parity: rng-consumption tests green, no golden regen
   expected in Wave A; if forced, loudly.

---

## WAVE B — the braid (ruling 8: now)

### S11.8 Generator: two strands, knots as crossings

Flag-gated **TB_KNOTWORK=1** during development (parity safety: the
current generator remains the unflagged path until the braid verdicts;
soft-release public flags-off builds keep current maps).

- Two strands per act, currency-keyed (ruling 7): **truth strand**
  (event-heavy, clue-biased, shrine-adjacent texture) and **power
  strand** (combat/shop/treasure-heavy). Composition targets live in
  data, enforced by S11.1's per-strand assertions. **Character events
  appear on BOTH strands** (CI-enforced) — birth-rite arrival must
  not become strand-gated or D6/D7 breaks for strand-campers.
- Strand width 1–2 lanes (total layer width ≈ current 2–3 budget;
  R4 combat count holds). Within-strand micro-choice survives;
  between-strand choice is the commitment (P2).
- **Knots sit at fixed crossing layers** (2 per act; A3's third knot
  placement is an S11.0-open item below). Taking the knot = elite
  fight; victory grants the crossing (land on either strand next
  layer) plus the S11.3 reward table. Bypassing = continue your
  strand. The only way to cross the weave is through a snarl.
- Finale untouched; strands converge at the pre-boss forced rest.
- Lore strings (strand names, knot prose) PROVISIONAL pending a
  string-authoring pass against the bible; structure is the
  commitment.

### S11.9 Bot routing

Bot policy learns strands: value a strand by summed reachable
node-kind utility (event-seek weights reused); knot-taking decision
prices escalation state + crossing value. Re-baseline after (this is
a behavior-shifting engine-queue item by construction — its own
regen, loudly).

### S11.10 Wave B gates

1. Composition CI (strand assertions) green over both flag states.
2. TB_KNOTWORK batteries all pairs: win rate within ±6 of Wave A
   post-escalation baseline; run-length in band (R4).
3. **D6/D7 full re-battery** under TB_KNOTWORK: character events/run,
   birth-pick seats %, median arrival — against the B6 ledger
   (1.48/run, p1 10%/p2 20%, act 2 layer 5). Regression here blocks
   the flag default, not the merge.
4. Flag-off parity: unflagged generator byte-identical maps
   (golden lock).
5. Solo (bot-partner) plays sanely on strands — manual pass + the
   S11.9 re-baseline.

## S11.11 Open items (designer, non-blocking to start)

1. A3's third knot: extra crossing layer vs doubled knot at an
   existing crossing (recommend extra layer — preserves "crossings
   are scarce").
2. Escalation ladder numbers after first battery (sign-off row).
3. The S11.5 deep-event proposal table (blocks S11.5 authoring only).
4. Strand composition targets (data tables; sign-off before Wave B
   battery).
5. Whether TB_KNOTWORK flips default-on for the stranger-cohort
   playtest build once gates pass (recommend yes — ruling 8's
   spirit — with the public flags-off build untouched either way).
