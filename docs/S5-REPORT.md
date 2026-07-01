# S5 Final Report — The Thesis Pass (hex ceiling + Bram floor)

2026-07-01, branch `s5-balance`. All content changes designer-approved
(sign-off recorded in docs/S5-PROPOSALS.md). Every battery = 50 runs/pair,
scales as committed at that step, A0.

## The ladder (seed set 1000)

| Step | vb | vv | bb | vv burst | Worn Knife | act-1 HP (vb/vv/bb) |
|---|---|---|---|---|---|---|
| S5.0 baseline (1.5/1.35) | 18% | 60% | 22% | 16.2 | 19.2 | 23.4 / 19.4 / 25.2 |
| + doubleHex cap (+6) | 12% | 48% | — | 11.2 | 17.1 | 23.6 / 20.2 / — |
| + Worn Knife max 12 | 18% | 28% | — | 13.0 | 9.3 | 25.4 / 25.7 / — |
| + Tables A/B (re-aims + narrowing) | 22% | 24% | 22% | 10.1 | 9.2 | 25.5 / 26.9 / 25.4 |
| + anchor 1.45/1.30 (S5.5) | 28% | 36% | 34% | 11.5 | 9.1 | 22.7 / 25.1 / 23.1 |
| final, seed set 2000 (replication) | 30% | 26% | 30% | — | 9.1 | 22.3 / 24.2 / 22.9 |
| **final, both sets pooled (100 runs)** | **29%** | **31%** | **32%** | — | — | — |

Seed-set ordering flips (vb loses to vv by 8 on set 1000, beats it by 4 on
set 2000) ⇒ the residual differences are noise; the pooled numbers are the
honest read.

## S5.6 gates

1. **Thesis vb ≥ vv AND ≥ bb: PARITY, not a clean pass.** Pooled 29/31/32
   is a three-way tie inside noise (±4.6% at 100 runs) — vs the baseline's
   vv +38 over vb. The engine no longer dominates; nothing distinguishes
   the pairs. Strict reading: FAIL by 2–3 points. Honest reading: the
   ordering is now unmeasurable at practical sim scale. **Designer call
   below.**
2. Parity |vv − bb| ≤ 15: **PASS** (1 point pooled).
3. All pairs 25–35%: **PASS pooled** (29/31/32). Per-set excursion: vv 36
   on set 1000 (1 point over).
4. Hex share, vb-only per the gate-4 amendment: **PASS** (44.3 / 41.5).
   Mirror telemetry: vv 79–80% (structural), bb 8–10% (floor-rate design).
5. Act-1 HP loss 16–22: **vb PASS** (22.7/22.3, band edge); vv 25.1/24.2
   and bb 23.1/22.9 run ~1–3 hot. Second notch NOT taken — the conditional
   authorized one. Flagged, not tuned.
6. Worn Knife mean ≤ 15: **PASS** (7.4–9.2 across pairs/sets; was 19.2
   baseline, ~28 human PT3). Max burst: 11.5 stacks/detonation vs the
   17-stack human observation.
7. Tests green from fresh clone: **PASS** (86/86, verified from a scratch
   clone of s5-balance).
8. Designer signed the proposal table: **PASS** (recorded 2026-07-01;
   only approved changes are in the diff; S5.3 shipped ZERO per the HOLD —
   bb didn't need it).

## Open for the designer

- **Gate 1 disposition:** accept parity as satisfying the thesis intent
  (duplication no longer beats synergy — it ties), or authorize a
  vb-specific lever next sprint? Candidates if wanted: ship S5.3 #1
  (Pummel keepMomentum — but it lifts bb equally), or a vb-only synergy
  lever (cross-player link payoff), which is new-design territory.
- **Act-1 HP for the mirrors** (gate 5): ~23–25 vs band 22. A second
  anchor notch would likely push win rates over the 35 ceiling. Options:
  accept, or revisit the band (it predates the S5.1 cuts).
- Linked Shields upgrade delta is now thin (6 → 7 partner Block after
  OQ#34) — future content-pass item.
- Mutation links still carry 'any' at common/uncommon (e.g. Votive
  Cinder) — outside the OQ#24 upgrade ruling; needs its own ruling if the
  narrowing should extend to mutations.

## Final battery summaries (seed set 1000, tip of s5-balance)

### PAIR=vb

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 14 (28%)  |  combats won: 404
furthest acts: {"1":1,"2":35,"3":14}
turns: 2586  |  cards played: 18470  |  overall link-fire: 54.7%
act 1: 250 combats, link-fire 52.1%, HP lost/combat 22.7
act 2: 176 combats, link-fire 57.4%
Resonance ignitions: 1801  |  streak tags: {"Strike":3286,"Surge":1393,"Hex":1720,"Guard":1495,"Rite":659}
damage by tag: {"Strike":39581,"Hex":20406,"HexScaling":11129}  |  Hex share: 44.3%
detonations: 1168  |  avg stacks per detonation: 4.16
p1 (vess): damage 27310 | block 16287 | link-fires 5062 | falls 45 | covets taken from partner 214
p2 (bram): damage 43806 | block 17466 | link-fires 5042 | falls 39 | covets taken from partner 229
Worn Knife: 573 plays | mean damage 7.74
thread: spent/combat 3.73 | spend mix {"pulse":785,"reclaim":0,"sever":27,"steady":0} | regen wasted at cap/combat 4.62
forced links (Pulse): 737 (7.3% of fires) | Resonances needing one: 542/1801
gold: mean income/run 403.2 ({"combat":4705,"elite":8241,"boss":6045,"event":320,"treasure":849}) | mean residual 343.5 | removals/player/run p1 1.16 / p2 0.20 | removal spend 93.6% of total spend
Pulsekeeper's Ring discounts fired: 8
---------------- GATES ----------------
PASS  full-run bot win rate ≤ 40%  →  28%
PASS  avg HP lost per Act 1 combat ≥ 8  →  22.7
PASS  Act 1 link-fire ≥ 30%  →  52.1%
PASS  Act 2 link-fire 40–60%  →  57.4%
PASS  no tag > 50% of resonance streaks  →  38%
PASS  Hex damage share 25–45% (vb gate, §14.10 + S5)  →  44.3%
ALL GATES PASS
===============================================================
```

### PAIR=vv

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 18 (36%)  |  combats won: 363
furthest acts: {"1":14,"2":18,"3":18}
turns: 2348  |  cards played: 17502  |  overall link-fire: 49.3%
act 1: 238 combats, link-fire 45.7%, HP lost/combat 25.1
act 2: 139 combats, link-fire 56.5%
Resonance ignitions: 1172  |  streak tags: {"Strike":1386,"Surge":774,"Guard":1030,"Rite":450,"Hex":1878}
damage by tag: {"Strike":14538,"HexScaling":21497,"Hex":35907}  |  Hex share: 79.8%
detonations: 765  |  avg stacks per detonation: 11.52
p1 (vess): damage 39277 | block 14273 | link-fires 4440 | falls 34 | covets taken from partner 194
p2 (vess): damage 32665 | block 14032 | link-fires 4185 | falls 37 | covets taken from partner 205
Worn Knife: 1335 plays | mean damage 9.07
thread: spent/combat 2.15 | spend mix {"pulse":389,"reclaim":0,"sever":25,"steady":0} | regen wasted at cap/combat 5.55
forced links (Pulse): 355 (4.1% of fires) | Resonances needing one: 292/1172
gold: mean income/run 365.0 ({"combat":4237,"elite":7119,"boss":5603,"event":205,"treasure":1085}) | mean residual 256.5 | removals/player/run p1 1.56 / p2 0.10 | removal spend 91.8% of total spend
Pulsekeeper's Ring discounts fired: 3
---------------- GATES ----------------
PASS  full-run bot win rate ≤ 40%  →  36%
PASS  avg HP lost per Act 1 combat ≥ 8  →  25.1
PASS  Act 1 link-fire ≥ 30%  →  45.7%
PASS  Act 2 link-fire 40–60%  →  56.5%
PASS  no tag > 50% of resonance streaks  →  34%
PASS  Hex damage share (telemetry only for vv, S5 gate-4 amendment)  →  79.8%
ALL GATES PASS
===============================================================
```

### PAIR=bb

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 17 (34%)  |  combats won: 422
furthest acts: {"1":2,"2":30,"3":18}
turns: 2541  |  cards played: 17418  |  overall link-fire: 50.4%
act 1: 250 combats, link-fire 46.6%, HP lost/combat 23.1
act 2: 187 combats, link-fire 53.6%
Resonance ignitions: 1694  |  streak tags: {"Strike":3702,"Surge":1590,"Rite":811,"Guard":1202,"Hex":498}
damage by tag: {"Strike":62836,"Hex":7038}  |  Hex share: 10.1%
detonations: 578  |  avg stacks per detonation: 2.56
p1 (bram): damage 35153 | block 15028 | link-fires 4479 | falls 43 | covets taken from partner 236
p2 (bram): damage 34721 | block 15901 | link-fires 4293 | falls 35 | covets taken from partner 238
Worn Knife: 0 plays | mean damage n/a
thread: spent/combat 3.70 | spend mix {"pulse":803,"reclaim":0,"sever":30,"steady":0} | regen wasted at cap/combat 4.80
forced links (Pulse): 773 (8.8% of fires) | Resonances needing one: 605/1694
gold: mean income/run 421.5 ({"combat":4972,"elite":8279,"boss":6437,"event":190,"treasure":1195}) | mean residual 318.3 | removals/player/run p1 1.54 / p2 0.14 | removal spend 94.0% of total spend
Pulsekeeper's Ring discounts fired: 11
---------------- GATES ----------------
PASS  full-run bot win rate ≤ 40%  →  34%
PASS  avg HP lost per Act 1 combat ≥ 8  →  23.1
PASS  Act 1 link-fire ≥ 30%  →  46.6%
PASS  Act 2 link-fire 40–60%  →  53.6%
PASS  no tag > 50% of resonance streaks  →  47%
PASS  Hex damage share (telemetry only for bb, S5 gate-4 amendment)  →  10.1%
ALL GATES PASS
===============================================================
```

