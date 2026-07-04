# S13.6 difficulty review — the designer-deferred re-read, on S13's batteries

Ruled sequencing honored: this re-read runs on the S13 card-economy
batteries (S13-ECONOMY-STATUS.md), not before. Same environment, same
instrument discipline: every comparison below is same-container,
100-run legs (4 × 25 shards), TB_RITES=1 TB_BOT_SEEK_EVENTS=1, A0,
draft v2 default (the S13.6 flip, commit `f9b1d59`) unless a row says
v1. Pooled rows say n=.

Assessment only — **no knob was turned in this pass.** Every
recommendation below is a designer yes/no; levers stay untouched until
ruled.

---

## 0. First finding, and it reframes the rest: the instrument's noise floor

The flip sanity row exposed it. Two identical-config v2-vb legs (same
build behavior, same seed set 1000–1099) read **60.0% and 49.5%**;
run-by-run, **61 of 99 shared seeds flipped outcome**. The v1 legs did
the same (57/100 flipped) while netting 50.0 → 51.0. This is the
review-sweep's known socket-timing jitter class (state-pure decisions,
timing-dependent state evolution) — but nobody had measured its size:
per-run outcomes are NOT reproducible across sim invocations, and a
single 100-run leg carries **~±7–10 win-points of cross-invocation
noise**. Aggregates are honest; single legs are coarse.

Consequences applied throughout this doc:
- anchors are POOLED across independent legs (n=199–299);
- the S11.10 gate-2 verdicts use same-build comparators only;
- one S13.5 headline is corrected below (§1);
- **proposed instrument rule (yes/no): any ±6-style gate reads pooled
  n≥200 legs from here on.** 100-run legs remain fine for coarse
  sweeps and texture.

The S13.5 gate reads survive re-examination: gate 2 (load-bearing,
−41) and the full cap-curve (11→14→26→37→49 over caps 0→12, range 38
points) dwarf the floor; the D6 tail-slope's ruled leg (8→12 = +12 ≈
3.0/pick) stands as measured, though the 12→uncapped tail flattens
under pooling (cap-12 49 vs uncapped 49.7 pooled — the tail's gains
concentrate at the knee-to-12 stretch, which is the stretch D6 ruled
on).

## 1. The flip re-anchor (D7 second half — the loud, recorded row)

Draft v2 became the default in `f9b1d59` (BotPolicy, sim harness, AND
the server's in-process solo partner — the surface note honored: real
solo drafting changed, as a decision). TB_BOT_DRAFT_V2=0 is the v1
escape hatch, comparison-only. Rows on the flipped build:

| Leg | win % | act-1 HP/combat |
|---|---|---|
| default vb, seeds 1000+ | 49.5 (49/99) | 29.7 |
| default vb, seeds 1100+ (fresh) | 50.0 (50/100) | 29.4 |
| v1 vb (TB_BOT_DRAFT_V2=0) | 51.0 | 27.9 |
| default vv | 38.4 (38/99) | 27.4 |
| default bb | 45.0 | 26.2 |

**Correction on record:** S13.5 reported v2-vb 60 vs v1 50 (+10). With
the noise floor known and three v2-vb legs pooled — 159/299 = **53.2%**
vs v1 pooled 101/200 = **50.5%** — the honest win-rate edge of v2 is
**+2.7, within noise**. The 60 was a high leg. The flip does NOT stand
on a win-rate edge and never needed to: it stands on D7's process (a
clean battery behind it) and on what v2 measurably does — engines
drafted, dilution respected (winning decks ~33 vs v1's ~41), the
removal lever used (~2.7/seat/run vs 0.09), take-rate falling with
deck size. v1 was never the target to beat; it was the floor to
retire.

## 2. Win-rate band: the 25–35% A0 gate no longer describes the instrument

The S9a/S10a gate ("each pair inside 25–35% at A0") was authored
against draft-v1 bots — a coordination floor that undervalued rares,
never removed a card, and drafted itself into 41-card decks. That
instrument is retired. Under the v2 default (pooled where available):

| Pair | win % | vs the 25–35 band |
|---|---|---|
| vb | 49.7 (n=199) | +15 over the ceiling |
| vv | 39.4 (n=198) | +4 over |
| bb | 41.0 (n=200) | +6 over |

The sim's older M2 header gate (win ≤40%) reads FAIL on vb by
construction; it is archaeology, not CI. **None of this is evidence
the game got easier for humans** — no game number moved; the bots got
smarter in exactly the dimension the sprint built. The bands were
calibrated to the old bot; the old bot is gone. Pair spread 8–11
points (≤15 ✓); vb leading both mirrors is the co-op thesis working,
not a tuning failure.

## 3. HP watch band (act-1, 16–22 pair HP/combat): still hot, unchanged by S13

| Stage | act-1 pair HP/combat |
|---|---|
| S10a battery | 23.6–25.8 |
| Wave B stages | 25–29 |
| S13 v1 rows | 27.9–28.0 |
| S13 v2 default rows | 29.4–29.7 (vb) / 27.4 (vv) / 26.2 (bb) |
| braid legs | 31.9–37.0 (fewer, bloodier fights) |

4–8 points over the band, the pre-existing S10a drift; S13 neither
caused nor cured it (v1 27.9 vs v2 29.5 — within the per-leg spread).
The floor ("must not sag below 16", S9d.A1) holds everywhere.

**The two bands now conflict in OPPOSITE directions** — win rate says
"too easy," HP loss says "too bloody." One global knob cannot satisfy
both: TB_ENEMY_DMG_SCALE is the sensitive lever (~9 win-points per
0.05 notch, comfort-pass ladder) and it moves both numbers the SAME
way (+DMG lowers win rate AND worsens HP loss). This is the S3.4
"bands conflict" precedent, now wider. The resolution is a band
decision, not a knob search (§6 recs 1–2).

## 4. The fight-price question: ANSWERED — fights pay now

The question on record: ~27–29 pair HP/fight (≈19% of the 146-HP vb
pool) — is the reward bundle worth it? Post-S13, per fight won the
bundle is ~10.3 gold + one card offer per seat (a knee-to-12 pick buys
~3 win-points — gate 3) + relic odds on elites.

The OQ#59 outcome split is decisive, and it replicates across all
seven flip-build legs:

- **combats/run: wins 7.3–8.0 vs losses 3.3–5.9** — winners FIGHT MORE
- relics/run: wins 5.9–6.8 vs losses 2.8–3.8
- deck size: wins run SMALLER (the dilution thesis, again)

Pre-S13 the hypothesis was that fights were a bad trade (the braid's
route-around-combat pairs lost nothing by skipping them). Under the
new economy, combat participation correlates with winning in every
leg, braid included. The fight's PRICE didn't change; its PAYOUT did.
**Recommendation: close the fight-price question — no repricing.**

Per-encounter attribution (unchanged shape): the a2 boss remains the
run-killer (60.5 pair HP/combat under v2, 74.9 under v1), then a1
boss ~54, finale ~48–60, bellkeeper elite ~47. Normals 16–33. No new
outlier flags. Watch item kept open: the S11.2 elite escalation ladder
reads last/first 0.98–1.63 across legs vs its "≥2" note — still not
biting; parked with OQ#55's joint-recalibration framing (braid
follow-up owns it).

## 5. S11.10 gate 2 re-anchor (the braid, TB_KNOTWORK=1)

The deferred gate: braid win rate within ±6 of the same-build
non-braid row, per pair. Pre-S13 it read vb −4 ✓ / vv +22 ✗ / bb +22 ✗
with the designer hypothesis that the card economy was the culprit.
The re-anchor, all legs on the flipped build:

| Pair | non-braid | braid | Δ | ±6 verdict |
|---|---|---|---|---|
| vb | 49.7 (n=199) | 36.0 | **−13.7** | FAIL — low |
| vv | 38.4 | 47.5 | **+9.1** | FAIL — high (edge; inside 2× the noise floor) |
| bb | 45.0 | 69.0 | **+24.0** | FAIL — high, decisive |

**Gate 2 still fails, but the failure changed species — and the
economy hypothesis is CONFIRMED for the pair it was about.** vb, the
canonical pair, now PAYS for routing around combat: strand-runners
see ~18% fewer act-1 reward screens (75 vs 91), draft less, and lose
−14 for it. vv's inflation collapsed from +22 to +9 (edge-of-noise).
What remains is **pair-asymmetric**: bb's braid inflation persisted
and widened (+22 → +24, now 69%) while fighting FEWER combats (5.8
won/run vs 7.7 non-braid) through bloodier fights (31.9 HP/combat).
Whatever shields bb on the braid, it is not the card economy — the
S7.5 double-guard survivability signature interacting with braid
structure (fewer, spikier fights favor the guard floor; bram's
generic Momentum stack needs no specific engine pieces, so lost
picks hurt it least) is the working read, unproven.

**Recommendation (rec 4): re-scope gate 2.** The economy-side fix
worked; declare the remaining failure what it is — the bb pair
asymmetry (on record since S9a: "bb runs ~5–10 pts easier... a
pair-asymmetry question") amplified by braid structure, plus the
never-calibrated knot-pricing/escalation ladder (OQ#55). That is a
braid-recalibration sprint, not a lever in this one — and these rows
are its banked anchor.

**Status correction (designer, this review):** the braid is ALREADY
the shipped game — `92e7492` (PR #10) set TB_KNOTWORK=1 on the
playtest deployment, and the designer confirms it stands. The
engine/sim fallback default remains off (baselines unaffected), but
"default-off pending gate 2" is stale: the BRAID rows above are the
game-as-played rows, the non-braid rows are the comparison
instrument, and the bb +24 inflation is LIVE, not parked — which
raises the braid follow-up sprint's priority accordingly.

## 6. Recommendations (each a designer yes/no; nothing pre-empted)

1. **Re-author the bot win-rate band around the v2 instrument** —
   propose 40–55% at A0 for vb, mirrors reported not banded (S5
   gate-4 pattern). The alternative — re-centering difficulty until v2
   bots read 25–35 — means tuning the game ~1–2 DMG notches harder to
   chase a bot upgrade players never felt; rejected on the "bots are
   instruments, not players" principle. Next playtest re-reads human
   difficulty on the new content; human data rules (OQ#14).
2. **Keep the 16–22 act-1 HP band as a HUMAN watch band; stop reading
   it against bots.** It has been 4–8 over for four sprints across
   every policy and content stage. If the playtest ALSO reads bloody,
   the lever is a −0.05 DMG notch (own commit, own battery, S5.5
   precedent) — which would raise bot win rates further above rec 1's
   band, hence: band decision first, knob second.
3. **Close the fight-price question** (§4 — fights pay post-S13).
4. **Re-scope S11.10 gate 2 per §5** — economy half CLOSED (fixed);
   remainder re-filed as the braid/bb-asymmetry sprint (with OQ#55's
   ladder work). Priority raised: the braid is the shipped playtest
   game (TB_KNOTWORK=1 on the deploy since PR #10), so bb's +24 is
   live at the table.
5. **Adopt the n≥200 pooling rule for ±6-style gates** (§0). The M2
   header gates stay as archaeology or retire with rec 1.

## Post-review pointers

- Next playtest carries: solo manual pass (S13 gate 5, now on v2
  drafting), human difficulty re-read (recs 1–2). Rare designs, the
  26 Witness lines, and the rare frame are RATIFIED (2026-07-04) —
  nothing provisional rides along.
- The TB_KNOTWORK default-on question is MOOT — the playtest deploy
  has run braid-on since PR #10 and the designer confirms it stands.
  What remains is bringing bb inside ±6 on the shipped map (the braid
  sprint's gate).
