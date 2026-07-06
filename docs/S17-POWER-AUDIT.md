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

<!-- SECTIONS 3-7 FILLED FROM THE BATTERY — see analysis below -->
