# Threadbound — Sprint S14: Instruments & the Bundled Re-anchor

Purpose: (a) ratify the instrument decisions the S13.6 difficulty review
left as designer yes/nos — the head of every downstream dependency
chain; (b) land the last blind instrument (per-card attribution) BEFORE
any behavior changes; (c) burn down every open review-sweep item that
individually invalidates baselines — in ONE bundle, so the project pays
for one golden regen and one pooled re-anchor instead of five; (d) clear
the no-dependency content/UI slate that has sat open since the sweep.

Numbering note (D0, needs ratification): S12 = art overhaul, S13 = card
economy. This sprint takes **S14**, branch `s14-instruments-reanchor`,
from current main (post-PR #12). The braid recalibration is **S15**
(companion doc), sequenced strictly after S14's batteries — S14's braid
rows are S15's banked anchor.

Hard scope rule: instruments, the six bundled behavior/rng fixes, and
the content-string/UI slate ONLY. **No balance tuning** — no enemy
number, scale, ladder constant, card cost, or rarity odds moves in this
sprint (the pierce question, the ladder, and every difficulty lever are
S15 or later). No map topology changes; TB_KNOTWORK deploy default
stays as shipped. No Act 4. Balance-adjacent behavior commits separate
from content commits; content via enumerate→propose→sign-off; golden
regens only when forced, loudly — this sprint forces exactly one, and
part of its purpose is that everything needing one rides it together.

Companion evidence: docs/S13-DIFFICULTY-REVIEW.md (the five recs and
the noise floor), docs/REVIEW-SWEEP.md (Bucket B items cited by number
below), docs/OPEN-QUESTIONS.md.

---

## Part 0 — Rulings ledger (designer; blocks everything below)

These are recorded here so the sprint carries its own instrument law.
R1/R2/R5 are the S13.6 review's recs 1/2/5 verbatim-adjacent; R3/R4 are
its closures; R6–R8 are sweep/OQ items whose rulings gate S14 work
items. Every gate in Parts 4–5 is written against R1/R2/R5 as
recommended — if a ruling lands differently, the gate text amends
before implementation starts.

- **R1 — Bot win-rate band, re-authored for the v2 instrument.**
  Proposal: **vb 40–55% at A0, default topology; mirrors REPORTED, not
  banded** (S5 gate-4 pattern). The 25–35 band was calibrated to
  draft-v1 bots that no longer exist; re-centering the game to chase a
  bot upgrade players never felt is rejected on the bots-are-
  instruments principle. Human data rules at the next playtest (OQ#14).
  The sim's M2 header gate (win ≤40%) retires with this ruling.
  **RULED (2026-07-04): as proposed** — vb 40–55 at A0 default
  topology; mirrors reported, not banded; the M2 header gate retires.
- **R2 — The 16–22 act-1 HP target becomes a HUMAN watch band; bots
  keep a bloodiness TRIPWIRE.** Bots stop being read against the
  16–22 target (4–8 over for four sprints across every policy and
  content stage). If the next playtest ALSO reads bloody, the lever is
  a −0.05 DMG notch — own commit, own battery, S5.5 precedent, and
  explicitly NOT this sprint.
  **RULED (2026-07-04): amended by designer — keep a bot HP gate for
  especially bloody fights.** Recorded form (three tripwires, all
  bot-side, none a tuning target): (a) the S9d.A1 floor holds — act-1
  pair HP/combat must not sag below 16 anywhere; (b) **regression
  tripwire: pooled (n≥200) act-1 pair HP/combat must not rise more
  than +4 vs the banked S14 anchor, per pair per topology** — the
  delta form survives environment drift and fires on exactly
  "bloodier than the anchor"; (c) per-encounter HP attribution
  continues, with outlier flags (the a2-boss class) REPORTED in every
  status doc. The +4 width is designer-amendable; it sits above the
  observed same-config leg spread (29.4 vs 29.7).
- **R3 — Close the fight-price question.** Winners fight more in every
  flip-build leg; the payout changed, not the price. No repricing.
  **RULED (2026-07-04): CLOSED.**
- **R4 — Re-scope S11.10 gate 2 per the review's §5.** Economy half
  CLOSED (fixed by S13); the remainder — the bb pair asymmetry
  amplified by braid structure, plus the never-calibrated escalation
  ladder (OQ#55) — is re-filed as **Sprint S15**, whose gate is
  re-authored there as on-braid pair spread (see the S15 doc, D-row
  S15-D1). **RULED (2026-07-04): re-scope ratified** — economy half
  CLOSED; remainder is Sprint S15.
- **R5 — Pooling rule:** any ±6-style gate reads pooled **n≥200** legs
  from here on; 100-run legs remain fine for coarse sweeps and
  texture. (The measured cross-invocation noise floor is ±7–10 points
  per 100-run leg; 61/99 same-seed runs flip outcome between
  invocations.) **RULED (2026-07-04): adopted.**
- **R6 — B16 (Wedding Knife):** ratify observed drops-normally
  behavior AND take the filter simplification in S14.2 (the sweep
  noted the simplification is distribution-identical but not
  rng-stream-identical — this sprint IS the golden-regen window it
  wanted). Alternative: ratify and leave the dead logic; strike the
  S14.2 row.
  **RULED (2026-07-04): ratify + simplify, as recommended.**
- **R7 — B13 (auto-retether exemption):** exempt enemies whose OWN
  mechanic moves tethers (today: the Warden of the Crossing's sever
  intent) from the §14.8 every-3rd-turn cadence. Note honestly: on
  turns where the two do NOT coincide this is a real (small) behavior
  change, not just a log fix — the Warden re-tethers less often
  overall. Recommended as the sweep recommended it: the cadence exists
  to un-park fights this enemy already un-parks.
  **RULED (2026-07-04): exempt** — the small behavior change accepted
  knowingly.
- **R8 — B4 (q_came payoff):** re-key the Loom's Eye q_came-true
  reward from `covetEach` (unspendable where it lands — the shrine
  sits after the run's last reward screen) to **`pendingThread` for
  the finale** — the in-source comment's own alternative, thematically
  "the loom leans toward you." One switch case at the reducer's
  PROVISIONAL block (reducer.ts ~:1101). Amount proposal: 2. Rides
  S14.3 as a content-adjacent commit with its own log line.
  **RULED (2026-07-04): re-key to pendingThread, amount 2 (the
  proposal as written).** The triumphant shrine line retexts to state
  the real gain (Witness-never-lies fence applies); string rides the
  D4 sign-off table.
- Housekeeping closures, if you agree (one line each in
  OPEN-QUESTIONS): **OQ#39** CLOSED — PT3 data says leave base regen
  at +2 (high spend + low waste + heavy Pulse use in the beta run).
  **OQ#52** — the D9/D10 classification is still marked OPEN; S9c
  pre-spent the presentation for the stronger branches, so this is
  likely a one-line ruling. **OQ#56** — propose CLOSED-AS-MANAGED: the
  same-environment re-anchor discipline plus R5's pooling rule is the
  operational resolution; cross-machine comparisons remain
  unreliable by policy.

## Part 1 — S14.1 Instruments (land FIRST, before any behavior change)

**Per-card attribution (sweep B23).** Telemetry gains per-card play
counts and per-card presence-in-winning-deck counts (per seat), plus
relic acquisition source (drop/shop/treasure/boss). Sim summary and
aggregate-human.mjs both read it out (top/bottom-10 by play rate;
never-picked / never-bought lists). This is the "dead cards" instrument
the content-audit lens has been blind without, and it must exist in the
baseline batteries BEFORE S15 touches balance — instruments before
numbers, the house ordering. Sim-only surfaces plus the Telemetry
type; no gameplay change; goldens unaffected (telemetry is
hash-excluded by design).

Landing order note: S14.1 is its own commit, and the Part 4 batteries
run AFTER the full S14.2 bundle — the anchor rows must carry the new
instrument.

## Part 2 — S14.2 The bundled behavior/rng fixes (one loud regen window)

Each row individually invalidates baselines (rng consumption, sim
behavior, or golden state-hashes); bundled, they cost one regen + one
pooled re-anchor. Separate commits per row inside the window; suite
green after each; the regen lands with the first rng-consuming row and
is called out in-commit.

1. **B1 second half — elite slots SAMPLE the pool.** Both map paths
   are still positional: `map.ts:127` (classic) and `map.ts:630` (the
   braid's knots) index `eliteIds[i % length]`, so the Mislaid Sexton
   and The Unstrung cannot appear below A3 and never have. Change:
   seeded sample-without-replacement per act from `pools.elite` in
   both paths. This was RULED at the sweep (2026-07-02) as "the first
   post-playtest engine change"; it is also a prerequisite for S15's
   A3-flat re-read (the extra A3 knot currently serves the same two
   elites). rng-consumption change → the regen. CI rider: a
   coverage test asserting every pool elite is reachable at A0 across
   a seed sweep.
2. **B14 — bot link-planning learns Choir Silence, via the dedup.**
   Collapse bot-policy's three hand-rolled link-fire computations onto
   the engine's `computeLinksFired` (the sweep's runner-up refactor —
   the Choir Silence blindness is the drift bug the duplication
   already caused), which brings the suppression along for free. Sim
   behavior shift → rides this re-anchor. Consequence to re-read in
   Part 4: the a2_silence_wretch heat flag (62.3 hp/combat) was
   measured by bots fighting it wrong.
3. **B24 — Steady stops being structurally zero (sim-only).** A
   minimal bot heuristic: consider Steady when pool ≤1, an
   overdraft-Fray is otherwise imminent, and no higher-scoring Thread
   action exists. The verb is then judged on data instead of on a
   zero. No production surface changes.
4. **B16 — Wedding Knife filter simplification** (per R6): the
   last-resort concatenation is dead logic; simplify to plain
   pool-exclusion-until-exhausted. Distribution-identical,
   rng-stream-different → rides the regen window.
5. **B13 — retether exemption** (per R7): enemies whose def carries a
   tether-moving intent are skipped by the §14.8 cadence
   (combat.ts:1301 block). Behavior change → goldens.
6. **B15 — solo bot reseed.** The solo driver derives its policy seed
   from the redacted view, and `redactFor` masks `seed = 0`
   (lib.ts:~695), so every solo run's partner plays identical seeded
   choices at identical contexts (and delayFor jitter is constant
   too). Fix: the server passes the room's true seed to the driver
   out-of-band (the driver is server-side; no wire/redaction change,
   §11 intact). Production solo behavior shift, sim untouched —
   flagged in the commit as such.

## Part 3 — S14.3 Content-string & UI slate (no battery dependencies)

Content strings via the sign-off table below; UI rows are
presentation-only. Separate commits from Part 2; nothing here touches
goldens except where noted.

1. **B9 — mechanicLine backfill, six rows** (content sign-off table):
   the pre-S10a mechanic carriers (Mourner, the Cantor, the chorus,
   Pall-adjacent wardens, the Unraveled) get one-line mechanicLines so
   "no line = no mechanic" stops misleading. Proposals drafted at
   implementation, returned as a 6-row table, S10a diction standard.
2. **B17 — Hearth-Keeper retext** to the shipped S7 interpretation:
   "When spending Momentum halves it, keep up to 3." (rites.ts:221
   currently teaches a decay rule that doesn't exist.) Ratifies the
   interpretation per the sweep rec.
3. **B18 — Codex elimination phrasing** → per-descent: "Not that
   descent" (Codex.tsx:46) so a later run can't contradict the record.
4. **B8 — enemy frame width + line trims:** max-width on `.enemy`
   mechanic text (CSS), plus trims for the three longest S10a lines
   (content strings — rows in the same sign-off table as B9). Needs
   one pad-distance glance.
5. **B20 — a `rite:` inspect kind:** name/flavor/text of the worn
   birth-rite, pad-reachable after the pick. Recall isn't reveal; the
   held-reveal ruling covers the unpicked trio only.
6. **B12 — Pall Warden client-side last-owner forecast** (recomputes
   on reorder; §11-clean — same computation the planned-Block preview
   uses). Kills the "the game lied about the target" class on a warm
   encounter.
7. **B10 — held-reveal registers become bundle-secret:** stub the
   70%-gated registers server-side (witness.ts:158/:169 import
   channel) and add them to the wire-capture assertions — same
   treatment the Vigil/Half-Carried leaks got. The "post-playtest"
   deferral has expired.
8. **B4 — q_came re-key** per R8 (one switch case + log line; the
   PROVISIONAL comment resolves).
9. **OQ#42 — drop the redundant "Pass on Coveting" button** (Onward
   auto-passes; keep-as-explicit-decline is the alternative — a one
   -word ruling either way).
10. Human-glance rows, no code until seen: **B7** — cyan `#7fd4ff`
    survived into the new sigil grammar's tier-2 palette
    (sigils.tsx:52); does the seat-hue law bind enemy marks under the
    v2 vocabulary? **B19** — codex undiscovered-slot contrast at TV
    distance.

Explicitly NOT in S14 (parked with owners): B5 pierce (S15-D2), B21
Ring escalation (human `ringDiscountsFired` read, next playtest),
OQ#26 Thread levers / OQ#31 resonance coverage / OQ#40 sever verb /
OQ#41 relic sharing / OQ#44 ascension model / OQ#45 anti-streak
binding (design-session queue), the Lens-5 content backlog (next
content sprint), the seat-list refactor (scheduled before Act
4/character 3 per the roadmap — worth its own slot soon; it is not
snuck in here), and the **socket-free sim harness** (OQ#56 backlog
item: the harness constructs BotViews directly from engine state and
calls policies in lockstep — per-run reproducibility, a far smaller
noise floor, cross-machine comparability; lands immediately before
the first post-S15 sprint so its forced re-anchor is free).

Next-playtest carries (for the playtest plan, recorded here so it
travels with the packet): the S13 solo manual pass (on the reseeded
partner), the human difficulty re-read (R1/R2 human halves), the
D10 re-observation (debrief question 2 verbatim, unnamed —
intrigue / stall / no-registration, now against grown rites and
braid-rate arrival), and B21's human `ringDiscountsFired` read.

## Part 4 — Batteries & gates

Discipline: same-environment; seeds 1000+; TB_RITES=1
TB_BOT_SEEK_EVENTS=1; A0; v2 default (the shipped policy). Gates read
POOLED n≥200 per R5. Run AFTER the full S14.2 bundle, carrying S14.1's
instrument.

Rows (each pooled ≥200 unless marked texture):
- default topology vb / vv / bb — the post-S14 base anchor;
- **TB_KNOTWORK=1 vb / vv / bb — these braid rows are S15's banked
  anchor** (its Part 0 cites them by name; do not re-run them there);
- one A0 elite-coverage sweep (gate 2);
- one a2_silence-focused read from the base rows' per-encounter table
  (gate 4).

Gates:
1. **CI/structure:** suite green after every commit; the B1 coverage
   test (every pool elite reachable at A0); pinning tests for the
   sampled-elite draw order, the retether exemption, and the knife
   filter; the one golden regen loud and in-commit; flag-off parity
   and rng-fuzz suites green.
2. **Elite coverage (the B1 point):** at A0, all six elite encounters
   appear across the seed sweep in both topologies; per-encounter
   telemetry shows Sexton/Unstrung heat rows for the first time —
   REPORTED, not banded (they've never been measured at A0).
3. **Band sanity under R1:** pooled vb inside 40–55 at A0 default
   topology; mirrors reported. (This is a sanity read on the new
   band, not a tuning gate — nothing in S14 may be tuned to pass it;
   if it misses, that is R1 evidence, recorded, not chased.)
3b. **HP tripwires under R2 (as amended):** the ≥16 floor holds
   everywhere; pooled act-1 pair HP/combat within +4 of the
   pre-S14 same-environment read, per pair per topology — B1's
   sampled elites and B14's smarter fighting are the two rows that
   could plausibly move it, and this gate is exactly the designer's
   "watch for especially bloody fights" instrument. Per-encounter
   outlier flags reported, incl. first-ever A0 Sexton/Unstrung rows.
4. **The a2_silence re-read:** with B14 landed, re-read the
   62.3-hp/combat outlier flag. Expected to cool; if it stays hot with
   bots now fighting it right, it graduates from "bot-confounded" to a
   real S15-adjacent watch item.
5. **Steady is nonzero** in the sim readout (direction gate, not a
   band) — the stat finally measures a verb.
6. **No-balance audit:** the diff carries no enemy/card/scale/ladder
   number changes; reviewer-checkable by inspection.

## Part 5 — Designer decisions (D-list)

- **D0 RULED (2026-07-04):** S14 numbering + branch ratified.
- **D1 RULED (2026-07-04):** R1 as proposed; R2 AMENDED — the bot HP
  tripwire set (floor / +4 regression delta / outlier flags) stays as
  a gate; R3, R4, R5 as proposed.
- **D2 RULED (2026-07-04):** R6 ratify+simplify; R7 exempt; R8
  pendingThread, amount 2.
- **D3 RULED (2026-07-04), all three:** OQ#39 CLOSED — base regen
  stays +2 (PT3 data: high spend, low waste, heavy Pulse use).
  OQ#52 — **D9 classified Branch C** (identity communication
  failure; the C EXECUTE shipped in S9c, the mechanical half
  superseded by S9d's growers — closes with no new work); **D10
  classification DEFERRED** — the live read was "not impactful, not
  understood" (Branch-C class), but both halves have been buffed
  since (growers for impact, braid arrival 38–50% at act-2 L3 for
  registration), so the read recalibrates at the next playtest and
  the D10-C EXECUTE (full-screen shrine treatment for the pick)
  stays UNFIRED pending it. OQ#56 CLOSED-AS-MANAGED — absolute win
  rates are environment-local by policy; all gates are
  same-environment pooled deltas (R5); the socket-free harness is
  filed as a named backlog item, timed post-S15 so its re-anchor
  rides a sprint that banks fresh anchors anyway.
- **D4** Sign-off table at implementation: the six B9 mechanicLines +
  the three B8 trims (returns as one table).
- **D5 RULED (2026-07-04): drop the "Pass on Coveting" button** —
  Onward's auto-pass is the decline; rides S14.3.
- **D6 RULED (2026-07-04): ship the solo reseed in this bundle** —
  the S13 solo manual pass at the next playtest should read the
  fixed partner, not the constant-seed one.

Status: **D0–D3, D5, D6 all RULED (2026-07-04) — the packet is
implementation-ready with no open rulings.** D4 (the six B9
mechanicLines + three B8 trims) returns mid-sprint as a sign-off
table, by design.
