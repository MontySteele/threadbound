# Review Sweep — Fresh Eyes Before the Humans (2026-07-02)

Scope: one fully general pass over the whole project on `main` (post
S7/S8/S9a/S10a), by a reviewer who did not write it. Docs read as claims,
code read as evidence. Method: full grounding-doc read; build + full suite
(236 tests green at the end, 231 at the start); four fresh 50-run batteries
(the SHIPPED playtest config `TB_TRACKS=1 TB_RITES=1 TB_BOT_SEEK_EVENTS=1`
for vb/vv/bb, plus a flag-off vb baseline); two complete run-log
read-throughs (a defeat and a victory, seeds 1007/1002); and a 63-agent
multi-lens review with every finding adversarially verified against the
source before it was kept (55 findings survived, 0 refuted; 4 more from a
completeness pass).

Constraint compliance, stated loudly:

- **The difficulty re-centering commit remains unspent.** Nothing here
  tunes a number, a card, an enemy, or a scale.
- **Zero golden fixtures were regenerated.** Every string/ordering fix in
  Bucket A touches only `state.log`, which `hashState` excludes by design
  (hash.ts: "telemetry/log excluded since they are observational") — the
  golden covenant lock ran green after every commit.
- **Flag-off parity held throughout**: the tracks-covenant golden test
  (pure-engine, socket-free, state-hash vs the fixture banked BEFORE this
  sweep) and the rng-consumption fuzz suite passed after every commit —
  that is the parity proof. A battery-level spot check flipped individual
  runs pre/post, which was verified to be the DOCUMENTED sim jitter, not
  drift: on one unchanged build, the same seed run twice sequentially
  (TB_SIM_CONC=1) produced different turn counts — OQ#20's "socket
  arrival-order flips" reproduced in isolation. Battery aggregates are
  comparable at n=50; per-run outcomes never were.
- **No content, canon, or held-reveal surface was authored or explained.**
  The only fiction-adjacent strings touched: the fall-rebind "aggro" line
  (diction only, same rule stated) and the title screen's Witness pronoun
  (ratified canon enforcement).

## Battery readout (this sweep's runs, seeds 1000+)

| Config | vb | vv | bb |
|---|---|---|---|
| TRACKS+RITES+seek (the deploy config), 50 runs | **48%** | 36% | 38% |
| flag-off vb, 50 runs | 18% | — | — |

Other reads from the flagged batteries: link-fire 49.2–54.1% overall
(inside band); act-1 HP loss 24.8–26.0 (above the 16–22 watch band, the
known S9a/S10a carryover); birth picks **0–10% of seats**; character
events taken 0.56–1.18/run; `steady` thread-spend **0 in every battery**;
sever 29–33; removal spend 93.5–95.3% of all bot gold spend with 258–307
residual; Pulsekeeper's Ring discounts 3–10 per 50 runs; Worn Knife mean
7.0–8.9 (S5 cap holding); vv Hex share 80.0% (telemetry-only per the S5
gate amendment), detonation banks 10.7 stacks/burst.

---

## A. Fixed now (21 commits, one concern each, suite green after each)

Severity-ordered. No balance, no content, no canon, no tuning.

1. **`TB_RITES`/`TB_TRACKS` parsed with bare truthiness** — `TB_RITES=0`
   (or `=false`) silently kept the playtest flags ON, in the server AND in
   the sim harness's reclaim nudge — so the natural mid-playtest flip-back
   and any `=0` "flag-off baseline" battery were both foot-guns (the S8 doc
   literally documents the `=0` form for the parity run). Now strict
   `=== '1'`, the TB_DRAIN house pattern. `c9b2ca6`
2. **Combat narration leaked wire ids** — the resolution theater derived
   enemy names by stripping instance ids ("mislaid sexton" id-mush) and
   both renderers passed freeform `detail` strings raw, so every enemy
   phase read "attacks p1 for 9" on the most-watched surface in the game,
   with three fresh S10a instances. Client-side fix: roster-aware names
   (ordinals, face renames) + whole-word seat-id substitution through the
   same `pname()` typed events use. Wire/engine/hashes untouched. `9ecd414`
3. **`aggregate-human.mjs` didn't mirror the sim summary it claims to
   mirror** — no per-encounter HP table (the S10a gate-4 outlier read) and
   no S7.8 rites readouts (death-pick tuning flags, birth pick rate/timing
   — the gate-4 arbitration data), on the eve of human sessions that ship
   `TB_RITES=1`. Both blocks ported, presence-gated; pre-comfort files
   print byte-identical. `f61d6da`
4. **The rites phase had zero protocol-level coverage** — wire-capture
   never ran `TB_RITES=1` and its LIVE_PHASES omitted `'rites'`, so a
   seed/rng-masking regression in the new phase would pass CI on exactly
   the shipped config. Now both flags on, Vestry picks crossing the real
   socket inside the covenant assertions, plus a mid-Vestry
   snapshot/restore test ("deploys must only cost a refresh"). `7e63162`
5. **Untested S10a/S9a claims now have tests** — the status doc said the
   mote echo was parity-tested (it wasn't; only snuffer/cracked were);
   Choir Silence's mechanicLine advertises "a Pulse still forces one"
   with no resolution test; the S9a union read-path had unit tests but
   nothing through START_RUN. All three covered; all pass against current
   behavior. `80b0b08`
6. **The no-Hex-growth covenant test missed Hex *scaling*** — its banned
   op set held application ops only; a future rite mutation authored with
   `damagePerHex` (uncapped Worn-Knife class, the strongest human-data
   offender) would have shipped green through the gate the docs call
   load-bearing. `damagePerHex` added. `d8a4c7c`
7. **Title-screen Witness pronoun** — "He is thrilled" on the
   Descend-alone panel violated the ratified it-never-he canon (S8.7
   purge; witness.ts header). Now "It is thrilled." `7959375`
8. **`CONTENT_VERSION` was still `'s5'`** after four content sprints —
   tomorrow's human telemetry would have pooled under the wrong content
   tag, the exact failure S6.1 built the stamp to prevent. Now `s10a`;
   nothing pins the value. `b67c10e`
9. **Inspect panel omitted every S10a mechanic** — a pad player focusing
   a new enemy got a detail panel that knew less than the frame under it,
   and the keyword glossary never attached to the new hooks. One line in
   `resolveInspect`. `49de44e`
10. **Two pad-unreachable `<select>`s** — the lobby Ascension picker
    (exactly the veteran-hosts-fresh-friends flow tomorrow plans for) and
    the solo bot-speed select were missing `data-gp`. `de5fed9`
11. **`TB_START_GOLD` read unguarded in the pure engine** — a typo'd env
    started every run at NaN gold (SHOP_BUY permanently false → silently
    bricked economy), `""` gave 0, and an envless host would throw. Now
    the registry `envScale` contract. `5205467`
12. **Tithe-Taker's death refund logged a lie at the Thread cap** —
    "+2 Thread" printed unconditionally while `gainThread` clamps
    silently; kill it with a full pool (common early-fight) and the log
    asserted a gain that never arrived — the PT3 "thread math ain't
    matching" complaint class, in fresh S10a code. Now logs the real
    delta, silent at zero (the relic-hook pattern). `24b08e8`
13. **Deaths narrated before their killing blows** — `hitEnemy`/`detonate`
    pushed `enemy_dead` (via `applyEnemyHpLoss`) before pushing the damage
    event, so every kill's theater dissolve played one beat before the hit
    that caused it (visible in any run log as dead-then-damage). `d129384`
14. **Chorus members died silently** — Chorister HP-sync zeroed the other
    bodies with no `enemy_dead` event, so two of three never got a death
    line or dissolve. Also added the `wasAlive` guard on the struck
    member's push. `f4a1cfe`
15. **"the Fallen draw no aggro"** — MMO jargon inside the game's most
    dramatic in-fiction log line. Now "nothing hunts the Fallen"; same
    rule stated. `6f6d900`
16. **`read_chain` had no telegraph tint** — The Unstrung's signature
    dilemma intent was the only intent kind missing from the TELEGRAPH
    map. `205e647`
17. **The wrong-way Witness lines sat outside the never-lies fence** —
    S8.4 shipped after the audit corpus was drawn. They pass clean (both
    are model deflections); now they can't regress. `7da51a8`
18. **serveStatic containment lacked its separator** — `startsWith(dist)`
    admitted `dist*`-named siblings via raw `../` requests. Theoretical
    today; this is the public playtest host. `22371ce`
19. **Dead vocabulary: `echoesDontExhaust`** — a PassiveId granted by
    nothing and interpreted nowhere; any future relic naming it would ship
    as a silent no-op. Deleted. `ecaf935`
20. **Dead presentation code** — a tautological style expression in
    DeckOverlay and a fully-overridden `.mapnode.mypick` rule (a trap for
    the next visual pass). `a528860`
21. **Untokenized identity hues** — witness lavender `#b9a8d4` and enemy
    amber `#e0a060` were repeated literals; now `--witness` /
    `--enemy-warm` in theme.css, zero visual change. `c2c38b6`

## B. Designer decisions (one-line rulable questions, with recommendations)

Severity-ordered. Evidence is file:line or this sweep's battery data.

1. **The two S10a elites cannot appear below Ascension 3.** Map generation
   assigns elite encounters *positionally* from the pool
   (`map.ts:107`-area), so every A0–A2 act has exactly the same two
   pre-S10a elites — the Mislaid Sexton (the enemy built to stress the new
   Reclaim window) and The Unstrung are unreachable for every fresh
   profile, and the battery only ever sampled them under A3/A4 scaling.
   *Q: accept for tomorrow (session-note it), or make elite slots sample
   the pool — an rng-consumption change requiring a golden regen and an
   A0 battery re-run?* **Rec: accept for tomorrow; sample-the-pool as the
   first post-playtest engine change — the S10a variety thesis is
   otherwise untestable by humans.**
2. **The shipped config was never the batteried config.** The S9a/S10a
   battery matrix (and its "re-centering stays unspent" reading) ran
   `TB_RITES` only; render.yaml ships TRACKS+RITES, and under that config
   vb reads **48%** (gate ≤40% FAILS; S8 gate-4 had already banked 44%),
   +30 pts over flag-off. *Q: does the banked no-re-centering ruling
   stand for the deploy config?* **Rec: stand for tomorrow — first-session
   fun outranks calibration (§OQ#25 precedent) and bot rates aren't human
   rates — but treat 48% as the number the next re-centering conversation
   starts from, not 29%.**
3. **Quickening is inert on ~84% of the pool.** Mutation precedence
   (OQ ruling #6: Echoes of upgraded cards mutate from the BASE form,
   `combat.ts:822`-area) means "cards you Reclaim arrive upgraded" does
   nothing visible on any mutation-bearing card — a birth-rite picker
   tomorrow will reasonably file a bug on the sprint's held-reveal
   centerpiece. *Q: retext to its real scope ("rare cards you Reclaim
   arrive upgraded"), swap the effect, or let mutation×upgrade compose?*
   **Rec: rule before the sessions; retext is the only same-day-safe
   option (content string — not taken unilaterally).**
4. **q_came's payoff is unspendable where it lands.** The Covet charge
   granted at the Loom's Eye verdict (`reducer.ts:880`-area, marked
   PROVISIONAL in-source) has zero remaining spend windows — the shrine
   sits after the last reward screen of the run (loom → rest → shop →
   boss). A pair that proves it TRUE gets a triumphant line and a dead
   resource. *Q: re-key to what?* **Rec: `pendingThread` for the finale
   (the comment's own alternative) — thematically "the loom leans toward
   you" already.**
5. **Double-guard has nothing to fear: the roster has zero through-block
   damage.** Every player-facing multiplier — Weak, Vulnerable, Strength,
   and **Fray** — applies pre-block (`combat.ts` hitPlayer: the frayed
   multiplier runs before `Math.min(player.block, amt)`), and the only
   pierce in the game (`detonate`) targets enemies. This single gap
   explains both bb's 5–10-pt edge AND its flat A2/A4 response: +10%
   damage is answered by +10% block, and the A4 Fray rung triggers off
   Thread spends guard pairs never make. The §14.8 retether only breaks
   *asymmetric* parking — against a symmetric pair it moves the target
   between two walls. (Bot amplifier: the one tag-specific scoring bonus
   in bot-policy is +2.5 for Guard at low HP, and Bram's Guard suite is
   strictly stronger than Vess's.) *Q: which lever?* **Rec: one act-2
   pierce-class enemy ("strikes past your guard") as S10b texture, and
   consider post-block Fray as the A4 redesign — it gives the existing
   rung teeth against turtles specifically.**
6. **Birth rites stay starved in the shipped config.** This sweep
   reproduces S8 gate 4 exactly: birth picks 0–10% of seats, character
   events 0.56–1.18/run against the N=2 threshold (10 clue events at 2×
   weight crowd 6 character events out of ~4.6 event visits). Tomorrow's
   debrief question 2 will mostly have no answerable seat — and mirror
   pairs cap at one seat by design. *Q: raise character-event weight above
   clue weight for the playtest build, go L8/E32, or accept slow arrival?*
   **Rec: if tomorrow is meant to read the birth-rite at all, raise the
   character-event weight (one knob, flag-gated pool only); otherwise
   accept knowingly and brief the debrief script.**
7. **Enemy sigils may wear the p1 player hue.** The procedural sigil
   PALETTE contains `#7fd4ff` (`sigils.tsx:40`); 10 of 31 enemies hash to
   it, including two cyan "Votive" enemies side by side in one new
   encounter — against a UI that carefully enforces cyan=yours everywhere
   else. *Q: may enemies wear seat hues?* **Rec: replace that palette
   entry with a neutral (replacement, not removal — removal reshuffles
   every enemy's established mark). Needs one human glance.**
8. **S10a mechanicLines blow out the enemy frame.** Up to 94 chars with
   no max-width on `.enemy` (~3× the frame standard on a solo elite), and
   The Unstrung's line states the dilemma its intent partly restates.
   *Q: trim the three longest lines (content strings), cap the frame
   width (CSS), or both?* **Rec: both; the trim rides the S10a sign-off
   table. Needs a human glance at pad distance.**
9. **Two mechanic-visibility standards now coexist.** All nine S10a
   enemies state their mechanic on the frame; the six pre-S10a carriers
   (Mourner, Cantor, chorus, Unraveled…) stay inspect-only — friends will
   infer "no line = no mechanic" and misread the old roster. *Q: does the
   S10a legibility rule bind retroactively?* **Rec: yes — backfill six
   one-line mechanicLines (content strings, sign-off table).**
10. **The held-reveal register lines ship in the client bundle.** The
    70%-gated sacrament fall-rebind quote and the procession-direction
    hint are datamine-able via the witness pool import
    (`witness.ts:158/:169`) — the same channel class as the two
    bundle-secrecy leaks already treated as bugs (Vigil, Half-Carried),
    for the game's biggest reveal. No runtime surface shows them early.
    *Q: is the held reveal a runtime-only law or a bundle-secrecy law?*
    **Rec: bundle-secrecy — stub the registers server-side post-playtest
    and add them to the wire assertions; not a same-day change.**
11. **OQ#48 (whose codex drives the Witness register) is the ledger's one
    unruled item — and it fires tomorrow.** Max-of-seats means a veteran
    host's codex pulls the quieter 70% registers (and the sacrament
    quote) into a brand-new player's first run. *Q: max, min, or
    per-seat?* **Rec: ratify max-of-seats for now (union-rule-consistent)
    and note it in the session script.**
12. **Pall Warden's displayed binding is stale at commit time.** It
    rebinds to the last chain owner *before* attacking
    (`combat.ts:1062`-area) with no client forecast — "the game lied about
    the target," the exact complaint class the §14.8 retether forecast
    was built to kill, on a warm encounter (a1_warden_leech 39.6–46.2
    hp/combat). *Q: add a client-side last-owner forecast (recomputes on
    every reorder), or session-note it?* **Rec: forecast post-playtest;
    tomorrow, session-note.**
13. **The Warden of the Crossing's sever intent and the §14.8
    auto-retether cancel each other.** Same enemy phase, two contradictory
    log lines, net zero (seen live in the seed-1007 log). *Q: exempt
    enemies whose own mechanic moves tethers from the auto-retether
    cadence?* **Rec: exempt — the cadence exists to un-park fights those
    enemies already un-park.**
14. **Bot link-planning is blind to Choir Silence.** Bot-policy's three
    hand-rolled link-fire computations don't apply the suppression, so
    bots stage into the held link and can never Pulse it — the
    a2_silence_wretch gate-4 heat (62.3 hp/combat) was measured by bots
    fighting it wrong. *Q: port the suppression into bot scoring (sim
    behavior shift → re-baseline)?* **Rec: yes, post-playtest, then
    re-read the outlier flag before treating that enemy as hot.**
15. **Solo runs share one constant bot-policy seed.** The driver seeds
    from the redacted view's masked (0) seed field (`solo.ts:47`) — the
    Witness's seeded choices repeat across solo runs at identical
    contexts. *Q: reseed from room state (behavior-shifting for solo
    bots)?* **Rec: yes, after tomorrow.**
16. **Wedding Knife "exclusion" is self-cancelling dead logic.** The
    last-resort filter concatenates the knife back, so it drops like any
    relic (`reducer.ts:789`-area) — either the OQ#3 story-beat intent or
    the code is wrong. *Q: ratify drops-normally (observed, baselined
    behavior) or fix the filter?* **Rec: ratify and simplify later —
    note the simplification is distribution-identical but not
    rng-stream-identical, so it wants its own golden regen window.**
17. **Hearth-Keeper's text teaches a rule that doesn't exist** ("Momentum
    no longer decays at end of turn" — there is no end-of-turn decay; the
    halving-on-spend floor is the shipped S7 interpretation). *Q: ratify
    the interpretation + retext ("when spending Momentum halves it, keep
    up to 3")?* **Rec: yes; rides the pending gate-1 sign-off with items
    3/8/9.**
18. **Codex elimination copy says "✕ Never this:" but truths vary run to
    run** (`Codex.tsx:46`) — a later descent can prove a "never" true and
    the record contradicts itself. *Q: per-descent phrasing, or rule that
    "Never" is the Machine's claim rather than the record's?* **Rec:
    per-descent phrasing ("Not that descent"); it's new S9a copy, cheapest
    to rule now.**
19. **Codex undiscovered slots sit at ~1.9:1 contrast** — likely invisible
    at TV distance, and the empty-vessel read IS tomorrow's vibe check.
    *Q: how visible should the gestation be?* **Rec: solid
    `--text-faint`/`--text-dim` for the slot glyphs; needs the actual TV.**
20. **Birth-rite identity is hover-only after the pick** (`Rites.tsx:98`
    title attributes) — a pad player can never re-read what their passive
    does. The held-reveal ruling covers the unpicked trio, not the rite
    you wear. *Q: add a `rite:` inspect kind (name/flavor/text, all shown
    once at pick time)?* **Rec: yes — recall isn't reveal.**
21. **Pulsekeeper's Ring reads dead at bot rates** (3–10 discounts per
    50-run battery; the OQ#27 telemetry watch). *Q: trigger the pre-agreed
    escalation (every third Pulse FREE)?* **Rec: wait one day — read
    tomorrow's human `ringDiscountsFired` first; the escalation is already
    agreed if it stays dead.**
22. **Gate 3's "<25% of acquisitions" denominator still isn't emitted**
    (S9a decision list #6 confirmed). *Q: add card-acquisition counts to
    telemetry?* **Rec: yes — one counter, makes the Reclaim band
    enforceable numerically.**
23. **There is no per-card play/win attribution anywhere** — the sim and
    human files aggregate by tag only (Worn Knife is special-cased), so
    "dead cards / never-bought relics" is unanswerable from data. *Q: add
    per-card play counts (and relic acquisition source) to Telemetry?*
    **Rec: yes before the next balance pass; without it the content-audit
    lens stays blind. Note bots also leave shops nearly untouched (93–97%
    of spend is removals; 258–307 gold residual), so relic/card shop
    content is telemetry-dark from batteries regardless.**
24. **Steady has literally never been spent by a bot** (0 across every
    battery, every config, all sprints on record). Nothing in the game
    reads or rewards it beyond its base effect. *Q: bot-policy Steady
    heuristic (sim-only), content support, or accept it as a
    rarely-correct emergency verb?* **Rec: sim-only heuristic first so
    the stat isn't structurally zero; judge the verb on human data.**
25. **Sever is the only Thread verb with no content support** (29–33 uses
    per battery, all bot-forced; no relic, hook, or card sweetens it —
    while chorus fights *require* it). *Q: one co-op relic ("Sever costs
    1 less") or a `sever` HookEvent, or read tomorrow's
    `threadSpendByKind.sever` as a pricing probe first?* **Rec: the
    probe first, the relic in the next content pass.**

### Lens 5 — the ten best unexploited combinations (one line each, ranked by fun-per-effort)

1. **`rite_reclaim` Witness pool** — the vestment passing through the
   partner is the whole §5b thesis and no one says anything: one
   `sayWitness` context fired when a `riteOnly` card is Reclaimed, ~6
   authored lines, machinery all exists (`combat.ts` reclaim block +
   `{rite}` substitution).
2. **Re-key q_came's dead Covet payoff to `pendingThread`** — one
   switch-case, turns a dead reward into a finale the pair feels (B4).
3. **A relic on the `reclaim` HookEvent** — a Reclaim-centric game with
   zero reclaim relics; "either of you Reclaims: both gain 2 Block" is a
   co-op card that already parses.
4. **Overflow catcher relic on `regenWastedAtCap`** — the stat is already
   computed and mean 3.4–5.2/combat; "Thread regen lost to the cap
   becomes Kindled 1, once per turn" is a free build-around.
5. **`resonatedLastTurn` as a card/relic clause** — maintained every turn
   for one enemy; "if you Resonated last turn: +X" is a sustain-the-
   harmony archetype seed with zero new bookkeeping.
6. **Generalize the death-crossing funnel** — `threadOnDeath` and
   `splitsOnDeath` are one-enemy fields on a fully general hook:
   `goldOnDeath`, `hexOnDeath` (stacks migrate to an ally), `cardOnDeath`
   (a gift/curse into the bound player's discard — pairs with the
   Sexton's discard feed) are each one def field + a few lines.
7. **A gold-reading event beyond the shop** — the one gold-spend event
   heals a broke pair for free (`m2-world.ts:293` clamp); gold does
   nothing outside shops while bot residuals run 250+; one act-2 event
   that reads the purse ("toll: 50g or...") makes the S4.1 provenance
   telemetry mean something.
8. **`oncePerCombat` relic tier** — the S7.1 limiter is plumbed and
   tested and carries exactly one passive; "first X each combat" relics
   can be budgeted stronger than the turnStart band allows.
9. **Covet-hook content** — `covet` HookEvent single-used; q_came grants
   charges (B4) and nothing else reads the covet economy: "when your
   partner Covets your card: draw 1" is table-talk in relic form.
10. **A `sever` HookEvent + one supporting relic** — the most expensive
    verb, mechanically mandatory against the chorus, zero payoff texture
    (B25).

## C. Observations (no action proposed)

- **State of the codebase.** This architecture is in genuinely good shape
  for the roadmap's next year. The reducer purity discipline is real (one
  env leak found and fixed was the exception that proves it), the
  content-module + flag-gating pattern has now survived four stacked
  sprints with rng-stream parity intact, and the test culture (fuzz
  replay, golden locks, the wire covenant) catches exactly the class of
  regression a content-heavy year will generate. Archetype growth and a
  third character are cheap: content modules are additive, rites/events
  are role-keyed, and the union/unlock machinery ships empty and ready.
  Act 4 rides the faces/boss machinery that already exists. The one thing
  the codebase actively resists is 3–4 players: `PlayerId = 'p1' | 'p2'`
  is a literal union wired through `otherPlayer()`, binding logic, the
  chorus rotation, Resonance's `owners.size === 2`, the client's PCOLOR
  maps, and now three S10a mechanics. **The single refactor that pays
  most if done early: abstract the two-seat assumption behind a seat-list
  helper layer (forEachSeat / otherSeats / seatHue) and migrate
  opportunistically** — every sprint that ships before it digs `'p1'|'p2'`
  in deeper; Act 4 and character 3 will multiply the sites.
- Runner-up refactor: bot-policy's three duplicated link-fire
  computations should collapse onto the engine's `computeLinksFired` —
  the Choir Silence blindness (B14) is the drift bug that duplication
  already caused, and every future chain-reading mechanic re-triggers it.
- A stunned Mislaid Sexton still eats the discard and a stunned Pall
  Warden still rebinds — passive cadences ignore stun. Consistent with
  the §14.8 "deterministic cadence" contract, but "skips its turn" reads
  contradicted; friends may report it as a bug.
- Killing Choir Silence mid-chain still holds a link that same turn
  (suppression is computed once per resolution). Legible in the planning
  UI, and preview==reality holds; noted as the one visible divergence
  between a mechanicLine's fiction and the static-computation
  architecture.
- Loom of Two Hands granted "+1 Thread" during the Unraveled's severed
  turns in the victory log — passive gains flow while "the Thread is
  severed." Rules-consistent (only actions and cross-links are barred)
  but a fiction wobble worth a line in the Unraveled's spec someday.
- `riteUnlockUnion` treats a claim-less seat as contributing nothing; a
  pre-S9a client paired with a claiming seat yields the claimer's subset
  (union spirit says absent = everything). Zero impact while everything
  ships unlocked; becomes live the day unlock pacing prunes profiles.
- Same future-trap class: profile normalize intersects stored rite
  unlocks with today's rite set and nothing ever accrues — the first
  sprint that ADDS a rite ships it locked for every veteran and unlocked
  for fresh installs, until accrual or a version-stamped re-seed exists.
- Chorus HP-sync deliberately fires death hooks only for the struck
  member (no chorus def carries hooks today). If a future chorus gets
  `threadOnDeath`-class hooks, rule the semantics then; the sweep's fix
  covered the log/theater half only.
- The a2 boss is the run-killer for every pair (50.4–74.1 pair-HP/combat
  across configs, worst for bb), and act-1 HP loss sits 2.6–4 points
  above its watch band in all three flagged batteries — consistent with
  the S9a status's "two bands now conflict" note. Banked, not tuned.
- The parked jitter cleanup (S9a checklist #4) now has a minimal repro:
  one unchanged build, TB_SIM_CONC=1, same seed, two invocations → run 3
  diverged at turn 60 vs 62. Per-run sim outcomes are not reproducible
  even sequentially; only the engine walk is. Worth knowing before anyone
  compares two batteries run-by-run again.
- The `/?style` reference screen hasn't gained a swatch since the S7/S9a
  chrome shipped — the "designer's cheapest veto point" no longer covers
  the newest treatments (Vestry, trio, codex, Loom's Eye all read clean
  in code, but the reference can't veto what it doesn't show).
- Server error toasts mix registers ("the loom is being restrung" next to
  "no such room"); the join-flow strings are the ones friends will
  actually hit. Voice-consistency call for whenever strings are next
  authored.
- The engine `info`/`enemy_action` detail strings still *carry* seat ids
  on the wire (the client now renders them as names). If a future surface
  prints details raw it will leak again; a typed-field convention for
  subjects would close the class.

---

## The three findings I'd fix first if I owned the game

1. **B1 — the invisible half of S10a.** Sample elite encounters from the
   pool. Two of the nine new enemies — including the one designed to
   stress the sprint's Reclaim widening — cannot appear in any game a
   normal player will play, and the battery only ever met them under A4
   scaling. Everything the tonight-doc says about variety compounding is
   currently false for elites below A3.
2. **B5 — give the roster one way through Block.** A single pierce-class
   intent (plus, if bolder, post-block Fray on the A4 rung) simultaneously
   fixes the bb win-rate asymmetry, makes two ascension rungs bite the
   pair they currently ignore, and gives every future guard-heavy
   archetype a real check. One structural gap explains three symptoms;
   that's the cheapest balance leverage in the codebase.
3. **B3+B6 — make the birth rite arrivable, and alive when it arrives.**
   The mirror sacrament is the game's thesis made mechanical, and in the
   shipped config it reaches 0–10% of seats — and when it does arrive,
   its marquee pick (Quickening) visibly does nothing on most cards. One
   pool-weight knob and one retext turn the held reveal from a no-show
   into the moment it was designed to be.

## Fun factor, as actually experienced from the data and two full run logs

The core loop is working, and you can see it in both the numbers and the
prose. Link-fire sits at 49–54% — inside the band the design doc calls
the fantasy's pulse — resonance ignites steadily without any tag
dominating, thread spend per combat roughly doubles when the flagged
systems are on, and 7% of all link fires are Pulse-bought, which is the
§14.12 rework doing exactly what it was built to do. The seed-1007 defeat
was genuine drama: the Cantor reads slack in the chain, the bots kept
feeding it unlinked cards (+20 Block in one turn), Vess fell, Bram fought
a three-turn solo last stand behind walls of Brace-Up, and the Witness
buried them with "Half a partnership. Do show me what the Covenant was
for." The seed-1002 victory paid off the other end: a 14-stack Rendcall
detonation for 56 into the Unraveled, the Thread severed for two turns
with own-links still firing — the Covenant's floor proven in play, not in
a doc — and the shrine's quiet "the loom mends what it recognizes — both
heal 6" landing as earned. The Witness is the game's connective tissue
and its line pools are deep enough that two full logs shared almost no
repeats. What drags: Bram's floor turns read as Brace-Up × 4 (the
same-iness lives in the Guard suite, not the pool size), the a2 boss is
a wall for everyone, and the meta-loop content — birth rites, the codex
filling, q_came's payoff — is nearly invisible at current routing rates,
so the run-scale game is carrying all of the fun that the meta-scale game
was built to share. The bones are excellent; the systems that make this
game *this game* need routing oxygen and one honest payoff each.
