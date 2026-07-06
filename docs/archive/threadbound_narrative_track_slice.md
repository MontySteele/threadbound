# Threadbound — Narrative Truth System: Vertical Slice Spec (rev 2)

Status: **design spec, pre-implementation.** Code starts only after Sprint
S5 lands, on its own branch (`nt-slice`), flag-gated (`TB_TRACKS=1`).
Rev 2 (2026-07-01) replaces the track-picking model with the
question/answer truth model ratified this session. Lore remains PROVISIONAL
— the lore bible session follows a validated slice. UI reference: the
Tapestry + Loom's Eye mockups ratified in the 2026-07-01 design session.

## The system in one paragraph

Each run secretly rolls a **truth**: a tuple of answers to a FIXED set of
questions the loom always asks (production: four — *Who are you / Why did
you come / What happened here / Why did it happen*). Clue events yield
**asymmetric fragments** (one per player), each bearing on one question and
auto-pinned to that player's **Tapestry** — the in-run evidence board — so
nobody has to remember act-1 flavor text an hour later. Before the Act 3
boss, at the **Loom's Eye**, the shrine reveals a coveted relic as the
stake and offers **one shared answer sheet** the pair fills together:
assert any subset of questions, leave the rest unspoken. Pooled evidence
from both boards strikes out contradicted answers on the sheet. Both
players confirm the same sheet; they pass or fail together. Every TRUE
assertion pays its linked reveal; ANY false assertion unravels the stake;
blanks are free; all-true earns a completion boon. Unrevealed boss
mechanics always telegraph in-fight one turn before first firing. The
verdict is stated completely before the boss node unlocks. The codex
(profile) permanently records truths and eliminations.

## Rulings embedded (designer sessions of 2026-06/07)

1. **Stake revealed BEFORE commitment; the shrine covets** — selection is
   rarity-weighted (rare 3×, uncommon 2×), never uniform, so the wager
   never decouples from confidence.
2. **Per-question assertion.** Blank questions are free (silence, per
   question). Each true assertion reveals its linked payoff. Any false
   assertion loses the stake. All questions answered true → completion
   boon on top. *The loom punishes false naming, not silence.*
3. **One shared sheet.** The pair edits a single sheet; both must confirm
   the same filled state; verdict applies to both. No independent sheets.
4. **No in-run consolation for false assertion.** Meta only: wrong
   assertions write elimination entries to the codex; engaged-but-wrong
   pairs still advance the meta-narrative.
5. **The Tapestry shows YOUR fragments only.** Partner fragments appear as
   face-down stubs ("Bram holds a thread — ask him"). Fragment text never
   crosses screens; asymmetry survives the log, and mid-run deduction
   stays a conversation.
6. **Eliminations materialize at the shrine, not on the board.** Mid-run
   the Tapestry is raw prose. At the Loom's Eye, BOTH players' fragments
   pool mechanically and strike contradicted answers on the sheet (source
   noted). Over-collection → all-but-one struck per question →
   auto-completion, which is earned (routing paid for it in cards/relics
   not taken). Silent pairs still get pooled strike-outs — the
   accessibility floor — just fewer, with no shared theory.
7. **Fixed question set, varying answers.** Same questions every run:
   stable board columns, teachable ontology, and the codex meta-layer
   ("*why did it happen* has had six true answers…"). World questions key
   boss reveals; self questions key personal payoffs (and are the future
   hook for motive-correct event choices — lore session).
8. **Solo fallback:** the Witness voices the partner channel; its
   fragments pin to a Witness column (thread-gold) on the one board.
9. **Ascension fraying (future, NOT in slice):** higher rungs weaken
   per-fragment elimination strength (a fragment that struck two answers
   at A0 strikes one at A3). The fragment data model carries a strength
   field from day one; the feature ships later as a rung.

## Hidden-information discipline (§11 extension)

The client never receives: the truth tuple, live mechanic list,
fragment→elimination mappings, or unrevealed fragment text. The server
pushes rendered fragment text per player at event resolution (board
renders only what was pushed); at the shrine it pushes the pooled
strike-out sets per question (computed server-side), then the per-question
verdicts and reveals after confirmation. A player reading the websocket
learns nothing their screen doesn't show.

## Data model sketch

- `QuestionDef`: id, text, kind ('world' | 'self'), payoff binding.
- `AnswerDef`: questionId, id, text, codexTruthEntry.
- Truth roll: seed-deterministic tuple drawn from a VALID-COMBO table
  (not every product of answers is coherent; the table is content).
- `FragmentDef`: eventId, channel ('actor' | 'partner'), text, bearsOn:
  questionId, eliminates: answerId[], strength (reserved, default 1).
- Boss: face keyed off the *what happened* answer (slice economy: one
  body, two faces); mechanicPool per face; live mechanics rolled
  seed-deterministically, each live mechanic bound to a world question
  for its reveal payoff; telegraphLine per mechanic (shown one turn
  pre-fire when unrevealed).
- Run state (server): truthTuple, fragmentsRevealed per player,
  shrine: { stakeRelicId, sheet: Record<questionId, answerId | null>,
  confirmed: Record<PlayerId, boolean>, verdict per question, stakeLost }.
- Profile: codex truths[] + eliminations[].

## Slice scope (the falsification build)

- **Three questions** (production adds the fourth): *Who are you* (self,
  2 answers), *What happened here* (world, 2 answers — the two boss
  faces: provisional Sexton / Peal), *Why did it happen* (world,
  3 answers). Twelve possible truths from seven authored answers.
- **Payoff bindings** (slice): *what happened* true → the boss's real
  name + mechanic 1 revealed in the intent UI; *why* true → mechanic 2
  revealed; *who* true → small personal boon (provisional: heal 6 each).
  Completion (all three true): keep-stake is already the wager rule, so
  the boon is additive — provisional: the boss's full opening-turn intent
  shown at the pre-boss rest.
- **Six clue events**, elevated pool weight behind the flag. Each: shared
  scene with a REAL non-clue choice and cost (clue events must not be
  free lore dispensers or the fights-vs-events routing tension dies),
  fragment A to the actor, fragment B to the partner. Every fragment
  bears on one question and eliminates exactly one answer (strength 1).
  Coverage audit: each question reachable from ≥3 events; no single
  event resolves a question alone.
- **The Tapestry**: overlay (T key / pad button), columns per question,
  pinned fragment cards (act + event tag, witness-colored left border:
  p1 cyan / p2 orange / Witness gold), partner stubs, empty state
  ("no thread yet"), pin toast on reveal. Client-side render of
  server-pushed fragments only.
- **The Loom's Eye**: fixed Act 3 node adjacent to (never replacing) the
  pre-boss rest. Stake panel (coveted relic + rarity), the shared sheet
  (answer chips; struck answers show source; per-question "leave
  unspoken" state), both-confirm footer showing each player's state,
  "Speak the name" / "Pass in silence". Full verdict screen before the
  boss node unlocks.
- **Telemetry**: clue events offered/taken, fragments per player, board
  opens per act (is the log used?), per-question outcome
  (blank/true/false), strike-outs at shrine vs. answers self-deduced,
  stake relic + rarity + lost?, sheet edit count + time at shrine (talk
  proxy), boss result, codex writes.

## Worked example event (pattern-setting; lore provisional)

**The Unrung Bell** — a bell too heavy to have ever been hung,
half-buried. Ring it (cost 4 HP — the sound goes through you) for the
fragments, or scavenge the fittings (gain 15 gold, learn nothing).
- Fragment A (actor): "The clapper is bound in grave-cloth — someone
  silenced this bell ON PURPOSE." → bearsOn *what happened*, eliminates
  "the choir drowned."
- Fragment B (Witness, to the partner): "Your friend hears a bell. I
  hear the pause after one. A kept pause. Someone is still keeping it."
  → bearsOn *why did it happen*, eliminates "hunger."
Neither screen holds a conclusion; the sentence completes out loud.

## Pass / fail (behavioral, judged on playtest + telemetry)

- Pairs demonstrably talk about fragments (board-open telemetry plus
  sheet-edit churn and time-at-shrine above trivial).
- Assertion counts VARY across runs and questions — neither all-blank
  nor reflexively all-asserted; blanks appear on genuinely weak
  questions.
- Strike-outs and correct assertions correlate with clue events taken
  (the routing economy functions).
- The stake reveal and the shared sheet produce table talk — the shrine
  reads as a moment.
- Solo: the Witness channel supports a confident partial assertion.
If pairs skip clue events and pass in silence, iterate once on
payoffs/stake, then reassess the direction. The slice tests ONE
question: is assembling the truth together fun?

## Out of scope for the slice

The fourth question, ascension fraying, codex UI beyond a title-screen
stub list, meta-rewards for codex completion, motive-correct event
scoring, track-specific relics, additional bosses, the lore bible, any
mainline event rework.
