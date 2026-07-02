# Threadbound — Sprint S8: Content Realignment

Purpose: author the game against the systems S7 built and the canon the
lore bible ratified. S7 made the Rites, character events, and the wider
maps exist; S8 makes them (and the truth system around them) SAY what the
bible says. After S8, the combined playtest (`TB_TRACKS=1 TB_RITES=1`)
verdicts a build whose mechanics and plot actually match.

Branch: `s8-content`, from post-S7 main. S8 depends on S7's rite model,
character-event subtype, and map config having landed. Hard scope rule:
no new systems — every part here authors content into machinery that
already exists (the one exception, S8.1, REWORKS a system S7 built to a
superseding design, and goes first for exactly that reason). No unlock
economy, no question-quota finalization, no Act 4. Content sign-off
discipline throughout: enumerate→propose→sign-off; nothing lands
unapproved. Balance-relevant changes commit separately from prose.

## S8.0 Rulings resolved (designer, this session)

1. **Death-rites are CARDS** — one unique card, 1 copy, added to the
   starting deck at pick (supersedes S7's passive death-rites; see S8.1).
2. **Rite cards are removable at shops.** Escalating removal costs
   already price it; shedding the vestment is a story.
3. **Birth-rites stay passives, retuned upward** — except First-Breath,
   ruled DOWN to: the first Resonance ignition each combat, both players
   heal 1 (once-per-combat cap + mid-act-2 arrival ≈ 8 HP/player over a
   run's back half; the per-ignition original was ~4× that).
4. The asymmetry (card you wear / passive you become) is deliberate
   held-reveal signal — the second rite arriving as a different KIND of
   thing is itself the mirror announcing itself.

## S8.1 Rite redesign (supersedes S7.2/S7.4 implementations)

S7 kicked off against the original passive-rite tables, so this part is
a rework, first in the sprint: replace the 8 death-rite passives with 8
unique rite CARDS, retune the 6 birth-rite passives. Migrate telemetry
keys; the S7.8 battery re-runs after this part alone.

Model requirements:
- Death-rite `RiteDef` references a `CardDef` (riteOnly flag or `rite`
  rarity — excluded from rewards/shops/event card pools via the
  starter-only machinery).
- **Every rite card defines a mutation entry** (rite cards are legal
  Reclaim targets — the vestment can die, pass through the partner, and
  return reborn: §5b happening to the player's identity card). Authored
  here, birth-column names where the fiction earns it.
- The no-Hex-growth test extends over rite card base/link/mutation.
- Battery readout gains pick distribution per rite (<10% or >60% of
  offers = tuning flag).

Death-rite cards (numbers provisional, sign-off table):

| Role | Card | Cost/tag | Effect sketch | Pull |
|---|---|---|---|---|
| Vess | Shroud | 1 Guard | Gain 4 Block. Link (Hex): partner gains 2 Block | Defensive vestment |
| Vess | Votive | 0 Rite | Gain 1 Thread. Link (Rite): partner draws 1 | Economy/tempo |
| Vess | Knell | 1 Strike | Deal 3. Link (Hex): Detonate | The classic detonation arc |
| Vess | Vigil | 1 Guard | Taunt: bind target to you. Gain 3 Block | Binding-architect flirt |
| Bram | Toll | 0 Rite | Gain 2 Momentum. Link (Surge): gain 1 more | Bank starter |
| Bram | Pyre-Brand | 1 Strike | Deal 4. Link (Strike): Kindled 2 | Aggro chain |
| Bram | Mourner's Step | 1 Guard | Gain 4 Block. Link (Guard): gain 2 Momentum | Momentum-from-defense |
| Bram | Descant | 0 Surge | Draw 1. Link (Surge): partner draws 1 | Co-op tempo |

Birth-rite passives (final directions, numbers provisional):

| Role | Rite | Effect |
|---|---|---|
| Vess | Quickening | Cards you Reclaim enter your deck upgraded |
| Vess | First-Breath | First Resonance ignition each combat: both players heal 1 |
| Vess | Cradle-Warden | Partner's links fired off your cards: +1 to the linked effect |
| Bram | Hearth-Keeper | Momentum no longer decays at end of turn (carries up to 3) |
| Bram | Dowry-Bound | Reclaim a partner's card: gain 2 Momentum and draw 1 |
| Bram | Naming-Day | Your mutated cards' effects +2 |

Interaction watch: Quickening + Dowry-Bound both amplify S7.6's Reclaim
widening. If Reclaim engagement jumps from zero to dominant, tune the
rites first — the widening is the lore-critical piece.

## S8.2 The fourth question + answer pools (§8)

The coupling that governs this part: **an answer is not content until it
is deducible.** Every answer needs fragment coverage in the clue-event
tables, and every q_what answer keys a boss face. Answers, fragments,
and faces are one budget.

- **Add `q_came` ("Why did you come?")** — the spec'd fourth question,
  never shipped. This completes the slice spec, not changes it; its
  post-playtest fate (like q_who's) remains open.
- Answer expansion per §8 themes, world-questions first:
  - `q_what`: 2 → 4 (add "abandoned mid-rite", "consumed by a starving
    part" to Sexton/Peal) — each new answer needs a face treatment
    (S8.5) and fragments.
  - `q_why`: 3 → 5 (add "mercy", "unity" to hunger/grief/covenant).
  - `q_came`: 0 → 4 (paid / compelled / volunteered / fleeing).
  - `q_who`: hold at 2 (+0). It's the question most likely to leave the
    deduction set post-playtest (the death-rite pick answers it out
    loud) — don't author against a question on the bubble.
    **Designer may override**; flagged as the one contestable call here.
- Clue events: 6 → 10 (proposal), so fragment coverage supports the
  larger pools. Deducibility rule, enforced by test: every answer has
  ≥2 fragments bearing on it (support or contradiction) across the
  pool, and every question is coverable in a single run at the L7/E32
  routing ceiling.
- Every answer ships: chip text, codexTruthEntry, fragments (both
  channels — actor prose + partner/Witness prose, asymmetric per the
  Babel rule), and payoff wiring.

## S8.3 Character events — voice pass

S7 shipped 3 per role with placeholder prose, structure-final. S8
authors them fully: role voice (the Hexweaver's stations vs the
Cinderfist's), word-drawer naming, real consequence text, and one
Witness partner-channel line each that respects the knowledge boundary
(deflection where the gap is — the sarcasm is scar tissue).

## S8.4 The wrong-way event

New event, both acts, RARE (below normal queue weight — it should be
possible to never see it in a run): something ascends past the players,
unexplained. No mechanical reward is the wrong call for an event slot —
proposal: a single strange choice (watch it pass / reach out) with a
small asymmetric consequence, no explanation either way. Per held
reveal, the codex explains what these were only much later (hook id
reserved now; codex wiring is out of scope). The event never repeats
within a run.

## S8.5 Boss faces (the q_what payoff made true)

The Sexton/Peal pattern generalizes: an arena's two truths are "the one
who broke it to protect it" and "the thing it became" — every two-faced
boss a small Witness-versus-Caretaker. S8.2's q_what expansion to 4
answers requires **two new face treatments** wired to the new answers,
same machinery as `faces.ts`. Faces are the single most expensive item
in this sprint (mechanics + telegraph lines + reveal payoff each);
they're budgeted here and nowhere else. Proposal for which bosses carry
them comes as its own sign-off table once Claude Code inventories which
boss slots have face support.

## S8.6 Mutation renames — the birth column

- Audit all existing mutation names (currently uniformly
  Stitched/Hexbound). Rename a MINORITY toward the birth column
  (Quickened, Cradled, First-Drawn) — rarity of the birth column is
  itself lore signal; do not flip the whole set.
- Proposal: ~1 in 4 mutations birth-column, weighted toward mutations
  whose effect reads as renewal (draw, heal, Thread) rather than damage.
- Rite-card mutations (S8.1) count toward the birth-column quota.
- Sign-off table: old name → new name → rationale, before landing.

## S8.7 The Witness pass

- **Voice arc:** line pools gain codex-percentage-keyed registers
  (sardonic collector → quieter, more deliberate). The profile codex
  fill already exists client-side; the engine needs the percentage
  passed where Witness lines are drawn. Register thresholds provisional
  (e.g. 0/30/70%) — tune post-playtest.
- **The fall-rebind line** gets its sacrament quote (the welcome rite in
  miniature — §5b). The current line stays in the pool; the sacrament
  version joins at a higher codex register, so the quote is itself a
  held reveal.
- **Never-lies / knowledge-boundary audit** (§9 action item, now due):
  every existing line (~60, incl. witness-solo) audited against §4 —
  the Witness withholds, deprecates, misdirects by omission, never
  fabricates; where a gap is, it deflects. Violations rewritten;
  audit table in the sign-off.
- New line pools S7 stubbed: death-rite pick acknowledgment ("don the
  vestment of…"), birth-rite arrival (a line that only makes sense
  later), wrong-way event.

## S8.8 Sign-off gates

1. All sign-off tables approved before their part lands: rite cards +
   mutations (S8.1), answer/fragment sets (S8.2), face assignments
   (S8.5), mutation renames (S8.6), Witness audit (S8.7).
2. Deducibility test green: every answer ≥2 bearing fragments; every
   question coverable in one run at the L7/E32 ceiling.
3. Post-S8.1 battery: 50×3 with `TB_RITES=1 TB_BOT_SEEK_EVENTS=1`, pairs
   within ±8 pts of the S7 flag-off baseline; Reclaim engagement > 0 and
   not dominant (< 25% of card acquisitions, provisional bound); rite
   pick distribution inside the 10–60% band.
4. Full-content battery at sprint end: within noise of the post-S8.1
   battery (content parts must be balance-neutral; if a face mechanic
   moves numbers, it commits separately with its own readout).
5. Flag-off parity: `TB_TRACKS=0 TB_RITES=0` unchanged vs the S7
   baseline (rng-consumption test included — new events and questions
   must follow the gated-pool pattern).
6. Witness audit table complete; zero lines violating never-lies.
7. Tests green from fresh clone; `npm run build` before any battery.

## Out of scope

Unlock economy and held-reveal pacing mechanics, answers-per-question
quota and final question set (Part-2, post-playtest — S8 grows pools,
playtests trim them), codex completion criteria, Act 4 / the Caretaker,
the chant/poem (§10.7 — the Rites lock the roles, but the verse waits on
the final question set), character 3, 3–4 player work, art/audio.
