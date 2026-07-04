# S12 brief — card rewards don't seem to matter (designer-ruled sprint seed)

Ruled 2026-07-04 (OQ#59 close): the braid's fights-vs-events-vs-treasure
mix STANDS as a design choice. The Wave B win-rate inflation indicts
something deeper and systemic: **the card-reward stream is not
load-bearing.** A pair that routes around combat should arrive at the
knots underpowered — their deck never grew — and instead they fight
exactly as well. This brief seeds the sprint doc; per house convention
the sprint itself is enumerate→propose→sign-off on the designer's
packet.

## The evidence (all 2026-07-04, in-env)

1. **HP/combat is flat across topologies: 29.7 (braid) vs 29.6 (Wave
   A).** The clean datum. Braid pairs take 2–4 fewer card picks per act
   and fight identically. Card picks contribute ~nothing measurable to
   per-fight performance in the bot meta.
2. **One relic-bearing event per act-2 map moved vb +11 by itself**
   (the S11.5 hs-floor probe, deep stages disabled). Relic marginal
   value is enormous by comparison.
3. **The braid stays hot without event greed**: event-seeking OFF reads
   vv 45 / bb 50 (vs 26/38 baseline) — fewer fights is pure upside
   because the forgone card rewards cost nothing.
4. Winners end ~9 relics / ~45 pair cards / 9 fights (new economy
   instruments; the wins-vs-losses split is run-length-confounded —
   prefer per-fight instruments).

## The bot-meta caveat (OQ#14 precedent — size against playtest too)

Bots draft junk: sim evidence UNDERSTATES card value for humans who
draft synergies (links, growers, Hex axes). The direction is still
credible — flat HP/combat is a big effect to be pure drafting noise —
but magnitudes must be re-read against Playtest 2+ human data before
any deep rebalance ships.

## Candidate levers (ENUMERATED, not proposed — the sprint doc rules)

- **Reward quality**: rarity odds up; picks offer upgraded cards late;
  sets of 3 → curated sets keyed to deck shape (dilution-proof).
- **Dilution pricing**: skipping a pick should not dominate; adding a
  mediocre card should not be a self-harm tax (e.g., picks may
  optionally REMOVE a starter alongside).
- **Relic supply damping**: fewer sources or diminishing relic value —
  the mirror-image lever; touches S11.3/S11.5/S11.7 signed content, so
  it needs its own sign-off rows.
- **Elites price deck quality**: escalation (or knot HP) reads deck
  power so an ungrown deck PAYS at the knot — the designer's stated
  frame ("they do worse against the elites").
- **Bot draft policy**: value-aware picks (synergy-scored) so sims stop
  understating card value — instrument work, arguably a prerequisite
  for measuring any of the above.

## Instruments that must exist before gates are set

- Per-fight performance keyed to deck-growth quantile (does a grown
  deck fight measurably better? today: no signal).
- Card-pick take-rate and skip-rate per act (bots + playtest).
- Economy per-act normalization (end-of-run totals are run-length-
  confounded).

## Consequences until S12 lands (recorded in the Wave B status)

- S11.10 gate 2 (win rate ±6) is DEFERRED to re-anchor after S12 —
  the braid's numbers are expected to move when card rewards matter.
- TB_KNOTWORK stays default-OFF (S11.11-5 answered "not yet" by
  implication); the flag-off public build is untouched either way.
- Gates 1/3/4 read green today (structure CI + goldens; D6/D7
  improves on every measure); gate 5 (solo manual pass) rides the
  playtest.
