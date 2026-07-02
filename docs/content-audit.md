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

## S8.6 Mutation renames — the birth column (2026-07-01, s8-witness-mutations)

ALL PROVISIONAL pending designer sign-off (S8.8 gate 1). Quota: 117 mutations
ship (109 pool/starter + 8 rite cards); the 8 S7/S8.1 rite-card mutations
already wear birth-column names, so 21 pool mutations were renamed for a
birth-column total of 29/117 ≈ 1 in 4. Selection weighted toward mutations
whose EFFECT reads as renewal (draw, heal, Thread, partner-gains) rather than
damage. Names and matching text only — zero effect changes. Every new name
checked unique against the full display-name set (no new OQ#36/#47-class
collisions).

| File | Old name | New name | Rationale (effect) |
|---|---|---|---|
| cards.ts | Stitched Brace-Up | Cradled Brace-Up | Block 3 + Thread 1 — Thread gain is renewal |
| vess-m2.ts | Rough Comfort | Swaddled Comfort | Block 6 + Draw 1 — sheltering + draw |
| vess-m2.ts | Ember Rites | Hearth Rites | Thread + Momentum — hearth is the birth column's fire |
| vess-m2.ts | Brawler’s Oath | Cradled Oath | Block + taunt + draw — takes the blow to shelter another |
| vess-m2.ts | Bellows-Breath | Quickened Bellows | Draw + Momentum 3 — pure tempo/renewal |
| vess-m2.ts | Votive Cinder | Dowry Cinder | Thread + Momentum + link draw — votive (death) → dowry (birth) |
| vess-m2.ts | Loose Spark | First-Drawn Spark | Draw + Momentum — draw-first identity |
| vess-m2.ts | Cinderthread | Hearth-Thread | Thread + Momentum — Thread economy |
| vess-m2.ts | Spent Inheritance | Dowered Inheritance | Thread 2 + Momentum 2 — spent (tithe) → dowered (arrival) |
| bram-m2.ts | Stitched Banked Coals | Hearth-Banked Coals | Thread + Block — the kept fire |
| bram-m2.ts | Stitched Hold the Line | Cradled Hold the Line | Block 6 + partner Block 6 — partner-gains |
| bram-m2.ts | Stitched Drumbeat | Quickened Drumbeat | Draw + Thread — renewal |
| bram-m2.ts | Stitched Forgefire | Quickened Forgefire | Thread 2 + Draw — renewal |
| bram-m2.ts | Stitched Second Wind | First-Drawn Second Wind | Thread + Draw — second wind IS first breath |
| bram-m2.ts | Stitched Brace | Cradled Brace | Block 6 + Thread — sheltering |
| bram-m2.ts | Stitched Dig In | Cradled Dig In | Block + partner Block 4 — partner-gains |
| bram-m2.ts | Hexbound Backdraft | First-Drawn Backdraft | Base is pure Draw 2 (Hex only on link) |
| neutral-relics-m2.ts | Hold the Seam | Cradle the Seam | Block + Draw — holding become cradling |
| neutral-relics-m2.ts | Worn Patience | Quickened Patience | Draw + Keep — the oxymoron is the reveal |
| neutral-relics-m2.ts | Lean Tithe | Lean Dowry | Thread + Draw — tithe of passage → dowry of arrival (§2) |
| neutral-relics-m2.ts | Quiet Words | Christening Words | Draw + Kindled — words that name |

Deliberately NOT renamed: everything whose mutation effect is damage/Hex-forward
(the death column keeps the majority — its rarity is the lore signal, §7), and
the two designer-signed collision fixes (Caught Breath OQ#47, Slipped Breath
OQ#36) to avoid churning ruled names. Rite-card mutations (rites.ts: Cradled
Shroud, First-Lit Votive, Quickened Knell, Cradle-Vigil, First-Struck Toll,
Quickened Brand, Cradled Step, First-Drawn Descant) count toward the quota and
were left as authored.

## S8.7 Witness never-lies audit (2026-07-01, s8-witness-mutations)

Every Witness-voiced line audited against lore bible §4 (never-lies, RATIFIED;
knowledge boundary; "it", never "he"). Corpus: witness.ts, witness-solo.ts,
M2_WITNESS + event witness channels in m2-world.ts, events.ts, and the two
S6-flagged clue-events.ts idiom lines. character-events.ts EXCLUDED (parallel
S8.3 ownership). Verdict was KEEP for all lines not listed below — antiquity
("centuries", "a thousand years"), self-deprecation, figurative deflection,
and letting others' misreadings stand are all legal; first-person mortal
biography, real-world scripture/calendar, and fabrication are not. Held by
`packages/engine/test/witness-canon.test.ts` (S8.8 gate 6). Rewrites
PROVISIONAL pending sign-off:

| File:line (pre-edit) | Old | New |
|---|---|---|
| witness-solo :13 | "…Very well. I was a legend once." | "…Very well. I have been called worse than furniture." |
| witness-solo :22 | "Centuries of technique, spent on a Tuesday." | "Centuries of technique, spent on an errand no one will record. Except me. Obviously." |
| witness-solo :41 | "My old masters swore I would never resonate with the living again…" | "Ignition. No one ever designed me to resonate with the living. Apparently no one needed to." |
| witness-solo :50 | "…and I'm the one who's dead." | "…and I'm the one without a pulse." |
| witness-solo :56 | "I'm dead, not blind." | "I'm old, not blind." |
| witness-solo :57 | "…not as if I can take it with me. Again." | "…not as if I'm going anywhere with it. I'm not going anywhere at all." |
| witness-solo :59 | "Coveting from a ghost. The commandments never imagined…" | "Coveting from the keeper of the pile. The rite has a word for that. I am electing not to teach it to you." |
| witness-solo :76 | "…I died properly the first time." | "…I have never once done this before. A debut." |
| witness-solo :79 | "Dead twice now, by my count…" | "I am told this is what dying is like. I remain unqualified to confirm it." |
| witness-solo :94 | "half-woven by a ghost" | "half-woven by the furniture" |
| witness-solo :98 | "Somewhere, my old masters are filing a complaint." | "Set it down exactly as it happened; I will know." |
| witness-solo :102 | "The worst was also mine, so — symmetry." | "I keep a list. You are nowhere near it." |
| witness-solo :104 | "…I've died here twice now and it doesn't." | "…I have watched every descent there has ever been, and it doesn't." |
| witness.ts :58 | "The commandments saw you coming." | "The rite has provisions for your kind. Filed under inevitable." |
| m2-world :320 | "I once served kings. Now I supervise crafts." | "This place once received kings. Now it hosts crafts." |
| m2-world :642 | "Somewhere, my old masters are quietly furious." | "Even the deep parts of this place felt that. I would know." |
| clue-events :102 | "Grave-robbing, but make it textiles." | "Grave-robbing, refined to the textile arts. The dead wore it better." |
| clue-events :185 | "This is why we cannot have nice expeditions." | "Fondling the anonymous gravestone. And they wonder why the dead keep to themselves." |
| keywords.ts :55 (client) | Covet flavor quoted the commandments line | "The rite has provisions for your kind." |

Deliberate KEEPs worth flagging for the designer: "I never had the cardio for
this. Or the heart. Literally." (MORE true under §4 — kept verbatim); "I'm
down. Insofar as I can be."; "Consider it back rent for the haunting" (others'
misreading, tolerated, never claimed); "I still have the hands for this.
Somewhere." (the 'Somewhere' is the admission); "I left my tears in another
century" (figurative deprecation, not biography). Pronoun comments he → it
throughout witness.ts / witness-solo.ts / witness-draw.ts.

Golden fixture note: the rewrites change witnessSaid TEXT only — regenerated
tracks-covenant golden in this commit per its own procedure; all 24 seeds kept
identical action counts and finalRng (zero gameplay drift), 3 finalHash values
moved (the rewritten strings drawn mid-walk).
