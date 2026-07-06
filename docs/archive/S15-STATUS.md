# S15 Status — Braid Recalibration (2026-07-05)

Sprint doc: docs/archive/threadbound_sprint_S15_braid_recalibration.md. D0–D2 ruled
2026-07-05 (D2: **option C, A-first**, after the ramp-scaling design
analysis — pre-block scaling is the already-run A2/A4 experiment bb read
FLAT to; the accepted levers relocate damage past Block instead of
resizing it). Branch: `claude/sprint-14-15-design-review-6fxjef` (D0).
Anchors: S14's Part-4 rows, same container, cited not re-run.

Suite green after every commit (406 tests at tip, up from 388). One golden
regen (2A's pool growth); 2B and both riders left the fixture untouched by
construction. Total sim spend this sprint: ~5,600 runs across four
batteries + top-ups, seeds 1000+/1200+, S14-R5 discipline (pooled n≥200
per row; vb-default deliberately deepened to n=400 for the R1 read).

## What landed (commit per row)

- **S15.2A** — `attack_pierce` (post-block damage; Strength/Weak/
  Vulnerable/Fray still apply pre-pierce, so Weak IS the counterplay) +
  **The Seamripper** (act-2; normal comp `a2_ripper_eater`, knot-eligible
  elite comp `a2_knot_rippers`), own telegraph tint (`tel-pierce`,
  bone-bright — deliberately outside every faction hue), intent text
  states the whole mechanic, Witness intro pool (Mourner pattern), motif
  row. ALL strings + numbers RATIFIED as proposed - S16-D1 (D5 rows 1-10).
  - Rider 1: `describeIntent` rest-boon prose (exhaustive-switch catch).
  - Rider 2: knot fights escalate by NODE kind, not just def-elite —
    `a2_knot_rippers` carries normal-tier defs but IS the knot; union
    keying, all pre-S15 content byte-identical.
- **Bot telegraph read (PRODUCTION-WIDE, sim + solo — B14 precedent,
  correct play off public info):** the low-HP Guard preference inverts to
  a malus when every incoming hit pierces; the solo lethal-adjacent
  estimate stops crediting block against pierce. Pinned both ways.
- **S15.2B** — at A4 the Fray damage bonus lands PAST Block. Below A4 the
  arithmetic is byte-identical (pinned; golden untouched). Rung copy
  re-authored (RATIFIED - S16-D1, D5 row 8). The rung finally bites the pair it was
  aimed at — see the A4 differential below.
- **S15.3 instrument** — `TB_BOT_ALL_KNOTS` (S13.1a pattern, SIM-ONLY):
  the elite-excess routing probe; OQ#55's ≥2 gate reads on this leg. Loud
  in the sim knob header; pinned next to the knot-pricing test.

## The dose ledger (two battery-checkpoint resizes, both sanctioned by the
## sprint doc's "before the lever is re-sized" language)

| build | knot comp | def loop (pierce+plain) | knot heat | braid spread | vb default |
|---|---|---|---|---|---|
| battery 1 | ×2 | 12+11 | 28–36 | 17.3 | 40.5 |
| battery 2 | ×3 | 18+16.5 | 56–69 (!!) | 15.5 | 36.4 (R1 BREAK) |
| battery 3 (SETTLED) | ×2 | 14+9 | 30–39 | 12.2 | 38.3 (n=400, graze) |

Lesson, on record: the pierce lever's differential (guard-check) effect
rides its UNPREVENTABLE share; its absolute total is pair-neutral
collateral. ×3 bought 2 spread points by bleeding everyone (bb default
−11, vb default under the R1 floor). The settled mix shifts the loop
pierce-ward at ×2 bodies — the knot sits in the upper-normal heat band
(30–39, under the Bellkeeper's 50–55) and the spread closes to 12.2.

## Final rows (battery 3 + top-ups, the FINAL build)

| row | n | win % | act-1 pair HP/combat | Δ vs S14 anchor (HP) |
|---|---|---|---|---|
| vb braid | 200 | 40.0 | 36.50 | +1.04 |
| vv braid | 200 | 47.0 | 38.13 | +1.32 |
| bb braid | 224 | 52.2 | 34.92 | +1.37 |
| vb default | 400 | 38.3 | 31.95 | +0.75 |
| bb default | 223 | 39.9 | 29.03 | +0.19 |
| vb braid A2 | 200 | 17.5 | 43.57 | — |
| bb braid A2 | 200 | 28.0 | 41.61 | — |
| vb braid A3 | 200 | 12.0 | 44.82 | — |
| bb braid A3 | 200 | 25.0 | 41.27 | — |
| vb braid A4 | 200 | 13.0 | 44.76 | — |
| bb braid A4 | 224 | 22.8 | 42.36 | — |
| vb probe ×1 / ×2 | 200/200 | 25.0 / 20.5 | ladder 1.09 / 1.32 | — |
| bb probe ×1 / ×2 | 200/200 | 38.5 / 27.5 | ladder 1.09 / 1.25 | — |

(A4 pre-2B anchor, banked on the pre-2B build in this container:
vb 14.0 / bb 28.5, n=200 each.)

## Gates (Part 1, as ratified in D1)

1. **On-braid pair spread ≤15 — PASS.** vb 40.0 / vv 47.0 / bb 52.2 →
   spread **12.2** (S14 anchor: 18.0; S13.6's flip build: 33).
2. **bb on-braid within ±8 of vb — FAIL at +12.2**, improved from +18.
   The pierce lever saturates here: exposure × differential-share is
   bounded, and the ×3 dose experiment showed the next increment breaks
   R1 before it closes gate 2. The remaining closure lives in the
   designer-gated levers (D3-B lifts vb-braid from below; the S15-D4
   composition row raises bb's knot tax). Honest read: this gate does not
   close inside this sprint's ruled scope.
3. **vb keeps the co-op texture lead ON THE BRAID — PASS.** Link-fire
   vb 51.5% vs vv 48.4 / bb 48.1; thread spent/combat vb 8.92 vs
   bb 7.95 / vv 7.78.
4. **Ladder ≥2 on the elite-excess probe — FAIL, STRUCTURAL (the doc's
   pre-enumerated branch).** Two-point fit: signed constants
   [.10/.30/.60] → last/first 1.09; doubled (×2 scale) → 1.25–1.32, at a
   cost of 5–11 win points on the probe legs. The response is sublinear
   (knotsCut resets per act, so the last knot carries at most rung 2–3;
   pairs out-kill the HP scaling). Extrapolated ceiling ≈ 1.3–1.5 —
   the ×2-probe precedent holds. **Constants stay [0,.10,.30,.60]**
   (a tax that cannot reach the gate is not calibration); the structural
   lever returns as the S15-D4 proposal row below.
5. **A3 nonzero tooth on the braid — PASS.** Marginal vs A2 (the S13.6
   flat read, re-measured with sampled elites + the A3 crossing layer):
   vb −5.5 (17.5→12.0), bb −3.0 (28.0→25.0). The rung is no longer flat;
   NO placement proposal row needed (Part 3.3's "if still flat" branch
   does not trigger).

**HP tripwires (S14-R2 as amended) — PASS.** Floor: lowest pooled act-1
read 29.03 ≥ 16. Regression: max +1.37 (bb braid), inside +4, per pair
per topology — and act-1 is untouched by every S15 change, so these
deltas double as the observed noise floor.

**2B differential (A4 braid, vs the pre-2B anchor):** bb 28.5 → 22.8
(−5.7); vb 14.0 → 13.0 (−1.0). Post-block Fray taxes the guard pair
specifically. (Attribution note: the anchor predates the sizing re-mix,
so the bb delta carries a small mixed component — direction is clean,
the vb control barely moved.)

**R1 band (standing gate): vb default 38.3 at n=400 vs the 40–55 band —
FAIL-marginal.** *(S16-D2 RULED: option (c) — accepted as-is pending the
human difficulty re-read, with (b) pierce 7→6 PRE-APPROVED as the fallback
if the playtest agrees vb-default feels over-taxed. The band stays 40–55;
the row is reported FAIL-marginal-accepted, not re-tuned. Post-script, on
the record: the S16.0e re-anchor read this row at 49.0 (n=400) on the
socket-free instrument — the 38.3 carried the wire's contention tax, and
the band holds with room on the clean read. See docs/archive/S16-STATUS.md.)* The floor sits inside the CI (±~4.8), S14's anchor was
41.5, battery 1 (pierce-6 mix) read 40.5. Causally this is act-2 ripper
exposure on the classic map (the only lever touching that row). Two
checkpoint resizes were already spent; a third against a noise-level
target is tuning theater — the knob goes to the designer in D5 row 11.

## D5 sign-off table — rows 1–10 RATIFIED as proposed (S16-D1, 2026-07-05);
## row 11 ruled S16-D2 (both recorded in the S16 sprint doc)

| row | surface | proposed |
|---|---|---|
| 1 | enemy name | The Seamripper (`seamripper`) |
| 2 | mechanicLine | its needle passes under Block — banked guard will not stop it |
| 3 | flavor | It has never met a seam it respected, and it does not consider your guard a special case. |
| 4 | Witness intro (3) | "The Seamripper. Your guard is a seam like any other. It knows the way through." / "Block it all you like. The needle was never aiming at the wall." / "It took the choir apart one stitch at a time. Do keep it off its rhythm." |
| 5 | intent text | ⚔ N PIERCES — Block won't stop it |
| 6 | log line | strikes PAST p1's guard for N |
| 7 | rest-boon prose | N damage straight past your guard |
| 8 | A4 rung copy | the Thread frays on its last point — and Fray bites past Block |
| 9 | motif row | seamripper: crawler + tool (S12 grammar) |
| 10 | def numbers | hp [42,48]; loop pierce 7 / block 8 / attack 9 / pierce 7; knot comp ×2 |
| 11 | **the R1 knob** | vb default reads 38.3 (n=400) vs the 40 floor. Options: (a) accept the graze and re-band R1 to ~38–55 (the band predates the pierce roster); (b) pierce 7→6 (halves the re-mix; costs ~1–2 braid-spread pts, likely recovers vb default to ~39–40); (c) accept as-is pending the human difficulty re-read (R1's human half was always the senior read). **Rec: (c), with (b) pre-approved as the fallback if the playtest agrees vb-default feels over-taxed.** |

## D3 — the strand reward question (decision packet)

The doc's own logic: "rule A vs (B or C) AFTER Part 2's battery — if the
pierce lever alone pulls the spread inside gate 1, the −13.7 is a texture
fact, not a fairness problem, and A costs nothing." **Gate 1 passed
(12.2 ≤ 15) → recommendation: A (accept and record).** vb's braid
penalty is priced routing; the tapestry/codex payoff stays meta-scale by
design.

Held open, with eyes open: gate 2 (+12.2 vs ±8) is the one gate this
sprint could not close, and **D3-B (knots pay a pick to BOTH seats) is
the strongest remaining lever that closes it from below** (lifts vb-braid
specifically; composition change at the knot reward screen only). If you
want gate 2 closed in the next arc, rule B here or approve the D4 row
below — pierce is saturated and the ladder answer is structural.

## S15-D4 — knot composition (proposal row, STALLS for ruling)

Per the OQ#55 outcome (gate 4): constants cannot reach ≥2; the ruling's
pre-enumerated structural lever is composition. Proposal, sized from this
sprint's data: **the act's second-and-later knots draw from a harder
sub-pool** — weighted toward the guard-check comp (`a2_knot_rippers`) and
the act's hottest named elites (Bellkeeper tier), with the FIRST knot
keeping the full pool (the gentle debut stands). Effects, mechanically:
last/first rises by composition (not scales), and bb's knot tax rises
with it (gate-2 medicine). Enemy-count/composition is not a banned lever.
No code moved — awaiting the S15-D4 ruling (pre-approve vs fresh session).

## Instruments & texture, first reads

- Ripper-knot heat (settled): 30.2–39.1 hp/combat — upper-normal band,
  below every named act-2 elite. bb no longer pays less than vb there.
- Steady spend holds 392–641/row (B24 alive under pierce pressure).
- `a2_ripper_eater` stays braid-rare (act-2 strand combats are few);
  the knot comp carries the braid check by design.
- Probe legs (TB_BOT_ALL_KNOTS): win rates drop 11–15 pts vs unprobed
  rows — excess knots DO cost runs; what they don't yet do is cost
  progressively (the ladder's structural gap, see gate 4).
- 5 run timeouts across ~5,600 runs (0.09%), all topped up per R5.

## Next-playtest carries

The S14 carries stand (solo manual pass on the reseeded partner; human
difficulty re-read — now doubly load-bearing, it rules D5 row 11; D10
re-observation; B21 ringDiscountsFired). New: a human read on the pierce
telegraph (tint + intent line at TV distance — does "don't block this"
land without coaching?), and the B7/B19/B8 glance rows still wait.

## S16 pointers (nothing started)

Gate 2 closure via D3-B and/or the D4 sub-pool row (designer-gated);
the a2_boss outlier (55–82 under v2, tracked since S13); relic-shop
telemetry darkness (human data); the Brace-Up pierce-answer play-mix
comparison once human data exists (the bot mix barely moved — the bot
was HANDED the telegraph read in 2A, so its shift is by construction;
the human read is the real gate-5 test).
