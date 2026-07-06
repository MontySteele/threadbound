# S14 Status — Instruments & the Bundled Re-anchor (2026-07-05)

Sprint doc: docs/archive/threadbound_sprint_S14_instruments_reanchor.md. All rulings
(R1–R8, D0–D3, D5, D6) were recorded before implementation; D4 returns below
as the sign-off table, by design. Branch: `claude/sprint-14-15-design-review-6fxjef`
(the session's designated branch; the doc's `s14-instruments-reanchor` name
was superseded by the hand-off).

Everything landed. Suite green after every commit (388 tests at tip, up from
366). One golden-regen window, opened by B1 and ridden by B16 (each regen
loud, in its own commit); B13's behavior change left the fixture untouched
(random walks rarely reach elite cadence turns).

## What landed (commit per row)

- **S14.1 (B23)** per-card attribution: `cards.{plays,picks,winningDeck}`
  per card def per seat + `relicSources` (drop/boss/shop/treasure/event/
  shrine). Sim summary + aggregate-human.mjs read it out. Landed FIRST; the
  anchor rows below carry it.
- **R1 executed**: the M2 `win ≤ 40%` header gate retired; the sim bands
  **vb 40–55 at A0 default topology only**, mirrors/braid reported.
  aggregate-human.mjs reports human win rates unbanded.
- **S14.2 bundle** (separate commits inside one regen window):
  - **B1** elite slots SAMPLE the pool, both map paths (seeded shuffle →
    positional draw). GOLDEN REGEN. CI rider: every pool elite reachable at
    A0 across a seed sweep, both topologies + draw-order pinning.
  - **B14** bot link-planning collapsed onto the engine's computation
    (`computeLinksFiredFrom` kernel + `silencesFirstLinkActive`); the three
    hand-rolled copies are gone and bots now see Choir Silence (pinned:
    the bot Pulses the held link).
  - **B24** Steady heuristic (SIM-ONLY, solo never fires it): scrub active
    Fray stacks, or pre-bank the shield at remaining ≤ 1 — considered only
    after Pulse passes.
  - **B16** (R6) Wedding Knife filter simplification — drops-normally
    RATIFIED; the self-cancelling filter removed. Distribution-identical,
    rng-stream-different → GOLDEN REGEN in-commit.
  - **B13** (R7) tether-moving enemies (Warden of the Crossing, Bellkeeper)
    exempt from the §14.8 auto-retether. Small behavior change accepted
    knowingly; def-driven; pinned both ways.
  - **B15** (D6) solo bot reseed: the server passes the room's TRUE seed
    out-of-band; `redactFor`'s masking stays untouched (§11 intact, pinned).
    PRODUCTION SOLO SHIFT — the next playtest's solo pass reads the fixed
    partner.
- **S14.3 slate**: **B4** (R8) q_came re-keyed `covetEach` → `pendingThread`
  amount 2 (+2 Thread at the finale; shrine line retexted, PROVISIONAL);
  **B17** Hearth-Keeper retext to the shipped interpretation; **B18** codex
  "Not that descent:" phrasing; **B8** `.mech-reveal` max-width 26ch + the
  three longest S10a lines trimmed; **B9** six mechanicLine backfills
  (PROVISIONAL, table below); **B20** `rite:` inspect kind (worn vestment
  re-reads, pad-reachable via the RELICS zone); **B12** Pall Warden
  client-side last-owner forecast (recomputes on stage/reorder, §11-clean);
  **B10** held-reveal registers bundle-secret (content/witness joins the
  vite secret-stub; bundle-secrecy AND wire-capture assert every register
  chunk absent).
- **OQ#42**: found ALREADY EXECUTED — the "Pass on Coveting" button was
  dropped in `ffe615b` (S5.4). The ruling line formalizes shipped reality;
  no code moved.

## Part 4 — batteries & gates

Discipline: same-environment (this container), 25-run shards pooled,
seeds 1000+ (top-up shards at 1200 where a run timed out), TB_RITES=1
TB_BOT_SEEK_EVENTS=1, A0, v2, no TB_TRACKS (the S13.6 instrument
discipline). A PRE-S14 anchor was banked in this same container before any
behavior change — the R2 tripwire's delta reads against it, not against
S13.6's numbers (OQ#56: absolute rates are environment-local).

### The anchor rows (S15's banked anchor — cite, do not re-run)

| row | n | win % | act-1 pair HP/combat | Δ vs pre-S14 (same env) |
|---|---|---|---|---|
| vb default | 200 | 41.5 | 31.20 | +1.36 |
| vv default | 200 | 30.0 | 30.39 | +1.78 |
| bb default | 200 | 36.5 | 28.84 | +0.55 |
| vb braid | 200 | 40.0 | 35.46 | +0.73 |
| vv braid | 200 | 48.0 | 36.81 | −0.14 |
| bb braid | 224 | 58.0 | 33.55 | −0.58 |

(Pre-S14 same-container reads: vb 41.5/29.84, vv 35.4/28.61, bb 36.0/28.29
default; vb 34.5/34.73, vv 41.5/36.95, bb 56.7/34.13 braid.)

**On-braid shape, post-S14 instruments**: vb 40.0 / vv 48.0 / bb 58.0 —
spread 18.0, bb−vb +18.0, canonical pair still worst. Same shape S13.6
read (33-pt spread in its environment); S15's gates start from THESE rows.
S11.2 ladder last/first pooled 0.92–1.11 across rows — OQ#55 still
unbitten, exactly S15 Part 3's job.

### Gates

1. **CI/structure — PASS.** Suite green after every commit; B1 coverage
   test + sampled-draw pinning; retether-exemption pinning (both enemies +
   plain-elite control); knife-filter pinning; regen loud and in-commit
   (B1, B16); flag-off parity (golden lock) and rng-fuzz suites green
   throughout.
2. **Elite coverage — PASS.** All six elites appear at A0 in every row,
   both topologies. First-ever A0 heat rows, REPORTED: a1_elite_sexton
   25.4–30.3 hp/combat, a2_elite_unstrung 24.2–33.0 — both mid-pack
   (bellkeeper 42–55 and cantor 36–41 sit above them). The S10a variety
   thesis is finally live below A3, and neither new elite is hot.
3. **Band sanity (R1) — PASS.** vb default 41.5%, inside 40–55. Mirrors
   reported: vv 30.0, bb 36.5.
3b. **HP tripwires (R2 as amended) — PASS.** Floor: lowest pooled act-1
   read 28.84, comfortably ≥ 16. Regression delta: max +1.78 (vv default),
   inside +4, per pair per topology. Per-encounter outliers reported below.
4. **a2_silence re-read — STAYS HOT, graduates.** Pooled default-topology
   rows: pre-S14 55.3 hp/combat (n=21) → post-B14 57.0 (n=30), ~1.8× the
   battery mean, still flagged in the vb row (68.9). With bots now
   planning around the suppression, "bot-confounded" is falsified — the
   encounter graduates to a real S15-adjacent watch item (small n; it is
   one act-2 normal encounter).
5. **Steady nonzero — PASS.** 467–674 spends per 200-run row (~9% of the
   thread-spend mix; ~2.7/run) from a permanent 0 across all prior
   batteries. The verb finally measures; whether the heuristic's rate is
   RIGHT is a texture question for the next review, not a gate.
6. **No-balance audit — PASS.** The full sprint diff carries no enemy/
   card/scale/ladder number changes (checked by grep over content diffs).
   The only new number is R8's ruled pendingThread amount (2).

### Per-encounter outliers (R2c, reported)

a2_boss remains the tracked outlier everywhere: 55–74 hp/combat under v2
across rows (braid rows 66–83 pre, 55–72 post). a2_bell_pair flagged once
(74.7, n=6 — thin). a1_boss reads 55–65 on braid rows (the braid's
fewer-bloodier profile; consistent with its higher act-1 HP/combat).
Any a2-boss action stays a future sprint (S15 doc, Part 5.4).

### S14.1 instrument, first reads

- Top plays battery-wide: brace_up(34.5k), patchwork(32.6k), opener,
  pinprick, jab, loose_stitch — the Brace-Up floor-turn monotony note now
  has a number attached (S15 Part 5.5's pre/post pierce comparison is
  armed).
- Battery-wide, every one of the 129 acquirable cards was picked at least
  once (v2 drafts explore); per-config dead-card lists are the finer read
  for the next content sprint.
- picked-but-never-played: none.
- Relic sources: drop 2272 / boss 2112 / treasure 667 / event 436 /
  **shop 58** — shops are telemetry-dark for relics at bot rates (the B23
  note verified: 93–97% of bot gold goes to removals), so relic-shop
  content stays a human-data question.
- All 28 relics acquired at least once across the battery.

## D4 sign-off table — RATIFIED 2026-07-05 ("D4 lines look good")

All ten rows are final; the PROVISIONAL markers on these strings in the
content files and reducer are flipped to RATIFIED. The Choirmaster flag
at the end of this section remains open (not covered by the ratification).

B9 backfills (S10a diction standard):

| row | enemy | proposed mechanicLine |
|---|---|---|
| 1 | The Mourner | a Chain run of 4+ from one hand feeds it — +2 Strength that turn |
| 2 | The Cantor | every staged link that fails to fire armors it — +4 Block each |
| 3 | Choristers (×3, shared) | three bodies, one wound — and one always stands unbound |
| 4 | Warden of the Crossing | it trades its binding between you — who holds it is its choice |
| 5 | The Bellkeeper | its binding tolls from one of you to the other — the bell decides |
| 6 | The Unraveled | at half its blood it severs the Thread — two turns with nothing between you |

B8 trims (same table, same standard):

| row | enemy | was (chars) | proposed |
|---|---|---|---|
| 7 | The Unstrung | 96 | Resonate and the Thread Frays; hold back and it strikes twice |
| 8 | The Mislaid Sexton | 93 | every 3rd turn it eats the top of its bound one’s discard |
| 9 | Choir Silence | 82 | the first link each turn is held — a Pulse still forces it |

R8 rider:

| row | surface | proposed |
|---|---|---|
| 10 | Loom's Eye q_came-true line | The loom knows why you came — and leans toward you. The Thread arrives 2 deeper at the last fight. |

**Flagged, not ruled**: the Choirmaster carries mournerMechanic +
chainReader and is NOT in the ruled six — line it (one row) or leave the
a2 boss unstated? The Unraveled got its kit line under the ruling; the
face liveMechanics stay shrine-earned either way.

## Human-glance rows (no code until seen)

- **B7**: cyan `#7fd4ff` in the sigil tier-2 palette (sigils.tsx:52) —
  does the seat-hue law bind enemy marks under the v2 vocabulary?
- **B19**: codex undiscovered-slot contrast at TV distance.
- **B8**: the new 26ch mechanic-text cap needs one pad-distance glance.

## Next-playtest carries (recorded per the sprint doc)

The S13 solo manual pass (on the RESEEDED partner — B15 shipped); the
human difficulty re-read (R1/R2 human halves); the D10 re-observation
(debrief question 2 verbatim, unnamed); B21's human `ringDiscountsFired`
read.

## S15 readiness

S14's braid rows above are S15's banked anchor (its Part 0 cites them by
name). S15 still needs its own D0–D2 ruled (numbering/branch, the
re-authored gate set, the B5 pierce option) before implementation starts.
The A3-flat re-read prerequisite (sampled elites) is now in the baseline;
the ladder instrument (knot-pricing policy) is live; the per-card
instrument is in the anchors, so the guard-suite pre/post pierce
comparison will have a clean baseline.
