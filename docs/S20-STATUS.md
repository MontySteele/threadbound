# S20 status — First Impressions (implementation record)

Sprint doc: `docs/threadbound_sprint_S20_first_impressions.md` (charter
and D-list live there; this file is the execution record). Designer
kickoff 2026-07-06: "if there are no open questions, let's get to it" —
D0–D6 taken as ratified as proposed, per the S18/S19 precedent. Two
in-sprint stop-and-reports went to the designer and came back ruled
(Parts 1.1 and 1.4 below). Part 7 rows are PROPOSED and stall until
signed; the Part 6 deletion rows stall the same way.

Fresh-container note (instrument law): before any change landed, the
S19 parity check reproduced its bank byte-identically on the tip, and
the S20-R1 legs later reproduced their own first run to the exact win
count — cross-invocation determinism re-proven twice in this container.

## Part 1 — S20.1 the canon flip (RULED, landed first)

### 1.1 Tracks-on sim audit → STOP-AND-REPORT #1 → ruled fix (`0e8ebb6`)

The audit found the fleet DETERMINISTIC under tracks (same-seed repeat
and 4-vs-1 shard invariance byte-identical) but WEDGED on 2–4% of
rites-on runs: a mutated rite echo whose only Link is tier-granted
(S9d growth — e.g. First-Drawn Descant at resonances ≥ 6) reads as a
Pulse target everywhere that uses `grownDef` (resolution effects,
client preview, bot policy), but the reducer's legality assert and
`computeForcedLinks` read the ungrown `effectiveDef`. The bot proposed
the Pulse forever → livelock → stall guard. The same mismatch gave
humans a spurious "that card has no Link to force" and could silence
the production solo partner — reachable on the hosted build today.
**The pre-approved F-fallback did NOT dodge it**: rites-only batteries
stalled too (4/100 — seeds 20003/20054/20089; tracks+rites 2/100 —
20048/20079). Not the anticipated failure, so: stop and report.

**Ruled (designer, this session): the one-line engine fix** — Pulse
legality and the forced-flag helper align on `grownDef`, exactly what
resolution already fires. `computeLinksFired` stays ungrown (natural
fires unchanged); the residual (a mutated grower's tier link fires
only when FORCED) is FILED as the OQ#69 residual. Evidence: both
wedged batteries complete; determinism audit clean; regression test
pins both directions; **scripts/s19-parity-check.sh PASS byte-identical**
(growth needs tallies, tallies need rites — the rites-off canon cannot
see this change); suite 431/431 (429 + 2 new pins).

### 1.2 Suite audit (`ba92f92`)

The suite run under the incoming defaults surfaced five failures, one
shape: raw-Client lifecycle harnesses (reconnect, solo persist /
concede / waiver, drain) that walk a run to the map and never pick a
vestment. They assert transport mechanics, not flag behavior — they
now pin `TB_RITES=0 TB_TRACKS=0 TB_KNOTWORK=0` explicitly. Engine
tests already pass flags through START_RUN. 431/431 under both
environments — green for the right reasons.

### 1.3 The flip (`af02805`)

`envFlag(name, true)` at every call site for the three flags — server
start handler and sim fleet, same reader. The S10a `require.main` shim
removed (importers now inherit the same defaults). `RECLAIM_NUDGE`
rides the rites flag through `envFlag` instead of a strict `==='1'`,
so explicit and default are identical. render.yaml's three pins
removed as redundant. README: `npm run server` is the game; the `=0`
archaeology table added. Banner echoes all three flags. Verified live:
default boot logs `rites on · tracks on · knotwork on`; `TB_KNOTWORK=0`
logs `knotwork off`.

### 1.4 S20-R1 re-bank → STOP-AND-REPORT #2 → ruled (`a8bbd4c`)

The board (seeds 20001–22000, n=2000 ×3, no env prefix — the new
canon; run twice, identical win counts):

| leg | win % | died a1 | act-1 HP/combat | link-fire | thread/combat | knot ratio |
|---|---|---|---|---|---|---|
| vv | 67.1 | 16.7% | 23.5 | 47.2% | 5.78 | 1.28 |
| vb | 69.7 |  0.7% | 22.2 | 56.4% | 7.37 | 1.25 |
| bb | 76.2 |  0.1% | 23.2 | 53.0% | 7.71 | 1.25 |

Band re-read: gate 2 (bb−vb) **+6.5 IN**; gate 4 knot ratio **IN**
(1.25–1.28 vs ≥1.2); co-op texture link-fire lead **IN** (vb 56.4);
vv floor watch **IN** (16.7%, re-anchored, tripwire 21.7%); HP floors
**IN** (≥22.2 vs 16). Three bands read OUT — the S18-D3 vb 45–55 win
band (69.7), vb Hex share 25–45 (46.3), B22 reclaim <25% (57–64%, an
instrument artifact: the nudge rides every canonical battery now).
**Ruled: convert to REPORTED-not-banded** — no silent re-derivation;
fresh bands on the S20-R1 anchor set are the next design session's
first item (OQ#70). Full bank + shas:
`docs/reference/s20-p2000-bank.txt`. Parity instruments re-banked the
same way (`scripts/s20-parity-check.sh` is the living form, explicit
flags; the S19 script pins its era's flags and stays runnable as
archaeology — its bank regenerated for a strings-only diff, three
gate-label lines, shown in full at re-bank time).

Correction on the record: the sprint doc's Part 0 said the old anchors
were rites-on; the S19 bank's own command line shows rites-off. The
re-bank moved two flags' worth of environment, not one.

### 1.5 Ledger (`a04502c`)

OQ#59 superseded; OQ#65 sharpened (lane generator = explicit-only dead
config; deletion named as the natural next ruling, not taken); OQ#68
logged (knot contact floor, WORKING AS DESIGNED, parked with the knot
take-rate instrument); OQ#69 (the Pulse ruling + residual); OQ#70 (the
band re-derivation owed).

## Parts 2–4 — client visuals (`6624aa5`)

**S20.2 title screen** — title + epigraph (row St-e1), TitleCord as
the thesis image until the splash art signs, two EQUAL mode doors
(Descend Together / Descend Alone) opening their controls in place,
"How to play" overlay (auto-opens once, Esc/✕/click-out, remembered;
carries the S6.6 blurb copy — row St-h1), footer = version stamp +
drain banner + one quiet utility row (profile/codex/data-note). Links
lose browser-blue. `title_splash` added to the B6 pipeline
(`scripts/art/prompts.json`) — the art row stalls at Part 7.

**S20.3 the braid** — presentation only, map.ts untouched. The two
warps are continuous curved paths whose sides ALTERNATE at each knot:
the strands visibly cross, one passes OVER (ink casing), the knot sits
on the crossing. Node chips became circular medallions in the sigil
vocabulary's own grammar (`nodeMedallionSvg` — seeded rings, broken
for fight kinds per R3, kind glyphs, act accents, the thread
signature), kind-only so scouting stays the asymmetric layer; the word
rides as a small caption; event subtitles stay. Visited trail pulls
taut and brightens (client-local, survives refresh per run+act);
unreachable dims and dashes; the field is a CSS loom texture +
vignette; the only motion is the current-node pulse (reduced-motion
safe). The archaeology lane map keeps its old layout with the new
medallions. NOTE for the record: the sprint doc's Part 0 said the
vocabulary already had node-kind marks — it did not; the medallions
were added IN the vocabulary's grammar rather than borrowed from it.

**S20.4 the Witness rail** — right side on map and combat; current
line emphasized over a ~5-line quiet scrollback; App accumulates every
witness line across screen transitions (deduped by the engine's
no-echo law, reset per room) — nothing said during reward/vestry/map
hops is lost. Hint-family lines land in the rail marked and bordered
(teaching, not color) and hold ~18s; the S19.6 popup is gone. Mobile
collapses to the latest line, tap-to-expand. The S19 smoke-run item
"nothing reads as noise" now has its place to be verified.

## Part 5 — rite growth retext (`eb11765`, strings commit)

Vestry cards show rule + progress + ceiling (per-N form) or the tier
ladder with the current tier marked (tiered form); the card body
renders the GROWN def on the offer and the worn re-read (in-run cards
already read grown). All strings CLIENT-side — nothing reaches battery
stdout; the parity check verifies no re-bank is owed. Strings at
Part 7 rows St-r1..r8, PROVISIONAL. Note: the inspect panel (`rite:`)
still shows the base text — the card body beside it carries the grown
numbers; a growth line in the inspect panel is a candidate for the
next UI pass, not landed unruled.

## Part 6 — the cleanup pass (lands last; see the inventory below)

Rules as ruled: archive ≠ delete; deletions stall unsigned; living
docs stay top-level; dangling references fixed; script removals only
with grep-proof; no code path touched (suite green before and after is
the mechanical proof).

### The signed inventory (dispositions)

**KEEP top-level (living):** OPEN-QUESTIONS.md, REVIEW-SWEEP.md,
threadbound_lore_bible.md (carries the word-drawer §7),
threadbound_design_doc.md, threadbound_roadmap_handoff.md,
threadbound_sprint_S20_first_impressions.md + S20-STATUS.md (the
current pair), PLAYTEST-2.md (the live playtest checklist, cited from
README), docs/reference/ (live instruments: banks, parity baselines,
sigil spec, S20 screenshots).

**ARCHIVE → docs/archive/ (project record, indexed):** every earlier
sprint doc (S1/S2–S19), every earlier STATUS doc (S13-ECONOMY through
S19), the M1/M2/M3 plans, one-off reports (S3-BALANCE, S5-BASELINE /
-PROPOSALS / -REPORT, S17-POWER-AUDIT + .txt data), briefs
(S12-CARD-ECONOMY via S13 naming, difficulty review), early notes
(m1-writing, content-audit, characters_and_player_count,
comfort_pass, map_knotwork_session, narrative_track_slice,
s9_decision_tree, decision-tree-era "tonight" docs), and the stray
top-level `comfort-pass.patch` (archived pending its deletion row —
top-level docs/ must hold only living documents).

**DELETE — PROPOSED, STALLS unsigned (rule 1):**

| # | candidate | evidence | status |
|---|---|---|---|
| Del-1 | docs/archive/comfort-pass.patch | its content landed long ago (S? comfort pass; the patch is a duplicate of merged work); archived this sprint so top-level is clean | STALLS |
| Del-2 | scripts/spotcheck-s1s2.js | grep-proof of zero references recorded in the cleanup commit; superseded by the suite | STALLS |
| Del-3 | scripts/sim-shard.sh | superseded by TB_SIM_SHARDS in sim.ts (S16.0b); grep-proof in the cleanup commit | STALLS (proposed beyond the doc's list — designer may strike) |

**Reference fixes:** every `docs/<archived-name>` citation in living
and archived .md files rewritten to `docs/archive/<name>`; README's
M2-plan/playtest citations updated. The missing S19 sprint doc is
COMMITTED (reconstructed from S19-STATUS.md, honestly headed as a
reconstruction) so S19-STATUS's reference finally resolves. Code
comments that cite sprint docs by old paths are NOT touched — the
cleanup commits touch no code file (rule 6 outranks; the archive
README is the resolver for historical citations).

## Part 7 — strings & art sign-off (STALLS until signed)

Voice constraints: the epigraph is AUTHORIAL — the Witness does not
narrate the title screen (it hasn't met them yet; the truth law
extends to voice placement). Witness lines: NONE this sprint — the
rail moves where lines live, not what is said.

### Strings

| # | surface | proposed text | status |
|---|---|---|---|
| St-e1 | title epigraph | "Two go down together, bound by one thread." | PROVISIONAL |
| St-h1 | How-to-play overlay | S6.6 blurb copy carried over AS-IS (rooms / no-partner / feedback keys), plus two new sentences: "Your first fight teaches itself: a short guide walks you through staging cards, Links, and the Thread the first time you descend on this browser." and the keys line ("d deck · f fullscreen · gamepads work everywhere.") | PROVISIONAL (carry-over noted per the sprint doc) |
| St-r1 | Shroud growth line | "▲ +2 Block each time either of you falls · +N so far · cap +8" | PROVISIONAL |
| St-r2 | Vigil growth line | "▲ +1 Block for each enemy that dies Bound to you · +N so far · cap +9" | PROVISIONAL |
| St-r3 | Knell growth line | "▲ +1 damage per 3 detonations · +N so far · cap +12" | PROVISIONAL |
| St-r4 | Pyre-Brand growth line | "▲ +1 damage per 6 Kindled burned · +N so far · cap +8" | PROVISIONAL |
| St-r5 | Mourner's Step growth line | "▲ +1 Block per 15 Momentum spent · +N so far · cap +6" | PROVISIONAL |
| St-r6 | Toll growth line | "▲ +1 Momentum per 25 links fired · +N so far · cap +2" | PROVISIONAL |
| St-r7 | Votive ladder | header "▲ grows as the pair spends Thread · N so far"; tiers "8 Thread spent — Votive also draws 1" / "20 Thread spent — its link deepens: your partner draws 2" | PROVISIONAL |
| St-r8 | Descant ladder | header "▲ grows with Resonance ignitions · N so far"; tiers "6 Resonances — its link widens: you and your partner each draw 1" / "14 Resonances — Descant draws 2" | PROVISIONAL |
| St-m1 | map captions | none new — medallion captions reuse the existing nodeName words (toll-door, covet cache, The Loom's Eye, kinds) | row exists so the "any new map caption strings" clause reads answered |

### Art (B6 statement included)

| # | row | status |
|---|---|---|
| Art-1 | title splash — `title_splash` entry landed in scripts/art/prompts.json (subject: the two figures and the soul-thread before the descent — the thesis in one image; style template + post-process per pipeline README) | **STALLS at candidate generation.** This environment has no image model; candidates could not be generated this session. Next session with pipeline access: generate per README step 1, attach the set here, designer picks or rejects. NO art landed; NO adoption wiring exists (it lands with the pick, per pipeline README step 3). B6 holds: one art set, no mixing — until a pick signs, the sigil vocabulary v2 remains the whole set, and the title's thesis image is the TitleCord. |

## Part 8 — exit gates

1. **Suite green: PASS — 431/431** (the sprint-doc's "429/429" plus
   the two ruled regression pins from stop-and-report #1; every test
   green on every commit).
   **Parity: PASS** — `scripts/s20-parity-check.sh` byte-identical
   after Parts 1–5 (client strings never reach stdout; verified, not
   assumed). The S19 archaeology instrument also PASSES against its
   regenerated bank (strings-only regen, diff shown at re-bank).
2. **Engine behavior diff:** NOT empty — by ruling. The branch carries
   exactly ONE engine behavior change beyond the flip: the Pulse
   grown-def alignment (stop-and-report #1, ruled in-session,
   regression-pinned, invisible to the rites-off canon by parity
   proof). map.ts untouched entirely (`git diff` confirms). Everything
   else engine-side is zero.
3. **Screenshot gate (designer):** title / vestry / braid map / combat
   with rail — three widths each in `docs/reference/s20-shots/`
   (desktop 1440, 1024, 390; plus the how-to overlay, the open
   together-door, and a rail close-up). PASS is the designer's eye.
4. **Flag gate: PASS** — bare `npm run server` boots with
   `flags: rites on · tracks on · knotwork on` and serves the braid
   (verified live in the browser this session); `TB_KNOTWORK=0`
   documented in README and verified to boot the lane path; S20-R1
   re-bank committed with the band re-read on the record.
5. **Cleanup gate:** the inventory above executed exactly — archive
   moves landed, deletion rows STALL unsigned, the S19 sprint doc
   exists and S19-STATUS's reference resolves, suite green after
   (mechanical proof in the cleanup commits).
6. **Designer smoke run on the deployed build: OPEN — rides the next
   session** (deploy is a git-push). Checklist: the S19 list, plus —
   the rail catches every line (transition test: trigger a line at a
   reward, find it on the map), the vestry numbers read at a glance,
   the braid reads as two strands crossing. The
   `resonance_together` human-shaped exhaustion read (S19 Part 8.3)
   still rides this run.

## Part 9 — D-list disposition

| D | ruling | disposition |
|---|---|---|
| D0 | ratified | Part 1 landed first, its five steps in order, own commits; cleanup last |
| D1 | executed | flip + sunset landed; TWO stop-and-reports fired and were ruled in-session (Pulse fix; bands → REPORTED). F-fallback not taken — it would not have dodged the wedge |
| D2 | ratified | title composition landed; art stalls at Part 7 (no image model this session); epigraph at St-e1 |
| D3 | ratified | braid treatments 1–5 landed; screenshot gate set; legibility choices recorded (kind-only medallions — no encounter leak) |
| D4 | ratified | rail landed as ruled (row b + mobile collapse + no-line-lost) |
| D5 | ratified | ruled shape landed; tiered rows separate; strings at Part 7 |
| D6 | rules ratified | archive executed; deletion rows tabled and STALL for signature |

**Logged this session:** OQ#68 as directed (knot contact floor,
WORKING AS DESIGNED, parked with the take-rate instrument; adjudicates
with the S11.11-1 pending row).

## Close

The window closes with the game looking like itself: a stranger now
meets a title with two doors, a vestry that says what its vestments
do, a braid drawn as a braid, and a Witness whose voice has a place.
The S21 ascension doc travels with the handoff package per the
after-close note. Owed next session: strings + art + deletion
signatures (Part 7 / Del rows), fresh gate bands on the S20-R1 board
(OQ#70), the OQ#69 residual ruling, and the deployed smoke run.

### Post-close touch-up (designer smoke look, 2026-07-06)

The designer's first live look at the braid caught two Part 3/4
defects, both fixed the same day (client-only; suite 431/431 and both
parity instruments byte-identical after):

1. **Doubled braid lines.** The warp strands already pass through
   every on-strand node, and the edge loop drew a plain sagging cord
   over those same connections again — two lines between the same
   rooms. Fix: the warp waypoint walk now records which edges it
   covers (`warpCovered`), and the cord for a covered edge is skipped
   unless it carries state (taut trail, live pick). The remaining
   faint cords are the genuine cross-route edges.
2. **The Witness spoke in two places.** The rail (S20.4) and the
   bottom `Log` both rendered the same line on map and combat. Fix:
   `Log` takes `muteWitness`, set on the two screens that mount the
   rail — one voice, one place. The log keeps witness lines everywhere
   the rail is absent (rites, shop, summary epitaph untouched).
3. **Scale pass (designer: too small, too much dead screen).** Base
   type 15px → 16px (17px ≥1600px wide); `.app` cap 1240px → 1500px;
   the map screen leaves the 780px reading column. The braid's
   geometry now derives from the viewport — column and row spacing
   fill the width the rail leaves and the height under the header,
   clamped so the shipped S20.3 numbers stay the floor on small
   screens — and one scale knob (`--map-scale`) carries medallion
   sizes, captions, and stroke weights together so nothing drifts
   apart. Mobile unchanged (clamps to the floor). A `-big.jpg` pair
   (2000×1300, the designer's window class) joined the banked set.
4. **The rail covered the character panel in combat.** The fixed-
   position rail sat on top of whatever the layout put bottom-right —
   on tall windows, Bram's panel. Fix: on the two screens that mount
   the rail (`.app.rail-on`, ≥1100px) the phase root reserves a real
   right gutter the rail's width, so content and rail can no longer
   share pixels at any scrollback height. Below 1100px the rail
   overlays as before (and collapses to one line ≤700px).
5. **The vestry still spoke from the bottom log.** The rites phase
   didn't mount the rail, so its Witness acknowledgements stayed in
   the old bottom position. Fix: the rail mounts on `rites` too and
   the vestry log takes `muteWitness` — the voice now has one place
   on every screen where it speaks mid-run (rites, map, combat). The
   vestry column is narrow, so no gutter is needed there.
6. **The combat recap played over the reward screen** (pre-existing,
   designer finding). When a resolution killed the last enemy, the
   authoritative phase flipped to `reward` immediately and the recap
   theater narrated over the Spoils screen. Fix (client-only,
   per-player by construction): when a broadcast leaves `combat`
   carrying a resolution log, the client holds a synthetic combat
   view — the last combat state (chain/hands/counts intact) with the
   recap log, final player HP, and every enemy pinned to its final
   0 HP so the per-beat HP-offset animation works unchanged. The held
   panel is display-only (`.recap-hold`, pointer-events none); the
   theater gained an `onDone` callback (natural end after its 1.2s
   linger, or skip-click) that releases the hold. Each seat holds and
   skips independently. Verified live: 1720 DOM samples across a
   driven fight — theater+combat coexisted (the hold), theater+Spoils
   never did. Defeat and act-advance transitions get the same hold.
7. **The Witness's location made uniform** (designer ruling). The
   rail now mounts on EVERY screen between the lobby and the end
   screens (rites, map, combat, reward, event, rest, covet, shop,
   loom — `RAIL_PHASES`), and `Log` filters witness lines
   unconditionally: the log is the mechanical record, the rail is the
   voice, on every screen that has both. Two deliberate exceptions
   stay inline as scene text: the lobby greeting (pre-run; the title
   is never narrated per S20.2) and the Summary epitaph (post-run).
   `reward-rail-desktop.jpg` joined the banked set as the reference.
8. **Braids not taken lose their colored line** (designer finding:
   mid-run, the full-strength warps through unreachable branches were
   noise). A warp segment now draws only where the run HAS BEEN or
   CAN STILL GO (both endpoints visited or reachable); everywhere
   else the colored strand is hidden and the covered edges fall back
   to the dashed dead cords, so the ghost topology stays readable
   without the color. Pre-first-pick the whole loom is reachable, so
   the pristine full braid is unchanged. `map-braid-midrun.jpg` is
   the banked reference.

The banked screenshot set was retaken on the fixed build.
