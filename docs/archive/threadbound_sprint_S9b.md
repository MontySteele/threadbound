# Threadbound — Sprint S9b: Playtest Response Pass

Purpose: land what the 2026-07 friend sessions found. Two workstreams:
a bugfix slate (three confirmed defects) and a content pass fixing the
systemic upgrade defect the players discovered the edge of — 18 cards
whose upgrade blocks are mechanically identical to their base card
(deep-equal over base/link/cost/keep), plus 4 cards whose upgrade text
contradicts their mechanics (stale from the M2-B1 2→3 Hex buff, which
landed in `base` but was never propagated to overlay texts).

Root cause: M2-B6 mandated "upgrades on every card, all deepening the
link clause"; a batch of overlay upgrade blocks were authored as
restatements of the base card and shipped green because no test compares
an upgrade to its base. S9b closes that gate permanently.

Branch: `s9b-playtest-response`, from main (post-1e5e076). Hard scope
rule: bugfixes + upgrade authoring + the new CI gate ONLY. No new
systems, no rite changes, no question/fragment changes (tapestry supply
is a live design conversation — anything ruled there lands as its own
part or its own sprint, not smuggled in here). Balance-relevant changes
commit separately from text fixes per convention. Fired T1 tree
branches file to OPEN-QUESTIONS.md as part of this sprint's paperwork.

## S9b.0 Designer decision list (rule before implementation)

1. **Sign-off on the S9b.3 proposal table** (per-card; strike or amend
   any row — numbers provisional pending battery).
2. **Pummel ceiling**: proposed 4×4=16 on link (was 3×4=12). Multi-hit
   interacts with per-hit riders; flag if you want 3×5=15 instead.
3. **Pale Unmaking cost 2→1**: detonator economics — cheapening Vess's
   flexible detonator raises detonation frequency. Battery watches Hex
   damage share (§14.10 band 25–45%).
4. **CI ordering**: land the upgrade-parity test with an exemption list
   that burns down as S9b.3 rows land, or land it after S9b.3 completes.
   Recommendation: exemption list — the gate exists from day one and
   shrinks loudly.
5. **Sprint name/number**: S9b chosen to leave S9 reserved for the
   Part-2 + unlock-economy sprint the roadmap defines. Re-rule if you
   want different numbering.

## S9b.1 Bugfix slate (separate commits, each with a test)

1. **Shop duplicate relic.** `generateShop` rolls `randomUnownedRelic`
   twice; the function excludes *owned* relics but not the relic already
   stocked this shop. Fix: thread an exclusion set through the loop.
   Test: seed-sweep shops, assert distinct relic refIds.
2. **Stale upgrade texts (text-parity, no mechanics).** needlework
   (text 3 Hex vs mech 4) and spark (text "Apply 2 Hex" vs mech 3;
   the link improvement Deal 3→5 is real and currently hidden behind
   the lie). Pinprick and withering share the defect but their texts
   are rewritten wholesale in S9b.3; if S9b.3 stalls, their text-parity
   fix lands here first. This commit precedes everything — the Witness
   never lies, and neither do the cards.
3. **Reclaim pile shows no cost.** The reclaim list renders name +
   mutation marker only. Fix: display the cost the card will actually
   have on arrival (post-mutation cost when a mutation exists; upgraded
   marker when Quickening applies). Client-only. Playtest note: "mostly
   0-cost cards" reclaim behavior may partly be cost-invisibility —
   re-read D5 after this lands.

## S9b.2 Upgrade-parity CI (covenant test addition)

New covenant assertions:
- Every card with an `upgrade` block differs from its effective base in
  at least one of base/link/cost/keep (deep-equality check).
- Every upgrade's advertised numbers match its effective mechanics:
  for each numeric amount in the effective effect ops (>1), the number
  appears in the upgrade text. (Coarse lint; catches the M2-B1 class of
  drift. Exemptions annotated inline where prose legitimately omits a
  number.)

Same enforcement posture as the deducibility CI: cheap, permanent,
loud. Exemption list per S9b.0-4 ruling.

## S9b.3 Upgrade rewrites — proposal table (sign-off required)

Posture: M2-B6 discipline — upgrades deepen the LINK clause first; base
touched only where the link is already the card's whole story. No new
Hex application/scaling amounts anywhere (Worn-Knife history; the
covenant fence formally covers rite content, but this table honors it
pool-wide). Riders draw from: draw, Block, damage, Weak, Momentum,
Heal, partner effects. Neutral stays slightly under character power.

| # | Card | Base (unchanged unless noted) | Current link | Proposed upgrade | Note |
|---|------|-------------------------------|--------------|------------------|------|
| 1 | Pinprick (V, C, 0) | Apply 3 Hex | (Strike) Apply 4 instead | Link: Apply 4 and draw 1 instead | non-Hex rider |
| 2 | Withering (V, C, 1) | 3 Hex ALL | (Guard) +1 Weak all | Link: also apply 2 Weak to all | Weak growth, not Hex |
| 3 | Stitchblade (V, C, 1) | Deal 5 | (Hex) Apply 3 Hex | Link: Apply 3 Hex. Draw 1 | |
| 4 | Loose Stitch (V, C, 0) | Draw 1 | (Strike) Draw 2 instead | Link: Draw 3 instead | 0-cost draw; battery flag |
| 5 | Cinch (V, C, 1) | Deal 6 | (Guard) Gain 4 Block | Link: Gain 6 Block | |
| 6 | Needle Wall (V, C, 2) | 8 Block + Bind | (Hex) 2 Hex to it | Link: 2 Hex to it, gain 3 Block | binding-architect lean |
| 7 | Quiet Mending (V, C, 1) | 6 Block | (Surge) Heal 3 | Link: Heal 3. Partner heals 2 | soul-thread texture |
| 8 | Gathering Slack (V, C, 1) | Draw 1, Kindled 1 | (Hex) Draw 2 instead | Link: Draw 2 and gain 1 Momentum instead | preserve replace semantics |
| 9 | Festering Knot (V, U, 2) | Apply 5 Hex | (Guard) 2 Weak | Link: Apply 3 Weak | |
| 10 | Pale Unmaking (V, U, 2) | 3 Hex + det ≤3 | (Strike) det ALL instead | Cost 2→1, link unchanged | S9b.0-3 ruling |
| 11 | Rend the Weave (V, U, 2) | Deal 8 | (Hex) Detonate all | Link: Detonate all and gain 2 Momentum | mirrors rendcall's authored upgrade |
| 12 | Measured Cut (V, U, 1) | Deal 6 | (Rite) Deal 6 again | Base Deal 7; link Deal 7 again | |
| 13 | Crossguard (B, C, 1) | 6 Block | (Strike) 3 Momentum | Link: Gain 5 Momentum | Momentum-floor consolidation |
| 14 | Bellows (B, C, 1) | 2 Mom, Draw 1 | (Guard) also 3 Block | Link: also gain 5 Block | |
| 15 | Ashfall (B, C, 1) | 2 Hex ALL | (Surge) 3 all instead | Link: 3 to all and 1 Weak to all instead | Hex amounts untouched |
| 16 | Banked Coals (B, C, 1) | Kindled 1, 2 Block | (Strike) 1 Thread | Base Block 2→4 | Thread economy untouched |
| 17 | Pummel (B, U, 1) | Deal 3 twice | (Surge) 3×4 instead | Base Deal 4 twice; link 4×4 instead | S9b.0-2 ruling |
| 18 | Tithe of Thread (N, U, 1) | Gain 2 Thread | (Surge) both draw 1 | Base adds: Gain 2 Block | neutral under-power rule; Thread untouched |

Implementation notes: replace-links (4, 8, 10, 15, 17) must preserve
their full replace effect lists — verify against source, not text.
Every rewritten upgrade gets matching `text` written against the
S9b.2 lint.

## S9b.4 Tree filings (paperwork, lands with the sprint)

- **D8 → Branch A** fired: run length in band. Baseline banked;
  the re-centering commit stays unspent.
- **D5 → Branch A signal** logged at T1: cross-player Reclaims occur
  and are articulated ("0-cost cards to start new links"). OQ#38
  closes at T2 per the tier gate; re-read after S9b.1-3 (cost display)
  in case cost-invisibility was steering target selection.
- **D9/D10 classification pending designer** (rite impact: duds vs
  concept; birth-rite read: stall vs intrigue vs no-registration).
  Filed as open until ruled; the fired EXECUTE joins the next sprint.
- Evidence filed to the §7 guard-suite item: Linked Shields strictly
  dominated by Immovable on numbers (7/6 vs 12/8 at equal cost); the
  niche (Guard self-trigger vs partner cross-play) exists but is
  illegible/underpriced. No action here.

## Gates

1. Full suite green including the new S9b.2 assertions (exemption list
   empty by sprint end).
2. Battery before/after S9b.3 (pooled shards, A0, all three pairs):
   within ±6 pts of the S9a/S10a matrix (vb 29 / vv 34 / bb 39). The
   rewrites are strictly upgrade-side, so drift beyond that means an
   upgrade is a build-warping outlier — name it and re-table.
3. Flag-off parity: rng-consumption tests untouched (upgrades consume
   no map rng; no golden regen expected — if one is forced, loudly).
4. Hex damage share stays inside 25–45% (vb) after Pale Unmaking's
   cost change; if it exits the band, revert row 10 alone and re-run.
