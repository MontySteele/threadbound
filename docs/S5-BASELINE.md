# S5.0 Baseline — post-§14.16 tip (4ce0214)

Banked 2026-07-01 on branch s5-balance (tip = main @ 4ce0214, untouched).
50 runs × PAIR per S5.0. Seed set 1000+. Scales 1.5/1.35, A0.
Every S5 effect is measured against THESE numbers (S3.5 is stale).

Headline: vb 18% / vv 60% / bb 22% — thesis (vb ≥ vv AND ≥ bb) violated; vb is LAST.

## PAIR=vb

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 9 (18%)  |  combats won: 394
furthest acts: {"1":2,"2":39,"3":9}
turns: 2527  |  cards played: 18208  |  overall link-fire: 56.6%
act 1: 250 combats, link-fire 52.6%, HP lost/combat 23.4
act 2: 176 combats, link-fire 61.7%
Resonance ignitions: 1827  |  streak tags: {"Strike":3262,"Surge":1492,"Hex":2117,"Guard":1656,"Rite":678}
damage by tag: {"Strike":38205,"HexScaling":13763,"Hex":20512}  |  Hex share: 47.3%
detonations: 1121  |  avg stacks per detonation: 4.28
p1 (vess): damage 27891 | block 16841 | link-fires 5359 | falls 46 | covets taken from partner 214
p2 (bram): damage 44589 | block 16696 | link-fires 4951 | falls 44 | covets taken from partner 219
Worn Knife: 622 plays | mean damage 15.05
thread: spent/combat 3.55 | spend mix {"pulse":732,"reclaim":0,"sever":32,"steady":0} | regen wasted at cap/combat 5.09
forced links (Pulse): 683 (6.6% of fires) | Resonances needing one: 485/1827
gold: mean income/run 380.8 ({"combat":4826,"elite":7935,"boss":5057,"event":225,"treasure":999}) | mean residual 378.9 | removals/player/run p1 0.74 / p2 0.14 | removal spend 94.1% of total spend
Pulsekeeper's Ring discounts fired: 16
---------------- GATES ----------------
PASS  full-run bot win rate ≤ 40%  →  18%
PASS  avg HP lost per Act 1 combat ≥ 8  →  23.4
PASS  Act 1 link-fire ≥ 30%  →  52.6%
FAIL  Act 2 link-fire 40–60%  →  61.7%
PASS  no tag > 50% of resonance streaks  →  35%
FAIL  Hex damage share 25–45% (provisional, §14.10)  →  47.3%
GATES PENDING PART A RECALIBRATION — do not tune off this number before the human-uplift bands exist (M3 Part A)
===============================================================
```

## PAIR=vv

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 30 (60%)  |  combats won: 469
furthest acts: {"1":1,"2":19,"3":30}
turns: 2705  |  cards played: 20177  |  overall link-fire: 55.8%
act 1: 250 combats, link-fire 48.5%, HP lost/combat 19.4
act 2: 209 combats, link-fire 62.9%
Resonance ignitions: 1778  |  streak tags: {"Strike":1958,"Surge":1170,"Guard":2077,"Rite":767,"Hex":3211}
damage by tag: {"Strike":16151,"HexScaling":41536,"Hex":60586}  |  Hex share: 86.3%
detonations: 926  |  avg stacks per detonation: 16.16
p1 (vess): damage 63895 | block 19729 | link-fires 5714 | falls 27 | covets taken from partner 265
p2 (vess): damage 54378 | block 18631 | link-fires 5538 | falls 27 | covets taken from partner 252
Worn Knife: 1359 plays | mean damage 19.23
thread: spent/combat 1.64 | spend mix {"pulse":343,"reclaim":0,"sever":41,"steady":0} | regen wasted at cap/combat 5.06
forced links (Pulse): 300 (2.7% of fires) | Resonances needing one: 258/1778
gold: mean income/run 481.5 ({"combat":4991,"elite":9261,"boss":8433,"event":255,"treasure":1137}) | mean residual 242.8 | removals/player/run p1 2.50 / p2 0.18 | removal spend 89.0% of total spend
Pulsekeeper's Ring discounts fired: 6
---------------- GATES ----------------
FAIL  full-run bot win rate ≤ 40%  →  60%
PASS  avg HP lost per Act 1 combat ≥ 8  →  19.4
PASS  Act 1 link-fire ≥ 30%  →  48.5%
FAIL  Act 2 link-fire 40–60%  →  62.9%
PASS  no tag > 50% of resonance streaks  →  35%
FAIL  Hex damage share 25–45% (provisional, §14.10)  →  86.3%
GATES PENDING PART A RECALIBRATION — do not tune off this number before the human-uplift bands exist (M3 Part A)
===============================================================
```

## PAIR=bb

```
================ TELEMETRY SUMMARY (M2 Part C) ================
runs: 50  |  victories: 11 (22%)  |  combats won: 405
furthest acts: {"1":2,"2":37,"3":11}
turns: 2540  |  cards played: 17432  |  overall link-fire: 45.6%
act 1: 250 combats, link-fire 38.9%, HP lost/combat 25.2
act 2: 183 combats, link-fire 53.4%
Resonance ignitions: 1524  |  streak tags: {"Strike":3412,"Surge":1626,"Guard":1267,"Rite":361,"Hex":486}
damage by tag: {"Strike":61939,"Hex":6470}  |  Hex share: 9.5%
detonations: 492  |  avg stacks per detonation: 2.74
p1 (bram): damage 33558 | block 16743 | link-fires 3942 | falls 45 | covets taken from partner 223
p2 (bram): damage 34851 | block 17276 | link-fires 4004 | falls 44 | covets taken from partner 231
Worn Knife: 0 plays | mean damage n/a
thread: spent/combat 3.65 | spend mix {"pulse":759,"reclaim":0,"sever":37,"steady":0} | regen wasted at cap/combat 4.82
forced links (Pulse): 728 (9.2% of fires) | Resonances needing one: 551/1524
gold: mean income/run 395.5 ({"combat":4901,"elite":8140,"boss":5457,"event":290,"treasure":986}) | mean residual 366.9 | removals/player/run p1 0.92 / p2 0.12 | removal spend 89.8% of total spend
Pulsekeeper's Ring discounts fired: 9
---------------- GATES ----------------
PASS  full-run bot win rate ≤ 40%  →  22%
PASS  avg HP lost per Act 1 combat ≥ 8  →  25.2
PASS  Act 1 link-fire ≥ 30%  →  38.9%
PASS  Act 2 link-fire 40–60%  →  53.4%
PASS  no tag > 50% of resonance streaks  →  48%
FAIL  Hex damage share 25–45% (provisional, §14.10)  →  9.5%
GATES PENDING PART A RECALIBRATION — do not tune off this number before the human-uplift bands exist (M3 Part A)
===============================================================
```

