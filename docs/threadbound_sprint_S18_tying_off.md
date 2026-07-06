# Threadbound — Sprint S18: Tying Off ("close the books, then the roadmap")

**Charter (designer, post-S17):** one ruling-and-execution sprint that
closes or formally parks every item awaiting a ruling, so the project
returns to the roadmap with an empty decision queue. This is the
design session the S17 §13 disposition ordered, authored as a sprint.
Nothing lands unruled; every table below stalls at sign-off per house
convention. **Hard scope rule: no content beyond the ruled levers; no
roadmap work rides along.**

**Sequencing law (standing):** instruments before balance — Part 1
(gate re-derivation) lands before any behavior change. Balance commits
separate from content commits. Golden regens loud, in their own
commits.

---

## Part 0 — Evidence on record (nothing here needs re-running)

The S17 final board (braid, A0, n=2000, same seeds 20001–22000
throughout — docs/S17-POWER-AUDIT.md §12):

| | S17.0 baseline | end of S17 (pass B) |
|---|---|---|
| vv | 54.4 | 36.0 |
| vb | 68.5 | 55.9 |
| bb | 74.0 | 71.7 |
| bb−vb (gate-2 band ±8) | +5.5 | **+15.8** |
| vv act-1 deaths | 27% | 38% |
| act-3 lethality (all pairings) | 0.7% of act-3 arrivals | unchanged shape |

Established by three S17 passes, carried as premises:

- **Bucket integrity is FIXED** within every pool (common < uncommon <
  rare on controlled lift) and holds under iteration. Not revisited
  here; the Part 6 exit battery re-confirms it as a regression check
  only.
- **The pool-vs-pool gap is structural.** Smallest-step scalar tuning
  moves it ~1–2 points a round against a +15.8 gap; the vess kit is
  setup-shaped (hex → detonate wants two turns and two seats), bram's
  is immediate. Per house law S17 stopped and reported; this sprint is
  the report's destination.
- **Gate-4 mechanism is fully visible** (S16-STATUS Part 6): braid
  paths meet at most TWO knots per act by construction; last/first is
  a knot-2/knot-1 ratio; the hottest existing comp yields ~1.8 as a
  sub-pool of one, dragged to ~1.26 by act 1. The ≥2 gate predates
  this ceiling.
- **The gate bands (±8 / ≤15 / +4) were calibrated on the contended
  wire** (S16 carry). The clean n=2000 board above is the natural
  anchor set.
- **Bot value ≠ human value** (S17 §1 caveats). Every park below that
  cites human data is citing this on the record.

---

## Part 1 — S18.1 Gate-band re-derivation (D1 — instrument rule, lands first)

The S16 carry executed. Proposed re-derivation, on the clean
instrument:

| # | rule | proposed form |
|---|---|---|
| 1a | Canonical anchor set | **seeds 20001–22000, n=2000 per pairing, braid A0, socket-free** becomes the named anchor battery (successor to S16-P100 for absolute reads; S16-R1 paired form unchanged for deltas) |
| 1b | Gate 2 | **bb−vb within ±8 stands as the intent band**, now read at n=2000 same-seed (the ±8 was a design intent; the wire contaminated the read, not the intent) |
| 1c | Trio spread ≤15 | **RETIRED if D2 ratifies its (c) half** (vv accepted as identity-hard); replaced by a vv FLOOR WATCH: vv act-1 death rate reported every battery, tripwire at +5 pts over its post-D2 anchor |
| 1d | HP tripwires | S14-R2 paired form (+4 pooled regression vs banked anchor, per pair per topology, floor ≥16) **unchanged** — the delta form already survives environment drift |
| 1e | Co-op texture gate | vb leads link-fire and thread/combat on the braid — **unchanged** (the S3 thesis gate; currently PASS) |

Deliverable: bands recorded here as ruled, anchors re-banked on the
tip build, one commit, no behavior change. **Everything downstream
gates against these.**

## Part 2 — S18.2 The pairing packet (D2 — the sprint's big ruling)

S17 §12 levers (a)/(b)/(c), plus packet S16-P1, ruled together.

**Ruled frame (designer, this session):** differentiation lives in
**unique starting decks** — no passives, no pre-applied state. The
Opening Thread proposal is **REJECTED as free power**; the lever
family is the vess starter list itself (`STARTER_DECKS`, cards.ts).
**Recommendation under the frame: a starter-deck reshape + the (c)
half; P1 is subsumed.**

**Code-grounded finding — the tenth-slot asymmetry:** bram's starter
carries `opener` (0-cost, Deal 4 + 2 Momentum, +12.3 lift — promoted
to uncommon in S17.1 yet retained as a starter slot) and `second_wind`
/ `kindle`; vess's carries `mendthread` — a dead-shape-cluster member
(§10) at zero across three batteries — plus `pinprick` and
`loose_stitch`. One seat opens with one of the game's best cards, the
other with one of its worst. The starters are already asymmetric in
quality; the ruling's frame says fix it **there**.

**Mechanism recap:** vv dies in act 1 (38%) because turn-1 links are
dead until a Hex lands, and the burst payoff (`knuckle_crack`,
"Detonate 2") lives on bram **by design** (§14.11 — cross-player by
construction). The mirror never detonates; Hex feeds only
`worn_knife`, blockable and capped. Starter levers that make turn-1
live and raise the defense floor, enumerated smallest-first:

| lever | change | strings owed | incidence & notes |
|---|---|---|---|
| S-1 | tenth-slot swap: `mendthread` out, second `pinprick` in | **none** | zero authoring; +0-cost Hex supply on turn 1; mendthread stays draftable (its shape parks per 6a) |
| S-2 | `patchwork` rider: "Gain 4 Block." → "Gain 3 Block. Apply 1 Hex." (dose row: 4 Block + 1 Hex) | retext + mutation/upgrade consistency check | ×3 copies — her defense turn IS her setup turn, exactly the Hexweaver's identity; touches vb half-weight, closing gate 2 from below (the P1 shape) |
| S-3 | new `starterOnly` vess card (Guard-with-Hex body) replacing one `patchwork` | full authoring: name, text, mutation, upgrade, Witness | reserve lever if S-1/S-2 probe short; biggest string cost |

**On the record — the M2-A5 tension:** starter decks are deliberately
poor so drafting matters. The claim here is that vess's is too poor
*in the mirror specifically*; the designer sets where that line sits,
and the probe reports vb's movement so the vb-side cost of the frame
is visible before ratification.

**The (c) half, proposed (unchanged):** vv is accepted as the
**identity-hard pair** — post-lever spread that remains is character
texture, not a gate failure. Gate 2 binds bb−vb only (Part 1c); vv
carries a floor watch, not a band.

**Probe protocol (dose comes from the designer, per house law):**
paired same-seed batteries per S16-R1 for S-1 alone, S-2 alone, and
S-1+S-2 — enumerated in advance so no dose is invented mid-pass.
Report vv/vb/bb paired deltas, vv act-1 death rate, and gate 2.
Designer ratifies one row; S-3 fires only if all three read short.

**Strings rider:** scoped to S-2 (retext) and S-3 (full) only; S-1
carries no strings. Tables stall in Part 7 until signed; Witness
lines literally true, as always.

### D2 sign-off table

| # | question | options | recommendation |
|---|---|---|---|
| D2-1 | lever family | **starter-deck reshape** (ruled frame) / scalar dose (a) / accept untouched | **starter reshape** |
| D2-2 | which levers probe | S-1 / S-2 / **S-1+S-2** / S-3 reserve | **S-1+S-2**, lean S-2 primary |
| D2-3 | S-2 dose | 3 Block + 1 Hex / 4 Block + 1 Hex | probe decides, designer ratifies |
| D2-4 | mirror spread | **(c) accept as identity**, gate binds bb−vb / keep trio gate | **(c)** |
| D2-5 | S16-P1 | subsumed by D2-1 (S-2's vb half-weight is the from-below lever) / kept separate | **subsumed** |

## Part 3 — S18.3 Difficulty (D3 — charter step 3, sequenced after D2)

Only ruled once pairing order is set: a global knob preserves order
and cannot fix it. Two distinct problems, two distinct levers:

1. **The level problem:** vb at ~56 (rising with D2) sits at the top
   of the band; bb ~72 is far above. A modest global dose sizes this —
   but note bb-side incidence: relic uplift already landed hardest
   where runs live longest (S17 §10), so a flat dose taxes bb most,
   which is the right direction.
2. **The texture problem (the bigger one):** act 3 kills 0.7% of
   arrivals. The boss act cannot lose you a run you didn't already
   lose. No global scale fixes this — it is act-shaped, and it is what
   a human player will actually feel at release.

**Recommendation:** authored act-2/act-3 teeth over global scale — the
knot sub-pool precedent (S16-D4) is the proven pattern. Enumerated
levers for the probe matrix, smallest honest dose each: (i) an act-3
boss sub-pool / second-intent rung (content — needs its own sign-off
row if new comps are authored); (ii) folding one A1-style rung into
the A0 baseline for acts 2–3 only; (iii) rest-heal trim (touches all
acts — flagged as the bluntest option); (iv) TB_ENEMY_HP/DMG scale
nudge (sizing reference only — recommend against as the shipped
lever). **The A3 placement question (S16 Part 6: bb reads FLAT at A3)
folds in here** — whatever rung lands should restore bb's A3 tooth,
read on the same battery.

Probe → report → designer sets the dose and the target band (proposed
target for discussion: vb 45–55 at A0, act-3 lethality visibly
nonzero). No dose proposed beyond the enumeration, by design.

## Part 4 — S18.4 The gate-4 packet (D4)

S16 options (a) authored knot-2 comp / (b) per-run knot escalation /
(c) re-derive the gate. **Recommendation: (c).**

The ≥2 gate predates the now-visible ceiling: two knots per act is
what the braid **is**, structurally — knots never edge into the next
crossing's knot, knotsCut resets per act, and even a sub-pool of one
(Bellkeeper tier) tops out ~1.8. A gate the topology cannot pass is
measuring the wrong thing. Proposed re-derivation: **knot-2/knot-1
pair-HP ratio ≥ 1.2 on the probe leg** — a regression floor that
protects the escalation that exists (currently 1.21/1.26, so it banks
the S16-D4 gain) instead of an aspiration the map geometry forbids.

Option (b) — per-run escalation — is a real design with real appeal,
but it re-paces both acts and is roadmap-sized, not close-out-sized;
if the post-D3 game still wants steeper knots, it returns as its own
sprint with its own thesis. Option (a) — a comp hotter than Bellkeeper
— is bounded by the ×3 pierce lesson and buys at most ~1.8 anyway.
Neither reaches 2; the honest move is the gate.

## Part 5 — S18.5 The law questions (D5)

**gravebloom vs the S13.2 flat-hex-echo law.** Recommendation: **the
law holds.** Hex dominance was a *structural* problem (OQ#28/#43 —
the only engine archetype, uncapped doubling); hookAll-hex past 2 is
precisely the direction the law was written to block, and bending it
for one dead card sets the precedent that any floor-raise can
petition. If gravebloom still needs help after the D2 reshape (which
raises early Hex density and may lift it for free), it gets a **different
axis** — enumerate in-sprint (e.g. detonate-side rider, or a draw
hook) and stall at sign-off; no authoring before the D5 ruling.

**braided_censer effect trim.** Recommendation: **PARK with a named
trigger.** The ruling already declined the trim this round in favor of
weight; the +5.4 stratified residual is a bot-resonance-rate artifact
until proven otherwise, and fray/resonance items are exactly where bot
and human play diverge most. Trigger, on the record: if the next human
playtest reads the censer as table-dominant, the pre-approved trim is
heal 2→1, no new session needed.

**S13.2-law-vs-uplift, generally.** Recommendation: laws outrank
passes **by default**, and a pass that collides with a law stops and
reports (as S17.2 correctly did) rather than landing — ratify this as
standing procedure so it never needs re-arguing.

## Part 6 — S18.6 Dispositions ledger (D6 — parking is a ruling too)

Each row closes an open item by ruling its disposition. None of these
land work.

| # | item | proposed disposition |
|---|---|---|
| 6a | Dead-shape cluster (measured_cut, slow_burn, tithe_of_thread, mendthread) + Thread-glue pattern (votive_thread, litany_of_mending) | **PARK to the playtest pile.** Three batteries prove scalar-immunity; the open question (Thread over-supplied vs bots under-banking) is adjudicable only by human data. Re-open trigger: first human playtest, debrief question on Thread banking, verbatim, unnamed. **No more +1s in the interim — ratified as a rule.** |
| 6b | Fray-relic trio (covetous_psalter, scar_votive, knotted_votive et al.) | **PARK.** Bots don't fray; these are the sloppier-human-pair relics by design. Human data rules. |
| 6c | OQ#41b (which relics become genuinely co-op) | **PARK to the content pass**, as already scoped. |
| 6d | OQ#56 (battery environment offset) | **CLOSE as superseded**, with verification: the offset was the WS-contention era; the socket-free path is deterministic per seed. Verify with one cross-environment n=100 same-seed row (byte-compare telemetry); if identical, the OQ closes with the evidence line. |
| 6e | Watches: a2_boss / a2_silence rows, OQ#53 (Linked Shields vs Immovable), D10 re-observe (shrine treatment unfired) | **REMAIN on the playtest slate** — already correctly filed; no ruling owed. Listed so the ledger is total. |

## Part 7 — Strings sign-off (stalls until each row is signed)

Populated at implementation: the D2 S-2 patchwork retext (plus
mutation/upgrade consistency), any S-3 authoring if fired, any D3 authored-comp names/lines, any D5
gravebloom retext. Nothing authors before its row is ruled; Witness
lines literally true; PROVISIONAL until ratified. (Anticipated-empty
rows stay in the doc per the S16-D2 precedent.)

## Part 8 — Batteries & exit gates (final build, Part 1 bands)

Same canonical seeds (20001–22000, n=2000 ×3) plus paired S16-R1 reads
per lever, attribution preserved by sequencing (D2 battery before D3,
as S16 Part 6 modeled).

Exit criteria — the sprint closes only if:

1. **Gate 2 (1b): bb−vb within ±8** at n=2000 same-seed.
2. **vv floor watch (1c) banked** with its post-D2 anchor; act-1 death
   rate materially below the 38% S17 exit (target visible in the D2
   probe, ratified with the dose).
3. **Bucket ordering holds** (common < uncommon < rare, all pools) —
   regression check only.
4. **Gate 4 (re-derived): knot-2/knot-1 ≥ 1.2** on the probe leg.
5. **HP tripwires (1d) PASS**; co-op texture gate (1e) PASS — vb keeps
   the link-fire and thread/combat lead.
6. **D3 target band met** as ruled, with act-3 lethality nonzero on
   the board.
7. **No-balance audit:** the diff's content plane carries exactly the
   ruled strings; every number change traces to a D-row.
8. **Ledger total:** every item in Parts 4–6 carries a ruling line in
   OPEN-QUESTIONS.md, dated. The decision queue reads empty.

## Part 9 — Designer decisions (D-list)

| D | decision | options | recommendation |
|---|---|---|---|
| D0 | branch | designated session branch from main (S14/S15 precedent) | — |
| D1 | gate bands | Part 1 table 1a–1e | ratify as proposed |
| D2 | pairing | Part 2 table D2-1…5 | starter reshape (S-1+S-2 probe) + (c) |
| D3 | difficulty | Part 3 levers (i)–(iv) + target band + A3 placement | authored act-2/3 teeth; band set by designer |
| D4 | gate 4 | (a) hot comp / (b) per-run escalation / **(c) re-derive ≥1.2** | (c) |
| D5 | laws | gravebloom axis; censer park-with-trigger; law-outranks-pass procedure | law holds; park; ratify procedure |
| D6 | dispositions | Part 6 ledger 6a–6e | ratify as proposed |

**After close:** the roadmap resumes — narrative-truth playtest slate,
ascension implementation, meta-progression — with the playtest pile
(6a/6b + D10 + the censer trigger + the R1 human read) as the first
playtest's pre-written agenda.
