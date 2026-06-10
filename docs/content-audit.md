# M1 Content Audit — Covenant (§3) & Pool Rules (§2.3)

Audited centrally against the design doc, 2026-06-10. This audit is also enforced
mechanically by `packages/engine/test/covenant.test.ts`, which runs in CI — content
changes that violate these rules fail the build.

## Pool shape

| | Vess | Bram |
|---|---|---|
| Total | 20 (10C / 7U / 3R) | 20 (10C / 7U / 3R) |
| Strike | 5 (knife, stitchblade, lashing_coil, seamripper, final_word) | 8 (opener, rendcall, hammerfall, followthrough, haymaker, pyre_vault, stamp_out, avalanche) |
| Guard | 4 | 4 |
| Hex | 6 | 1 (spark) |
| Surge | 3 | 4 |
| Rite | 4 (incl. 2 powers) | 3 (incl. 2 powers) |

- §4 "each pool ~35% its heavy tag": Vess Hex 6/20 = 30%, Bram Strike 8/20 = 40%. ✔ (within placeholder tolerance)
- §4 "every broad tag appears at common rarity in both pools": ✔ — Vess commons cover Hex (needlework, pinprick, withering), Strike (patient_knife, stitchblade), Guard (thornward, wardknot), Surge (loose_stitch, quickening), Rite (mendthread). Bram commons cover Strike (opener, rendcall, hammerfall, followthrough), Guard (crossguard, brace), Hex (spark), Surge (bellows, second_wind), Rite (kindle).

## Rule-by-rule

**Covenant 1 — every card playable standalone.** ✔ All 40 cards have non-empty base effects with no Link dependency; Link clauses are pure upside. Mechanically enforced. Worst-case draft outcome reviewed card-by-card: nothing is dead without partner cooperation.

**Covenant 2 — common/uncommon links read broad tags only.** ✔ Every common/uncommon Link condition is one of {Strike, Guard, Hex, Surge, Rite, any}. The narrow `Link (Partner's card)` condition appears only on rares (Gravebloom, Avalanche, Call and Answer) per §2.2. Mechanically enforced.

**Covenant 3 — cross-pollination pull-based and consensual.** ✔ The only M1 cross-deck flows are Reclaim (the receiving player chooses; temporary Echo; §5) and Covet (the receiving player spends a charge on a card the partner explicitly passed over; §8). Nothing is ever pushed into a deck. The Cold Lantern's `gainCard` adds a card from the subject's *own* pool.

**Covenant 4 — no archetype disable-able by partner behavior.** Audit question asked per build-around ("what partner play pattern turns this off?"):
- *Vess Hex/detonation*: Vess detonates on her own terms via Final Word and benefits from any link; Bram not playing Rendcall/Stamp Out merely removes upside. ✔
- *Bram Momentum*: entirely self-contained (Opener/Bellows/Stoke generate, Haymaker spends). Reliquary Mite's Momentum-feeding attack is answerable by Sever Binding either direction — a puzzle, not a disable. ✔
- *`partner`-condition rares*: turn off only if the partner stages literally nothing before them — not a natural pattern, and the bases stand alone. ✔

**Covenant 5 — draft is an open conversation.** ✔ Reward screen shows both sets to both players (client renders partner's set face-up); Covet picks happen after the partner's pick, on the shared screen.

**§2.3 — no self-similar cards at common; scarce at uncommon.** ✔ Mechanically enforced. Self-similar cards in M1 (all uncommon, all §9 samples): Inheritance (Rite→Rite), Haymaker (Strike→Strike), Dig In (Guard→Guard). Count: Vess 1, Bram 2 — within "scarce" (≤2/char). No rares are self-similar in M1.
- *Note:* `Link (any)` on a card is treated as **not** self-similar (it can be fed by any tag, so it cannot drive mono-tag spam). Needlework (Hex, Link any), Wardknot (Guard, Link any), Second Wind (Surge, Link any) audited under this reading — logged in OPEN-QUESTIONS #2.

**§2.3 — cross-player Resonance requirement.** ✔ Engine-enforced: solo streaks earn link bonuses but never ignite (unit-tested).

## Mutations (§7)

Hand-authored, deterministic: Needlework→Cinder Needlework, Withering→Cinder-touched Withering (Vess→Bram), Rendcall→Stitched Rendcall (Bram→Vess). Cards without an authored variant arrive as unmutated Echoes in M1 (basic implementation per M1 scope; full mutation coverage is M2 content work and must pass this audit when added).

## Verdict

M1 card list **complies** with §3 and §2.3. Two interpretation questions logged in `docs/OPEN-QUESTIONS.md` (#2 Link-any self-similarity, #3 Momentum application) for the designer.
