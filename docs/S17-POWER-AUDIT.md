# S17 pre-audit — card & relic power-level sweep (2026-07-06)

**Charter (designer, post-S16):** win rates on the shipped braid look
high. Before any difficulty change: (1) sweep relics and cards for
power level and check that common/uncommon/rare buckets carry
reasonable value; (2) bring vv/vb/bb pairings into balance; (3) only
then adjust difficulty so the game isn't a cakewalk. This document is
the sweep — **it proposes and does not tune**. Every move below stalls
at its sign-off table until ruled, per house convention.

## 1. Instrument

`TB_SIM_ITEMS=1` (landed this session): one machine row per run —
outcome, act reached, per-seat card picks/plays by def, relics
acquired — straight from the S14.1 B23 telemetry. Additive only; the
canonical battery output is byte-identical with the knob off, so no
re-anchor was owed.

**Battery:** n=2000 per pairing (vv / vb / bb), braid topology (the
shipped game), A0, base economy config, draft policy v2, socket-free
deterministic path, same seed set (20001–22000) across pairings — the
pairing comparison is same-map by construction. 6,000 runs total,
~8 minutes wall-clock.

**Measure:** per-item *win-rate lift* — win% of runs holding the item
minus win% of runs without it, pooled over the batteries where the
item's character pool is seated (vess cards: vv both seats + vb p1;
bram: bb both seats + vb p2; neutrals and relics: all three). `z` is
the two-proportion z-score; `**` flags |z| ≥ 2.

**Caveats, on the record:**
- *Survivorship:* acquisition act isn't stamped, so items picked late
  exist only in runs that lived long enough to pick them — lift skews
  positive for late-pool items. The bias shape is the same within a
  bucket, so the load-bearing read is RELATIVE ordering within and
  between buckets, not absolute lift.
- *Bot value ≠ human value:* bots take 100% of card offers (draft v2
  chooses which, never whether), so presence is mostly offer-roll
  randomness — closer to randomized exposure than human data would
  be — but lift still measures value under bot play. Human playtest
  data outranks this sweep wherever they disagree.
- *Same-seed pairing reads* are S16-R1-clean; per-item lifts are
  observational, not gated.

## 2. What rarity means mechanically (what a bucket move changes)

- Reward offers roll rarity 60/30/10 (common/uncommon/rare) per slot,
  then an 18% neutral-splash roll (`rollRewardSet`, reducer.ts).
- Shop card prices by tier: ~45–55g common, ~68–82g uncommon,
  ~135–165g rare.
- Draft policy v2 (the default bot) adds +3 pick priority to rares.
- Relics: flat weight except `rare: true` (⅓ weight; only
  loom_of_two_hands today).

So promoting a card common→uncommon roughly halves its offer
frequency and raises its price ~50%; demoting does the reverse. A
bucket move is an *availability* lever, not a text or effect change.

## 3. Battery overview — pairing balance & where runs die

Same seed set, n=2000 each, braid, A0:

| pairing | win% | died act 1 | died act 2 | died act 3 |
|---|---|---|---|---|
| vv | 54.4 | 539 (27.0%) | 368 (18.4%) | 5 (0.3%) |
| vb | 68.5 | 39 (2.0%) | 582 (29.1%) | 10 (0.5%) |
| bb | 74.0 | 6 (0.3%) | 504 (25.2%) | 11 (0.6%) |

Three findings, in order of size:

1. **vv's deficit is an act-1 problem, almost entirely.** The vess
   mirror loses 27% of runs in act 1; vb loses 2%, bb 0.3%. Past act
   1, vv converts about as well as the others. The vess kit is
   setup-shaped (hex, detonate, scaling) — two slow starters
   compound, where bram's immediate block/momentum kit carries the
   early game. Any "bring pairings into balance" lever should aim at
   vess's act-1 floor, not at vv's whole curve.
2. **bb−vb = +5.5 at n=2000** — inside the ±8 gate-2 band (the n=200
   final-battery read was +2.5; this is the tighter estimate).
   Character-vs-character is roughly where S16 left it; the *mirror*
   spread (bb−vv = +19.6) is the outstanding imbalance.
3. **Act 3 kills nobody.** 26 of 3,962 runs that reached act 3 lost
   (0.7%). All lethality is front-loaded into acts 1–2; the boss act
   is a formality under bot play. Whatever the difficulty ruling ends
   up being, this is the texture gap to know about: the game's *end*
   currently cannot lose you a run you didn't already lose.

## 4. Card audit — rarity buckets don't order value

Presence-weighted mean lift per bucket, on the act≥2-controlled
column (the honest one):

| pool | common | uncommon | rare |
|---|---|---|---|
| vess | **+9.4** | +8.6 | +9.0 |
| bram | +7.9 | **+5.6** | +8.0 |
| neutral | +6.1 | **+3.7** | +8.2 |

Expected common < uncommon < rare; observed: vess is flat with
commons on top, and in every pool the uncommon bucket is the trough.
Rarity is currently a price/frequency dial that does *not* track
value. Individual tier-breakers (act≥2 lift, `**` = z ≥ 2; full
tables in the battery logs and `audit-lift2` output):

**Commons at rare-tier value** (vess rare mean is +9.0, bram's +8.0):
- vess: `withering` +14.9**, `unpicking` +14.3**, `patient_knife`
  +13.6** (and a second shelf ~+10.5: graverust, spite_stitch,
  pinprick, seeding_curse, hollow_seam, thornward)
- bram: `rendcall` +14.0**, `ember_jab` +13.1**, `opener` +12.3**
- neutral: `tallow_mark` +13.4** (a 0-cost Hex 2 — the best common
  in the game by this read)

**Uncommons above nearly every rare:** `pale_unmaking` +16.3**,
`rend_the_weave` +15.5** (only needles_verdict and final_bell beat
them among all 24 rares).

**Rares at glue-tier value (demote or retune):** `aftershock` +0.4,
`stokers_due` +1.4 (bram); `selvage` +2.5, `unbroken_line` +2.2
(vess).

**Dead or negative (retune candidates — a bucket move can't fix
these):** `votive_thread` −4.2, `litany_of_mending` −2.5,
`tithe_of_thread` −0.9, `quickening` −0.1, `banked_coals` +0.5,
`inheritance` +0.9, `kindle` +1.0, `measured_cut` +1.3. Pattern
worth naming: **the Thread-gain glue reads dead under bot play**
(litany, tithe, votive_thread are three of the bottom eight).
Either Thread is over-supplied by regen/relics, or bots under-value
banking it — the human playtest should adjudicate before any retune.

## 5. Relic audit — flat as a class, two genuine outliers

Raw relic lift is +12…+35 across the board, but stratifying by total
relic count (within "you hold k relics, which ones?") collapses the
class to −1…+2: **relic lift was mostly the more-relics-=-better-run
confound, and the relic pool is broadly flat — reasonably bucketed
already.** Two exceptions stand clear of the pack after
stratification:

| relic | raw | act≥2 | count-stratified |
|---|---|---|---|
| braided_censer (coop) | +35.3 | +28.8 | **+5.0** |
| chord_of_the_choir (coop) | +26.7 | +20.5 | **+4.1** |
| *(next best)* hungry_whetstone | +20.0 | +13.2 | +1.9 |

Both are the **Resonance-hook relics** (per-ignition heal-both /
draw+Kindled). At bot resonance rates they fire constantly; they are
the two strongest items in the game by a factor of ~2.5 over the
next relic.

Bottom of the stratified table (−0.5…−1.1): covetous_psalter,
loom_of_two_hands, scar_votive, steadfast_icon, knotted_votive.
Note before anyone swings at them: three of those five are
**fray-hook relics**, and bots manage Thread well enough that fray
barely fires — they read dead under bot play but are exactly the
relics a sloppier human pair would feel. No action proposed; human
data rules here.

No relic went unacquired; no card went unsampled.

## 6. Proposed moves — SIGN-OFF TABLES (nothing below has landed;
## each row stalls until ruled)

Bucket moves are availability/price levers (§2), not effect changes.
Proposals are deliberately one-step; if a promoted card still tops
its new bucket next audit, promote again then.

### 6a. Card promotions (cut frequency 60%→30%, raise price ~50%)

| # | card | pool | move | act≥2 lift | evidence line |
|---|---|---|---|---|---|
| 1 | pale_unmaking | vess | uncommon → rare | +16.3 | beats 22 of 24 rares |
| 2 | rend_the_weave | vess | uncommon → rare | +15.5 | beats 22 of 24 rares |
| 3 | withering | vess | common → uncommon | +14.9 | above vess rare mean +9.0 |
| 4 | unpicking | vess | common → uncommon | +14.3 | above vess rare mean |
| 5 | patient_knife | vess | common → uncommon | +13.6 | above vess rare mean |
| 6 | rendcall | bram | common → uncommon | +14.0 | above bram rare mean +8.0 |
| 7 | ember_jab | bram | common → uncommon | +13.1 | above bram rare mean |
| 8 | opener | bram | common → uncommon | +12.3 | above bram rare mean |
| 9 | tallow_mark | neutral | common → uncommon | +13.4 | best common in the game; **covenant note:** the neutral pool's 8/5/2 split is pinned (M2 §9 + covenant.test.ts) — this row is a covenant amendment (7/6/2), not just a data edit |

### 6b. Card demotions (raise frequency, cut price)

| # | card | pool | move | act≥2 lift |
|---|---|---|---|---|
| 10 | aftershock | bram | rare → uncommon | +0.4 |
| 11 | stokers_due | bram | rare → uncommon | +1.4 |
| 12 | selvage | vess | rare → uncommon | +2.5 |
| 13 | unbroken_line | vess | rare → uncommon | +2.2 |

### 6c. Relic weight moves (the loom_of_two_hands precedent: `rare:
### true` = ⅓ drop weight, effect untouched)

| # | relic | move | stratified lift |
|---|---|---|---|
| 14 | braided_censer | add `rare: true` | +5.0 (2.6× next peer) |
| 15 | chord_of_the_choir | add `rare: true` | +4.1 (2.2× next peer) |

If the ruling prefers effect trims over weight (heal 2→1 / drop the
Kindled), that's a different lever with a different feel — flagging
both; the table proposes the weight lever because it preserves the
relics' identity and matches the audit's availability framing.

### 6d. Retune-flag list (PARKED — design work, not bucket moves)

votive_thread, litany_of_mending, tithe_of_thread, quickening,
banked_coals, inheritance, kindle, measured_cut — plus the
Thread-glue pattern (§4) and the fray-relic trio (§5), both of which
want human playtest data before anyone touches numbers.

## 7. Sequencing from here (per the charter)

1. **These tables get ruled** → moves land in their own commit(s),
   then a re-read battery (same seeds) confirms bucket ordering
   improved and measures the win-rate side effect (promotions of
   top cards should *lower* win rates a little on their own —
   strong cards become scarcer).
2. **Pairing balance:** the vv act-1 floor is the target
   (§3.1). Candidate levers for the ruling, from below: vess
   early-defense glue (e.g. a starter or common Guard tweak — lifts
   vv double, vb half, bb none, which is the shape of the gap);
   NOT a global act-1 nerf (vb/bb act-1 death rates are already ~0).
   Dose comes from the designer, per house law.
3. **Difficulty last**, once value and pairings sit right: bot win
   rates 54–74% at A0 braid say the baseline is soft, and §3.3 says
   the missing teeth are act-2/act-3-shaped (act 3 kills 0.7%).
   Levers on the shelf: global scales (TB_ENEMY_HP_SCALE 1.45 /
   TB_ENEMY_DMG_SCALE 1.3 are baked anchors today), folding
   A1/A2-style rungs into the A0 baseline, authored act-3/boss
   teeth (the knot sub-pool precedent), rest-heal. No dose proposed
   here by design.

Caveat once more, so it travels with the tables: **bot lift ≠ human
value.** Where a human read exists and disagrees, it outranks this
sweep. The sweep's strength is coverage (129 defs × 6,000 runs), not
depth.

---

# S17 implementation record (rulings of 2026-07-06)

**Designer rulings on the tables above:** 6a/6b/6c APPROVED as
proposed. Additionally: after the moves, identify each bucket's
biggest outliers and run a SMALL NUMBERS PASS to bring cards into
line (playtest is far out; bot data governs until then), and give
the relic class a modest uplift — the designer reads relic rewards
as below the value floor of the card-reward classes.

## 8. S17.1 — the moves, landed

All 15 moves in one commit; availability/price only. Consequences
that traveled with them, each on the record:

- **Covenant pool splits amended** (a sign-off row by its own comment):
  vess 25/20/12 → 22/23/12, bram 25/20/12 → 22/25/10, neutral 8/5/2 →
  7/6/2 (the tallow_mark row amends the M2 §9 split).
- **The four demoted rares owe mutations** (born rare = Echo
  unmutated; every uncommon must mutate). Mutation strings stall at
  sign-off — covenant carries a documented exemption until the rows
  below are ruled.
- **Witness rare-naming lines** (S13.4 rider pins authored = draftable
  exactly): two PROVISIONAL lines authored for the promotions; four
  lines retired with the demotions, preserved here for the record:
  - unbroken_line: "An Unbroken Line. Thread that keeps arriving.
    Inheritance, of a kind."
  - selvage: "Selvage. The finished edge. Whoever closes the row
    keeps it from unraveling."
  - aftershock: "An Aftershock. Every burst leaves one more tremor
    than anyone counted."
  - stokers_due: "The Stoker's Due. The Thread is spent; someone
    collects. He has decided it is him."
- **Golden regen** (loud, in-commit): rarity moves reshape reward
  pools → the random-walk covenant hashes moved.

### 8a. SIGN-OFF — mutations owed by the demoted four (strings; the
### covenant exemption comes out when these land)

| # | card | proposed mutation |
|---|---|---|
| M1 | aftershock | **Faultline** — "Power: whenever Hexes detonate, deal 2 to ALL enemies. Draw 1 when played. Exhaust." |
| M2 | stokers_due | **Stoker's Advance** — "Power: the first time Thread is spent each turn, gain 2 Momentum. Draw 1 when played. Exhaust." |
| M3 | selvage | **Raw Edge** — "Power: when the resolved Chain closes on your card, gain 4 Block. Exhaust." |
| M4 | unbroken_line | **Frayed Line** — "Power: at the start of each turn, gain 1 Thread. Every other turn, this asks again." *(flavor draft — if the double-clause reads muddy, the fallback is a plain weaker echo: gain 1 Thread on ODD turns)* |

### 8b. SIGN-OFF — the two PROVISIONAL witness lines (promotions)

| card | line |
|---|---|
| pale_unmaking | "Pale Unmaking. She writes the curse and reads it out in the same motion." |
| rend_the_weave | "Rend the Weave. A tear that takes the stitching with it — when there is stitching to take." |

## 9. Post-move battery (same seeds, n=2000 ×3) — the moves' own dose

| pairing | pre-moves | post-moves | Δ |
|---|---|---|---|
| vv | 54.4 | 35.4 | **−19.0** |
| vb | 68.5 | 53.9 | −14.6 |
| bb | 74.0 | 67.4 | −6.6 |

Two big reads:

1. **Bucket ordering fixed where it was broken.** vess 8.5/8.7/15.6
   and bram 9.3/10.1/13.7 now order common < uncommon < rare on the
   controlled lift. Neutral keeps a mild uncommon trough.
2. **The approved moves were themselves a large, asymmetric nerf.**
   Availability of top cards is a bigger dose than any ±1: the game
   got ~7–19 points harder with zero number changes — and vess paid
   most (5 promotions incl. 2-to-rare vs bram's 3 + two demotion
   buybacks). Consequence on the standing gates: **gate 2 (bb−vb
   within ±8, closed at +2.5 in S16) reopened at +13.5.** vv's act-1
   death rate worsened to 40%.

## 10. S17.2 numbers pass — slate + verify read

Directed: small pass on each bucket's worst offenders + relic-class
uplift. One smallest-step change per item (18 cards, 6 relics —
details in the commit). Notable: gravebloom's intended buff was
REVERTED in-pass — the S13.2 flat-hex-echo law caps hook hexAll at 2
and the law outranks the pass (designer call if it should bend).
Pulsekeeper's Ring landed its OQ#27 pre-agreed (b) escalation (every
third Pulse FREE) — the audit read it near-dead in costs-1 form.

Verify (same seeds): vv 35.4 (flat — vess buffs offset vess trims),
vb 56.5 (+2.6), bb 73.5 (+6.1 — the relic uplift lands hardest where
runs live longest). Within buckets: trims moved the outliers a step
(needles_verdict +32.8 → +28.2, avalanche −4.4) but the top rares
remain outliers; buffed floors mostly rose (ash_harvest +3.2→+7.4,
ashfall +1.5→+6.8, stitchblade +0.8→+4.3). **The persistent dead
cluster did NOT respond to +1s** — measured_cut, slow_burn,
tithe_of_thread, mendthread sit at/below zero across three batteries
now. Those are shape problems (the Thread-glue pattern), not scalar
ones; they go to the playtest/design pile, not another +1.

## 11. S17.3 pass B — the pairing lever, and where it stopped

The numbers verify exposed the gap's engine: **bram commons as a
class +10.2 vs vess commons +7.2**, and gate 2 at +17.0. Pass B, one
step each, shaped to the pairing directive (a bram-common trim hits
bb twice / vb once; a vess-Guard buff lifts vv twice): trims spark,
followthrough, crossguard, brand, forearm_wall, cinderbreak; buffs
wardknot, needle_wall, burr_shell, cinch, quiet_mending.

Verify (same seeds): **vv 36.0 (+0.6), vb 55.9 (−0.6), bb 71.7
(−1.8)** — every sign correct, every magnitude small. Bucket
ordering held (vess 7.2/8.3/14.8, bram 10.1/10.5/13.4).

## 12. End state + STOP-AND-REPORT packet (pairing & difficulty)

Final S17 board, braid A0, n=2000 same seeds throughout:

| | S17.0 baseline | after moves | after numbers | after pass B |
|---|---|---|---|---|
| vv | 54.4 | 35.4 | 35.4 | **36.0** |
| vb | 68.5 | 53.9 | 56.5 | **55.9** |
| bb | 74.0 | 67.4 | 73.5 | **71.7** |
| bb−vb (gate-2 band ±8) | +5.5 | +13.5 | +17.0 | **+15.8** |
| vv act-1 deaths | 27% | 40% | 39% | 38% |

What the three passes established: within-pool bucket integrity is
FIXED and holds under iteration; the pool-vs-pool gap is
**structural** — smallest-step scalar tuning moves it ~1–2 points a
round, and the honest read is that vess's kit is setup-shaped (hex →
detonate needs two turns and two seats' cooperation) while bram's is
immediate. Per house law this stops and reports rather than
inventing a bigger dose. Candidate levers for the ruling:

- (a) **A bigger authored dose at vess's act-1 floor** — e.g. +2/+3
  steps on vess Guard commons, or a vess starter-deck tweak (touches
  vb too, half-weight; the table above calibrates ~1–2 pts per
  common-class step, so ~3 steps ≈ the visible knee).
- (b) **A kit-shape lever, not a scalar** — e.g. vess starts combats
  with 1 Hex pre-applied on a random enemy (makes turn-1 links live),
  or act-1 enemies open one intent slower against double-vess.
  Shape levers are exactly what moved gates in S16; they need design.
- (c) **Accept the mirror spread, re-derive the gates on character
  identity** — vv as the "hard mode" pair, bb the forgiving one; the
  ±8 gate then binds bb−vb only (currently +15.8, still out) and a
  bram-side dose does the remaining work.
- Difficulty (the charter's step 3) waits on that ruling: vb 55.9
  sits at the band's top edge, vv below band, bb far above — a
  global knob moves all three and cannot fix their ORDER.

Also on the record: braided_censer still reads +5.4 stratified at ⅓
weight (weight cuts how often it appears, not what it does when it
does) — if that still offends after human play, the remaining lever
is the effect trim (heal 2→1), which the ruling declined this round
in favor of weight.
