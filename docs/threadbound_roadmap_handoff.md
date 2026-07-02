# Threadbound — Roadmap & Handoff (single doc, 2026-07-02)

**What this is:** the one document to open a fresh design thread with,
alongside the playtest feedback when it lands. It consolidates the
remaining roadmap, the post-sweep deltas, the executed same-day slate,
and a compressed copy of the S9 decision tree, so a fresh session has
full ground without this conversation's history.

**Repo:** https://github.com/MontySteele/threadbound (`main`).
**State at snapshot:** S7 (Rites) + S8 (content) + S9a (meta plumbing)
+ S10a (combat breadth) + review sweep (21 fixes) + same-day rulings
all on main; 236/236 tests green; playtest build ships
`TB_TRACKS=1 TB_RITES=1` (PR #7 default; strict `=== '1'` parse).
**Pre-session reminders still live:** Render must REBUILD from main to
pick up 7dfb90c (event weights) and e555bf0 (Quickening retext) — both
engine-package; and the host plays from a FRESH PROFILE (OQ#48
max-of-seats means a veteran codex pulls quiet registers into a
first-timer's run, poisoning the held-reveal read).

**Fresh-thread instructions:** ground in this doc, then
docs/REVIEW-SWEEP.md (inline RULED annotations are current),
docs/OPEN-QUESTIONS.md, the lore bible, and the playtest feedback.
Conventions at the bottom of this doc are binding. Claude proposes;
the designer rules.

---

## 1. Immediate

1. **Friend sessions (tunnel cohort).** Debrief script (question 2
   verbatim, never name the birth-rite). Observer notes: elite variety
   read is 7/9 by construction (two S10a elites can't appear below A3
   — accepted, ruled); a2_silence_wretch's outlier heat was measured
   by bots fighting it wrong, so treat it as unattributed;
   stunned-Sexton-eats-discard and stunned-Warden-rebinds are
   contract-consistent non-bugs (note verbatim complaints as evidence);
   Pall Warden's displayed binding is stale at commit time (forecast
   queued); pad players can't re-read a picked birth rite — the
   observer reads it aloud.
2. **Verdict processing** — the anchor session. Instrument: the
   decision tree (§4). Fire T1 branches; bank T2/T3 observations.
3. **Soft-release go-live.** Deploy public with flags OFF (named step:
   flip render.yaml back — the strict parse makes it trustworthy),
   itch page, Discord seeding (`#looking-for-thread`), wider-maps
   patch note as the first beat. This is the data supply chain for
   the stranger cohort; nothing T2 rules without it.

## 2. Rulings executed today (context a fresh thread needs)

- **B6:** character-event queue weight 2×→4× (flagged pool only;
  integer weights character 8 / clue 4 / normal 2 / rare 1). Fresh
  battery: character events 1.48/run (was 0.56–1.18), birth picks
  p1 10% / p2 20% of seats, median arrival act 2 layer 5. Improved
  but under the N=2 bot comfort line — **contingency armed: if humans
  still read late, the D6-B ladder resumes at L8/E32** (weight rung
  pre-spent).
- **B3:** Quickening reads "Cards you Reclaim that keep their name
  arrive upgraded." (Visible-behavior discriminator; rhymes with
  Naming-Day's renamed-is-claimed law; effect untouched.)
- **B2:** no-re-centering STANDS for the deploy config; ledger
  corrected — the next re-centering conversation starts from **48%
  vb (TRACKS+RITES)**, not 29%.
- **B11/OQ#48:** max-of-seats, ratified and closed.
- **B1:** two S10a elites invisible below A3 — accepted for the
  sessions; sample-the-pool is first in the post-playtest engine queue.

## 3. Pending designer rulings (banked, not urgent)

From S9A-S10A status: Twice-Carried rename (accept/re-rule), the
a1-easy +1 pool deviation, bb pair asymmetry (presumptive answer in
§6), act-1 HP loss above band vs win% in band (S3.4-shaped conflict;
human read rules). From the sweep, riding future sign-off tables:
Hearth-Keeper retext, codex "Never"→per-descent phrasing, Wedding
Knife drops-normally ratification, mechanicLine trims.

## 4. The decision tree (compressed; full version:
`threadbound_s9_decision_tree.md` — commit it to docs/ if not present)

Format: OBSERVE → branches. Tiers: T1 = friends suffice; T2 = stranger
cohort; T3 = telemetry volume. Fire nothing below its tier.

- **D1 q_who survives? (T2)** Players treat it as answered by the rite
  pick → q_who becomes an auto-logged record, deduction narrows.
  Players deduce it anyway → keep four questions. Confusion at the
  shrine → same as A.
- **D2 quota (T2/T3).** Narrowing + 40–70% success → freeze pools.
  Guessing/<40% → supply ladder: fragments+1 → clue events 10→12 →
  only then trim. >70% → +1 answer on world questions.
- **D3 codex completion (T3).** 8–15 runs to fill → all-proven
  unlocks Act 4. <8 → add a full-true-assertion mastery capstone.
  >15 / codex unopened → make progress louder first (gap-naming
  Witness lines), re-measure.
- **D4 rite unlock pacing (T2).** Fresh players fine → minimal
  economy (2 death-rites start, +1 at first boss kill, +1 at first
  act-2 clear; birth-rites all open). Overwhelmed → first run assigns
  a fixed starter rite, choice from run 2. Veterans repeat-pick >60%
  → tune the neglected, never force via gating.
- **D5 Reclaim/OQ#38 (T1 signal).** Attempts + articulation → CLOSE.
  Only rite-pickers attempt → add the unplayed-last-turn window
  (§7-D2) alongside. Zero → window + glow affordance; then full
  redesign with the birth-rite fiction as the only fixed point.
- **D6 birth-rite timing (T1 signal).** Mid-act-2 + routing → freeze
  L7/E32, retire reserve. Late → **L8/E32 directly (weight rung
  pre-spent)**. No routing at all → pip visibility + one existence-
  naming Witness line before numbers.
- **D7 threshold N (T2).** Both arrive by late act 2 → freeze N=2
  actor-credit. Frequent one-sided runs → partner-assist half-credit.
  Feels scheduled → N=3 with the assist rule.
- **D8 difficulty/length (T1).** In band → bank. Too easy for humans
  too → one DMG step (+0.05); never gold. Runs >80min → HP-scale
  down one step; layers untouched (load-bearing for D6).
- **D9 rite-card feel (T1).** Played + shapes drafting → archetype
  plan proceeds on all 8 pulls. Specific duds → tune named cards one
  notch. Concept unregistered → visual distinction + Witness names
  the card on first draw, before numbers. (Quickening reads against
  the NEW text.)
- **D10 held reveal (T1).** Intrigue → touch nothing. Stall → one
  Witness line acknowledging a choice exists, zero explanation.
  No-registration → full-screen pick moment.

If a session produces an observation no branch covers: bring THAT
observation plus this doc to a fresh thread — it is a sufficient
prompt.

## 5. Near-term (gated on verdicts)

- **S9 — Part 2 + unlock economy**, assembled from fired branches.
  Non-negotiable riders: the two future-traps land WITH the first
  added rite — riteUnlockUnion absent-seat = everything, and
  profile-normalize accrual (a new rite must not ship locked for
  veterans); bundle-secrecy ratified for held-reveal strings (stub
  70%-register lines server-side + wire assertions); q_came payoff
  re-keyed Covet → pendingThread; telemetry counters
  (card-acquisition; per-card play/win attribution — precondition for
  any future balance pass; bot batteries are shop-dark by
  construction, so relic questions need human data); Pulsekeeper's
  Ring escalation only if human `ringDiscountsFired` stays dead.
- **Difficulty re-centering** — one commit, still unspent, per D8,
  from the 48% ledger line.
- **Stranger + return cohorts** (playtest plan sessions 3–10) on the
  public flywheel; written verdict doc after session 10.

## 6. Post-playtest engine queue (behavior-shifting; each needs its
regen/re-baseline)

1. Elite encounters sample the pool (golden regen + A0 re-battery) —
   unblocks the S10a variety thesis.
2. Bot link-planning learns Choir Silence suppression → re-baseline,
   THEN re-read the a2_silence_wretch outlier before tuning.
3. Pall Warden client-side last-owner forecast.
4. Sever-intent enemies exempt from the §14.8 auto-retether.
5. Solo bot-policy reseed from room state.
6. Banked: per-run sim outcomes are non-reproducible even
   sequentially (jitter repro exists); only battery aggregates
   compare.

## 7. Mid-term

- **S10b — combat texture:** the pierce-class act-2 enemy +
  post-block Fray as the A4 redesign (the sweep's best structural
  finding: zero through-block damage explains bb's edge, flat A2/A4,
  and Bram's Brace-Up same-iness at once); mechanicLine backfill for
  six pre-S10a carriers + longest-line trims + frame cap (sign-off
  table); sigil palette p1-hue entry replaced with a neutral; Steady
  sim-heuristic; Sever pricing probe from human threadSpendByKind.
- **Archetype plan (roadmap step 3; design-first).** Each rite card
  is a declared archetype seed — grow the 8 pulls into real builds,
  gated per-pull on D9. Banked inputs: the `rite_reclaim` Witness
  pool (~6 lines, the §5b thesis given a voice — highest
  fun-per-effort on the board); reclaim-hook relic;
  `resonatedLastTurn` clause family; the `oncePerCombat` relic tier;
  covet-hook table-talk relic; generalize the death-crossing funnel
  (gold/hex/cardOnDeath); one gold-reading act-2 event (gives the S4.1
  provenance telemetry meaning). Bram's side differentiates the GUARD
  SUITE before adding cards. More rites per role land here (feeds the
  unlock economy).
- **Deferred specs with triggers set:** map graph overhaul (random
  topology; composition constraints at generation;
  `scripts/map-composition.js` as CI gate; trigger = slice/Rites
  verdict) and the Reclaim unplayed-last-turn window ("target a card
  your partner discarded UNPLAYED last turn" — fiction-safe, never
  empty; trigger = OQ#38 escalation path).

## 8. Long-term (sequence preserved)

- **Act 4 / the Caretaker** — design doc first (no data dependency);
  build gates on D3's codex completion criterion.
- **The Tollkeeper (character 3)** — Thread/Rite economy seat,
  reserved in threadbound_characters_and_player_count.md; build gates
  on the dyad reading well in human hands. **The seat-list refactor
  (forEachSeat / otherSeats / seatHue) is scheduled BEFORE the
  Tollkeeper and before Act 4** — every sprint deepens the `'p1'|'p2'`
  literal. Runner-up refactor: collapse bot-policy's three link-fire
  computations onto the engine's computeLinksFired.
- **3–4 player** — deprioritized until the dyad is validated.
- **Art/audio lane (parallel, anytime):** /?style veto loop approved;
  add swatches for new chrome (Vestry, trio, codex, Loom's Eye); card
  art overhaul; composed music (procedural per-context variety is the
  shipped stopgap); error-toast voice pass rides the next
  string-authoring sprint.
- **Parked:** meta-progression beyond the unlock/codex economy, the
  chant (§10.7 — waits on the final question set), Steam beats
  (post-traction).

## 9. Standing conventions (binding)

Documentation-driven; OQ numbers + ruling lines; sprint docs in house
format (numbered parts, hard scope rule, sign-off gates,
designer-decision lists); balance and bugfix commits separate;
enumerate→propose→sign-off for all content; batteries before/after
balance-adjacent changes (pooled shards for fine reads — ±6 pts at 50
runs; per-run outcomes never compare); flag-off parity with
rng-consumption tests; golden regens only when forced, loudly; the
no-Hex-growth covenant (application AND scaling ops); bundle secrecy
for held-reveal strings; supply-before-pool-size;
legibility-before-numbers; DMG to endanger, HP-down to shorten, never
gold; the Witness never lies; the held reveal explains nothing;
Claude proposes, the designer rules.
