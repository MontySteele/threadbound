# M2 Content Audit — Covenant (§3) & Pool Rules (§2.3), Full Pool

Audited centrally 2026-06-10 over the complete M2 content (agent-drafted pools
included — two duplicate-id collisions were the only defects found and were
renamed). Mechanically enforced by `packages/engine/test/covenant.test.ts`
(14 checks, run in CI); content changes that violate these rules fail the build.

## Pool shape (M2-B1 targets met)

| | Vess | Bram | Neutral |
|---|---|---|---|
| Total | 55 (25C/20U/10R) | 55 (25C/20U/10R) | 15 (8C/5U/2R) |
| Heavy tag share | Hex ~33% | Strike ~38% | — |
| Commons per broad tag | all ≥3 | all ≥3 | all 5 tags ≥1 |

Starter-only cards (Hatpin, Patchwork, Jab, Brace-Up) are additional, excluded
from every pool/reward/shop surface, and mechanically barred from acquisition.

## Rule-by-rule

**Covenant 1 — standalone playability.** ✔ All 125 pool cards + 4 starters have
non-empty bases; Link clauses pure upside. Enforced.

**Covenant 2 — broad-tag links at common/uncommon.** ✔ Enforced, including on
**upgrade overlays** (an upgrade cannot smuggle a narrow condition onto a
common/uncommon). `partner` conditions: rares only — Vess (gravebloom,
funeral_lace, widows_arithmetic, eye_of_the_loom), Bram (avalanche, final_bell,
immovable, share_the_fire), neutral (two_as_one, crossing_blow).

**Covenant 3 — pull-based cross-pollination.** ✔ Reclaim (Echo, consensual),
Covet (charge spent on passed-over cards), and now the **Wedding Knife** (§7):
both players must offer AND confirm; changing an offer resets consent; starter
cards can't be traded. Nothing is ever pushed.

**Covenant 4 — no partner-disableable archetypes.** Asked per build-around:
Hex/detonation now has ~6 detonators spread across both pools + 1 neutral, so
neither player gates the axis; Momentum self-contained; chainReader enemies
punish *both* players' slack links, not one archetype. ✔

**Covenant 5 — open-conversation draft.** ✔ Shared reward screen, shop is one
screen with shared gold, Covet after-partner-picks rule enforced.

**§2.3 self-similarity.** ✔ Zero at common (enforced). Uncommons: Vess 2
(inheritance, braided_malice), Bram 3 (haymaker, dig_in, drumbeat), neutral 1
(linked_shields) — all within the scaled ≤4/char bound.

**Mutations (§7).** ✔ Every common/uncommon (incl. neutrals) has a hand-authored
deterministic mutation; rares may omit (Echo arrives unmutated). Enforced.

**Upgrades (M2-B6).** ✔ Every card has one; house rule honored — upgrades deepen
the link (widen toward `any`, bigger payoffs, links added to linkless cards);
cost cuts only on linkless powers where link-deepening is impossible.

**Kindled (M2-A2).** ✔ No `energy` op exists anywhere in content (enforced);
all energy effects are Kindled grants, link clauses included.

## Relics (M2-B2)

28 relics, **13 co-op/Thread-specific** (≥8 required). Wedding Knife present
with exact §7 text. Each engine passive used at most once. Hook amounts within
the agreed bands (turnStart 1–2, event hooks 2–4, combatStart 3–8). Every relic's
display text matches its hooks. Enforced: count, coop count, id uniqueness,
knife presence.

## World content (M2-B3/B5)

21 enemies total across the acts (6 M1 + 15 M2) including 2 elites + boss per
act, the Chorister chorus-pool trio, and The Unraveled (severTurns: 2,
hp [200,220]). Every elite/boss interacts with a co-op system (binding
manipulation via `sever`, chain-reading, Mourner mechanic, Thread attrition).
12 events, 5 crossed, crossed tone split 3 consequence / 2 comedy (= 60/40).
Witness pools cover all M2-B5 contexts incl. partner_fallen, revival, shop,
map_disagree; no-repeat-within-run preserved; line uniqueness verified.

## Tuning applied under audit (Part C levers, in order)

1. Detonator access widened in content (lever 1 — drafted in).
2. Detonation 3 → 4 per stack (lever 2, `DETONATION_DAMAGE`).
3. Common Hex application strengthened: Needlework 3→4, Pinprick 2→3 (link 3→4),
   Spark 2→3 (lever 3).

Result: Hex damage share 21.2% (gate: 20–30%) at 25-run sim.

## Verdict

Full M2 pool **complies** with §3/§2.3 and all M2-B1 scaling rules. New
judgment calls logged in `docs/OPEN-QUESTIONS.md`.

## §14.11 starter payoff redesign (S3.3, 2026-06-12)

Hatpin reverts to a plain Strike (the §14.10 detonating version made Hex a
self-owned drip). Two new starter-only cards carry the starter Hex payoff:

- **Worn Knife** (Vess, 1, Strike): "Deal 2. +1 damage per Hex on the target
  (does not detonate)." Playable standalone ✓ (2 dry). No link — the pure,
  self-owned scaling floor ✓. Normal blockable damage, a deliberate contrast
  with detonation's pierce. Starter-only, never in pools ✓.
- **Knuckle-Crack** (Bram, 1, Strike): "Deal 4. Link (Hex): Detonate 2."
  Playable standalone ✓ (4 dry). Strike with Link (Hex) — not self-similar ✓.
  The burst payoff is cross-player by construction: Bram detonates what Vess
  banks. Starter-only, never in pools ✓.

Amplified-never-dependent holds in both directions: each card does honest work
alone; the Link/scaling is the reward for cooperation, not the cost of
playing. Mutations follow the cross-character convention (Cinder-honed Knife,
Stitched Knuckle-Crack). Enforced in covenant.test.ts ("§14.11 starter
payoffs").
