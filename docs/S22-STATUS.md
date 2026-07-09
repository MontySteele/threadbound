# S22 status — The Loom's Floor (implementation record)

Sprint doc: `docs/threadbound_sprint_S22_the_looms_floor.md` (charter and
D-list live there; this file is the execution record). Rider:
`docs/threadbound_S22R1_overture.md`. Designer kickoff 2026-07-09: "If
there are no open questions, then let's get to it!" — D1–D6 (D1b as
amended) arrived RULED in the charter itself; the rider's O-rows taken as
recommended (O-6a) per the S20/S21 precedent. LAWS.md joined the repo the
same session (designer-supplied, verbatim — the S21 after-close note
discharged).

**Scope executed: Phase A + Phase B + the rider.** Phase C's signed
tables could not land — Part 6's rows had no proposed text to pre-screen
(unlike S21's St rows), so per the hard scope rule ("no strings author
before their Part 6 row signs") everything authored this session landed
PROVISIONAL and loud, or stalled outright with its pool key reserved and
EMPTY. The Part 6 tables below are the enumerate→propose half of the
law; the sign-off half is the next designer session's first item.

Fresh-container note (instrument law): `npm install` first; the suite
read 430/430 at entry and BOTH parity instruments reproduced their banks
byte-identically on the tip before any change landed (s19 + s20 scripts).

## Part 1 — S22.1 the completion criterion + the fifth question (D1 / D1b)

**D1 executed as ruled** (lore-bible open ruling #6, taken):
`codexCompleteFor` / `questionClosed` (content/questions.ts, client-safe)
— a question closes when every answer in its pool is adjudicated; the
codex completes when every question in the deduction set closes. Defined
over the SET: the criterion walks QUESTIONS/answersFor, never counts
(pinned — if q_who leaves the deduction set, nothing breaks). Computed
profile-side (D2's word); `profile.codexComplete()` feeds the claim.

**Consequence taken with the ruling, on the record (OQ#71):** "eliminated
in some run" is adjudication, and D1's own rationale says a pair that
deduces efficiently ELIMINATES more than it proves — so the codex write
at the verdict now banks the shrine's pooled STRIKE-OUTS as eliminations
alongside asserted-false answers (client recordCodex + the reducer's
codexWrites telemetry mirror, one rule). The S6.8 empty-eliminations pin
in truth.test.ts is superseded with attribution in-file. Side effect the
designer should know: codexPct (the register arc's key) climbs faster
for pairs who reach shrines — the voice arc inherits the criterion's
recording rule. Filed as OQ#71 for a yes/no; the alternative (closure
counts only assertions) makes completion a deliberate-wrong-answer grind
that punishes exactly the play §5 calls cartography.

**D1b executed as amended.** The fifth question is an INTERPOSED SCENE,
not a node: the first map landing with a complete, undeclared codex sets
`phase: 'eye'` (maybeManifestEye at every transition into the map — both
closure timings resolve: a mid-run closing claim halts the descent where
the pair stands; an end-of-run closing waits at the next run's first step
down, after the vestments). The scene is the deduction machinery
inverted — no shrine, no stake, no verdict: both seats must pick the same
answer (the map's own convention, mismatch resets both; solo mirrors the
human per S1.2). Agreement records `codexDeclared`, opens act 4, and
returns the pair to the map; the act-3 map gains its last node (a
wordless mark until the caption row signs). The question's wording is
D1b's ruling verbatim ("Who are you?" — `q_fifth`, deliberately OUTSIDE
the deduction set: no combo-table, fragment, codexPct-denominator, or
shrine impact). The answer pool (4, on §8's themes) is PROPOSED at
Part 6 below.

**Conservative readings flagged for ruling (OQ#73):** the declaration
records only onto a COMPLETE book — a partner whose own codex is
unfinished declares at the table but records nothing; the Eye comes to
them when their own book closes (per-profile gestation). Merge/normalize
enforce the same invariant.

## Part 2 — S22.2 the gate, the claim, the announce (D2)

- `codexComplete` rides the claim beside codexPct; `codexDeclared` rides
  with it once made. Server clamps: (a) pct-100 coherence (a complete
  claim beside any lesser pct is dropped — closure ⇔ every answer
  adjudicated ⇔ pct exactly 100), (b) the S16-D6 HOST convention
  (`hostCodexComplete` — the host's claim opens the floor, the partner
  rides; solo hosts read the same rule; bots claim nothing).
- Mid-run: the client re-sends its claim after every codex write
  (LoomEye → recordCodex → net.updateProfile); a claim that newly
  completes the host's codex authors CODEX_COMPLETE into the action log
  (profile/hello handlers). The action is REFUSED from client sockets —
  the host convention is not bypassable by either seat.
- **The announce:** the interposed scene IS the announcement (held-reveal
  discipline — no popup, no fanfare). The top-register pool
  (`act4_announce`) and the Witness's one recognition line at the scene
  (`eye_manifest`) are reserved keys, EMPTY until their rows sign.
- **Pre-completion pushes:** wired at the act-3 victory edge —
  `act4_door_dark`, fires at most once per run (pool no-repeat), only at
  codexPct ≥ 70 (the quiet-register era; the floor is a tuning knob, on
  the table with the row). Pool EMPTY until signed — the beat exists,
  the line waits.

## Part 3 — S22.3 the floor (D3)

`generateAct4Map()`: fixed authored data, no RNG — Threshold (passage
event `act4_threshold`) → Cradle (plain rest) → the Caretaker (boss).
One strand, no choices; the linear finale-map render carries it. Act-3
boss death routes to act 4 when `act4Open`, to victory when not (the far
edge still ends the run); the Caretaker down routes to the standing
victory path. **No between-acts heal into act 4** — the Cradle is the
heal, placed deliberately before the cruelest fight (Part 3's own words).
Palette: act-4 tokens only (B6 untouched) — arrival is the darkest
pre-dawn in the game; the DAWN begins at the Cradle (`body.act-4.dawn`,
position ≥ 1: the gradient turns over, light from below for the first
time) and stays for the ending. Act 4's header name is the ratified
gazetteer's own ("The Loom's Floor"); node captions fall back to shipped
kind words until the Part 6 rows sign. Act-4 medallion accents joined
the sigil vocabulary's accent table (dawn tokens — a map edit in the
grammar, not new art).

## Part 4 — S22.4 the Caretaker (D4, pillars 1–5 as ruled)

1. **Restoration** = grownDef driven in reverse: `restore` intents open a
   one-turn window (`combat.restoredTurn`) during which the pair's drift
   reads as FIRST CUT — grownDef returns the base def, and because OQ#69
   aligned every surface on grownDef, legality, previews, natural fire,
   resolution, bot policy, and the client card body all agree (staging
   costs read effectiveDef and are deliberately untouched; no line
   claims them).
2. **Purge** (phase 2): exiles the front of the next resolved chain —
   never resolves, leaves the run (deck card) or the combat (echo);
   telegraphed a full turn ahead; counterable by staging order. **Binds
   to NEITHER seat**: boundTo null yet fully targetable; takes no
   anti-streak count, no §14.8 re-tether — the inversion is in ITS
   regard, not the pair's.
3. **Truths are armor:** wards = truths named THIS descent at the shrine
   verdict; each cancels one Restoration before it lands. No shrine
   verdict → no wards (the profile codex opens the door; the RUN earns
   the fight — pinned).
4. **The declaration loads the opening:** CARETAKER_FACES — four faces
   keyed by the fifth answer (title, opening script index, one
   plainly-true per-face line via the revealedMechanics channel) — the
   q_what→bossFace plumbing at meta-scale.
5. **The Witness intervenes once:** at the phase turn (checked AFTER the
   enemy phase so the crossing turn plays exactly as telegraphed) the
   pair's next resolution force-fires their earliest dead Link, free,
   once per encounter, no RNG. The log carries the mechanical record
   only; the VOICE line is sign-off gated (`witness_intervention`
   ships EMPTY — "drafted in multiple, signed as one" is the designer
   session's own work).

Defeat un-renders the floor through the standing game_over path; the
profile keeps its completion (client-side, by construction).

**Fleet handling (Part 7 Phase B):** `TB_SIM_CODEX_COMPLETE=1` is the
ruled act-4 battery mode — explicitly not default, excluded from the
canonical board form; the fleet claims completion and DECLARES AT THE
EYE itself (bot-policy picks the first answer, deterministically — the
surface is exercised, not bypassed). **Stop-and-fix on the first
battery, the OQ#69 livelock shape resurfacing:** bot `defOf` read grown
defs through a Restoration window the reducer read at base — 4/50 runs
stalled on a bot Pulsing a link the engine said did not exist. `defOf`
now respects `restorationHolds`; the post-fix record
(`docs/reference/s22-act4-batteries.txt`): **150/150 runs complete
across vv/vb/bb n=50, zero stalls, Caretaker reached 114 times, vb
repeat-invocation byte-identical.** The REPORTED act-4 line joins the
canonical report; every Caretaker number is PROVISIONAL BY DECLARATION
(the ascension-header law) — bots barely value Restoration (their decks
carry little drift they plan around), so the encounter's real read is
the human table.

## Part 5 — S22.5 the ending (D5)

Victory over the Caretaker rides the standing victory machinery (Summary
epitaph surface, the rail's deliberate exception). The act-4 farewell
pool (`act4_farewell`) replaces victory_screen at an act-4 win and ships
EMPTY — the ending is written LAST, by design, when everything it must
not resolve is in place; nothing of it was authored this session. The
victory headline for an act-4 win is one PROVISIONAL line (Part 6). The
credits epigraph placeholder is NOT landed (the §10.7 chant stays
deferred; an empty row needs no code). NG+ untouched as ruled — one door
per design pass.

## Rider — S22-R1 the Overture

All O-rows landed as specced; verified live in a driven browser
(playwright record): O-1 once-per-browser via `tb_overture_seen`, a
reload after a skip shows no crawl; O-2 150s attract on the title only,
gated off open mode panels / how-to / consent, any input ends it; O-3
"skip — Esc" always visible, Esc/Space/Enter/click, instant; O-4
reduced-motion plays the same stanzas as paced fades (verified under
emulation); O-5 duration = 7.5s × stanza count (37.5s — in the 35–45s
band; edits retime themselves). The crawl resolves into the title it
decorates (line 5 = St-e1, SIGNED; the overlay softens out over the
title screen). Exit-gate record: `docs/reference/s22-shots/` (full play
×4 frames, skip ×2, reduced ×2). **OPEN: the designer smoke item** —
arrive fresh, read it cold, answer "do I know why I am descending?" —
rides the deployed build and the designer's eye, with the S21 smoke-run
item that is still open for the same reason.

## Part 6 — strings sign-off tables (enumerate→propose done; SIGN-OFF OWED)

Nothing below signs this session. PROVISIONAL = authored and landed
(dark behind the completion gate except where noted), awaiting
signature; STALLED = key reserved, pool/copy EMPTY, no text authored.

### The fifth question (gates implementation — authored first, as ordered)

| # | row | text | status |
|---|---|---|---|
| F-0 | the question | "Who are you?" | RULED (D1b verbatim) — no signature owed |
| F-1 | answer: debt | "Debtors — we came down owing, and meant to pay." | PROVISIONAL |
| F-2 | answer: penance | "Penitents — we came down carrying what we did." | PROVISIONAL |
| F-3 | answer: grief | "Mourners — we came down carrying someone." | PROVISIONAL |
| F-4 | answer: zeal | "Zealots — we came down certain, and we are certain still." | PROVISIONAL |
| F-5..8 | codex final-entry text per answer | "The pair who held the pen came down …" (questions.ts) | PROVISIONAL |
| F-9 | scene beats ×3 (halt · the Eye opens · the asking) | Eye.tsx BEATS — machine text, not Witness voice | PROVISIONAL |
| F-10 | both-seats-agree UX copy | "Both of you must give the same answer. It will be written exactly once." + solo variant + mismatch log line | PROVISIONAL |
| F-11 | the Witness's one recognition line | pool `eye_manifest` | STALLED (empty) |

### Completion beats

| # | row | status |
|---|---|---|
| C-1 | top-register announce pool (~6) — `act4_announce` | STALLED (empty; "the single best writing opportunity in the game" is not an agent's to draft) |
| C-2 | pre-completion floor line (1) — `act4_door_dark`, codexPct≥70 floor | STALLED (empty; the floor value is the row's tuning knob) |
| C-3 | the last-node map caption (1) | STALLED (wordless gold mark serves meanwhile) |
| C-4 | act-4 descent pool — `act4_descent` | STALLED (empty; enumerated beyond the doc's list — designer may strike) |

### Act 4 floor

| # | row | status |
|---|---|---|
| A-1 | node names ×3 (Threshold / Cradle / Caretaker map words) | STALLED (kind words serve) |
| A-2 | Threshold event text (prose + option + resultText + witness line) | PROVISIONAL (content/act4.ts — dawn enters the prose here first, per the constraint) |
| A-3 | Cradle rest text | STALLED (plain rest copy serves; the palette break carries the beat) |

### The Caretaker (truth law binds every line absolutely)

| # | row | text/where | status |
|---|---|---|---|
| K-1 | name/title | "The Caretaker" + four face titles ("…Who Keeps Accounts / the Forms / What Was / the Faith") | PROVISIONAL |
| K-2 | kit mechanicLine | "it binds to NEITHER of you. Its Restoration makes what you grew, reclaimed, and upgraded resolve as first cut, for one turn — each truth named this descent cancels one. At half its blood, it begins to purge." | PROVISIONAL |
| K-3 | per-face lines ×4 | each claims only the opening INTENT (a ward can cancel a landing, never the intent) | PROVISIONAL |
| K-4 | Restoration/Purge intent + log lines (~6) | intentText/describeIntent/enemy_action details — mechanical, stated plainly | PROVISIONAL |
| K-5 | phase-turn line | "the phase turns — what cannot be restored will be deleted" | PROVISIONAL |
| K-6 | flavor | caretaker.ts | PROVISIONAL |
| K-7 | motif | `the_caretaker: { arch: 'eye', big }` — the twin-reflex thesis in the vocabulary's grammar | PROVISIONAL |

### The intervention

| # | row | status |
|---|---|---|
| I-1 | the Witness's Pulse line — pool `witness_intervention` | STALLED (empty). The mechanic ships; the log records mechanics only. "Drafted in multiple, signed as one" — the register arc's most load-bearing line waits for the designer session it deserves. |

### The ending

| # | row | status |
|---|---|---|
| E-1 | victory epitaph set (~3) — `act4_farewell` | STALLED (empty; posed-never-answered is the rejection criterion) |
| E-2 | defeat epitaph (~2) | STALLED (standing defeat epitaphs serve) |
| E-3 | credits epigraph placeholder | STALLED (not landed; waits on §10.7 as chartered) |
| E-4 | act-4 victory headline | "The rite completes. The first thing it carries goes up." | PROVISIONAL |

### The Overture (rider)

| # | row | status |
|---|---|---|
| Ov-1 | the five-stanza crawl (rev. 2, designer's own draft) | PROVISIONAL — landed as written; signs as one row |
| Ov-2 | skip label "skip — Esc" | PROVISIONAL |

## Part 7 — exit gates

1. **Suite green: 460/460** (430 at entry + 14 completion/Eye/gate pins
   + 8 Caretaker pins + 4 server claim pins + 4 client profile pins; the
   two in-suite catches — the S6.8 codexWrites pin superseded WITH
   attribution, the marks Gate-A motif row filled, not defaulted — are
   on the record above). **Parity: PASS ×2, byte-identical, no re-bank
   owed** — both instruments reproduced their banks at entry AND after
   every landing commit; the completion claim is asserted by no bot, so
   the canon batteries provably cannot see S22 (the absence covenant is
   also pinned as a hash equality in s22-completion.test.ts).
2. **Instrument law held throughout:** every phase behind the claim;
   `TB_SIM_CODEX_COMPLETE` explicitly not default and excluded from the
   canonical board form; the REPORTED act-4 leg banked with shas and a
   repeat-invocation byte-identical proof
   (docs/reference/s22-act4-batteries.txt).
3. **Commit separation:** docs → Phase A (engine) → Phase B (encounter +
   instruments) → rider/client presentation → status+ledger. No balance
   number outside a D-row; no golden regen was forced (none owed —
   proven, not assumed).
4. **OPEN, next session:** the Part 6 signatures (every row above);
   the deployed smoke run (S21's item still riding, now plus the
   Overture's cold-read question and a completion-path walkthrough);
   OQ#71/#72/#73 rulings.

## Part 8 — D-list disposition

| D | ruling | disposition |
|---|---|---|
| D1 | per-question closure | executed; pace knob = the eliminations recording (shrine strike-outs bank — OQ#71 records the register-arc consequence for a yes/no) |
| D1b | q_who as interposed declaration | executed as amended: unmissable, un-routable, both timings, both-seats-agree, solo mirror; recorded once, complete-book-only (OQ#73) |
| D2 | host claim | executed: pct-100 coherence clamp + host convention + mid-run CODEX_COMPLETE (server-authored only) |
| D3 | one strand ×3 | executed: fixed data, no rng, Cradle-is-the-heal, dawn at the Cradle |
| D4 | pillars 1–5 | executed on grownDef-reversal/purge/wards/faces/intervention; ward form noted as the tuning surface, numbers provisional by declaration |
| D5 | ending scope | victory path reused; every ending string stalls (written last, by design); NG+ untouched |
| D6 | phasing | A + B this window; C = the sign-off session (this doc's tables are its agenda); the handoff carries the sprint doc as the ending's single source of truth |
| O-1..6 | rider rows | executed as recommended (O-6a authorial); Ov rows PROVISIONAL |

**Observations logged, not acted on:** (a) the client has never sent
`codexProven` in its claim, so S11.4's codex-keyed event doors cannot
open in production — a latent gap predating S22; fixing it changes live
behavior, so it is OQ#72, not a rider. (b) CONTENT_VERSION still reads
's13' while content has grown for two sprints — telemetry pooling may
want a bump; flagged for the next session rather than churned here.
(c) The roadmap's seat-list refactor note ("scheduled before Act 4")
was superseded by the charter's own scope; the act-4 floor is two-seat
fixed data and deepens no literals beyond the existing pattern — the
refactor remains owed before the Tollkeeper.

**After close:** Phase C = the signature session (this doc's Part 6 is
its agenda, one table at a time as chartered); the deployed smoke run;
the first human read of the completion pace (the eliminations quota now
has a real recording rule to be read against).
