# Threadbound — Sprint S9d: The Tally (Grower Rites)

Purpose: implement the designer ruling that death rites are the game's
GROWERS — each rite card carries a per-run tally keyed to a distinct
axis and grows permanently as the run feeds it. Supersedes the S9c.1
death-rite magnitude table (structure problem, not a numbers problem:
the pool's scaling verbs cluster on Hex — the true root of the S5
dominance diagnosis — and contain zero per-run growth, so no one-of
flat card can seed an archetype). The death pick already happens at
run start (phase 'rites', S7.2/S8.0) — it IS the run's first decision;
this sprint makes it the archetype declaration it was always shaped
to be. Fiction: the funeral machine tallies.

Branch: `s9d-the-tally`, from main after S9c. Hard scope rule: the
growth mechanism, the eight rite-card redesigns, their tallies,
presentation, and CI/batteries ONLY — plus the two S9b/S9c amendments
recorded in §S9d.A (designer-ruled 2026-07-03, folded here so the
packet needs no re-gathering). No birth-passive changes, no map work,
no non-rite cards beyond amendment A1. Covenant fence intact: no
growth op is a Hex application or scaling op; every grower is CAPPED
(Worn-Knife guardrail, CI-enforced).

## S9d.A Amendments to S9b / S9c (ruled; implement with those sprints)

- **A1 (S9b row 7 → ruled option a):** `quiet_mending` base gains
  `exhaust: true`; upgrade becomes "Gain 6 Block. Link (Surge): Heal
  3. Your partner heals 2." — also exhausting. The S7.6 interaction
  is INTENDED: the partner may Reclaim it from the exhaust pile (an
  Echo — one borrowed breath, mutated, gone at combat's end). The
  pool's only repeatable heal becomes a once-per-combat co-op ritual.
  Battery watch: reclaim-loop sustain; act-1 HP-loss band must not
  sag below 16.
- **A2 (S9b watch row):** Immovable's `partnerHeal 3` link — no
  change now; joins the telemetry watch (same verb, on the card the
  playtest already called strictly-better). Read with the guard-suite
  differentiation item.
- **A3 (S9c.1):** death-rite rows STRUCK, superseded by §S9d.1
  below. Birth-passive rows stand as written (First-Breath heal 2 is
  oncePerCombat-fenced — not an attrition leak). S9c.2's identity
  frame ships in S9c; the growth-tally visual layer lands here.

## S9d.0 Designer decision list

1. Sign-off on the §S9d.1 table (axes ruled in session; bases,
   rates, caps provisional pending battery).
2. Tally scope ratification: PAIR-wide tallies (either seat feeds
   any axis) except Vigil's, which is per-seat by nature (enemies
   that die Bound to YOU). Recommended and assumed below.
3. Echo growth: a Reclaimed rite Echo carries the current tally
   value (the tally is carved into the object, whoever holds it).
   Recommended and assumed below.
4. Votive's shape (§S9d.1 note) — the one axis the designer flagged
   least certain; strike or amend freely.

## S9d.1 The eight growers (sign-off table)

Format: base · link · GROWS (axis, rate, cap). Growth applies to the
named amount; "pair" = both seats' events count. All text is
auto-rendered from effective amounts (a grown card can never lie).

**Vess (4):**

1. **Knell** (1) — Deal 3 · L(Hex): Detonate · GROWS +1 damage per 2
   detonation events (pair), cap +12. The Hex archetype finally pays
   outside Hex amounts; damage growth, covenant-clean. Watch: Hex
   damage share band.
2. **Shroud** (1) — Gain 4 Block · L(Hex): partner gains 2 Block ·
   GROWS +2 Block per fall (either seat), cap +8. Mourning thickens;
   self-balancing — strongest for pairs having the hardest run.
3. **Vigil** (1) — Bind the target; gain 3 Block · GROWS +1 Block per
   enemy that dies while Bound to you (per-seat), cap +9. The taunt
   archetype: dying to your face makes you harder to ignore.
4. **Votive** (0) — Gain 1 Thread · L(Rite): partner draws 1 · GROWS
   by tier on pair Thread SPENT: at 8, base adds Draw 1; at 20, link
   becomes partner draws 2. Reads the economy, never adds to it
   (Thread gain stays 1 — economy fence). DESIGNER FLAG (S9d.0-4):
   the tier shape is the least-loved row; amend freely.

**Bram (4):**

5. **Pyre-Brand** (1) — Deal 4 · L(Strike): Kindled 2 · GROWS +1
   damage per 4 Kindled consumed (pair), cap +8.
6. **Toll** (0) — Gain 2 Momentum · L(Surge): gain 1 more · GROWS +1
   base Momentum per 25 links fired (pair), cap +2. Small cap on
   purpose: Momentum grants are per-turn fuel and Hearth-Keeper
   carries interact.
7. **Mourner's Step** (1) — Gain 4 Block · L(Guard): gain 2 Momentum
   · GROWS +1 Block per 10 Momentum spent (pair), cap +6.
8. **Descant** (0) — Draw 1 · L(Surge): partner draws 1 · GROWS by
   tier on pair Resonance ignitions: at 6, link becomes BOTH draw 1;
   at 14, base becomes Draw 2. The chain archetype; tiers because
   linear draw growth on a 0-cost is how card games die.

## S9d.2 Engine: stateless growth

- Growth is DERIVED, not stored: effective amount = base +
  min(cap, floor(tally / per) × amount), computed at resolution and
  preview time from run telemetry. No CardInstance field, no sync
  surface, deterministic from state — Echoes and Reclaims inherit
  correctness for free (S9d.0-3).
- Def schema: `growsWith?: { axis; per; amount; cap; appliesTo }`
  (tiered rites use a `tiers` variant: `[{ at, patch }]`).
- Tally axes: existing counters serve detonations
  (`detonationEvents`), falls (`fallsByPlayer` summed), resonances
  (`resonances`), links (`linksFired`), thread (`threadSpent`).
  THREE new run counters: `momentumSpentTotal`, `kindledConsumed`,
  `boundKills` (per seat) — generally useful telemetry regardless.
- computePlannedDamage and bot card-valuation read effective
  amounts in the same commit; preview==reality stays green. Bot
  ROUTING toward axes is explicitly out of scope (S11.9's problem);
  first-pass bots simply value the number in front of them.

## S9d.3 Presentation: the tally marks

- Rite frames (S9c.2's treatment) gain tally pips and a "+N" chip;
  card text renders current effective values (§S9d.1 auto-render).
- One combat-log line when a rite crosses a growth step ("The bell
  remembers." class — generated, names card + new value; the WITNESS
  does not narrate growth: tallies are the Machine's bookkeeping,
  and the S9c pools already cover rites' voice).
- The run-start death pick screen shows each candidate's AXIS
  plainly ("grows with detonations") — the archetype declaration
  must be legible at the moment of declaration. Held-reveal
  unaffected: axes are visible mechanics, not narrative economy.

## S9d.4 CI (covenant extensions)

- Every `growsWith`/`tiers` block REQUIRES a cap / terminal tier.
- No growth patch may contain a Hex application or scaling op.
- Auto-render parity: effective-amount text equals mechanics for a
  sweep of tally states (the S9b upgrade-parity lint, generalized).

## Gates

1. Full suite + new CI green; preview==reality green.
2. Batteries (pooled shards, all pairs, A0 + A2) vs post-S9c
   baseline: win rate ±6; act-1 HP loss 16–22 (A1 watch); run
   length in band; Hex damage share 25–45 (Knell watch).
3. Direction gates: rite-card play rate rises vs S9c battery;
   mean realized growth per rite > 0 at every rite (an axis nobody
   feeds is a dead archetype — name it and re-table, don't ship it).
4. Per-rite pick distribution at the death pick: no rite above 40%
   or below 5% across the battery (bot proxy for "the pick is a
   real choice"; human read supersedes at next playtest).
5. Designer read on §S9d.3 strings (never-lies fence) before merge.
