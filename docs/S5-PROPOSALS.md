# S5 Proposal Table — designer sign-off required (gate 8)

Status: DRAFT, nothing below is committed. Per the S5.2 protocol, no re-aim
lands unapproved. Prepared 2026-07-01 on `s5-balance`.

Already landed (pre-decided by the sprint doc, separate commits):
- S5.0 baseline banked (`docs/S5-BASELINE.md`): **vb 18 / vv 60 / bb 22**.
- S5.1 lever 1 — doubleHex capped at +6 (Saturate, Braided Malice link,
  Widow's Arithmetic). Battery alone: vv 60→48%, stacks/burst 16.2→11.2.
- S5.1 lever 2 — Worn Knife per-play damage capped at 12. Battery with both
  levers: **vv 28%** (inside 25–35), Worn Knife mean 9.3 (gate ≤15 ✓),
  stacks/burst 13.0; vb 18%, Worn Knife 7.6.
- OQ#30 — Stolen Breath base gains Exhaust (ruling direction).
- OQ#42 — "Pass on Coveting" button dropped (Onward auto-passes).

## STOP report (S5.1 anti-target clause)

Hex damage **share** still misses the 25–45 band after both cuts: vv 82.8%
(was 86.3). Per S5.1 I am not reaching for a third lever. Reading: share is
a *ratio* — a double-Vess pair's damage flows through the Hex/HexScaling
buckets by construction, so cutting the ceiling shrank numerator and
denominator together. The *absolute* engine came down hard (win rate 60→28,
burst 16.2→11.2, Worn Knife 19.2→9.3). Designer call: does gate 4 need a
mirror-specific reading (e.g. band applies to vb only, or a wider vv band),
or is more cutting actually wanted?

## S5.5 flag (needs yes/no before the final battery)

Act-1 HP loss after the S5.1 cuts: vb 25.4 / vv 25.7 (baseline 23.4 / 19.4;
bb 25.2 untouched). Band is 16–22 — all pairs now run hot, as S5.5
predicted. **Proposal: ease the anchor one notch, 1.5/1.35 → 1.45/1.30**,
own commit, own battery delta. Yes/no?

## S5.2 Table A — Bram Hex-link re-aims

Full enumeration: 10 Bram cards carry a Link (Hex) clause. 5 are detonators
(the cross-player payoff identity) — KEEP. 5 read Hex without detonating —
re-aim toward the over-produced/under-read tags (Strike ×23 cards in pool,
Surge ×9). §2.3 respected: no common gains a self-similar link.

| Card | Rarity/Tag | Clause (base + upgrade) | Old | New | Rationale |
|---|---|---|---|---|---|
| Kindle | common/Rite | "Draw 1." | Hex | **Strike** | Non-detonator; Strike is Bram's floor tag — his draw engine should feed off what he actually plays. |
| Followthrough | common/Strike | "Apply 1 Weak." / "+1 Vuln" | Hex | **Surge** | Strike barred by §2.3 at common; Surge weave keeps it self-owned. |
| Body Blow | common/Strike | "Apply 1 Vulnerable." / "+1 Weak" | Hex | **Surge** | Same as Followthrough. |
| Fan the Flames | common/Surge | "Draw 1." / "Draw 2." | Hex | **Strike** | Surge barred by §2.3 at common; card is his tempo draw — Strike makes it live in every bb hand. |
| Cinder Cloak | uncommon/Guard | "Apply 1 Hex to ALL." / "2 Hex" | Hex | **Strike** | Link *produces* Hex (feeds his detonators) rather than reading it; firing off Strike removes the bootstrap problem. |

KEEP (detonator identity, unchanged): Knuckle-Crack (starter), Cinderbreak,
Rendcall, Stamp Out, Cinderfall — every clause whose link DETONATES.

## S5.2 Table B — upgrade-'any' narrowing (OQ#24/#33)

76 upgrade links at common/uncommon currently read (any). Multi-tag
conditions don't exist in the engine (and S5 says no new mechanics), so
one-step widening has no legal target yet. **Blanket proposal: every
upgrade-'any' at common/uncommon reverts to the card's BASE link condition
— the upgrade keeps its bigger effect, loses the width.** ('any' remains
rare-tier only.) Full row list in the appendix below; 68 of 76 rows are mechanical
(base condition is a named tag — the upgrade simply reverts to it).

Rows needing an individual pick (base is 'any' or absent):

| Card | Rarity/Tag | Base link | Proposed upgrade condition |
|---|---|---|---|
| Needlework (vess) | common/Hex | any | **Strike** (per-link payoff wants the dense tag) |
| Wardknot (vess) | common/Guard | any | **Surge** |
| Quickening (vess) | common/Surge | any | **Guard** (§2.3 bars Surge) |
| Votive Thread (vess) | uncommon/Rite | any | **Surge** |
| Breaker (bram) | uncommon/Strike | any | **Guard** (base-'any' at uncommon is itself suspect — flag for designer) |
| Stolen Breath (neutral) | common/Surge | any | **Rite** (its pre-§4 condition; now Exhausts per OQ#30) |
| Shared Sigil (neutral) | uncommon/Hex | any | **Guard** |
| Patchwork (vess) / Brace-Up (bram) | common/Guard | (none — upgrade adds the link) | **Surge** both |

Note: base-level 'any' links at common/uncommon (Breaker, Stolen Breath,
Needlework, Wardknot, Quickening, Votive Thread, Shared Sigil) are outside
the OQ#24 upgrade ruling — enumerate-and-rule separately if wanted; not
touched here.

## S5.3 — Momentum floor (ship 0–3, cuts before additions)

Only if Table A alone doesn't lift bb in the battery. In preference order:

1. **Pummel** (uncommon/Strike): add "Pummel doesn't halve your Momentum."
   (base + upgrade). Implementation: card-level `keepMomentum` flag honored
   at the existing halving check — one line, no new mechanic.
2. **Soot Mark** (common/Hex) link (Strike): "Gain 2 Momentum" → **3**.
3. **Cross-Counter** (uncommon/Strike) link (Guard): add "and your Momentum
   isn't halved this turn."

## S5.4 — remaining designer picks

- **OQ#34 Linked Shields**: recommend **partner Block 4 → 6** (co-op half
  is the identity, per the OQ note). Alternative: 8 Block base.
- **OQ#36 duplicate "Stolen Breath"**: recommend renaming **Gathering
  Slack's mutation** (the neutral common owns the table-talk history from
  PT2/PT3). Name candidates: **"Slipped Breath"**, "Breath Unbound",
  "Quickstitch".
- **NEW collision found during S5.4** (unlogged): neutral Stolen Breath's
  *mutation* is named **"Held Breath"** — collides with Bram's uncommon
  Held Breath. Recommend renaming the mutation to "Caught Breath" or
  "Kept Breath". (Will log as OQ#47 if you want it queued instead.)

## Appendix — all 76 upgrade-'any' rows (common/uncommon)

Proposed narrowing target = the base-link condition unless listed in
Table B above. Columns: char | card | rarity/tag | base condition |
upgrade link text.

| Char | Card | Rarity/Tag | Base cond → proposed | Upgrade link text |
|---|---|---|---|---|
| vess | Needlework (`needlework`) | common/Hex | any | "Apply 2 additional Hex per link fired earlier this Chain." |
| vess | Pinprick (`pinprick`) | common/Hex | Strike | "Apply 4 instead." |
| vess | Withering (`withering`) | common/Hex | Guard | "Also apply 1 Weak to all." |
| vess | Stitchblade (`stitchblade`) | common/Strike | Hex | "Apply 3 Hex." |
| vess | Thornward (`thornward`) | common/Guard | Hex | "Apply 2 Hex to ALL enemies." |
| vess | Wardknot (`wardknot`) | common/Guard | any | "Gain 5 more." |
| vess | Loose Stitch (`loose_stitch`) | common/Surge | Strike | "Draw 2 instead." |
| vess | Quickening (`quickening`) | common/Surge | any | "Draw 1 and your partner draws 1." |
| vess | Mendthread (`mendthread`) | common/Rite | Guard | "Your partner gains 5 Block." |
| vess | Saturate (`saturate`) | uncommon/Hex | Surge | "Draw 2." |
| vess | Lashing Coil (`lashing_coil`) | uncommon/Strike | Hex | "Apply 2 Hex to all enemies." |
| vess | Seamripper (`seamripper`) | uncommon/Strike | Surge | "Apply 2 Vulnerable." |
| vess | Knotward Veil (`knotward_veil`) | uncommon/Guard | Rite | "Gain 1 Thread and 3 Block." |
| vess | Spindle Step (`spindle_step`) | uncommon/Surge | Guard | "Draw 2." |
| bram | Opener (`opener`) | common/Strike | Surge | "Gain 5 Momentum instead." |
| bram | Crossguard (`crossguard`) | common/Guard | Strike | "Gain 3 Momentum." |
| bram | Bellows (`bellows`) | common/Surge | Guard | "Also gain 3 Block." |
| bram | Second Wind (`second_wind`) | common/Surge | Strike | "Also gain 1 Thread and Kindled 1." |
| bram | Hammerfall (`hammerfall`) | common/Strike | Guard | "Gain 6 Block." |
| bram | Spark (`spark`) | common/Hex | Strike | "Deal 5." |
| bram | Brace (`brace`) | common/Guard | Surge | "Draw 1 and gain Kindled 1." |
| bram | Kindle (`kindle`) | common/Rite | Hex | "Draw 1 and gain 1 more Momentum." |
| bram | Backdraft (`backdraft`) | uncommon/Surge | Strike | "Gain 3 Momentum." |
| bram | Pyre Vault (`pyre_vault`) | uncommon/Strike | Surge | "Gain 3 Momentum." |
| vess | Patchwork (`patchwork`) | common/Guard | (no base link) | "Gain 2 more." |
| bram | Brace-Up (`brace_up`) | common/Guard | (no base link) | "Gain 2 more." |
| vess | Hollow Seam (`hollow_seam`) | common/Hex | Strike | "Apply 3 more." |
| vess | Graverust (`graverust`) | common/Hex | Guard | "Apply 2 more Hex and 1 more Weak." |
| vess | Seeding Curse (`seeding_curse`) | common/Hex | Surge | "Apply 2 instead and draw 1." |
| vess | Thousand Pins (`thousand_pins`) | common/Hex | Strike | "Deal 3 to ALL enemies." |
| vess | Cinch (`cinch`) | common/Strike | Guard | "Gain 4 Block." |
| vess | Seam-Split (`seam_split`) | common/Strike | Surge | "Deal 6 more." |
| vess | Burr-Shell (`burr_shell`) | common/Guard | Surge | "Gain 2 more and draw 1." |
| vess | Needle Wall (`needle_wall`) | common/Guard | Hex | "Apply 2 Hex to it." |
| vess | Quiet Mending (`quiet_mending`) | common/Guard | Surge | "Heal 3." |
| vess | Threadlight (`threadlight`) | common/Surge | Guard | "Draw 1 and gain Kindled 1 more." |
| vess | Gathering Slack (`gathering_slack`) | common/Surge | Hex | "Draw 2 instead." |
| vess | Waxbound Oath (`waxbound_oath`) | common/Rite | Surge | "Gain Kindled 1 and your partner gains 3 Block." |
| vess | Festering Knot (`festering_knot`) | uncommon/Hex | Guard | "Apply 2 Weak." |
| vess | Carrion Lace (`carrion_lace`) | uncommon/Hex | Strike | "Deal 5." |
| vess | Inkwell Curse (`inkwell_curse`) | uncommon/Hex | Surge | "Apply 3 more Hex." |
| vess | Pale Unmaking (`pale_unmaking`) | uncommon/Hex | Strike | "Detonate ALL Hexes on the target instead." |
| vess | Rend the Weave (`rend_the_weave`) | uncommon/Strike | Hex | "Detonate all Hexes on the target." |
| vess | Measured Cut (`measured_cut`) | uncommon/Strike | Rite | "Deal 6 again." |
| vess | Shroudwork (`shroudwork`) | uncommon/Guard | Hex | "Your partner gains 6 Block." |
| vess | Martyr’s Knot (`martyrs_knot`) | uncommon/Guard | Rite | "Gain 5 more Block." |
| vess | Patient Breath (`patient_breath`) | uncommon/Surge | Hex | "Draw 1 and gain Kindled 1 more." |
| vess | Drawn Breath (`drawn_breath`) | uncommon/Surge | Guard | "Gain 4 Block." |
| vess | Votive Thread (`votive_thread`) | uncommon/Rite | any | "Gain 2 Thread more." |
| bram | One-Two (`one_two`) | common/Strike | Surge | "Gain 3 Momentum." |
| bram | Ember Jab (`ember_jab`) | common/Strike | Guard | "Deal 7 instead." |
| bram | Roundhouse (`roundhouse`) | common/Strike | Guard | "Gain 5 Block." |
| bram | Square Up (`square_up`) | common/Guard | Surge | "Gain 5 more Block." |
| bram | Soot Mark (`soot_mark`) | common/Hex | Strike | "Gain 3 Momentum." |
| bram | Ashfall (`ashfall`) | common/Hex | Surge | "Apply 3 to all instead." |
| bram | Wind-Up (`wind_up`) | common/Surge | Strike | "Draw 1 and gain 1 more Momentum." |
| bram | Banked Coals (`banked_coals`) | common/Rite | Strike | "Gain 1 Thread." |
| bram | Firewatch (`firewatch`) | common/Rite | Surge | "Your partner gains 4 Block." |
| bram | Cross-Counter (`cross_counter`) | uncommon/Strike | Guard | "Gain 3 Momentum and 3 more Block." |
| bram | Pummel (`pummel`) | uncommon/Strike | Surge | "Deal 3 four times instead." |
| bram | Breaker (`breaker`) | uncommon/Strike | any | "Gain Kindled 2." |
| bram | Stand Fast (`stand_fast`) | uncommon/Guard | Strike | "Your partner gains 5 Block." |
| bram | Hold the Line (`hold_the_line`) | uncommon/Guard | Surge | "Gain Kindled 1 and your partner gains Kindled 1." |
| bram | Pitchfire (`pitchfire`) | uncommon/Hex | Strike | "Deal 6." |
| bram | Slow Burn (`slow_burn`) | uncommon/Hex | Rite | "Apply 3 more and gain 1 Thread." |
| bram | Held Breath (`held_breath`) | uncommon/Surge | Guard | "Gain 3 Block." |
| neutral | Shared Burden (`shared_burden`) | common/Guard | Strike | "Your partner gains 4 Block." |
| neutral | Stolen Breath (`stolen_breath`) | common/Surge | any | "Gain Kindled 2." |
| neutral | Litany of Mending (`litany_of_mending`) | common/Rite | Guard | "You and your partner each gain 3 Block." |
| neutral | Twinned Cut (`twinned_cut`) | common/Strike | Surge | "Deal 4 more." |
| neutral | Patience (`patience`) | common/Surge | Guard | "Draw 1 and gain 1 Block." |
| neutral | Tithe of Thread (`tithe_of_thread`) | uncommon/Rite | Surge | "Draw 1. Your partner draws 1." |
| neutral | Quick Words (`quick_words`) | uncommon/Surge | Strike | "Gain Kindled 1 and your partner draws 1." |
| neutral | Shared Sigil (`shared_sigil`) | uncommon/Hex | any | "Your partner draws 1 and gains 2 Block." |
