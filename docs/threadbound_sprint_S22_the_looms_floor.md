# Threadbound — Sprint S22: The Loom's Floor ("the codex was always the weapon")

**Charter (designer session, 2026-07-07 window; D1–D6 RULED this
session, D1b as amended):** design the game's
proper ending — the codex completion criterion (lore-bible open ruling
#6, deferred since the slice), the Act 4 gate and its rendering, the
Caretaker encounter, and the ending itself. This is a DESIGN PASS:
rulings, structure, and string scaffolding, phased so implementation
can span the handoff. It builds only on RATIFIED canon (Part 0) and
takes no liberties with the two absolute laws: the Witness never
states falsehoods, and the held reveal is enforced by pacing, never
exposition.

**Hard scope rules:** no strings author before their Part 6 row signs;
no art beyond palette tokens (B6 — the dawn is a palette break, not a
new set); every mechanic proposed here reuses shipped machinery where
it exists (the question/answer chips, the payoff plumbing, the
claims-not-authority profile pattern, growers/mutations, the braid
renderer); the tracks question set is still awaiting its human
verdict, so every criterion below is defined over the SET, never over
hardcoded counts — if q_who leaves the deduction set, nothing here
breaks.

---

## Part 0 — Canon on record (all RATIFIED unless marked)

- **The gate fiction:** the deepest floor is not locked; it is
  UNRENDERED. The Machine renders the descent and cannot render what
  it can no longer describe. Completing the codex re-describes the
  Machine to itself → it can render its own floor → Act 4. An early
  push past Act 3 is a lore beat, not a wall.
- **The twin reflexes:** Witness = repair instinct; Caretaker =
  preservation instinct (restore the original, purge what drifted);
  rivals, nothing made either. The codex was always the weapon; the
  Witness seeks the Caretaker's destruction — unknowingly at first,
  willingly later. Every two-faced boss is a small
  Witness-versus-Caretaker; Act 4 is the pattern at full scale.
- **§5b:** death is the run-scale loop, rebirth the meta-scale loop —
  the codex accumulating is a GESTATION, Act 4 is the delivery. The
  bottom of the descent is where births come from; when Act 4 renders,
  the palette breaks the game's own gradient — then DAWN. The
  Witness's ending: it marches, willingly by the end, toward its own
  obsolescence; dissolution is posed, never answered.
- **The unlock economy:** codex progression unlocks rites, partly
  ascension-gated. (This sprint does NOT touch that economy; it rules
  the COMPLETION criterion only.)
- **Shipped machinery this design stands on:** QUESTIONS/ANSWERS with
  per-question payoffs (q_what→bossFace, q_why→bossMechanic — the
  precedent that a named truth SHAPES an encounter); truths +
  eliminations both recorded ("wrong answers are cartography");
  codexPct on profile claims, already keying the Witness registers;
  claims-not-authority with server clamps (maxAscension, S16-D6);
  growers/mutations and the grownDef machinery (post-OQ#69); the
  braid renderer whose warps already know how to cross.

## Part 1 — S22.1 The completion criterion (D1 — open ruling #6, taken)

**Proposed: a question CLOSES when every answer in its pool has been
adjudicated — proven true in some run, or eliminated in some run —
across the profile's history. The codex COMPLETES when every question
in the deduction set is closed.**

Why this shape and not the alternatives:

- *All-truths (collect every answer as a truth)* punishes correct
  play — a pair that deduces efficiently eliminates more than it
  proves, and §5's own canon says eliminations are cartography. A
  criterion that ignores half the codex contradicts the codex.
- *Percentage threshold (codexPct ≥ X)* is tunable but meaningless in
  the fiction — "the Machine is 80% described, close enough" is not a
  sentence the Witness could say with a straight face.
- *Per-question closure* is the fiction exactly: a region is
  described when every possibility has been mapped as true ground or
  charted as a lesion's edge. It is robust to the pending question-set
  verdict (defined over the set), and its PACE has a natural knob —
  the eliminations-per-run quota, which is already the Part-2 quota
  question the criterion was deferred with. One decision, both
  rulings.

**The last entry (D1b, RULED with amendment — a narrative event,
unmissable):** when the final question closes, the codex is complete
EXCEPT that the Machine now contains a full description of everything
but the pair holding the pen. **The Eye then comes to them.** The
fifth question is NOT a node and cannot be routed around: the first
time the pair stands on a map screen with a complete codex, the
descent halts and the Loom's Eye manifests where they are — an
interposed scene, the Machine reaching out now that it can finally
describe itself. Both closure timings resolve: a mid-run closing
verdict fires the scene that run (and if the finale hasn't begun, Act
4 opens THAT descent — the run everything changed); an end-of-run
closing fires it at the next run's first landing, the Eye waiting at
the first step down. The shape: the deduction machinery inverted —
not deduced from fragments but DECLARED by the pair, together (both
seats must pick the same answer; the map's own convention). Its
answer is recorded as the codex's final entry and loads the Caretaker
encounter the way q_what/q_why already load act-3 bosses (Part 4).
The question is the one canon predicted would leave the deduction
set: **"Who are you?"** — migrated from deduction to declaration,
asked at the end by the thing they have been describing. Final
wording, the answer pool, and the scene copy are Part 6 rows (the
answer THEMES are §8's: which figure's costume, and what its wearer
carried down).

**Ascension interlock: NONE for completion.** The ratified economy
gates RITE unlocks by ascension; gating the ending behind difficulty
would make the story a reward for grinding the ladder. Completion is
pure codex. (The ladder still pulls the same rope — deeper unlocks
feed faster deduction — but the door itself asks only for the book.)

## Part 2 — S22.2 The gate, the claim, and the announce (D2)

- **Detection:** completion is computed profile-side and rides the
  existing claim (`codexComplete: boolean` beside codexPct); the
  server CLAMPS per the established pattern — claims are not
  authority. **Access rule: the S16-D6 host convention** — the host's
  claim opens the floor; the partner rides (a fresh player descending
  with a veteran sees Act 4 the way they already play with the
  veteran's rites; credit accrues to both, per the union precedent's
  spirit). Enumerated alternative for the ruling: union-of-claims
  (either profile opens it). Recommendation: host — symmetry with
  ascension, and the fiction prefers it (it is the HOST's codex the
  Machine has been reading; solo hosts read the same rule).
- **The announce (the register arc's payoff):** the interposed Eye
  scene IS the announcement — no popup, no fanfare, held-reveal
  discipline; the manifestation itself is the reveal. After
  the declaration, the act-3 map gains its last node: the way down
  continues where it never did before. The Witness's lines here are
  the top-register pool speaking about its rival's door opening — the
  single best writing opportunity in the game, and every line must
  survive the truth law while the Witness finally understands what it
  built. (Part 6 rows; nothing authors here.)
- **Pre-completion pushes** (the ratified lore beat): the act-3
  finale's far edge already ends the run; the beat is a single
  Witness line acknowledging the floor that isn't there — one line,
  one row, fires at most once per run, only when the profile is past
  a codexPct floor (the early game should not explain the ending
  exists).

## Part 3 — S22.3 Act 4: the Loom's floor (D3)

**Proposed structure: one strand.** The braid's two warps converge and
BRAID INTO ONE — a single-strand floor, three nodes, no choices on the
map (the choosing is over; the declaration was the last fork):

1. **The Threshold** — a passage node, not a fight: the wrong-way
   traffic (§5b's cheap haunting item, landed here where the codex
   can finally explain it) crosses the pair at last, visibly ascending.
   Mechanically a scripted event; narratively the proof the Machine
   still births.
2. **The Cradle** — a rest node under the palette break: the dawn
   begins HERE, not at victory — the pair heals in the first light the
   descent has ever shown, before the hardest fight. (The kindest
   thing the game ever does, placed deliberately before the cruelest.)
3. **The Caretaker** — the encounter (Part 4).

The renderer already knows how to draw this: one warp, both seat hues
wound together (the bound-pair-as-whole thesis drawn literally — the
unbroken ring's topology). Palette: act tokens only (lamplit earth →
bruised violet → ember dark → dawn), B6 untouched. Map generation is a
fixed authored floor — no fills, no RNG beyond the encounter's own.

## Part 4 — S22.4 The Caretaker (D4 — the encounter design)

**Pillars, from the reflex it is:**

1. **It restores the original.** The Caretaker's signature intents
   temporarily REVERT drift: a grown rite reads at base for a turn; a
   mutation echo reads as the card it was; an upgraded card loses its
   plus. The run's accumulated identity — everything the pair grew,
   reclaimed, and renamed — is what it attacks, because that is what a
   preservation reflex sees as damage. Mechanically this is the
   grownDef machinery driven in reverse, one turn at a time; after
   OQ#69, every surface already agrees on what "grown" means, so
   "ungrown, briefly" is implementable and — critically — LEGIBLE.
2. **It purges what drifted.** Phase two: what cannot be restored is
   deleted. Purge intents exile cards from the chain (not the deck —
   run-scale cruelty, not meta-scale), and its binding behavior is the
   inversion of every enemy before it: it binds to NEITHER player —
   it does not acknowledge the pair as parts of the Machine at all.
   The fairness laws hold: telegraphed, counterable, no falsehoods in
   any mechanicLine.
3. **Truths are armor.** The run's named truths already lean the loom
   (the S14.3 pendingThread precedent); at the Caretaker each RUN
   truth named this descent is a ward — proposed form: each named
   truth cancels one Restoration intent before it lands ("what is
   fully described cannot be restored to a lie"). The profile codex
   does NOT buff the fight (the book opens the door; the RUN earns
   the fight) — keeps the encounter honest at first completion and
   replayable after.
4. **The declaration loads the opening.** The fifth question's answer
   picks the Caretaker's first face and opening pattern — the
   q_what→bossFace plumbing at meta-scale. Two to four faces per the
   answer pool; each face's mechanicLine is a Part 6 row.
5. **The Witness intervenes once.** Scripted, at the phase turn: the
   repair reflex acts — one Pulse on the pair's best dead link,
   announced in its own voice. It has spent the whole game teaching
   the player this verb; here it spends it. Once per encounter, no
   RNG, sign-off gated line. (Willingly, by the end.)

**Defeat:** the floor un-renders — the run ends as any run ends; the
codex keeps its completion (the door stays open; the Machine does not
un-describe itself). **The encounter is REPORTED-not-banded in
batteries at first** (Part 7) — bots will read it before humans do,
but its numbers are provisional by declaration, same law as the
ascension header.

## Part 5 — S22.5 The ending (D5)

Victory completes the jammed rite — the funeral machinery finally
carries THROUGH, and the first thing it carries is upward: the
wrong-way traffic from the Threshold, no longer wrong. The dawn
finishes. The ending screen is the Summary epitaph surface (the rail's
deliberate exception) carrying the top-register Witness farewell —
the reflex no longer needed, its dissolution POSED, never answered
(two to three closing lines whose ambiguity is load-bearing; the
sign-off table's hardest rows). The Caretaker is not mocked in defeat
— it was a reflex too; §0 says the world was collateral in a dispute
between two certainties, and the ending should not pick one. Then:
credits epigraph (one line, the §10.7 chant's first appearance if the
designer ever ratifies it; placeholder row until then), and the codex
screen gains its final state — complete, with the last entry in the
pair's own declared words.

**No New Game Plus is designed here.** Post-completion runs keep Act 4
open (host claim); whether completion re-arms, escalates, or varies is
a future ruling with human data. One door per design pass.

## Part 6 — Strings & content scaffolding (STALLS — counts and constraints only)

| table | rows | constraints |
|---|---|---|
| The fifth question | 1 question + 3–4 declaration answers + codex final-entry text per answer + the manifestation scene copy (~3 beats: halt, the Eye opens, the asking) | §8 themes; both-seats-agree UX copy; the scene and question are machine text, not Witness voice — though the Witness may speak ONE rail line as it recognizes what is happening (its own row, register-gated) |
| Completion beats | top-register announce pool (~6), pre-completion floor line (1), the last-node map caption (1) | truth law; held reveal — no exposition, the register arc carries it |
| Act 4 floor | node names ×3, Threshold event text, Cradle rest text | word-drawer; dawn enters the prose here first |
| The Caretaker | name/title row, per-face mechanicLines (2–4), Restoration/Purge intent lines (~8), phase-turn line | truth law binds every mechanicLine absolutely — the encounter that reverts cards must SAY so plainly; no falsehood survives contact with this boss |
| The intervention | 1 line (the Witness's Pulse) | the register arc's single most load-bearing line; drafted in multiple, signed as one |
| The ending | victory epitaph set (~3), defeat epitaph (~2), credits epigraph placeholder | ambiguity is load-bearing; posed-never-answered is a rejection criterion for any line that resolves it |

Authoring order when sessions allow: the fifth question first (it
gates implementation), the Caretaker table second, the ending last —
written when everything it must not resolve is in place.

## Part 7 — Implementation phasing & instruments

- **Phase A (engine, this window if S21 clears):** completion
  computation + claim + clamp; the fifth-question surface on the
  existing Loom's Eye machinery; the act-4 floor as fixed map data
  behind the completion gate. Deterministic; suite-covered; parity
  story per the S20-R1 convention (the gate is claim-off in every
  battery until Phase C).
- **Phase B (encounter):** the Caretaker on the grownDef-reversal and
  purge mechanics; bot-policy handling sufficient for batteries (the
  fleet must SURVIVE the encounter deterministically, not master it);
  REPORTED act-4 leg joins the canonical report, no band.
- **Phase C (strings + palette):** signed tables land; dawn tokens;
  the wrong-way Threshold event. Registers untouched — the top pool
  grows, existing pools do not move.
- **Instrument law throughout:** every phase behind the completion
  claim, which no bot asserts — the canon batteries are byte-stable
  until a ruled act-4 battery mode exists (`TB_SIM_CODEX_COMPLETE`,
  Phase B, explicitly not default).

## Part 8 — Designer decisions (D-list)

| D | decision | options | recommendation |
|---|---|---|---|
| D1 | completion criterion | RULED: per-question closure; pace knob = the eliminations quota (the Part-2 question, now one decision) | executed in Part 1 |
| D1b | the fifth question | RULED: q_who migrated, AS AN INTERPOSED SCENE — the Eye manifests to the pair, unmissable, un-routable (designer amendment 2026-07-07) | executed in Parts 1–2 as amended |
| D2 | act-4 access | RULED: host claim (S16-D6 symmetry) | executed in Part 2 |
| D3 | floor structure | RULED: one strand ×3 nodes — the topology thesis drawn literally | executed in Part 3 |
| D4 | Caretaker pillars | RULED: pillars 1–5 as written; pillar 3's ward form noted as the tuning surface | executed in Part 4 |
| D5 | ending scope | RULED as written; NG+ deferred. Horizon note (designer): future ascensions are expected to take Act 4 for granted and extend difficulty as POSTGAME — recorded for the ladder's eventual A6+ design, out of scope here |
| D6 | phasing | RULED: Phase A this window; B–C by capacity, else handoff — this doc is their spec | Phase A cleared to route after S21 |

**After close:** Phase A routes to implementation; Parts 6's tables
open one at a time under enumerate→propose→sign-off; the handoff
package carries this doc as the ending's single source of truth.
