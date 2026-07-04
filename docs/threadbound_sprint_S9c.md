# Threadbound — Sprint S9c: The Feel Slice

Purpose: make rites and Resonance LAND. Implements the fired branches
and approved rulings from the 2026-07 friend sessions: D9-B (rite
magnitude), D9-C (rite identity), the rite_reclaim Witness pool pulled
forward, D10-B (one line at the birth pick), and Resonance rungs i–ii
(legibility, then aim). Playtest verbatims answered here: "deathrites
and birthrites did not feel impactful enough," "birth rites made no
sense," "Resonance didn't feel impactful."

Branch: `s9c-feel-slice`, from main AFTER S9b lands. Sequencing is
load-bearing: S9b turns 18 no-op upgrades real, which retroactively
buffs Quickening ("reclaims arrive upgraded" starts doing something on
those cards) — birth-passive tuning must read post-S9b batteries or we
double-move one knob. Hard scope rule: rite content, rite/Resonance
presentation, and the named Witness lines ONLY. No map work, no
question/fragment changes, no new cards. The covenant fence holds: no
Hex application or scaling ops anywhere in rite content — every bump
below is non-Hex by construction. Balance commits separate from
presentation commits.

## S9c.0 Designer decision list

1. Sign-off on the D9-B magnitude table (§S9c.1) — numbers
   provisional pending battery.
2. Approve or amend the four rite_reclaim Witness candidates and the
   D10-B line (§S9c.3–4) — strings PROVISIONAL, never-lies and
   wrong-way fences apply, your read is the gate.
3. Resonance rung ii ships in this sprint (recommended) or holds for
   its own micro-slice if rung i's battery drifts.

## S9c.1 D9-B — magnitude (sign-off table; balance commit)

Death-rite cards. Identity target: a notch under common on raw
numbers, over common on thread texture — the current gap is two
notches, not one. Costs unchanged throughout.

| Card | Current | Proposed |
|------|---------|----------|
| Shroud (1) | 4 Block; L(Hex): partner 2 Block | 5 Block; L: partner 3 Block |
| Votive (0) | 1 Thread; L(Rite): partner draws 1 | adds Draw 1 to base; link unchanged (Thread amount untouched — economy fence) |
| Knell (1) | Deal 3; L(Hex): Detonate | Deal 5; link unchanged |
| Vigil (1) | Bind + 3 Block | Bind + 5 Block (taunting at 3 is a self-report) |
| Toll (0) | 2 Momentum; L(Surge): +1 | 3 Momentum; link unchanged |
| Pyre-Brand (1) | Deal 4; L(Strike): Kindled 2 | Deal 6; link unchanged |
| Mourner's Step (1) | 4 Block; L(Guard): 2 Momentum | 5 Block; L: 3 Momentum |
| Descant (0) | Draw 1; L(Surge): partner draws 1 | adds Gain 1 Momentum to base; link unchanged |

Birth-rite passives (post-S9b read first, per sequencing note):

| Passive | Current | Proposed |
|---------|---------|----------|
| First-Breath | first ignition/combat: both heal 1 | both heal 2 |
| Cradle-Warden | partner links off your cards: +1 | +2 |
| Naming-Day | mutated effects +2 | HOLD (re-read post-S9b) |
| Dowry-Bound | reclaim partner card: 2 Mom + draw 1 | HOLD (D5-A says it works) |
| Hearth-Keeper | Momentum carries, cap 3 | HOLD (B3 retext just landed) |
| Quickening | reclaims arrive upgraded | HOLD — S9b IS its buff |

## S9c.2 D9-C — identity (presentation commit)

- Rite cards get a distinct frame treatment in hand/chain/pile views
  (client CSS + a frame marker off the Rite tag — no engine change).
- The Witness NAMES the rite card the first time it is drawn each
  run (existence-naming, held-reveal-compatible: what it is, never
  what it's for). One line per card, drawn from the S9c.3 register.

## S9c.3 The rite_reclaim Witness pool (pulled forward)

Trigger: a player Reclaims the PARTNER's rite card. Pool of 4, fired
at most once per combat, standard rotation. Register: disdain with an
edge of reluctant recognition — the Witness has seen funerals; it has
not often seen them shared. Fences: never lies, never explains the
pip economy, no wrong-way lines. Candidates (PROVISIONAL, designer
read is the gate):

1. "That was made for their hands. It seems not to mind yours."
2. "Grave-goods, borrowed. The dead keep poor inventories."
3. "You wear each other's mourning now. How economical."
4. "A rite passed hand to hand. The Machine files that under
   'irregular.'"

## S9c.4 D10-B — the birth pick line (presentation commit)

One Witness line at the birth-rite pick moment, acknowledging that a
choice exists and is the player's — zero explanation of stakes or
economy. Candidate (PROVISIONAL): "It wants naming. That part, at
least, is yours to do." Fires once per pick; no repeat within a run.

## S9c.5 Resonance rung i — legibility (presentation commit)

- The ignited slot's floating number renders the multiplier
  explicitly (base ×1.5 → result), the chain slot gets an ignition
  treatment, and the combat log gains one generated line naming the
  streak length and the ignited card.
- No engine change; computePlannedDamage already models ignition, so
  the preview now VISIBLY matches what it already computed.

## S9c.6 Resonance rung ii — aim (engine; balance commit)

computeResonanceSlots ignites the qualifying run's LARGEST primary
effect instead of its last slot ("the loudest note carries").
Tie-break: latest slot among the tied. computePlannedDamage and bot
valuation updated in the same commit — preview==reality is tested and
must stay green. Battery-gated per S9c gates; if drift exceeds the
band, rung ii reverts alone (S9c.0-3 fallback) and re-enters as its
own micro-slice.

## Gates

1. Full suite green; preview==reality tests green after S9c.6.
2. Batteries (pooled shards, all pairs, A0): win rate within ±6 pts
   of post-S9b baseline; rite-card play rates and ignitions/run rise
   (direction gate, not band — the point of the sprint).
3. Hex damage share stays in 25–45% (no rite bump is a Hex op, but
   Knell's detonate frequency could move it — watch, don't assume).
4. Witness strings: designer read against never-lies / wrong-way
   fences before merge (S9c.0-2).
5. Flag-off parity untouched: all rite/Resonance content is flagged
   or engine-internal; rng-consumption tests green.
