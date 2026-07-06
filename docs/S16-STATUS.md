# S16 Status — Off the Wire (2026-07-06)

Sprint doc: docs/threadbound_sprint_S16_off_the_wire.md. All rulings
S16-D1..D10 + S16-R1 recorded there (2026-07-05, verbatim); D0 satisfied
by the session's designated branch per S14/S15 precedent
(`claude/sprint-design-review-ntrppl`, from main after PR #13 merged;
S15 status `e83dc46`). Sequencing held: S16.0a–e landed and banked
before any behavior-changing part.

## Part 1 — S16.0, the socket-free instrument (`dba6ddb`, `e49a1df`)

- **S16.0a** — per-seat redaction factored into the engine as a pure
  function (`redactFor`); the server's wire view delegates to it
  (construction byte-identical — the wire hash digests this object, so
  key order is part of the covenant; wire-capture suite green
  unchanged). New in-process runner (`bots/src/local.ts`): lockstep
  policy calls straight through `reduce()`, transient IllegalActions
  skipped for the round exactly as the wire's reject-and-rewake flow
  settles them. No server import (importing the server binds a port),
  no socket, no sleeps. **Default transport; `TB_SIM_SOCKET=1` restores
  the wire.** Transport is loud in the header, always.
- **S16.0b** — `TB_SIM_SHARDS=N` (default cores−1) forks workers over a
  contiguous seed partition; machine rows pool in canonical run order,
  so pooled output is byte-identical at any shard count (socket-free).
- **S16.0c** — pinned (bots/test/local-sim.test.ts): same seed twice →
  byte-identical telemetry, base and braid+probe configs; distinct
  seeds diverge; shard partition contiguous/exhaustive/balanced;
  2 shards ≡ 1 shard through the real fork path at n=200 manually and
  n=4 in CI. The OQ#20/S13.6 jitter class is dead for sims.
- **S16.0d** — B22: `reclaims / total card acquisitions` in the sim
  summary and aggregate-human.mjs (gate-3 band <25%, numerically
  enforceable; pre-S14 human files read n/a rather than back-guessing).

### Two latent defects the deterministic path exposed (`e49a1df`)

1. **Duplicate card instanceIds** (engine, pre-existing): take a card on
   an act-2+ reward screen, spend the free pick-removal (deck length
   returns to L), covet the SAME defId at the same screen → two cards
   sharing one instanceId; the twin is unstageable ("already staged")
   forever. On the wire this surfaced as the S15-era 0.09% run timeouts;
   socket-free it was a hard stall (seed 1033, vv braid). Fixed with an
   rng-free de-dup suffix — only colliding ids change; goldens verified
   untouched (NO regen). Pinned (s16-instance-ids.test.ts).
2. **Shard stdout truncation** (harness): `process.exit()` drops piped
   stdout not yet flushed — children lost tail rows under load. Flush-
   then-exit in children and the WS parent.

### The parity bridge (one-time read, S16.0c — recorded, never
### load-bearing again)

vb braid, seeds 1001–1200, identical build (`e49a1df`), this container:

| instrument | n | win % | note |
|---|---|---|---|
| socket-free | 200 | 74.0 | deterministic |
| WS, TB_SIM_CONC=8 (the S13–S15 battery config) | 200 | 48 | one process, one event loop |
| WS, TB_SIM_CONC=1, 3 worker processes | 90 | 70.0 | uncontended wire |

Paired on the 90 common seeds: socket-free 66.7 vs uncontended-WS 70.0
— **paired delta −3.3, 11/90 discordant, 40/90 run lines
byte-identical. PASS within the S14-R5 noise floor (±7–10/100-run
leg).** Single-seed check: an uncontended WS run reproduces the
socket-free run byte-for-byte (turns, cards, links) in 2 of 3
invocations; the divergent invocation shows act-2 link-fire collapsing
63.6% → 51.1% on identical seeds.

**Finding, on record — the OQ#56 offset mechanism is identified.** The
old instrument's noise was not symmetric jitter: event-loop contention
makes bots act on stale views, which misplays chains (links break;
never the reverse — a race cannot *improve* a plan). The −26-point gap
between the contended and uncontended wire on identical seeds is that
misplay tax, and it scales with machine load — which is why S9a/S10a
containers read 8–26 points apart (OQ#56), why 61/99 same-seed WS runs
flipped outcome (S13.6), and why S14-R5 had to demand pooled n≥200.
Every historical WS row measured the game PLUS a scheduler tax local to
its machine. The socket-free rows measure the game. Cross-instrument
comparisons stay closed (OQ#56 ruling) — S15's absolute numbers are
context, not anchors, exactly as the sprint doc ordered.

### S16.0e — the anchors (this container, build `e49a1df`, socket-free,
### TB_SIM_SHARDS=3)

Absolute rows, pooled (seeds 1001..1200; vb default deepened to
1001..1400 for the R1 row, S15 precedent):

| row | n | win % | act-1 pair HP/combat | overall link-fire | thread/combat |
|---|---|---|---|---|---|
| vb braid | 200 | 74.0 | 26.4 | 56.9% | 4.35 |
| vv braid | 200 | 59.0 | 30.5 | 50.3% | 3.17 |
| bb braid | 200 | 84.0 | 26.8 | 51.0% | 4.09 |
| vb default | 400 | 49.0 | 24.1 | 55.3% | 4.33 |
| vv default | 200 | 53.0 | 24.8 | 51.7% | 3.08 |
| bb default | 200 | 50.0 | 24.8 | 49.2% | 3.58 |
| vb probe (ALL_KNOTS) | 200 | 74.0 | 26.4 | ladder 1.09 (23.5→25.6 HP) | — |
| bb probe (ALL_KNOTS) | 200 | 84.0 | 26.8 | ladder 1.08 (24.6→26.6 HP) | — |

Zero failed runs across ~1,800 (the old 0.09% timeout class is gone with
its cause). Anchor readings, on record:

- **Gate-2 anchor: bb−vb on-braid = +10.0** (84.0 − 74.0), from the old
  instrument's +12.2. **On-braid spread anchor = 25.0** (84.0 − 59.0) —
  the ≤15 band was calibrated on the contended wire, whose misplay tax
  compressed pair differences (it taxes the strongest performer most);
  the clean instrument reads the pairs further apart. The band is
  re-derivation material (instrument rule, not content) — the Part 6
  no-regression read is "not worse than the anchor," and the ≤15 number
  goes back to the designer with the S17 balance-session pointers.
- **R1 row: vb default 49.0 at n=400 — INSIDE the 40–55 band.** The
  S15 FAIL-marginal 38.3 was carrying the scheduler tax; on the clean
  instrument the band holds with room. Reported per S16-D2 (option c);
  the (b) pierce fallback stays pre-approved for the HUMAN read only
  and nothing here spends it.
- **vb keeps the co-op texture lead on the braid** (anchor form of the
  trio gate): link-fire 56.9% vs vv 50.3 / bb 51.0; thread spent/combat
  4.35 vs bb 4.09 / vv 3.17.
- **Probe ≡ default rows at A0, identically** — the DP router already
  takes both reachable knots per act at A0 (knot value 3 / 2.5 beats
  every alternative), so TB_BOT_ALL_KNOTS changes nothing there; the
  knob verified live at A3 (third crossing: outcomes shift, kill-2 heat
  32.2 → 34.4). The S15-era 11–15-point probe-vs-unprobed gap was the
  contention tax again, not routing.
- **Topological fact surfaced by the deterministic read** (context for
  gate 4): braid knots never edge into the NEXT crossing's knot — every
  act path crosses at most TWO knots, so the ladder's .30/.60 rungs are
  dead code on any braid path and last/first is structurally a
  knot-2/knot-1 ratio. The S15 "ceiling ≈1.3–1.5" extrapolation stands,
  now with the mechanism visible.
- Act-1 elite heat (for the D4 act-1 sub-pool): warden 26.7/27.6 >
  sexton 25.1/23.8 > mourner 17.1/17.5 (vb/bb). Act-2: bellkeeper
  43.2/44.7 > cantor 31.1/35.9 > rippers 30.1/28.2 > unstrung ~12.5.

Canonical paired seed set, recorded by name: **S16-P100 = seeds
5001..5100** (SEED=5000, RUNS=100). Paired baselines banked on the
anchor build for: vb/vv/bb braid, vb/bb default, vb/bb probe. Every
Part 2–4 gate reads paired against these per S16-R1 (same seeds on
build A and B, per-seed outcomes differenced, discordant counts
reported); absolute bands stay pooled n≥200.

Speed, informational (wall-clock per pooled n=200 gate read, this
container): socket-free unsharded 53 s; socket-free 3-shard 19–20 s;
WS conc-8 (the S15-era config) 283 s. **The new instrument reads a
pooled row ~14× faster** — and the paired S16-R1 form needs half the
runs for a cleaner read on top.

## Part 2 — S16.1, the D3 lever (executed as pinning + a decision packet)

**Finding: the D3-B ruling's premise does not match the shipped code.**
"Today: strand-local" is false — the knot reward screen has offered a
card pick to BOTH seats (each from their own pool) since M2 (§8), at
every knot kind, on both topologies, and the reward screen's copy
already reads correctly for two seats. Verified three ways: reducer
(`afterResolution` rolls per-seat sets at every combat victory, no
strand gate anywhere in engine or client), empirically (in-process
probe runs across braid knots, all four elite comps), and now by test.

Executed per the sprint's own law ("the next lever is a fresh design
session, not a bigger dose — the ×3 lesson stands"):

- **The ruled END STATE is pinned** (s16-knot-reward.test.ts): both-seat
  3-card offers at every braid crossing (both acts), classic elites, and
  non-knot combat rewards; both picks actually takeable. It can never
  silently regress into the strand-local shape the ruling forbids.
- **No balance change landed.** Granting an EXTRA pick at knots would be
  an unruled dose invented to rescue a mis-premised ruling — exactly the
  resize class D3's own packet history warns against.
- **The Part 2 battery is vacuous by construction** (build A ≡ build B)
  and was not spent. Gate 2 closure rides the D4 sub-pool alone this
  sprint.
- **D2 sign-off table: EMPTY** (the doc's own anticipated case — the
  existing screen copy already reads correctly for two seats).

**DECISION PACKET — S16-P1 (gate 2's from-below lever, returns to the
designer):** vb-braid sits 10.0 under bb-braid on the clean anchor. If
gate 2 must close from below in a future arc, the honest candidate
levers are (a) knots pay one ADDITIONAL pick to each seat (a real dose
of the card economy at mandatory crossings — needs a fresh ruling and
its own battery), (b) the S15-D3 option C (a truth-strand deep event
gains a card-offer face), or (c) accept ±10 as the pairs' true distance
on the clean instrument and re-derive the gate band (the ≤15 spread
anchor suggests the old bands were contention artifacts). No
recommendation is embedded — the premise correction comes first.

## Part 3 — S16.2, the D4 sub-pool (landed; the dose check)

Implementation: `KNOT_SUBPOOLS` (DATA, encounters.ts — a membership
change is a sign-off row): act 2 = `a2_knot_rippers` +
`a2_elite_bellkeeper` (the ruling's own words); act 1 = the same rule
applied to the anchor heat table (warden + sexton). The braid's
second-and-later crossings draw from it, ordered by the SAME elite
shuffle — **no new rng**. First crossing keeps the full-pool draw
byte-identically; later knots skip the debut's comp when an alternative
exists (the S14.2 B1 habit). Classic topology untouched.

Verified surgically: 1,200 generated braid maps (300 seeds × both acts
× A0/A3), 23,400 nodes — the ONLY differences vs the pre-D4 build are
later-knot encounterIds (780 nodes); zero rng drift, zero other node
changes. Pinned (s16-knot-subpool.test.ts): later knots ⊆ sub-pool
(200-seed sweep, both acts, A0+A3); the debut covers the FULL pool
across a 300-seed sweep; no debut repeat when avoidable.

Dose check (paired same-seed per S16-R1, seeds 1001–1200, vs the
S16.0e anchors):

| row | anchor | post-D4 | paired Δ | discordant (up/down) |
|---|---|---|---|---|
| vb braid | 74.0 | 69.5 | −4.5 | 33 (12/21) |
| vv braid | 59.0 | 57.5 | −1.5 | 29 (13/16) |
| bb braid | 84.0 | 76.5 | −7.5 | 27 (6/21) |
| vb probe | 74.0 | 69.5 | −4.5 | ladder 1.09 → 1.24 |
| bb probe | 84.0 | 76.5 | −7.5 | ladder 1.08 → 1.28 |

The knot tax lands differentially exactly as the ruling intended: bb
pays −7.5 to vb's −4.5, so **bb−vb on-braid closes +10.0 → +7.0** on
the D4 lever alone. Knot-2 heat rises 25.6→29.6 (vb) / 26.6→31.3 (bb);
on-braid spread 25.0 → 19.0. Gate readings on the FINAL build are in
Part 6.

## Part 4 — S16.3, the slate (each row its own commit)

1. **OQ#37 theater HP (S16-D9): ALREADY LIVE — verified, recorded, no
   code.** The ruled behavior landed at `22a4061` ("per-action HP
   playback in the theater"): `hpDelta`/`displayHp` walk a client-held
   display value down per `damage`/`detonate`/`player_hit` beat, skip
   snaps to final (`onOffsets(null)`), enemy bars and player stats both
   consume the offsets (App.tsx:1087/1169). §11-clean by construction —
   no engine replay. The OQ ledger had simply never been closed; it is
   now (OQ#37 gets its RULED line + the pointer).
2. **Choirmaster mechanicLine (S16-D5): landed** (`33bbc51`), the
   ratified string, trailing period normalized off per the D4-ratified
   six. Witness-law check re-verified at the def: mournerMechanic +
   chainReader both live; both clauses state true rules.
3. **Relic-owner retexts (S16-D8): enumerated + proposed below —
   STALLS at the table.** Effects untouched; nothing lands until each
   string is signed. The convention (text names whose resource it
   grants) is ratified; these are its applications.
4. **Ascension host-only (S16-D6): landed** — see its commit. The S7.7
   half (host-only dial, server-mirrored vote, host-persistent pick,
   `data-gp` pad reachability) was already live; the S16 delta is the
   CLAMP: the host's own unlock now rules (`maxAscension` reads the
   host seat only), retiring the min-over-seats rule that silently
   dragged a host's A2 to A0 beside a fresh-profile partner. Partner
   rides; solo unchanged (bot seat never clamps). Pinned both ways in
   s6.test.ts.
5. **Anti-streak binding (S16-D7): landed** — see its commit and the
   golden note there.
6. **S15 paperwork: landed** — see its commit.

### S16-D8 sign-off table — SUPERSEDED at ruling (2026-07-06)

**Designer's ruling on the stall:** the descriptions are fine as-is
*provided the UI only shows relics you yourself benefit from*. So no
retext rows land; the fix moved from strings to presentation. Landed:
the RelicBar now renders **your own relics + the partner's `coop:
true` relics only** — the partner's solo relics (the whole confusion
class below) no longer appear on your bar, so their holder-scoped
text can't read as if it applied to you. The co-op list was already a
curated data flag (13 of 28, the M2-B2 "≥8 co-op relics" floor), so
no design pass was needed. Effects untouched; strings untouched. The
table is preserved for the record:

Relics whose current text is silent about whose resource it grants
(the OQ#41a confusion class — "Ember Coal only gave Vess Momentum").
Verified against the hook engine: every row below is per-HOLDER
(`runHooks` runs on the holder's own relics).

| # | relic | current text | proposed text |
|---|---|---|---|
| 1 | ember_coal | Begin each combat with 3 Momentum. | Its bearer begins each combat with 3 Momentum. |
| 2 | kindling_bundle | Begin each combat Kindled 1. | Its bearer begins each combat Kindled 1. |
| 3 | sealed_reliquary | Begin each combat with 6 Block. | Its bearer begins each combat with 6 Block. |
| 4 | drawn_curtain | Draw 2 additional cards at the start of each combat. | Its bearer draws 2 additional cards at the start of each combat. |
| 5 | census_of_wounds | At the start of each combat, heal 3. | At the start of each combat, its bearer heals 3. |
| 6 | saints_marrow | When taken, heal 8. | When taken, the taker heals 8. |
| 7 | scar_votive | Whenever the Thread frays, heal 3. | Whenever the Thread frays, its bearer heals 3. |
| 8 | chord_of_the_choir | Whenever Resonance ignites, draw 1 and gain Kindled 1. | Whenever Resonance ignites, its bearer draws 1 and gains Kindled 1. |
| 9 | pulsekeepers_ring | Every third Pulse costs 1 Thread. The Ring keeps count. | Every third Pulse its bearer declares costs 1 Thread. The Ring keeps count. |
| 10 | bridegrooms_knot | Begin each combat with 3 additional Thread. | The pair's Thread begins each combat 3 higher. *(optional — the resource is already shared; flagged for completeness)* |

Convention-compliant already, left alone: everything with a "you /
your / your partner" anchor (whetstone_psalm, hungry_whetstone,
vigil_lamp, iron_girdle, hexwrought_locket, twin_phylactery,
tithing_bowl, covetous_psalter, loom_of_two_hands, wedding_knife,
braided_censer, knotted_votive), the enemy-facing pair (cracked_bell,
needlecase_of_saint_morrow), and the pair-scoped shared-event pair
(steadfast_icon, threadspool_reliquary). OQ#41b (which relics become
genuinely co-op) stays content-pass material, untouched per the
ruling.

## Part 5 — sequencing, as executed

S16.0a→b→c→d landed and pinned → the two instrument defects the
deterministic path exposed were fixed (their own commit) → **1e anchors
banked** → Part 2 (pinning + packet; battery correctly not spent) →
Part 3 + its battery (the two levers' contributions separate in the
ledger by construction — D3 contributed zero, so the whole knot-tax
delta is D4's) → slate rows, each its own commit, binding's golden
regen inside the window → final battery → gates on the final build.
Total sim spend this sprint: ~7,700 runs (~7,000 socket-free + ~700
over the wire for the bridge and checks), wall-clock minutes where S15
spent hours. Zero failed runs after the instanceId fix.

## Part 6 — batteries & gates, read on the FINAL build (all levers +
## D7 binding; paired per S16-R1 vs the S16.0e anchors, seeds 1001+)

Final rows, with the per-lever attribution the sprint's sequencing was
designed to yield (P3 battery = D4 alone; final − P3 = D7 alone; the
D3 contribution is zero by construction):

| row | anchor | +D4 | +D7 (final) | paired Δ total | discordant (up/dn) |
|---|---|---|---|---|---|
| vb braid | 74.0 | 69.5 | 70.5 | −3.5 | 43 (18/25) |
| vv braid | 59.0 | 57.5 | 57.5 | −1.5 | 43 (20/23) |
| bb braid | 84.0 | 76.5 | 73.0 | −11.0 | 44 (11/33) |
| vb default | 49.0 (n=400) | — | 50.0 | +1.0 | 78 (41/37) |
| vv default | 53.0 | — | 52.0 | −1.0 | 22 (10/12) |
| bb default | 50.0 | — | 52.5 | +2.5 | 35 (20/15) |
| vb probe | 74.0 · ladder 1.09 | 1.24 | 70.5 · ladder 1.21 | — | ≡ braid at A0 |
| bb probe | 84.0 · ladder 1.08 | 1.28 | 73.0 · ladder 1.26 | — | ≡ braid at A0 |
| vb braid A2/A3 | — | — | 40.0 / 36.5 | tooth −3.5 | — |
| bb braid A2/A3 | — | — | 43.5 / 44.5 | tooth +1.0 | — |

The unplanned finding in the ledger: **D7's anti-streak binding is a
real balance lever, not just fairness plumbing** — isolated on paired
seeds it moves bb-braid −3.5 (vb +1.0, vv 0.0). Alternating elite
bindings deny the bram mirror its lucky-streak turtle wins; it stacks
with D4's knot tax in exactly the gate-2 direction. Both effects were
ruled; the attribution is on record because the levers landed in
separate batteries.

1. **CI/structure — determinism & parity: PASS.** Same-seed
   byte-identical telemetry pinned (base + braid/probe); the one-time
   WS parity bridge recorded (Part 1: paired −3.3 vs the uncontended
   wire); shard aggregation pinned (N ≡ 1, fork path included);
   knot-reward pinning (Part 2); sub-pool + first-knot pinning
   (Part 3); binding-bias pinning (Part 4.5, rng-stream identity
   included); suite green per commit (427 at tip, from 406); one
   golden regen (D7), loud, in-commit.
2. **Gate 2 (headline): bb on-braid within ±8 of vb — PASS at +2.5**
   (anchor +10.0; old instrument +12.2). D4 closed −2.5 of it, D7
   closed −4.5 more, and bb's own default rows are untouched (+2.5,
   inside noise) — the tax is braid-knot-specific as ruled.
3. **Gate 4: ladder ≥2 on the probe leg — FAIL at 1.21/1.26 (from
   1.09/1.08). THE STOP-AND-REPORT BRANCH FIRES, per the doc.** The
   composition lever landed at its full honest dose (100% of later
   knots draw the sub-pool; no rng, no constants touched) and bought
   +0.12/+0.18. The remaining gap is structural, now with the
   mechanism fully visible: (i) braid topology — knots never edge into
   the next crossing's knot, so every act path meets at most TWO
   knots, and last/first is a knot-2/knot-1 ratio by construction;
   (ii) knot-1 averages the full pool (~24.5 pair HP) while the
   hottest existing comp (Bellkeeper tier, ~44) yields at most ~1.8
   even as a sub-pool of one, dragged to ~1.26 by the cooler act-1
   sub-pool; (iii) knotsCut resets per act, as S15 named.
   **DECISION PACKET (gate 4):** reaching ≥2 requires one of — (a) a
   dedicated authored knot-2 comp hotter than Bellkeeper (content
   session; the ×3 pierce lesson bounds how much absolute heat is
   safe), (b) per-run (non-resetting) knot escalation — structural,
   re-paces both acts, (c) re-derive the ≥2 gate itself: it predates
   the visible 2-knots-per-act ceiling, and a knot-2/knot-1 ratio of
   ~1.3 with composition may simply be what the braid IS. No resize
   attempted here.
4. **No-regression trio:** on-braid spread 15.5 — improved 9.5 points
   from the 25.0 anchor (the old ≤15 band, calibrated on the
   contended wire, is met in spirit and missed by 0.5 in letter; the
   band itself is S17 re-derivation material, Part 1). **vb keeps the
   co-op texture lead — PASS** (link-fire 56.7 vs vv 50.1 / bb 50.8;
   thread/combat 4.46 vs bb 4.13 / vv 3.08). **A3 tooth: PARTIAL** —
   vb keeps a clear tooth (40.0 → 36.5, −3.5); bb reads FLAT at A3
   (43.5 → 44.5, +1.0, within row noise). Attribution: D4 moved the
   sting INTO A2's second knot — both A2's later knot and A3's extra
   knot now draw the same sub-pool, so the marginal rung shrank for
   the pair that handles those comps best. REPORTED; any A3 placement
   action is a designer call (the S15 Part-3.3 philosophy).
5. **HP tripwires (S14-R2 as amended, paired form): PASS.** Floor:
   lowest pooled act-1 read 24.1 ≥ 16. Regression: max +1.2 (bb
   braid/probe), inside +4, per pair per topology. Watches REPORTED,
   no action: a2_boss 46.2 hp/combat (vb-braid leg, n=159) and
   a2_silence_wretch mid-table — both rows in the final battery logs.
6. **R1 band, reported per S16-D2: vb default 50.0 at n=400 —
   mid-band.** The (b) fallback stays unspent; the human re-read
   arrives with a clean prior.
7. **No-balance audit: PASS.** The sprint diff's content plane carries
   exactly the ruled D4 sub-pool data and the ratified D5 string;
   engine number changes are the two ruled levers; the D8 retexts did
   not land (stalled at the table); the instanceId fix is
   correctness-only (colliding ids had no legal play at all).
8. **Speed, informational:** pooled n=200 gate read 283 s (S15-era
   config) → 19 s (sharded socket-free), ~14×; a paired S16-R1 read
   costs half the runs of a pooled read on top of that.

## Part 7 — D-list outcomes

- **D0** — satisfied: the session's designated branch, from main after
  PR #13 (S14/S15 precedent).
- **D1 (relic retexts)** — table authored above; stalled as designed,
  then **RULED 2026-07-06: superseded by the UI filter** (RelicBar
  shows own + co-op only). No strings landed; none will.
- **D2 (knot-reward copy)** — **EMPTY**, the doc's own anticipated
  case: the existing screen copy already reads correctly for two seats.
- **D3 (ladder short of ≥2)** — the stop-and-report branch FIRED; the
  decision packet is in the Part 6 gate-4 row below. No resize was
  attempted (the ×3 lesson stands).
- Unscheduled finding, recorded as **packet S16-P1** (Part 2): the
  D3-B premise mismatch and the honest from-below lever candidates.

## Carries (updated)

The playtest slate stands as written in the sprint doc (the human
difficulty re-read now arrives with a cleaner prior — the clean
instrument puts vb default at 49, mid-band; the S16-D2 (b) fallback
looks unlikely to be needed but remains the playtest's call). New
carry: **the gate bands themselves** (±8, ≤15, the +4 tripwire) were
all calibrated against contended-wire readings; the S17 balance
session should re-derive them against clean-instrument anchors before
they gate anything else. S17 pointers from S15 stand; add packet
S16-P1 (gate-2 from-below lever) and the gate-4 packet (below) to the
same session. Watches: a2_boss and a2_silence rows continue —
REPORTED in the final battery logs, no action taken (future sprint,
per the sprint doc).
