# Threadbound — S9 Decision Tree (Part-2 Rulings, Pre-Written)

Purpose: every decision gated on human playtests, converted to
OBSERVE → BRANCH → EXECUTE form. When session data arrives, the designer
matches what was observed to a branch and fires the attached ruling —
no design session required. Claude proposed these branches with full
project context; the designer still rules by choosing the branch (or
overriding it — the tree is a map, not an autopilot).

**Evidence tiers** — do not fire a ruling below its tier:
- **T1**: tomorrow's friend sessions suffice (1–2 pairs, qualitative).
- **T2**: needs the stranger cohort (fresh eyes, ~4+ pairs).
- **T3**: needs telemetry volume (soft-release aggregation).

Doubles as the observation sheet: the OBSERVE lines, in order, are what
to watch for tomorrow.

---

## D1. Final question set — does q_who survive? (T2, early signal T1)

OBSERVE: Do players connect their death-rite pick to the "Who are you?"
question? Debrief probe: "What did the game already know about you?"
Watch for q_who assertions made from rite knowledge rather than clue
fragments, and for players treating the question as already-answered.

- **Branch A — players treat q_who as answered by the rite pick** (they
  say some version of "well, I chose who I was"): EXECUTE the bible's
  anticipated ruling — q_who leaves the deduction set and becomes a
  RECORD: the codex logs the rite pick as the answer to "Who are you?"
  automatically, first codex entry of every run. Deduction narrows to
  the three world questions (+ q_came). The Loom's Eye stake pool
  shrinks by one question; no rebalance needed (stakes are
  per-question).
- **Branch B — players engage q_who as a real deduction anyway** (clue
  fragments about identity still land, assertions feel earned): keep
  all four questions; EXECUTE nothing except a note that rite fiction
  and identity deduction coexist.
- **Branch C — q_who confuses** (players think the rite pick WAS the
  assertion, get surprised at the shrine): same execution as Branch A —
  confusion here is evidence the mechanic already superseded the
  question.

## D2. Answers-per-question quota (T2 for feel, T3 for tuning)

OBSERVE: shrine behavior at S8's expanded pools. Deduction success per
question; blank rates; whether pairs NARROW (discuss eliminations) or
GUESS (assert on vibes). Telemetry: strike-outs vs self-deduced per
question; fragments seen per question before assertion.

- **Branch A — narrowing happens, success 40–70% per asserted
  question**: quota is right at S8 sizes (4/4/5). EXECUTE: freeze
  current pools as the production quota; the deducibility test's ≥2
  bearing fragments per answer becomes permanent CI.
- **Branch B — guessing dominates / success <40%**: pools outrun
  fragment supply. EXECUTE in order until Branch A behavior: (1)
  fragments per clue event +1 (supply, not pool size); (2) clue events
  10→12; (3) only then trim the largest pool by one answer. Never trim
  first — the composition lesson: same-iness/illegibility is supply
  composition before pool size.
- **Branch C — success >70%, assertions feel automatic**: too legible.
  EXECUTE: raise answer counts on world questions by +1 each (theme
  lists in bible §8 have spares) before touching fragment clarity.

## D3. Codex completion criteria → Act 4 unlock (T3, direction T2)

OBSERVE: codex fill per run (profile telemetry). Runs-to-fill at
current pool sizes; whether players CHECK the codex between runs
(screen-open telemetry from S9a's surface).

- **Branch A — fill rate implies 8–15 runs to completion**: EXECUTE the
  straightforward criterion — Act 4 unlocks when every question has
  all answers proven (truths + eliminations both count as "known").
  8–15 runs is the right epic length for the current content volume.
- **Branch B — fill implies <8 runs**: too fast for the reveal's
  weight. EXECUTE: completion requires all answers proven AND at least
  one full-true assertion run (every asserted question correct in a
  single run) — a mastery capstone, not a grind extension.
- **Branch C — fill implies >15 runs / players never open the codex**:
  the gestation isn't legible. EXECUTE: before touching the criterion,
  make progress louder (Witness lines referencing specific gaps —
  "you still don't know WHY" — at high registers); re-measure; only
  then consider per-question partial rewards.

## D4. Rite unlock pacing (T2)

OBSERVE: the death-rite offer with everything unlocked. Fresh players:
overwhelmed or engaged by a 2-of-4 offer? Pick deliberation time. Do
returning players hunt variety or settle on a favorite?

- **Branch A — fresh players engage fine**: unlock gating is pacing
  polish, not necessity. EXECUTE the minimal economy: 2 death-rites
  per role unlocked at start, remaining 2 unlock at first boss kill
  and first act-2 clear respectively; birth-rites all available from
  the start (the reveal IS the gate). Held-reveal pacing preserved
  with near-zero machinery — the S9a plumbing already supports it.
- **Branch B — fresh players overwhelmed** (analysis-paralysis at the
  offer, or thoughtless picks): EXECUTE: first-ever run offers no
  choice (the Witness assigns a fixed starter rite per role — "wear
  this one"); choice unlocks run 2. Plus Branch A's schedule after.
- **Branch C — veterans settle on one rite** (>60% repeat pick in
  profile telemetry, T3): tuning flag per the S8.1 band, not an
  unlock problem. EXECUTE: tune the neglected rites; do not force
  variety via gating.

## D5. Reclaim / OQ#38 verdict (T1 for signal, T2 to close)

OBSERVE: any deliberate cross-player Reclaim attempt, with the S7.6
widened window and both rite pulls live. Debrief: "Did you ever take
something back from your partner's pile? Why / why not?"

- **Branch A — attempts happen and players can articulate why**:
  OQ#38 CLOSES. EXECUTE: log the closing ruling; D2-addendum window
  stays parked.
- **Branch B — attempts happen only for rite-pull players**
  (Dowry-Bound/Quickening pickers Reclaim, others never): partial.
  EXECUTE: the addendum's reframed window ("target a card your partner
  discarded UNPLAYED last turn") lands as an ADDITIONAL window, rites
  keep their pulls; battery before/after per the S8.1 interaction
  watch.
- **Branch C — still zero across the cohort**: friction is structural.
  EXECUTE: the reframed window PLUS a UI affordance (Reclaim-eligible
  cards glow on the partner's board — visibility before mechanics);
  if a further cohort still shows zero, Reclaim returns to full
  redesign with the lore constraint (birth rite; pulls from death)
  as the only fixed point.

## D6. Birth-rite timing / map config (T1 signal, T2 to rule)

OBSERVE: when birth-rites actually arrive in human hands (telemetry:
act/layer of pick). Do players ROUTE for character events once they
notice the pips?

- **Branch A — median arrival mid-act-2, players route**: L7/E32
  holds. EXECUTE: freeze as production config; retire L8/E32 reserve.
- **Branch B — arrival late act 2 / act 3**: EXECUTE the S7.8.4
  escalation, in order: character-event queue weight up one notch;
  re-observe; then L8/E32 only if weighting fails. (Weight is cheaper
  than run length.)
- **Branch C — players don't route for events at all** (ambient
  arrival only): legibility, not supply. EXECUTE: pip visibility pass
  + one Witness line at first character event naming the mechanic's
  existence ("there are doors here meant for you specifically" —
  held-reveal-compatible: names that events exist, not what they pay).
  Re-observe before touching numbers.

## D7. Threshold N and actor-credit (T2)

OBSERVE: does N=2 with actor-credit produce "I never got mine"
feel-bad (one player's birth-rite arrives, the other's never does)?

- **Branch A — both players usually arrive by late act 2**: holds.
  EXECUTE: freeze N=2, actor-credit.
- **Branch B — frequent single-sided runs**: EXECUTE: partner-assist
  credit — a character event grants its actor 1 progress and the
  partner 0.5 (two partner-witnessed events = one credit). Preserves
  routing asymmetry while capping the gap; N stays 2.
- **Branch C — both routinely capped by mid-act-2 and it feels
  scheduled**: EXECUTE: N=3 with the Branch-B assist rule; map supply
  already covers it at L7/E32's ceiling.

## D8. Difficulty and run length — "is it still fun" (T1)

OBSERVE: run duration vs the 60–75 min target at L7 maps; deaths and
where; the a2_bell_pair note (distinguish "that fight was hard" from
"the game is hard"); whether the stacked build's eased bot difficulty
reads as easy to humans too.

- **Branch A — runs in band, deaths feel attributable**: EXECUTE:
  nothing. Bank the baseline.
- **Branch B — too easy for humans as well**: EXECUTE: one
  TB_ENEMY_DMG_SCALE step (+0.05) — the sweep showed DMG ≫ HP ≫ gold
  in sensitivity; never re-center via gold (bots can't convert it and
  it's the human-agency knob by ruling).
- **Branch C — runs >80 min**: pacing, not difficulty. EXECUTE:
  TB_ENEMY_HP_SCALE down one step (HP stretches fights without
  protecting players — the sweep's coarse-knob finding, used in
  reverse); map layers untouched (they're load-bearing for D6).

## D9. Rite-card feel (T1)

OBSERVE: do vestment cards get played or treated as dead starters?
Any shop-removal of a rite card — and the stated reason (bad fit vs
dud card).

- **Branch A — played, and picks visibly shape drafting**: S8.1
  validated. EXECUTE: archetype plan proceeds against all eight pulls.
- **Branch B — specific cards are duds** (played never, removed as
  chaff): EXECUTE: tune the named cards one notch (cost −1 or effect
  +1) — the archetype plan proceeds for validated pulls, holds for
  tuned ones pending the next cohort.
- **Branch C — the CONCEPT reads as chaff** (players don't register
  rite cards as special at all): identity communication failure, not
  numbers. EXECUTE: visual distinction pass (unique frame, the
  Witness names the card on first draw) before any mechanical change.

## D10. Held reveal — the birth-rite arrival read (T1, confirm T2)

OBSERVE: debrief question 2, verbatim, unnamed. Intrigue-confusion
(theories, a name they invented) vs stall-confusion (play stopped,
"is this a bug") vs no-registration (didn't notice they got one).

- **Branch A — intrigue**: the held reveal works. EXECUTE: D4's
  economy lands as observed; no explanation text added anywhere.
- **Branch B — stall**: EXECUTE: the minimum viable explanation — the
  pick UI gains a single Witness line acknowledging that a choice is
  happening ("the Loom offers; take one") with zero explanation of
  what rites DO. Re-observe. The reveal survives; the stall dies.
- **Branch C — no-registration**: presentation, not pacing. EXECUTE:
  the pick becomes a full-screen moment (the shrine treatment, not a
  toast). Nothing else changes.

---

## Execution notes

- Every EXECUTE above is sized for Claude Code + a one-line designer
  go — none requires a design session. Where an EXECUTE has ordered
  sub-steps, run one step, re-observe, then the next; never fire a
  whole ladder at once.
- Branches can mix across decisions freely (D6-B with D7-A, etc.) —
  they were written to be independent.
- If tomorrow produces an observation NO branch covers, that is the
  one case worth spending API-Fable on: bring the observation, not
  the whole context — this doc plus the observation is a sufficient
  prompt.
- File the chosen branches as ruling lines in OPEN-QUESTIONS.md per
  house convention; the S9 sprint doc is then assembled from the
  fired EXECUTEs plus the unlock plumbing already landed in S9a.
