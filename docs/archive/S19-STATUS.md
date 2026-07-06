# S19 status — Descend Alone (implementation record)

Sprint doc: `docs/archive/threadbound_sprint_S19_descend_alone.md` (charter and
D-list live there; this file is the execution record). Designer kickoff
2026-07-06: "if there are no open questions, let's get to it" — the
D-list recommendations taken as ratified as proposed (R-a, +1.2, T-a,
D4 land-if-time, D5 counts, D6 as tabled), per the S18 precedent.
Part 7 strings proposed below, PROVISIONAL until the designer signs.

Fresh container note (instrument law): the canonical battery reproduced
the S18 exit board EXACTLY on the tip in this container before any
change landed — see Part 1.

## Part 1 — S19.1 the parity instrument (D0), commits `d74d837` + `5c7a8ab`

1. **Pre-S19 parity BANKED in-branch**: S18-P2000 re-run on the tip
   (`0a8878a`) — vv 881 / vb 972 / bb 975 of 2000, the S18-STATUS
   Part 8 exit board to the run. Hashes + commands in
   `docs/reference/s19-p2000-bank.txt`; full leg outputs held in the
   session scratchpad for the exit byte-diff.
2. **Cheap per-commit form**: `scripts/s19-parity-check.sh` — n=100 vb
   braid + TBITEMS, full-stdout byte-diff vs the banked
   `docs/reference/s19-parity-vb100.txt`. Same-seed repeat and
   4-shard-vs-1-shard invariance verified before banking. Run after
   EVERY S19 commit below — all PASS byte-identical.
3. **--solo battery mode**: one headless policy-driven human seat per
   run creates a solo room over the real WS transport; the server's
   in-process SoloBotDriver (the production surface) holds p2. Reports
   win%, thread verbs/run per seat, per-pool Witness line counts, and
   the turn each pool exhausts. Every row REPORTED, never banded
   (S14-R5 / the S16 jitter lesson).
   - Instrument fix on the record (`5c7a8ab`): `state.log` is per-turn
     (resolveTurn clears it), so the first verb counter read only the
     final turn. Corrected to incremental counting. First corrected
     read: the solo partner already Pulses ~5–10/run — the pre-S19 gap
     was Reclaim-shaped, not verb-shaped.

**Pre-sprint solo anchor** (n=100/pairing, seeds 30001–30100, braid,
A0, run from a worktree pinned to the pre-behavior commit `5c7a8ab`):

| leg | win% | bot pulse/run | bot reclaim/run | bot sever/run |
|---|---|---|---|---|
| vb | 11% | 9.92 | **0.00** | 0.16 |
| vv | 30% | 5.46 | **0.00** | 0.14 |
| bb | 9% | 8.13 | **0.00** | 0.22 |

**Line-budget report (the D5 sizing evidence), vb leg, pre-sprint:**

| pool | size | lines/run | exhausted in | median exhaust |
|---|---|---|---|---|
| resonance_together | 6 | 6.00 | **100/100 runs** | **act 1, turn 11.5** |
| own_play | 6 | 5.64 | 81/100 | act 2, turn 26 |
| human_linked_off_me | 6 | 4.81 | 56/100 | act 2, turn 34 |
| covet_solo | 7 | 6.15 | 53/100 | act 2, turn 30 |
| fallen_human / fallen_self | 6 | ~1 | 0 | — |
| others | 6–7 | <1 | 0 | — |

The sprint's thesis measured: the Witness goes silent on resonance in
the FIRST ACT of every single run. The D5 targets (12/12/12) are sized
against exactly this. **Finding for the designer, outside the ruled
table:** `covet_solo` (not in the D5 table) also exhausts in half of
runs by act 2 — logged here, no change without its own row.

## Part 2 — S19.2 solo Reclaim (D1, row R-a as recommended), commit `07e886d`

Landed as ruled: articulable pulls only (tag fires a held link — exact
tag; 'any'/'partner' excluded — or feeds the hex/detonate axis into a
pile ≥ 3), at most once per combat, courtesy floor of 5 strict (no
lethal-adjacent exception; measured net of already-declared spends),
considered from the top of the turn, announced always via
`i_reclaimed_yours` (empty pool no-ops until Part 7 signs).

Two implementation notes on the record: (i) the axis read uses the
double-quoted op form JSON.stringify actually emits (tryPulse's form);
axisBonus's single-quote read is sim-frozen and untouched. (ii) First
draft evaluated the pull at end-of-turn where the bot's hand was
nearly empty — moved to top-of-turn, where "a link I'm holding" means
something.

**Post-policy probe (same battery, all five parts landed):** bot
reclaims/run vb **5.77** / vv **4.87** / bb **5.58** — the verb exists,
~once per 2–3 combats, every pull articulable by construction. Win%
moved vb 11→20 / vv 30→25 / bb 9→13 (WS transport, loose read — the
S14-R5 noise law puts ±7–10 points on a 100-run leg; no direction
claimed, the read is "nothing broke").

## Part 3 — S19.3 tail-planning (D2, +1.2 as recommended), commit `8d0bd9a`

One scoring term, solo-only: candidate at the chain TAIL + human's open
hand holds a card whose link.condition equals the candidate's tag →
+1.2 (below "fires own link" +2). No announce line —
`human_linked_off_me` (18%) lands at the moment of proof.

## Part 4 — S19.4 protective targeting (D3, row T-a as recommended), commit `8d0bd9a`

The lethal-adjacent read factored out of maySpend into a per-seat
helper (same math — maySpend behavior unchanged, held by the fleet
byte-diff); when the human reads lethal-adjacent, the bot's fallback
target preference flips to `boundTo === human`. The detonate/hex pile
convergence still outranks the flip (T-a scope).

**T-b probe evidence (for the designer):** the battery cannot see
per-sever context, but the POLICY can be read directly: the solo bot's
only Sever trigger fires when every living enemy is bound to ITSELF —
so its Severs can only push enemies TOWARD the human (spreading), never
pull one off a dying human. Bot severs/run ~0.2. T-b ("under the
lethal-adjacent read, a declared Sever targets an enemy bound to the
human") remains one line and is NOT landed — but note the current
etiquette can, rarely, hand an enemy to a lethal-adjacent human. If
that reads as a problem, T-b's ruling should probably also SUPPRESS the
spread-sever while the human is lethal-adjacent. Stalls for a ruling.

## Part 5 — S19.5 resonance-streak term (D4, cut-line — LANDED), commit `83d6f38`

The day had room; the pre-approved cut was not spent. +0.5 solo-only
staging bonus for placements that raise the chain's ignition count,
priced by the engine's own computeResonanceSlots (the S9c.6 rule:
preview==reality by shared resolver).

## Part 6 — S19.6 Witness machinery (D5/D6), commits `94144cd` + `aa84d9e` (sever guard)

All triggers behind `state.botSeat`; every sayWitness call no-ops on an
empty pool, so the machinery landed SILENT — nothing speaks until the
Part 7 rows sign. Wired: `i_reclaimed_yours` (with S19.2),
`i_pulsed_yours` (bot Pulses a human-owned link, always), `i_severed`
(at resolution, only when the binding actually moved — a chorus sever
can no-op and the Witness may not announce a cut that didn't happen),
`i_steadied` (wired though the solo policy never Steadies today — the
pool waits for the verb), `my_pick` (bot reward pick, 50%, `{card}`).
maybeSaySolo gained an optional vars pass-through; per-combat cap and
existing cadences untouched.

D6 hints (client, `WitnessHints`): once-per-RUN (keyed on the act-1 map
hash — the seed is masked while live), act-1-only, solo-only, behind
`tb_witnessHints` (default ON, `!== '0'`). Triggers as tabled; the
dead-link read excludes Pulse-forced and linkless slots (truth law).
Line choice is runKey % pool — variety across runs, not within.
The settings-toggle UI rides with the strings commit (its label is a
Part 7 row).

## Part 7 — strings sign-off table (PROVISIONAL until each row is signed)

Voice constraints applied: the solo register (drafted against its
will, follows the human's lead grumbling, sardonic-early; no registers
gained this sprint), word-drawer lexicon, every line literally true —
`{card}` lines claim only what the engine just did; chatter pools never
coach; hint pools teach what the mechanic IS and never promise
outcomes; no mortal-ghost biography.

### D5 expansions (18 lines)

| # | pool | proposed text |
|---|---|---|
| St-1 | resonance_together | "Two hands on one thread, and the weave answers. I had forgotten it could be this loud." |
| St-2 | resonance_together | "Resonance, and half of it mine. Put it in the record twice." |
| St-3 | resonance_together | "There — the chain remembers what it is for. So, briefly, do I." |
| St-4 | resonance_together | "The weave takes both our marks this time. This one goes on the good shelf." |
| St-5 | resonance_together | "It sings once for the pair of us. Even the dark leans in to hear that." |
| St-6 | resonance_together | "Again the ignition, again both names on it. Keep weaving like that and I will run out of dry remarks." |
| St-7 | own_play | "Consider it placed. I did have several centuries to think about the order of things." |
| St-8 | own_play | "One more from my hand. The hand is figurative. The card is not." |
| St-9 | own_play | "I file this here. Filing is the one skill eternity actually rewards." |
| St-10 | own_play | "Mine, into the chain. No flourish. The flourish is implied." |
| St-11 | own_play | "I contribute. Quietly. Let the record show who kept the weave fed — I keep the record." |
| St-12 | own_play | "Another of mine on the table. I said I would hold the other end; I hold it thoroughly." |
| St-13 | human_linked_off_me | "Lit, off my card. I do set a decent table." |
| St-14 | human_linked_off_me | "Your link, my kindling. We will not discuss how long I have been kindling." |
| St-15 | human_linked_off_me | "You followed my thread of thought. There is hope for this arrangement." |
| St-16 | human_linked_off_me | "Off mine again. At this rate I will have to start pretending it is luck, for modesty." |
| St-17 | human_linked_off_me | "A fire off my card. Warm your hands; I can't." |
| St-18 | human_linked_off_me | "You saw what I left you. Noted, weaver. Filed under: promising." |

### New pools (28 lines)

| # | pool | proposed text |
|---|---|---|
| St-19 | i_reclaimed_yours | "I am taking an echo of your {card}. It was doing nothing where it lay." |
| St-20 | i_reclaimed_yours | "Your {card} — I want its shape for a turn. The original stays where you dropped it." |
| St-21 | i_reclaimed_yours | "A copy of {card} comes across the thread. Waste offends me; I have watched eras of it." |
| St-22 | i_reclaimed_yours | "I reclaim {card}. Yes, yours. It knows the way across the thread." |
| St-23 | i_reclaimed_yours | "Borrowing {card}. An echo of it, strictly — I deal in copies. Ask the codex." |
| St-24 | i_reclaimed_yours | "{card}, echoed into my hand. A discard is a resting place, not a grave." |
| St-25 | i_pulsed_yours | "A Pulse, for your link. It read dead; I disagreed." |
| St-26 | i_pulsed_yours | "I put two Thread behind your card. Its link fires now, whatever sits before it." |
| St-27 | i_pulsed_yours | "Your link was about to sleep through the turn. I knocked." |
| St-28 | i_pulsed_yours | "Pulsed. Yours. I do not spend Thread on sentiment; the card earned it." |
| St-29 | i_pulsed_yours | "Two Thread, and your dead link remembers its duty. The old pushes still work." |
| St-30 | i_pulsed_yours | "I forced yours awake. The thread between us is not decorative." |
| St-31 | i_severed | "Severed. The binding comes loose and settles elsewhere." |
| St-32 | i_severed | "Three Thread to re-aim a hunger. Money well spent, as spending goes down here." |
| St-33 | i_severed | "I cut the tether where it stood. It has already found a new anchor; they always do." |
| St-34 | i_severed | "Severed — the leash moves. The Undercroft does love its leashes." |
| St-35 | i_steadied | "Steadied. A Thread spent on composure — ours, collectively." |
| St-36 | i_steadied | "I steady the line. Centuries of holding things teaches the grip." |
| St-37 | i_steadied | "One Thread for calm. The weave sits easier for it." |
| St-38 | i_steadied | "Steadied. Whatever the turn does next, it does it to a firmer thread." |
| St-39 | my_pick | "I will take {card}. I have reasons; most of them are even tactical." |
| St-40 | my_pick | "{card} goes on my shelf. Everything ends up on a shelf of mine eventually." |
| St-41 | my_pick | "Mine is {card}. The collection wants what the collection wants." |
| St-42 | my_pick | "I choose {card}. Write it down — I always write it down." |
| St-43 | my_pick | "{card}, then. Some things one simply recognizes after enough centuries." |
| St-44 | my_pick | "I pick {card}. Played things end up in piles, and piles down here have two readers." |
| St-45 | my_pick | "{card} for me. No commentary from the gallery, please." |
| St-46 | my_pick | "{card}. A keeper knows quality; I have dusted enough of it." |

### D6 hints (20 lines) — teach the mechanic, promise nothing

| # | pool | proposed text |
|---|---|---|
| St-47 | hint_thread_floor | "The Thread runs low. It is one pool and we both drink from it — overdraw, and the fraying bites us both." |
| St-48 | hint_thread_floor | "Below four now. The Thread has a bottom; spend past it and it frays — and a fray is paid by the pair." |
| St-49 | hint_thread_floor | "The Thread thins. A fray, when it comes, punishes both of us — the pool is shared and so is the penalty." |
| St-50 | hint_thread_floor | "Little Thread left. It regrows as the turns pass, but a fray, once earned, is shared." |
| St-51 | hint_link_read | "Your card's link read nothing behind it just now. A link fires off the card before it — order is the whole grammar." |
| St-52 | hint_link_read | "That link stayed dark: nothing it wanted stood in front of it. Links read their predecessor — mine included." |
| St-53 | hint_link_read | "A dead link in your chain this turn. Links only catch when the right card stands before them; mine count as cards, for the record." |
| St-54 | hint_link_read | "Your link went unread at the commit. It wanted a particular neighbor and had none. Links are grammar, not garnish." |
| St-55 | hint_binding | "Its binding moved. Every enemy is bound to one of us; the binding names its prey." |
| St-56 | hint_binding | "The tether re-aimed itself. What an enemy is bound to is what it hunts — and bindings can move." |
| St-57 | hint_binding | "Its leash crossed over. Bound-to decides who takes the teeth, and the names change mid-fight." |
| St-58 | hint_binding | "A binding changed hands just now. They do that — Severs, falls, and certain enemies all re-aim the leash." |
| St-59 | hint_reclaim_exists | "I just pulled an echo from your discard — that is Reclaim, two Thread. Your dead cards are not as dead as they look." |
| St-60 | hint_reclaim_exists | "That was a Reclaim: I copied a card out of your pile for two Thread. The thread carries cards both ways." |
| St-61 | hint_reclaim_exists | "An echo of yours, in my hand — Reclaim does that. My piles are as open to you as yours are to me." |
| St-62 | hint_reclaim_exists | "I reclaimed from your discard just now. Two Thread buys a copy of anything resting in a partner's discard or exhaust." |
| St-63 | hint_pulse | "Your link died on the table and the Thread sat unspent. Pulse exists: two Thread forces a staged link to fire, whatever precedes it." |
| St-64 | hint_pulse | "A dead link at the commit, with Thread to spare. For two of it, a Pulse fires a staged link regardless of order." |
| St-65 | hint_pulse | "The Thread watched your link stay dark. It needn't — a Pulse, at two Thread, lights a dead link where it stands." |
| St-66 | hint_pulse | "Link unfired, Thread unspent. Those two facts share a remedy called Pulse; either of us can cast it on either's card." |

### Settings toggle (1 label)

| # | string | proposed text |
|---|---|---|
| St-67 | hints toggle label (settings popover, default ON) | "witness hints" |

Truth-law audit notes, per pool: Reclaim lines say echo/copy and that
the original stays (Reclaim copies — PT2); Pulse lines state the real
mechanic (fires regardless of predecessor) and the standing price;
Sever lines are direction-neutral (the bot's Sever can settle on
either end, and chorus severs move the binding between voices) and the
trigger only fires when a binding actually moved; Steady lines claim
composure, not outcomes; my_pick lines claim only the pick; hint lines
describe the shared pool, fray sharing, link order, binding movement,
Reclaim's two-way price, and Pulse's price/effect — all as the engine
has them. No line claims a grave, masters, or a life.

## Part 8 — batteries & exit gates (final build `9ee2d48`, strings landed)

1. **Sim parity — HARD GATE: PASS.** S18-P2000 re-run on the final
   build, all three pairings, full-stdout `cmp` against the Part 1
   bank: vv / vb / bb all BYTE-IDENTICAL. Every behavior change in the
   sprint is invisible to the fleet, proven end to end.
2. **Suite green: PASS** — 429/429 on every commit. **No golden regen:
   PASS** — the branch diff touches no test or fixture file at all.
3. **Solo battery (REPORTED, n=100 × vb/vv/bb, seeds 30001–30100):**
   - **reclaims/run > 0 with R-row attribution: PASS** — vb **5.81** /
     vv **4.79** / bb **5.61** (from 0 by construction), every pull
     articulable by R-a's own trigger. Bot verbs/run (vb leg): pulse
     8.87, reclaim 5.81, sever 0.20, steady 0 (structural — trySteady
     is sim-only).
   - **win% sanity (loose): PASS** — vb 11→19, vv 30→28, bb 9→16
     against the pre-sprint anchor; all movement within the S14-R5
     noise envelope for 100-run WS legs. Nothing broke.
   - **Pool-exhaustion shape (the D5 acceptance): PARTIAL —
     stop-and-report.** The grown chatter pools now hold: own_play
     (12) exhausts in 14/100 runs at median act 2 turn 41 (was 81/100
     at turn 26); human_linked_off_me (12) in 3/100 (was 56/100).
     Two always-fire pools still exhaust early ON THE BOT BOARD:
     - `resonance_together` (12): 97/100 at median act 1 turn 21 (was
       100/100 at turn 11.5 — the doubling doubled the runway, and the
       bot pair simply out-resonates it: ~29 ignitions/run, 43% of
       them Pulse-forced. A human solo pair will not sustain that
       rate; the smoke run is the human-shaped read. If it still
       exhausts act 1 for humans, the fix is a designer row — either
       a bigger pool or the per-combat cap extended to this pool —
       NOT landed here.)
     - `i_reclaimed_yours` (6): 58/100 by median act 2 turn 33 — the
       count was ruled before R-a's realized frequency (~5–6/run) was
       measurable. By exhaustion the verb has been announced six
       times, which may be exactly enough teaching; designer's call.
     - `covet_solo` (7, outside the ruled table): 72/100 by act 2
       turn 28 — logged again, unchanged without a row.
   - B22 context line: the co-op summary's reclaim-ratio band prints
     on solo boards too (~27% vs the <25% co-op band) — that band was
     derived for pair fleets; on the solo board it is context, not a
     gate.
4. **No-balance audit: PASS.** The content plane carries exactly the
   proposed St-1..St-67 strings (PROVISIONAL) and nothing else; every
   policy branch in the diff sits behind `mode === 'solo'`
   (bot-policy) or `state.botSeat` (combat/reducer/client); the one
   shared-code refactor (lethalAdjacent out of maySpend) is proven
   same-math by gate 1; no balance number moved; the S18 board is
   untouched by byte-diff.
5. **Designer smoke run: OPEN — rides tonight's session** (the gate
   was designed to). Checklist for it: the Witness speaks past act 1
   (it now holds three fresh chatter pools plus five announce pools),
   the Reclaim is seen and announced, hints fire once each in act 1
   with the toggle ON, nothing reads as noise. **Strings ratification
   rides the same session** — every St-row is PROVISIONAL until then.

Committer-identity note: the branch was rebased once after review
(`--reset-author`, content unchanged) — hashes in this doc are the
final ones.

## Part 9 — D-list disposition

| D | ruling | disposition |
|---|---|---|
| D0 | ratified | Part 1 landed first; every commit byte-diffed |
| D1 | **R-a** | landed as recommended; probe 4.9–5.8 reclaims/run |
| D2 | **+1.2** | landed as recommended |
| D3 | **T-a** | landed; T-b stalls with a note (see Part 4) |
| D4 | land if time | LANDED — the cut was not needed |
| D5 | counts ratified | machinery landed silent; strings at Part 7 |
| D6 | ratified | machinery landed inert; strings + toggle at Part 7 |
