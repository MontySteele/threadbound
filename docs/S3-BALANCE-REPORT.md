# S3 Balance Report — starter redesign (§14.11) + Pulse rework (§14.12)

Date: 2026-06-12 (pre-Playtest-2). All batches: seeded 50-run VB sims, seed set
1000+, lockstep sim bots. Scales are printed per batch; anything at the old
anchor says **1.4/1.3**.

**Interpretation caveats (apply to every number below):** bot policy has
archetype affinity (hex-converging); mirror gaps partially measure bot fit,
not card strength — read direction and magnitude, not decimals. Mirrors are a
solo-mode configuration; the tuned product remains vb. All bands here are
bot-floor proxies pending M3 Part A human-uplift bands.

---

## A/B — Pulse rework (§14.12), both batches at 1.4/1.3, post-§14.11 starters

| metric | (a) baseline `fb62d43` (old +3 Pulse) | (b) rework `409f061` (force-a-dead-link) |
|---|---|---|
| win rate | 58% | 40% |
| act-1 HP lost/combat | 17.0 | 19.7 |
| overall link-fire | 56.3% | 58.0% |
| Resonance ignitions | 1604 (3.49/combat) | 1818 (4.02/combat) |
| thread spent/combat | 15.16 | 3.02 |
| spend mix | pulse 3674 · sever 21 | pulse 702 · sever 21 |
| regen wasted at cap/combat | 0.40 | 4.39 |
| links forced via Pulse | n/a | 655 — **6.4% of fires** |
| Resonances needing a Pulse | n/a | 480/1818 (26%) |
| avg stacks/detonation | 6.23 | 4.94 |
| Worn Knife mean damage | 19.70 | 10.96 |

### Success signals, honestly scored

- ✅ **Forced links a visible minority (5–15%)**: 6.4%. Grease, not crutch.
- ✅ **Resonance/combat up**: 3.49 → 4.02 (+15%); 26% of all Resonances only
  existed because someone Pulsed.
- ❌ **Thread spent/combat ≥ 2× baseline**: went DOWN, 15.16 → 3.02.
- ❌ **Regen wasted at cap down**: went UP, 0.40 → 4.39.

### ⚠️ ESCALATION (per S3 sign-off: "else escalate to designer before S3.4")

The two failed signals are, on inspection, **structurally unreachable under
the new mechanic**, not evidence the rework missed:

1. The baseline's 15.16/combat is the OLD bot spamming flat-+3 Pulse roughly
   1.4×/turn — precisely the "correct-but-silent spends" that hid the system
   from the designer in solo runs. New Pulse is only castable when a dead
   link exists and is declared once per bot per turn: the ceiling is ~4–5
   thread/combat. **No policy can reach 2× a spam baseline.** The 2× target
   was written against an imagined quiet baseline; the real baseline was loud.
2. Regen waste rose **because** spend fell (pool sits near cap more). It is
   the designed lever for the deferred OQ#26 work (overcap strain / links
   generate Thread), not a regression of this slice.
3. The doc predicted win rate "WILL drift up (forcing links is pure player
   upside)". It dropped 58% → 40%: old Pulse was secretly a damage engine
   (~3,700 casts × +3 ≈ 11k damage/batch) and the rework removed it. The
   nerf direction helped the difficulty floor rather than hurting it.

**Texture verdict:** the Thread now does what §14.12 wanted at the bot level —
forced links are a visible minority, a quarter of Resonances are bought with
Thread, and every spend is named in the log. The economy LOOP (does spending
feel worth it turn-over-turn for humans) remains the OQ#26 question.

**Decision taken:** proceeded to S3.4/S3.5 with the anchor marked
**provisional pending the designer's A/B ruling**, because the failed metrics
are unreachable-by-construction, the passing metrics are the texture ones,
and Playtest 2 needs a committed anchor. If the designer re-rules Pulse
(cost, frequency, or pulling OQ#26 levers forward), re-walk S3.4 — it is two
knobs and three sims.

---

## S3.4 — difficulty re-anchor (bands: win 25–35%, act-1 HP 16–22 pair-total)

The doc expected the landing zone near 1.2/1.2–1.3/1.25 ("the Hatpin buff the
1.4/1.3 anchor compensated for no longer exists"). Measured the OPPOSITE
direction: the §14.11 starters are a net buff over detonating-Hatpin (Worn
Knife scaling + Knuckle-Crack burst beat one self-owned drip card), so the
ladder walked UP from 1.4/1.3.

| scales | win | act-1 HP/combat | notes |
|---|---|---|---|
| 1.4/1.3 | 40% | 19.7 | rework A/B batch (b); win above band |
| 1.45/1.35 | 40% | 21.9 | win unmoved; HP at band ceiling |
| 1.5/1.3 | 44% | 21.6 | HP fits; win doesn't |
| 1.5/1.4 | 22% | 24.0 | overshot both bands |
| 1.55/1.3 | 24% | 23.0 | just under win band |
| 1.55/1.25 | 38% | 21.6 | win 3 over |
| 1.525/1.325 | 34% | 23.5 | win in band; HP 1.5 over |
| **1.5/1.35** | **26%** | **23.0** | **COMMITTED** (seeds 1000) |
| 1.5/1.35 (seeds 2000) | 28% | 22.0 | cross-seed check — both bands met |

**Committed anchor: `PT1_ENEMY_HP_SCALE = 1.5`, `PT1_ENEMY_DMG_SCALE = 1.35`.**

Findings the next tuner needs:

- There is a **win-rate cliff** inside the 1.5–1.55 × 1.3–1.35 square: one
  notch on either knob swings ~20 points (44% → 24%). Likely an enemy-HP
  breakpoint against standard chain damage; treat small knob moves near the
  anchor as nonlinear.
- **The two S3.4 bands conflict by ~1 HP at this meta.** Every combination
  that lands win ≤35% pushes act-1 HP/combat to ~22–23.5. The HP band (16–22)
  was authored expecting the §14.11 starters to be a nerf; they are a buff.
  1.5/1.35 is the least-bad joint fit: win in band on both seed sets, HP at
  22.0–23.0 straddling the ceiling. Report, not auto-tune — per S3.6 no lever
  beyond the two knobs was touched.
- Friday softening knob unchanged: `TB_ENEMY_HP_SCALE=1.2 TB_ENEMY_DMG_SCALE=1.2`
  remains the first-timer setting; active scales ride in every telemetry file.

---

## S3.5 — character balance battery (anchor 1.5/1.35, seeds 1000, 50 runs each)

| metric | vb (baseline) | vv | bb |
|---|---|---|---|
| win rate | 26% | 32% | 16% |
| furthest acts (1/2/3) | 4 / 33 / 13 | 8 / 24 / 18 | 1 / 41 / 8 |
| act-1 HP lost/combat | 23.0 | 22.2 | 23.1 |
| link-fire act 1 / act 2 | 52.8% / 62.0% | 47.6% / 61.8% | 38.6% / 51.7% |
| Resonance ignitions (per a1+a2 combat) | 1803 (4.13) | 1387 (3.36) | 1377 (3.21) |
| Hex damage share | 50.0% | **84.7%** | 8.9% |
| avg stacks/detonation | 6.18 | **13.11** | 2.77 |
| Worn Knife plays · mean damage | 608 · 12.92 | 1280 · 19.13 | — |
| thread spent/combat · forced links | 3.25 · 6.5% | 1.55 · 2.5% | 3.03 · 8.5% |
| per-seat damage+block split | vess 41% / bram 59% | 53% / 47% | 50% / 50% |
| Falls split | 47 / 41 (53%/47%) | 40 / 41 | 50 / 48 |

### Acceptance bands, scored

- ❌→✅ **Synergy premium (headline)**: split verdict.
  - Resonance/combat: vb 4.13 **exceeds both** mirrors (3.36, 3.21) ✅ — the
    pairing weaves more than duplication does, mirrors are NOT resonating at
    near-vb rates, so links are not too generic (the S3.6 first check).
  - Win rate: vb 26% beats bb by exactly 10 points ✅ but **loses to vv by 6
    points** ❌. The vv edge is not resonance — it is the hex ENGINE: 84.7%
    Hex damage share, 13.1 stacks per burst, double Worn Knife at 19.1 mean.
    Two hex-converging bots playing the hex-converging policy's favorite
    archetype is the caveat printed above doing exactly what it warned;
    treat the 6-point edge as bot-fit signal until a human vv run exists.
- ❌ **Character parity |vv − bb| ≤ 15**: 16 points — a hair over, in the
  weak-Bram direction (bb also bottoms the link-fire rates: Bram's pool
  links want a Hex supply that the mirror lacks).
- ✅/❌ **Texture**: avgStackAtDetonation 6.18 in vb (≥3 — bank-and-burst
  restored, the §14.11 goal) ✅; Worn Knife mean 12.92 in vb vs band 4–8 ❌ —
  the band assumed typical piles of 2–6 Hex; bot piles routinely exceed 10.
  Direction is right (the knife scales and is never dead weight at 2 dry);
  the magnitude says the band was authored for human pile sizes.
- ✅ **Within-pair contribution (vb)**: bram 59.0% of damage+block (< 60%);
  Falls 53%/47% (< 70% one-sided).

### S3.6 findings (report, don't auto-tune — nothing beyond the two knobs was touched)

1. **vv > vb on win rate** — per playbook, checked Resonance first: mirrors
   resonate 19–22% LESS than vb, so cross-archetype links are doing their
   job. The vv edge rides on hex-pile compounding. Top vess damage sources
   in vv: detonation bucket 42.3k (largest), HexScaling 37.4k — of which
   Worn Knife alone ≈ 24.5k (26% of ALL vv damage; 1280 plays × 19.13),
   remainder Patient Knife's per-Hex mode — Strike only 14.4k. The pile
   enablers (Saturate's doubleHex feeding 13-stack bursts, uncapped
   Worn Knife scaling) are the cards to watch IF a human vv run ever
   reproduces this; logged as OQ#28. Do not nerf mirror play without a
   human datapoint — the tuned product is vb.
2. **Bram mirror is the weak one** (16% win, 38.6% act-1 link-fire): his
   links are Hex-hungry (Rendcall, Stamp Out, Followthrough, Knuckle-Crack
   all read Hex) and the mirror starves them. This is the design working —
   Bram is supposed to want a Vess — but it makes |vv−bb| parity miss by 1
   point. Designer call: accept (asymmetric dependence is the thesis) or
   widen a couple of Bram links to Strike/Surge in the pool pass (OQ#24's
   content pass is already scheduled post-playtest).
3. **Hex-share gate proposal** (sign-off item; gate NOT edited): vb at the
   S3.4 anchor reads 50.0% (current provisional band 25–45 FAILs). With
   §14.11, starter payoffs exist on both sides and Worn Knife books into
   HexScaling by design; the bot is also hex-converging. **Propose: 35–55%
   provisional at the bot floor**, re-derived against Friday's human pair
   data in M3 Part A. Until ratified, the sim prints the 25–45 FAIL line —
   honest, and it blocks nothing (gates are pending Part A anyway).

### Sign-off checklist (S3)

- [x] Tests green incl. §14.11 covenant entries and §14.12 Pulse engine +
  policy-courtesy tests (55 passing).
- [x] A/B recorded; two signals pass, two fail structurally — **escalated
  above**; S3.4 proceeded with anchor marked provisional per the decision
  note.
- [x] S3.4 anchor committed (1.5/1.35) with updated ladder comment.
- [x] This report: A/B + all three battery batches, bands evaluated, caveats
  printed.
- [x] DESIGN doc §14.11 + §14.12 entries; deferred Thread levers in OQ#26;
  Pulsekeeper's Ring forced retext in OQ#27; battery findings in OQ#28.
- [x] Hex-share band revisited honestly: proposal above, gate untouched.
