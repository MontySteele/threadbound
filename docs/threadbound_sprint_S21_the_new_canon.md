# Threadbound — Sprint S21: The New Canon ("read the board we actually ship")

**Charter (designer session, 2026-07-07 window):** the S20 flip made
rites+tracks+knotwork the game — and moved the ground under every
band. This sprint pays the instrument debts (OQ#69, OQ#70), reads the
ascension ladder on the canon it will actually ship on (OQ#66's
inputs are S18-era and stale), rules only what the reads demand, and
clears the sign-off backlog as riders. The ascension SYSTEM is built
(rungs, ratified copy, host-only clamp per S16-D6, profile claims,
picker) — this is calibration, not construction.

**Standing laws:** instruments before balance (Part 1 and Part 2 land
before any rung moves); balance commits separate from content commits;
enumerate→propose→sign-off for strings; stop-and-report on structural
surprise; ascension.ts's own header holds — numbers stay PROVISIONAL
where human data is the missing input; this sprint fixes STRUCTURE
and derives DESCRIPTIVE bands, it does not chase feel.

---

## Part 0 — Evidence on record

- **The S20-R1 board (the new canon):** vv 67.1 / vb 69.7 / bb 76.2
  (n=2000 ×3, seeds 20001–22000, no env prefix, run twice identical).
  Structure held: gate 2 +6.5 IN, knot ratio 1.25–1.28 IN, link-fire
  lead IN (vb 56.4), vv floor 16.7% IN, HP floors IN.
- **The float is confounded:** tracks joined the canon AND
  RECLAIM_NUDGE now rides the rites default — environment and fleet
  behavior moved together. The +20 is not "the game got 20 easier."
- **Three ex-bands are REPORTED, not banded** (ruled at S20-R1):
  S18-D3 vb win 45–55 (reads 69.7), vb Hex share 25–45 (46.3), B22
  reclaim <25% (57–64, nudge-on artifact). Act-3 lethality was NOT in
  the re-bank table — a gap this sprint closes.
- **OQ#66 (stale canon, still structural):** on the S18 build the
  ladder read A2/A3 in the 17–22 range (S16-era ~40s) and bb's A3
  INVERTED (+2.5 — the extra elite PAYS at compressed rates; knots
  pay picks to both seats per S16-D3, so A3's third crossing arrives
  with rewards attached). Whether either survives the new canon is
  unknown — that is this sprint's question.
- **OQ#69 residual:** `computeLinksFired` reads the ungrown def, so a
  mutation echo whose only Link is tier-granted (the cards Reclaim
  creates — e.g. First-Drawn Descant past resonances ≥ 6) shows a
  live link in the preview that never fires naturally, only when
  Pulsed. Base growers are safe (tier links keep their conditions).
  The preview lies about a card on the reclaim path — the verb every
  solo player now sees.
- **Ascension inventory (today's code read):** rungs A1–A5 + ratified
  copy; mods at run start; A4 pierce (S15.2B); host-only clamp
  (lib.ts maxAscension, S16-D6 executed); profile claims
  (ascensionUnlocked per character, clears recorded); lobby picker.
  Nothing structural is missing.

## Part 1 — S21.1 The OQ#69 ruling (lands first — it moves link-fire)

**Proposed: align `computeLinksFired` on `grownDef`** — the grown
card IS the card, all the way down (legality, preview, resolution,
and now natural fire agree). "Fires only when forced" is not a rule a
player can be told with a straight face.

Protocol: paired same-seed battery (S16-R1 form, n≥100 ×3) isolating
the change; expected movement is small and confined to grower/echo
link-fire rates; the regression test pins natural fire on a
tier-granted echo link both directions. If the paired read shows
non-grower movement, STOP AND REPORT — the change should be
mechanically invisible outside the grower path, and any wider signal
means the model of the code is wrong somewhere.

## Part 2 — S21.2 Fresh bands on the S20-R1 anchor (OQ#70, the owed session)

Derived on the banked anchor set, descriptive-first (bands as
TRIPWIRES around the canon we ship, not targets we chase — targets
wait for human data):

| # | rule | proposed form |
|---|---|---|
| 2a | gate 2 | bb−vb within ±8 — RE-AFFIRMED as intent (reads +6.5) |
| 2b | pair win tripwires | each pairing within ±5 of its S20-R1 anchor at n=2000 same-seed (drift alarms, not quality claims); anchors re-banked only by ruled instrument events |
| 2c | vb Hex share | re-derive descriptively: anchor 46.3 ±8 (the old 25–45 was a lane-era read) |
| 2d | B22 reclaim | RETIRED in its old form (it measured nudge-off fleets); successor: reclaim rate within ±10 of anchor, per pairing — a drift wire, not a design claim |
| 2e | act-3 lethality | JOINS the canonical report (per pairing, % of act-3 arrivals lost). First read is the baseline; no band until the D3 texture target is re-ruled on human data |
| 2f | difficulty | NOT re-dosed this sprint. The 67–76 board is confounded (2 environment moves) and bot-read; ruling difficulty against it same-window would be chasing our own instrument. The question is FILED to the first human read with the S18-D3 texture framing attached |

## Part 3 — S21.3 The ladder survey (read before ruling)

The full grid on the new canon: **A0–A5 × vv/vb/bb**, paired seeds,
n=500 per cell (18 cells; shards make this an afternoon). Reported
per cell: win%, act-death profile, act-3 lethality, knot take-rate,
HP/combat by act. Deliverables:

1. **The curve, per pairing** — is the S18-era cliff (A2 at ~17)
   real on this canon, and is the ladder monotone?
2. **The A3 question** — does the extra elite still PAY (the OQ#66
   inversion)? The mechanism is visible in the knot economy: the A3
   crossing arrives with S16-D3 pick rewards attached.
3. **The A4/A5 tail** — pierce-fray and rest-trim have never been
   read on a canon where tracks events and the nudge exist.

## Part 4 — S21.4 Rung recomposition (ONLY what the survey demands)

Pre-enumerated levers so nothing is invented mid-pass. Rulings taken
only on survey evidence; if the survey shows a shape none of these
address, STOP AND REPORT.

**If A3 still inverts** (the extra elite is a net gift):
| row | lever |
|---|---|
| A3-a | the A3 extra crossing pays NO picks (the rung's elite is a toll, not a knot — S16-D3 scoped to A0–A2 crossings) |
| A3-b | reorder the ladder — the extra elite moves to A1 (where rates are high and rewards dilute less) and A3 takes a real tooth |
| A3-c | accept: A3 is "more game," the ladder's difficulty story is carried by A2/A4/A5 — copy retext owed if ruled ("one more knot in the weave") |

Recommendation if it comes to it: **A3-a** — it preserves the ladder
story and the fix is the exact mechanism the inversion diagnosis
named. A3-c is honest but makes rung copy 3 a lie of implication.

**If the A2 cliff is real on the new canon:** A2's ×1.1 damage lands
on every intent uniformly; enumerate (A2-a) soften to ×1.05 as the
PROVISIONAL number (the header's own convention — structure now,
feel later), (A2-b) leave it and let the cliff be the ladder's wall
by design, read again with humans. Recommendation: **A2-b** — do not
tune a provisional number against a bot cliff in the same window the
canon moved; file the read.

**Rung copy:** any recomposition owes its retext row (Part 5); the
ratified A4 string is untouched regardless.

## Part 5 — S21.5 Riders (the sign-off backlog, one session)

1. **St rows:** sign St-e1, St-r1..r8, St-m1 as proposed (pre-screen
   verified against rites.ts). **St-h1 REWORD before signature** —
   proposed replacement sentence: "The Witness offers a few pointers
   during each run's first act — Links, the Thread, and the leash
   explain themselves as they come up." (True to once-per-run,
   act-1-only, state-triggered; drops the browser-once claim and the
   walkthrough overstatement.)
2. **Del-1..3:** sign per their recorded evidence (designer strike
   right on Del-3 noted).
3. **gravebloom axis:** rule g-a/g-b/g-c from the S18 enumeration —
   the retext rides the next strings commit.
4. **OQ#65, the lane:** proposed ruling — DELETE the lane generator
   (explicit-only dead config; unbanded; bb-lane 27.5 is a trap for
   anyone who finds the flag). Its own commit, suite audit for
   lane-pinned tests (the S20.1 lifecycle pins keep their transport
   coverage on the braid), README archaeology note updated to "the
   lane is gone; the braid is the game." If struck, the alternative
   row is "keep one more window, delete at handoff close."
5. **Deployed smoke run** (the open S20 gate 6) + the
   `resonance_together` human-shaped exhaustion read ride whichever
   session touches the hosted build first.

## Part 6 — Batteries & exit gates

1. Suite green (431 + new pins); parity instruments byte-identical
   through Part 1's landing (the Part 1 change itself re-banks with
   its paired attribution — a LOUD, ruled re-bank, the S20-R1
   convention).
2. Part 2 bands recorded in OPEN-QUESTIONS as the OQ#70 closure;
   act-3 lethality present in the canonical report from this sprint
   forward.
3. Part 3 grid complete and banked (docs/reference/), per-cell rows
   in the STATUS doc.
4. Any Part 4 ruling lands with its paired battery attribution and
   its copy row signed; no ruling = the survey IS the deliverable.
5. Riders executed exactly; unsigned rows remain STALLED and say so.
6. No-balance audit: every number change traces to a D-row; balance
   and content commits separate.

## Part 7 — Designer decisions (D-list)

| D | decision | options | recommendation |
|---|---|---|---|
| D0 | branch + sequencing | Parts 1–2 before 3, 3 before 4; riders any time after 1 | ratify |
| D1 | OQ#69 | align computeLinksFired on grownDef / keep forced-only + retext previews | **align** |
| D2 | bands | Part 2 table 2a–2f | ratify as proposed |
| D3 | ladder survey | grid as written (n=500 × 18) | ratify |
| D4 | recomposition | A3-a/b/c, A2-a/b — evidence-gated | **A3-a if demanded; A2-b** |
| D5 | riders | St-h1 reword text; Del signatures; gravebloom g-row; OQ#65 delete-or-keep | sign / rule as proposed |

**After close:** the handoff package (LAWS.md, the two-human
protocol, this doc's successor notes) and — if the window allows a
second sprint — the S22 design pass proposed alongside this doc.
