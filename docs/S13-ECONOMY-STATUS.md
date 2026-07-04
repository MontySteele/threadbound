# S13 status — the card economy ("card rewards must matter")

Sprint packet: `threadbound_sprint_S13_card_economy.md` (all designer
decisions D1–D7 RULED 2026-07-04). Brief renamed S12 → S13 per D1.
Branch note: work landed on `claude/next-sprint-planning-gzx8u5` (the
session's designated branch; the packet's `s13-card-economy` name was
superseded by the environment's branch binding).

Environment: fresh container, 2026-07-04. **All rows below are
same-environment** (battery discipline: no comparisons to the packet's
absolute numbers — this container re-anchors base vb at 57 vs the
packet's 48 vs the older environment's 37; deltas within this doc are
the datum).

Standard config throughout: default (flag-off) topology, TB_RITES=1
TB_BOT_SEEK_EVENTS=1, A0, 100-run legs (4 × 25-run shards, seeds 1000+).

---

## What landed

| Part | Commit | Summary |
|---|---|---|
| S13.1a | `06c5785` | Probe flags → permanent sim knobs: TB_BOT_SKIP_PICKS, TB_NO_RELICS, TB_UPGRADE_ALL, TB_BOT_PICK_CAP=N (deck-size ceiling on STARTER_DECK_SIZE=10, pinned by test). Sim-only; echoed in every run header. |
| S13.1b | `06c5785` | Draft policy v2 behind TB_BOT_DRAFT_V2 (default OFF — D7): powers/engines +4, rare +1→+3, dilution term −max(0, deck−16)×0.4. One policy, no fork; solo-partner surface note in solo.ts. |
| S13.1c | `06c5785` | Economy telemetry: per-act per-seat pick take/skip + per-act relic/deck growth; sim + aggregate-human readouts. Closes the run-length confound. |
| S13.2 | `1d05b52` | Rare identity pass (D2/D3): gravebloom + call_and_answer become cross-seat engines; selvage/keepsake (V) + bellmetal/stokers_due (B) land. Pool 55 → 57/character (25C/20U/12R). Three new hook events (partnerLinkFired, chainClose, threadSpend). Covenant CI extended (caps required; no Hex growth). Forced golden regen (57-pool changes reward rolls) — loud, in-commit. |
| S13.3 | `2234a30` | Pick-with-removal (D4: option A — act-2+ screens): taking a card opens a free once-per-screen STARTER removal. Starters only; no gold interaction; v2 bots use it, v1 ignores it. Pinning tests per gate 1. |
| S13.4 | `115f7ec` | Rare legibility rider: gilt funerary frame (Gate B row on /?style, screenshot with this hand-off) + the Witness names each rare on first pick (26 authored lines, PROVISIONAL — D5). Forced golden regen (naming consumes rng) — loud, in-commit. |

## Sign-off rows — ALL RATIFIED (designer, 2026-07-04 follow-up)

All three returning rows closed: the six rare designs' numbers ("look
fine"), the 26 Witness naming lines (witness read passed), and the
rare frame treatment (Gate B screenshot: "frames look good"). Source
headers updated (witness-s13.ts, StyleScreen.tsx). Every engine is an
exhaust power, capped oncePerTurn, value riding pair state
(dilution-resistant by construction — the design law of the pass).
The table stands as the shipped design record:

| Card | Seat | Design as implemented | Numbers (ratified) |
|---|---|---|---|
| gravebloom (REVISE) | V | Power: first partner link-fire each turn → 2 Hex to ALL. Cost 2; + = cost 1. | 2 Hex, cost 2/1 |
| call_and_answer (REVISE) | B | Power: first partner link-fire each turn → Kindled 1 + draw 1. Cost 1; + = cost 0. | K1/D1, cost 1/0 |
| selvage (NEW — chain-position payoff) | V | Power: resolved Chain closes on your card → both seats +3 Block. Cost 2; + = cost 1. | 3 Block, cost 2/1 |
| keepsake (NEW — Reclaim-keyed, pull-based) | V | Power: your Reclaim → +1 Thread, draw 1. Cost 1; + = cost 0. | T1/D1, cost 1/0 |
| bellmetal (NEW — Resonance amplifier) | B | Power: Resonance ignition → +3 Momentum, draw 1. Cost 2; + = cost 1. | M3/D1, cost 2/1 |
| stokers_due (NEW — Thread-spend payoff) | B | Power: first pool spend each turn → +2 Momentum, +3 Block (either seat's spend). Cost 2; + = cost 1. | M2/B3, cost 2/1 |

Nothing in the S13 content set remains provisional.

Rarity odds (60/30/10) NOT touched, per the packet — the reserve lever
if gate 3 misses.

## The banked anchor (gate 3 discipline: v2-vs-v2, BANKED PRE-CONTENT)

Pre-S13.2 build (commit `06c5785` — instruments only), v2 policy,
deck-size sweep (ceiling = 10 starters + N net adds/seat):

| Leg | v1 base | cap 0 | cap 2 | cap 4 | cap 8 | cap 12 | uncapped |
|---|---|---|---|---|---|---|---|
| win % | 57 | 7 | 21 | 29 | 46 | 45 | 49 |
| act-1 HP/combat | 27.2 | 34.6 | 30.6 | 29.6 | 27.7 | 28.8 | 26.9 |

- Pre-content post-knee slope (8→12→uncapped): **~0–1 points/pick** —
  same-environment confirmation of the packet's ~1-point tail.
- v1-vs-v2 base delta (REPORTED, not banded — D7): 57 → 49, **−8 win
  points.** v2's rare/power preference and dilution discipline trade
  raw win rate for the meta the sprint is aimed at; the number exists
  to make the eventual default flip a decision, not a drift.

## Post-content battery & gates

All legs on the final S13 build (commit `115f7ec`), same environment as
the anchor. vv leg is n=99 (one 5-minute run timeout — the known
long-run class; comfort-pass note applies).

### The rows

| Leg | win % | act-1 HP/combat | act-1 LF | act-2 LF | reson/run | thread/combat | pair deck (wins) | act-2 lever removals/seat/run |
|---|---|---|---|---|---|---|---|---|
| v1 base (vb) | 50 | 28.0 | 50.8% | 57.7% | 31.4 | 7.94 | 41.5 | 0.09 |
| v1 skip-all (vb) | **9** | 35.2 | 44.3% | 45.5% | 22.4 | 7.73 | 18.8 | 0 |
| v2 cap 0 | 11 | 35.0 | 44.4% | 44.9% | 23.2 | 7.79 | 19.5 | 0.03 |
| v2 cap 2 | 14 | 31.7 | 46.8% | 48.8% | 24.9 | 7.79 | 21.1 | 0.08 |
| v2 cap 4 | 26 | 29.9 | 48.4% | 51.4% | 26.3 | 7.89 | 24.9 | 0.07 |
| v2 cap 8 | 37 | 30.1 | 49.3% | 54.9% | 27.0 | 7.74 | 32.1 | 1.47 |
| v2 cap 12 | 49 | 28.3 | 49.8% | 56.4% | 29.2 | 7.93 | 33.9 | 2.57 |
| v2 uncapped (vb) | **60** | 28.4 | 50.1% | 57.2% | 31.7 | 8.23 | 33.2 | 2.80 |
| v2 vv | 40 | 26.9 | 45.9% | 54.9% | 23.6 | 6.22 | 35.0 | 2.46 |
| v2 bb | 37 | 26.0 | 44.8% | 49.7% | 28.3 | 6.52 | 34.2 | 2.93 |

### Gate verdicts

1. **CI (structure): PASS.** 365/365. Covenant extended: every S13.2
   engine hook capped (oncePerTurn), no Hex-amount growth, render-parity
   over revised texts, pick-with-removal pinned (starter-only, once per
   screen, act-2+ per D4-A, free).
2. **Load-bearing check: PASS (holds AND widens).** Same-instrument v1
   pair, post-content: skip-all 9 vs base 50 = **−41 win points** (the
   packet's Part 0 read: −40). Cards did not get less necessary.
3. **Tail-slope (D6, ≥2 points/pick, v2-vs-v2): PASS — THE gate the
   sprint exists for.** Anchor (pre-content): 8→12→uncapped read
   46→45→49, ~0–1 point/pick. Post-content: 37→49→60 — the 8→12 leg
   reads **+12 points over four picks = 3.0 points/pick**, outside the
   100-run statistical floor (≥8 over a four-pick leg); 12→uncapped adds
   +11 more. The tail's ceiling lifted: post-knee picks now buy wins.
   The reserve lever (rarity odds 60/30/10) stays untouched and unspent.
4. **Texture gate: PASS.** vb under v2 leads BOTH mirrors on every
   co-op texture channel: resonances/run 31.7 (vv 23.6, bb 28.3),
   thread spent/combat 8.23 (6.22, 6.52), act-1 link-fire 50.1%
   (45.9%, 44.8%), act-2 link-fire 57.2% (54.9%, 49.7%). The new rares
   feed the thesis — every one of them keys a pair channel (partner
   link-fire ×2, chain close, Resonance, shared-pool spend, Reclaim).
5. **Solo manual pass:** rides the next playtest, as ever.

### Readings on record (not gates)

- **v1-vs-v2 base delta (D7 report):** pre-content v2 read −8 vs v1
  (57→49); **post-content it reads +10 (50→60)** — once rares are
  engines and the lever exists, the dilution-aware policy WINS. The
  first clean battery is now behind draft v2; per D7 the default flip
  is ready to be made as its own loud, recorded re-anchor (deliberately
  NOT flipped in this sprint's commits — the flip is a decision).
- **The lever is used and shapes decks:** under v2, ~2.5–2.9 free
  starter removals per seat per run land on act-2+ screens (v1, which
  ignores the lever: 0.09). Winning v2 pair decks run ~33 cards vs
  v1's ~41 — tighter decks, more wins, exactly the dilution thesis.
- **Take-rate now falls with deck size under v2** (the S13.1c
  instrument shows act-2 take-rates dipping as decks pass the knee) —
  the human/StS-meta shape the packet asked the bots to learn.
- **Re-anchored v1 base moved 57 → 50 across the content commit** —
  expected: v1 undervalues the revised engine rares it occasionally
  drafts, and gravebloom/call_and_answer's old bodies left its pool.
  The v2 rows are the going-forward instrument (gate 3 is v2-vs-v2 by
  construction).
- OQ#14 stands: bot evidence understates human card value; magnitudes
  re-read at the next playtest.

## Post-sprint (designer-ruled sequencing)

The difficulty re-evaluation runs on THESE batteries, not before: HP
bands (act-1 loss has sat above the 16–22 watch band since S10a), the
fight-price question (~27 pair HP/fight vs its reward bundle), and the
braid's S11.10 gate 2 re-anchor. D7's second half is also pending: draft
v2 flips default-on in one loud, recorded re-anchor after its first
clean battery.
