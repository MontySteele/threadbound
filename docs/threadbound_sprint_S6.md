# Threadbound — Sprint S6: The Narrative Truth Slice (Tapestry + Loom's Eye)

First implementation sprint of the narrative truth system, per the ratified
spec **docs/threadbound_narrative_track_slice.md** (rev 2, 2026-07-01). The
slice tests ONE question: *is assembling the truth together fun?* Everything
here is falsification apparatus for that question.

Branch: `nt-slice` (off main, post-S5 merge). Everything flag-gated behind
`TB_TRACKS=1` — with the flag off, a run is byte-identical to main tip
(same RNG stream, same map, same events; the covenant for this sprint).
Hard scope rule: no mainline balance changes, no mainline event rework, no
new relics/cards outside the slice's own surfaces. Lore remains PROVISIONAL
(Sexton/Peal names, fragment prose) — text ships behind the flag and gets
rewritten in the lore bible session; the STRUCTURE is what this sprint
commits to. Separate commits per work item, per the post-§14.16 rule.

## S6.0 Flag scaffolding (foundation, lands first)

`TB_TRACKS` read from env server-side (bots: same), threaded into the
engine as run state at `START_RUN` (the `unlockedCards` pattern — the pure
engine never reads env). RNG covenant: when the flag is off, ZERO
additional rng advances anywhere (truth roll, map gen, event queue). A
fuzz-style test locks this: same seed, flag on vs off, the flag-off run's
action-for-action states match main's.

## S6.1 Data model + truth roll (engine)

- `QuestionDef` / `AnswerDef` / `FragmentDef` per the spec sketch
  (types.ts), `strength` field reserved (default 1) for ascension fraying.
- Slice content: 3 questions / 7 answers — *Who are you* (self, 2), *What
  happened here* (world, 2 — the boss faces), *Why did it happen*
  (world, 3). VALID-COMBO table as content (not every product coherent);
  12 valid truths.
- Truth tuple rolled seed-deterministically at `START_RUN` when flagged,
  stored server-side in `GameState` (redaction handles the rest — S6.3).
- Covenant-style test: every answer appears in ≥1 valid combo; combo table
  references only defined ids; truth roll is replay-stable.

## S6.2 Clue events + asymmetric fragments

- New `EventEffectOp` that emits fragments: rendered text pushed per
  player (actor channel / partner channel), pinned to that player's board
  state. Fragment text NEVER enters the shared log.
- Six clue events in a slice content module, elevated pool weight behind
  the flag (weight mechanism added to the event queue — flag-off path
  untouched). Each event: shared scene, a REAL non-clue choice with cost
  (no free lore), fragment A → actor, fragment B → partner. The Unrung
  Bell (spec's worked example) is event #1 and sets the pattern.
- Coverage covenant test: each question reachable from ≥3 events; no
  single event resolves a question alone; every fragment bears on exactly
  one question and eliminates exactly one answer, strength 1.

## S6.3 Hidden-information discipline (§11 extension) — the load-bearing wall

Extend `redactFor` so the client NEVER receives: the truth tuple, the
boss's live mechanic list, fragment→elimination mappings, or unrevealed
fragment text. Server pushes rendered fragment text per player at event
resolution; at the shrine, the pooled per-question strike-out sets
(computed server-side); after confirmation, verdicts + reveals.
Gate test: serialize every message a client would receive across a full
scripted flagged run and assert none of the hidden strings/ids appear.
A player reading the websocket learns nothing their screen doesn't show.
Note: face mechanic pools must not ship in client-bundled content tables —
the narrative boss table lives where the client build can't import it.

## S6.4 The Loom's Eye (engine/server)

- New `NodeKind`/`Phase`; finale map gains the loom node ADJACENT to the
  pre-boss rest (never replacing it). Verdict stated completely before the
  boss node unlocks.
- Stake: rarity-weighted coveted-relic selection (spec: rare 3× /
  uncommon 2× — relics are binary rare/common today, so slice mapping is
  rare 3× / common 1×, flagged as a designer question below).
- One shared sheet: assert answer / leave unspoken per question; pooled
  fragments from BOTH boards strike contradicted answers (source noted);
  all-but-one struck → auto-completion. Both players confirm the same
  filled state; edits reset confirmations.
- Verdict: each true assertion pays its linked reveal; ANY false assertion
  unravels the stake; blanks free; all-true → completion boon. No in-run
  consolation for false; eliminations write to codex either way.

## S6.5 Boss faces + reveals + telegraphs

- One body, two faces keyed off the *what happened* answer (provisional
  Sexton / Peal); per-face mechanic pool; live mechanics rolled
  seed-deterministically, each bound to a world question for its reveal.
- Payoffs: *what happened* true → real name + mechanic 1 revealed in the
  intent UI; *why* true → mechanic 2; *who* true → heal 6 each
  (provisional); all-true boon → full opening-turn intent shown at the
  pre-boss rest (provisional).
- Unrevealed mechanics ALWAYS telegraph in-fight one turn before first
  firing (telegraphLine per mechanic).

## S6.6 The Tapestry (client)

Overlay on T key / pad button (DeckOverlay pattern): columns per question,
pinned fragment cards (act + event tag, witness-colored left border:
p1 cyan / p2 orange / Witness gold), partner face-down stubs ("Bram holds
a thread — ask him"), empty state ("no thread yet"), pin toast on reveal.
Renders server-pushed fragments ONLY — no client-side inference.

## S6.7 The Loom's Eye (client)

Stake panel (relic + rarity), shared sheet (answer chips; struck answers
show source; per-question "leave unspoken"), both-confirm footer showing
each player's state, "Speak the name" / "Pass in silence", full verdict
screen before the boss unlocks.

## S6.8 Solo, codex, telemetry

- Solo: the Witness voices the partner channel; its fragments pin to a
  Witness column (thread-gold). Rides the existing botSeat/witness-solo
  machinery.
- Codex: Profile gains truths[] + eliminations[] (version bump, merge
  rules: union, never downgrade). Title-screen stub list only.
- Telemetry (new fields on the existing counter bag): clue events
  offered/taken, fragments per player, board opens per act, per-question
  outcome (blank/true/false), strike-outs vs self-deduced, stake relic +
  rarity + lost?, sheet edit count + time at shrine, boss result, codex
  writes.

## S6.9 Sign-off gates

1. **Flag-off covenant:** with `TB_TRACKS` unset, sim battery and fuzz
   replays are identical to main tip (no rng drift, no map/event drift).
2. **Hidden-info gate:** the S6.3 wire-capture test passes; no hidden
   string/id ever crosses to a client.
3. Coverage covenant: each question ≥3 events; no single-event resolution;
   all fragments bear on one question, eliminate one answer.
4. Determinism: same seed → same truth tuple, same live mechanics, same
   clue-event queue; fuzz suite green with the flag ON.
5. Both-confirm correctness: sheet edits reset confirmations; verdict
   applies to both; disconnect/reconnect at the shrine resumes cleanly
   (lifecycle test).
6. Solo run completes the full loop (fragments → board → sheet → verdict
   → boss) with the Witness channel.
7. All tests green from fresh clone; `npm run check` passes.
8. Behavioral pass/fail (talk, assertion variance, routing correlation —
   spec lines 143-157) is judged on PLAYTEST + telemetry, not this sprint;
   this sprint ships the apparatus and the telemetry to judge it.

## Designer questions (non-blocking, provisional defaults taken)

1. Stake rarity weights: spec says rare 3× / uncommon 2×, but relics are
   binary rare/common. Slice default: rare 3× / common 1×. OK, or add a
   relic rarity tier now?
2. Clue-event pool weight value: slice default = clue events 2× in the
   flagged event queue. Tune after first playtest.
3. Heal-6 *who* payoff and pre-boss-intent completion boon are marked
   provisional in the spec — implemented as specced, flagged for review.

## Out of scope, explicitly

The fourth question, ascension fraying (strength field ships, feature
doesn't), codex UI beyond the stub list, meta-rewards for codex
completion, motive-correct event scoring, track-specific relics,
additional bosses, the lore bible, any mainline event rework, any balance
change to mainline content.
