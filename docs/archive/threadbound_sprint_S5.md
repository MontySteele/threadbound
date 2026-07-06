# Threadbound — Sprint S5: The Thesis Pass (Hex Ceiling + Bram Floor)

Post-PT3 rebalance sprint. The S3 thesis — **synergy must beat duplication**
— is currently violated: on the current tip (post-§14.16), 30-run sims read
vv 53% / vb 27% / bb 20%, with vv at 86.1% Hex damage share and the only
pair inside the act-1 HP band (the hex engine trivializes difficulty).
Human PT3 data agrees (Hex share 64.9% / 75.0%, Worn Knife ~28 dmg/play,
17-stack bursts). This sprint restores the ordering vb ≥ vv > bb → toward
vb ≥ both mirrors, primarily by CUTTING the Vess mirror's self-sufficient
engine (OQ#28/#43) and secondarily by raising Bram's floor (link re-aim).

Branch: continue on `s4-economy` (or designer's call for `s5-balance`).
Hard scope rule: no new cards, no new relics, no new mechanics, no
narrative/event work. Changes are caps, curves, link-condition re-aims, and
the parked small fixes listed in S5.4. Balance changes and bug fixes stay
in SEPARATE commits (post-§14.16 review finding — no more bundling).

## S5.0 Baseline first (mandatory, before any change)

Run and BANK the full battery on the untouched tip: 50 runs × each of
PAIR=vb, vv, bb. Commit the three summaries to docs/ as the **post-§14.16
baseline**. The S3.5 numbers are stale (the difficulty floor moved); every
S5 effect is measured against THIS baseline, not S3.5.

## S5.1 Hex ceiling levers (OQ#28 / OQ#43)

Two cuts, implemented as separate commits so each can be evaluated alone:

1. **Cap `doubleHex` (Saturate).** First guess: doubling applies up to a
   cap — "Double the Hex on the target (max +6)". A 17-stack burst becomes
   ≤ (11+6)... i.e., the exponential engine becomes linear past 6. Value
   provisional; tune against the S5.6 bands.
2. **Curve Worn Knife (`damagePerHex`).** Observed ~28 dmg/play. First
   guess: cap the per-play damage at 12 ("+1 per Hex, max 12"), keeping the
   floor-scaling identity (§14.11: it scales with Hex, never consumes it)
   while removing the uncapped top end. Alternative if the cap feels
   arbitrary in text: 1 per Hex up to 8, then 1 per 2 Hex. Designer picks
   the wording; the ceiling is the point.

Anti-target: do NOT touch Hatpin, base Hex application rates, or detonation
damage — the 25–45% band violation is a CEILING problem (scaling + doubling),
not a rate problem. If the band still misses after both cuts, STOP and
report; do not reach for a third lever unilaterally.

## S5.2 Bram link re-aim (OQ#24 execution, characters-doc §3 constraints)

The diagnosis: 12 of Bram's links read Hex (which he produces at the
Covenant floor, 6 tags) while Strike (13) and Surge are over-produced and
under-read. Protocol — this is enumerate → propose → designer gate:

1. Enumerate every Bram link clause with condition 'Hex' (pool + upgrades).
2. Propose re-aims for roughly HALF of them toward 'Strike' or 'Surge'
   (one-step re-aims between named tags per the OQ#24 ruling; 'any' stays
   rare-tier; preserve §2.3 zero-self-similar-at-common — a Strike card may
   not gain a Strike link at common).
3. KEEP Hex conditions on his detonator identity cards (Cinderbreak-class:
   cards whose link DETONATES — those are the cross-player payoff arcs and
   the founding image).
4. Present the full table (card / old condition / new condition / rationale)
   for designer sign-off BEFORE committing. No re-aim lands unapproved.

Also in scope, same protocol: the upgrade-widening ruling (OQ#24/#33) for
both characters' upgrade links — one-step widening between named tags,
'any' reserved for rares. Enumerate current upgrade 'any' links at
common/uncommon and propose narrowings.

## S5.3 Momentum floor (small, bounded)

No new cards. Up to THREE text-level adjustments to existing Bram cards to
deepen Momentum-as-bank (e.g., a keepMomentum rider on one uncommon, or a
spend that doesn't halve), proposed in the S5.2 sign-off table. If the S5.2
re-aims alone lift bb off the floor in the battery, ship zero of these —
cuts before additions, always.

## S5.4 Parked smalls (ride-alongs, separate commits)

- OQ#30: Stolen Breath base card (upgrade was fixed in PT2 batch 2; base
  pending) — per the logged ruling direction.
- OQ#34: Linked Shields — 8 Block base OR partner Block 4 → 6 (designer
  picks in the sign-off table; co-op half preferred per the OQ note).
- OQ#36: rename ONE of the two "Stolen Breath" cards (propose 2–3 names).
- OQ#42: drop the redundant "Pass on Coveting" button (Onward auto-passes).

## S5.5 Difficulty interaction check (do not skip)

The hex cuts LOWER player output → fights lengthen → act-1 HP loss rises.
It already runs hot for vb/bb (24–25 vs the 16–22 band). After S5.1+S5.2,
if HP-loss overshoots further, the correction is easing the anchor
(1.5/1.35 down a notch) — as its own commit, its own battery delta, and a
designer yes/no. Do not fold an anchor change into any other commit.

## S5.6 Sign-off gates (50 × 3 battery vs the S5.0 baseline)

1. **Thesis: vb win rate ≥ vv AND ≥ bb.** The headline gate.
2. Parity: |vv − bb| ≤ 15 points.
3. All pairs win rate inside 25–35% (vv must come DOWN from 53%).
4. Hex damage share: vv and vb inside 25–45%; bb exempt (floor-rate ~9% is
   the design).
5. Act-1 HP loss 16–22 all pairs (after S5.5 if needed).
6. Worn Knife mean dmg/play ≤ 15; max detonation burst meaningfully below
   the 17-stack human observation.
7. All tests green from fresh clone; new/changed card text covered by the
   covenant tests where applicable.
8. Designer has signed the S5.2/S5.3/S5.4 proposal table — no unapproved
   content change is in the diff.

## Out of scope, explicitly

Narrative/events/bosses (Track B, in design), soft-release deployment
(next sprint candidate), OQ#37 HP-bar theater (parallel UX task — may be
done alongside S5 but in its own commits, it touches no balance surface),
OQ#39 thread regen (CLOSED — PT3 telemetry says leave +2), OQ#40 Sever
verb (design session), OQ#44 ascension model (awaiting designer ruling:
host-only vs both-confirm), character 3, 3+ players.
