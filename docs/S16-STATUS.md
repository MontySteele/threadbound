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
