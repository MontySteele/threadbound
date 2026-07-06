# Threadbound — Sprint S15: Braid Recalibration ("the shipped map, made fair")

Purpose: implement the re-scoped remainder of S11.10 gate 2 (ruling
S14-R4). The braid is the shipped playtest game (TB_KNOTWORK=1 on the
deploy since PR #10, designer-confirmed), and on it the pairs read
vb 36 / vv 47.5 / bb 69 — a 33-point spread with the canonical pair
WORST. This sprint owns three coupled problems the S13.6 review
attributed to the braid: the bb asymmetry (live at the table), the
never-calibrated snarl escalation ladder (OQ#55), and the A3 rung
reading flat. It also carries the roster's one structural balance
lever — the through-block gap (sweep B5) — because it is the leading
hypothesis for the bb asymmetry and deciding it inside this sprint
means one battery answers both questions instead of re-anchoring the
braid twice.

Numbering: **S15**, branch `s15-braid-recalibration`, from main after
S14 has fully landed. **Hard sequencing dependency: S14 first.** S15's
anchor rows are S14's Part-4 braid batteries (sampled elites + the
suppression-aware bots + per-card attribution all in the baseline);
starting S15 before S14's batteries bank means every number here is
measured on a retired instrument.

Hard scope rule: the ladder constants, knot composition/pricing, the
B5 decision (one enemy + at most one ascension-rung redesign), and the
strand reward question ONLY. No card changes, no relic changes, no
rite changes, no gold levers (covenant), no Hex-amount growth
(covenant), no topology rewrite — the braid's shape is ratified
design (OQ#59 ruling); this sprint tunes what rides on it. Balance
commits separate from content commits; any authored strings (enemy
name/mechanicLine/Witness) via enumerate→propose→sign-off; golden
regens only when forced, loudly.

Sequencing status: S14 D0–D2 RULED (2026-07-04); this doc's gates
inherit R1/R2-as-amended/R5 in their recorded forms.

**RULED (2026-07-05), this doc's own D-list:**
- **D0 RULED:** S15 numbering ratified; work continues in the same
  session on `claude/sprint-14-15-design-review-6fxjef` (supersedes
  the `s15-braid-recalibration` branch name above, same precedent as
  S14). S14-first dependency satisfied — S14 banked at `922bddc`.
- **D1 RULED:** the Part-1 gate set ratified as written (spread ≤15,
  bb-vs-vb ±8 headline; non-braid demotes to comparison instrument).
- **D2 RULED:** option **C, A-first** — after a design analysis of the
  ramp-scaling alternative (recorded in the S15 status doc): pre-block
  scaling taxes weak-guard pairs first and is the already-run A2/A4
  experiment bb read FLAT to; the accepted levers relocate damage
  past Block instead of resizing it.
- D3, this doc's D4, and D5 remain open by design — they stall at
  their battery/sign-off checkpoints.

Companion evidence: docs/archive/S13-DIFFICULTY-REVIEW.md §4–§7,
docs/REVIEW-SWEEP.md B5, docs/OPEN-QUESTIONS.md #55/#59,
docs/archive/S9B-S11-STATUS.md (knotwork ledger), and S14's status doc
(the banked anchor rows).

---

## Part 0 — Evidence on record (nothing here needs re-running)

- **On-braid pair spread (flip build, S13.6 §5):** vb 36 / vv 47.5 /
  bb 69. bb's braid-vs-non-braid inflation is +24 and WIDENED across
  the card-economy fix while bb fights FEWER combats (5.8 won/run vs
  7.7) through bloodier ones (31.9 HP/combat). vv's inflation
  collapsed to +9.1 (edge of noise); vb now reads −13.7 vs non-braid
  — the economy fix working (routing around combat finally costs),
  reframed by this sprint as a strand-reward question (Part 3), not a
  gate failure.
- **Working hypothesis for bb (named in the review, unproven):** the
  S7.5 double-guard survivability signature interacting with braid
  structure — fewer, spikier fights favor the guard floor, and Bram's
  generic Momentum stack needs no specific engine pieces, so lost
  picks hurt it least. The structural root is sweep **B5**: the
  roster has ZERO through-block damage — every player-facing
  multiplier (Weak, Vulnerable, Strength, Fray) applies pre-block, so
  +10% damage is answered by +10% block, and the A4 Fray rung
  triggers off Thread spends guard pairs never make. One gap, three
  symptoms (bb's edge everywhere, bb's braid spike, two ascension
  rungs that don't bite the pair they should).
- **OQ#55 (the ladder):** last/first pair-HP ratio reads 0.98–1.63
  across flip-build legs vs the "excess elites must cost HP" ruling's
  ≥2 shape — still not biting even with knot-pricing live in the bot
  policy (the S11.9 instrument works: ratio moved 1.03 → ~1.45 when
  it landed; the ladder constants have never been calibrated against
  it). A clean ×2 probe read ~1.44 pooled — the bottleneck is partly
  structural, not just a constant.
- **A3 reads flat (±0) on the braid** (S13.6 §7): plausibly because
  the extra knot lands on a routable strand — the same route-around
  shape as gate 2 — AND because (pre-S14) the extra elite drew from
  the same two-elite rotation. S14's sampled elites change the
  second; this sprint re-reads the first.
- **Strand-runner reward deficit:** truth-strand routing sees ~18%
  fewer act-1 reward screens (75 vs 91), drafts less, and pays −14
  for it. Post-S13 this is the intended price of routing — the open
  design question is whether the truth strand's compensation (bound
  witness fragments, deep-event faces) is the right KIND of payment
  or whether it needs a card-reward channel.
- Noise law: all gates pooled n≥200 (S14-R5); anchors are S14's
  braid rows, same environment.

## Part 1 — S15.1 The gate, re-authored (D1)

Retire the braid-vs-non-braid ±6 framing as the headline (the braid is
the game; non-braid rows demote to comparison instrument). Proposed
gates, all pooled n≥200 on the shipped config (TB_KNOTWORK=1, v2, A0):

1. **On-braid pair spread ≤15 points** (the S3 parity bound, applied
   where the game is actually played). Today: 33.
2. **bb on-braid within ±8 of vb on-braid.** Today: +33. The ±8
   (wider than ±6) acknowledges the noise floor at the leg counts we
   can afford; tighten later if pooling deepens.
3. **vb keeps the co-op texture lead ON THE BRAID** (resonances,
   link-fire, thread engagement vs mirrors) — the thesis gate,
   re-read on the shipped map.
4. **Ladder gate (OQ#55, inherited):** last/first pair-HP ratio ≥2 on
   an elite-excess routing probe — measured with the S11.9
   knot-pricing policy that now exists, calibrating ladder and policy
   together per the OQ#55 ruling.
5. Direction read, not banded: A3's rung produces a nonzero win-rate
   tooth on the braid (today ±0).

## Part 2 — S15.2 The B5 decision (D2 — the sprint's one roster lever)

Design law: one way through Block, legible, telegraphed, and aimed so
that symmetric-guard pairs specifically must answer it. Enumerated
options:

- **A (recommended): one act-2 pierce-class enemy** — an intent that
  "strikes past your guard" (post-block damage), telegraphed with its
  own tint (the TELEGRAPH map gained the dilemma tint in the sweep;
  pierce gets its own). Placed in the act-2 normal pool AND eligible
  for knot encounters, so the braid's fewer-bloodier fights include
  the guard check. New enemy def + strings via sign-off; engine gains
  one intent kind with a pinning test.
- **B: post-block Fray on the A4 rung** (redesign) — the existing
  rung gains teeth against turtles specifically; no new enemy.
- **C: A + B** (the sweep's full recommendation) — the roster check
  at all ascensions plus the rung that bites guard pairs at A4.
- **D: knot-only pierce** — the new enemy appears only at knots;
  narrowest change, aimed exactly at the braid spike, but leaves the
  base-roster gap (bb's everywhere-edge) untouched.

Recommendation: **C**, sequenced A-first (own commit, own pooled
battery before B lands) so the two levers' effects are separable in
the ledger. Note loudly: A moves bb on BOTH topologies — the
non-braid comparison rows re-anchor as part of this sprint's
batteries, which is priced in (they run anyway).

Covenant check: pierce is post-block damage, not Hex; no Hex-amount
growth; caps not implicated. Witness/mechanicLine strings PROVISIONAL
until the witness read, per precedent.

## Part 3 — S15.3 Ladder & knot calibration (OQ#55 executed)

With the policy instrument live (knot-pricing) and S14's sampled
elites in the baseline:

1. Calibrate the snarl escalation constants against the ≥2 gate on an
   elite-excess routing probe (a probe flag directing bots to take
   every knot — sim-only, S13.1a pattern). The ruling's shape stands:
   steepening, so excess snarls must cost HP; the constants have
   simply never been fit to it.
2. If the ×2-probe precedent holds (structural ceiling near ~1.5),
   the pre-enumerated structural lever is knot composition rather
   than constants: later knots draw from a harder sub-pool or carry a
   second body (composition, not scales — enemy-count is not a
   banned lever). Returns as a proposal row before anything lands.
3. **A3 rung follow-up:** with sampled elites, re-read A3 on the
   braid. If still flat, proposal row: the A3 extra knot becomes
   non-routable (placed on the crossing layer both strands must
   touch) — a placement change, not a number change.

## Part 4 — S15.4 The strand reward question (D3 — design ruling, may be "accept")

vb's −13.7 on-braid penalty is the card economy pricing route-around
correctly. The question this sprint must answer on purpose rather than
by default: is the truth strand's compensation (fragments, deep-event
faces) meant to be worth the foregone picks, or does the truth strand
need one card-reward channel? Options:

- **A: accept and record** — routing IS a real trade now; the
  tapestry/codex payoff is meta-scale by design; no change. (Cheapest;
  consistent with "the mix STANDS as design.")
- **B: knots pay a pick to BOTH seats regardless of strand** (they
  already cross both strands; makes the mandatory crossings the
  card-economy equalizer). Composition change at the knot reward
  screen only.
- **C: one truth-strand deep event gains a card-offer face**
  (Carillon/Hymnal precedent — their shallow faces already pay
  relic/rare). Content, sign-off table.

Recommendation: rule A vs (B or C) AFTER Part 2's battery — if the
pierce lever alone pulls the spread inside gate 1, the −13.7 is a
texture fact, not a fairness problem, and A costs nothing.

## Part 5 — Batteries & gates

Anchors: S14 Part-4 braid + non-braid pooled rows (cited, not
re-run). All S15 gates pooled n≥200, same environment, shipped config;
non-braid rows re-anchor once (Part 2 consequence). Sequence: Part 2A
→ battery → Part 2B (if C ruled) → battery → Part 3 calibration →
battery → Part 4 ruling → (if B/C) final battery. Each battery is one
pooled pass over vb/vv/bb braid + vb/bb non-braid.

1. **CI/structure:** pierce intent pinning tests; telegraph tint
   coverage; ladder constants under test; knot-reward pinning if
   Part 4-B lands; suite green per commit; any forced regen loud.
2. **Gates 1–5 from Part 1** read on the final build.
3. **HP tripwires (S14-R2 as amended):** the ≥16 floor holds
   everywhere, AND pooled act-1 pair HP/combat stays within +4 of the
   S14 anchor per pair per topology — pierce adds damage by design,
   and this is the gate that says how much bloodier the fights may
   get before the lever is re-sized. The 16–22 TARGET remains
   human-only and is reported, not gated.
4. **Per-encounter attribution:** the new enemy's heat row lands in
   the table; the a2 boss remains the tracked outlier (60.5 under v2)
   — REPORTED; any a2-boss action is a future sprint, not this one.
5. **Per-card sanity (new S14.1 instrument):** the guard suite's play
   rates pre/post pierce — the check that the lever changed
   DECISIONS, not just outcomes (Brace-Up×4 floor-turn monotony was
   the fun-factor note; a pierce answer should show in the mix).

## Part 6 — Designer decisions (D-list)

- **D0** Ratify S15 numbering + branch + the S14-first dependency.
- **D1** Ratify the re-authored gate set (Part 1), esp. spread ≤15
  and bb-vs-vb ±8 as the headline pair.
- **D2** B5 option A/B/C/D (recommendation: C, A-first).
- **D3** Strand reward: A / B / C (recommendation: defer ruling until
  Part 2's battery, then A if gate 1 already passes).
- **D4** Part 3.2 knot-composition lever: pre-approve as the fallback
  if constants alone can't reach the ≥2 ladder gate, or require a
  fresh session.
- **D5** Sign-off tables at implementation: the pierce enemy's
  name/mechanicLine/Witness lines (PROVISIONAL until witness read),
  and Part 4-C's event face if ruled.

Hand to Claude Code after S14's status doc banks and D0–D2 are ruled;
D3/D4 are written to stall safely at their battery checkpoints.
