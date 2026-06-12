# Threadbound — Sprint S4: Economy Rulings + Ascension Skeleton

Post-rulings sprint (designer session 2026-06-12). Implements three designer
rulings (OQ#3/#8/#27), adds the gold telemetry those rulings need to be
readable, and builds the ascension/meta-progression **skeleton** — structure
and plumbing only, with every difficulty value explicitly provisional until
Playtest 2 calibration data exists.

**BRANCH RULE (binding):** all S4 work lands on branch `s4-economy`, NOT main.
Main stays frozen as the Playtest-2 build until that session's telemetry is
banked. Do not merge, do not rebase main into a state that changes gameplay.
If the playtest happens mid-sprint, that's fine — it runs from main.

Hard scope rule: no changes outside this doc. No pool content, no keyword
changes, no new cards, no locked-set authoring (S4.5 ships machinery with
everything unlocked). The OQ#24 upgrade-widening pass is explicitly NOT in
this sprint.

Record outcomes as §14.13 in DESIGN.md with a changelog entry, and mark
OQ#3/#8/#27 resolved in docs/OPEN-QUESTIONS.md with the ruling lines below.

---

## S4.0 Ruling log (fold into OPEN-QUESTIONS "Resolved")

- **OQ#3** → CLOSED, no change. Wedding Knife stays droppable-last from the
  random pool; shop/treasure remain its primary sources.
- **OQ#8** → unlimited removals per shop visit; price escalates **per player,
  run-persistent**; paid from the shared purse. (S4.2)
- **OQ#27** → Pulsekeeper's Ring loses `pulseCostMinusOne`; replaced with a
  run-persistent charge counter: the owner's **every third Pulse costs 1
  Thread** instead of 2. (S4.3)

## S4.1 Gold telemetry first (so S4.2 is readable from day one)

Gold currently has zero telemetry coverage. Add to the engine `Telemetry`
interface, sim summary, end-of-run summary screen, and human-session files:

1. **goldEarnedBySource** — `Record<'combat'|'elite'|'boss'|'event'|'treasure', number>`.
2. **goldSpentByCategory** — per player: cards, relics, removals.
   `Record<PlayerId, { cards: number; relics: number; removals: number }>`.
3. **removalsByPlayer** — count per player (mirrors the S4.2 counter; logged
   separately so telemetry survives even if the counter implementation moves).
4. **goldResidual** — purse at run end (the stat that says whether removal
   escalation is a real constraint or theater).
5. Per-act split of earned/spent folded into `actStats`.

Sim summary additions: mean gold income per run, mean residual, mean removals
per player per run, removal spend as % of total spend.

## S4.2 Shop removal rework (OQ#8 ruling)

Current: `ShopState.removalsBought` (shared, per-node), 3 slots at 75/100/125.

New design:
- Removals are **unlimited per shop visit** — the removal service never sells
  out; only gold gates it.
- Price for a given player = **75 + 25 × (removals that player has bought
  this RUN, anywhere)**. The counter is run-persistent: move it off
  `ShopState` onto run state as `removalsByPlayer: Record<PlayerId, number>`.
- Paid from the **shared purse** (unchanged). The design intent, verbatim:
  a player going small-deck can, at an escalating tax on the team's gold.
- Each player removes only from their own deck (unchanged).

Implementation notes:
- `ShopItem` entries of `kind: 'removal'` become a single always-present
  service row per player (or one row with per-player dynamic pricing —
  implementer's choice, but the UI must show **each player their own next
  price**, and show the partner's next price too: the negotiation is the
  point).
- Reducer: `SHOP_REMOVE` increments the acting player's run counter and
  charges the purse at that player's current price. Keep the existing
  assert that removal goes through `SHOP_REMOVE`.
- Bot policy: bots currently grab removals from the affordable-items list.
  Update to evaluate the per-player price; keep the existing
  remove-a-starter preference and the deck-size > 8 guard. Do not teach bots
  a small-deck strategy in this sprint — policy parity, not policy ambition.
- Witness: one line when a player buys their 4th+ removal in a run is in
  tone-budget ("Cutting away at yourself again. The Thread notices.") —
  optional, ≤1 new line.

## S4.3 Pulsekeeper's Ring rework (OQ#27 ruling)

Current: `passives: ['pulseCostMinusOne']` — every Pulse costs 1. Ruled
overpowered (literally doubles Pulses per Thread).

New design:
- Remove the `pulseCostMinusOne` passive entirely (type, combat.ts branches,
  relic def). It must not survive as dead code — a passive referencing a
  removed pricing rule is the same bug class as the original §14.12 retext.
- New mechanic: the ring's owner has a **run-persistent Pulse counter**
  (persists across combats; lives on player run state, created when the
  relic is acquired). Every third Pulse by the owner (counter ≡ 0 mod 3 on
  the pulse being cast, i.e. the 3rd, 6th, 9th…) costs **1 Thread instead
  of 2**. Counting starts at acquisition; Pulses before owning the ring
  don't count.
- Retext: "Every third Pulse costs 1 Thread. The Ring keeps count."
- UI: 0–2 charge pips on the relic frame; the THREAD row shows the
  discounted cost when the next Pulse is the discounted one (the affordance
  matters more than the math).
- Telemetry: `ringDiscountsFired` count, so Playtest-2-era data can confirm
  the relic isn't dead at human Pulse rates (designer accepted this risk
  knowingly; if it reads dead, the (b) variant — every third Pulse FREE —
  is the pre-agreed escalation, same average value, punchier moment).

## S4.4 Ascension ladder skeleton

Structure only. **Every numeric value below is provisional** and ships behind
the explicit understanding that M-next recalibrates them against Playtest 2 +
soft-release telemetry. Do not tune them in this sprint; do not re-anchor.

- Ascension level A0–A5, selected in the **lobby** before run start; both
  players must confirm (same both-confirm pattern as concede). Default A0.
- Rungs are **composable modifiers** applied at run start, each a discrete
  flag the engine consumes — not multiplied env math. A-level N applies all
  rungs ≤ N (StS convention):
  - **A1**: enemy HP scale +0.1 (stacks multiplicatively on the anchor).
  - **A2**: enemy damage scale +0.1.
  - **A3**: +1 elite per act (map generation).
  - **A4**: Fray penalty harsher (provisional: Fray threshold −1).
  - **A5**: rest-site heal reduced (provisional: 30% → 20% max HP).
- The `TB_ENEMY_HP_SCALE` / `TB_ENEMY_DMG_SCALE` env knobs remain orthogonal
  live overrides and are NOT folded into the ladder.
- Telemetry: ascension level stamped into every telemetry file and the sim
  summary header, same as the active scales already are.
- Sim harness: `ASCEND=N` env selects the level for bot batteries (no new
  gates this sprint — A0 must reproduce current behavior exactly).
- Unlock condition: clearing A(N) unlocks A(N+1) **per character**, recorded
  in the S4.5 profile.

## S4.5 Browser profile + unlock machinery (meta-progression substrate)

No accounts. Profile is browser-side with an export string.

- `localStorage` profile (alongside the existing session token):
  `{ version, clears: Record<CharacterId, { count, bestAscension }>,
  unlockedCards: string[], ascensionUnlocked: Record<CharacterId, number> }`.
- **Export/import string**: base64(JSON) + short checksum; import validates
  version + checksum and merges (max/union semantics, never downgrade).
  Exposed on the title screen, small. This is the save-state for now;
  a real account layer is explicitly out of scope.
- **Union rule (designer ruling, this session):** the run's available card
  pool is the **union** of both players' unlocked sets, and unlock credit
  from a cleared run accrues to **both** players' profiles.
- Card-pool pacing machinery: pool assembly at run start filters by the
  union unlock set. **Ship with every card unlocked by default** — zero
  behavioral change until a locked set is authored, which is post-playtest
  content-pass work (same pass as OQ#24), not S4 work.
- Client sends profile unlock-set + ascension selection at room join; the
  server (authoritative per §11) validates ascension ≤ both players' unlocked
  max and assembles the pool. Profiles are claims, not authority — server
  clamps, never trusts.

## S4.6 Sign-off gates

1. Tests green; fresh-clone test passes (Part D convention).
2. **A0 parity**: full sim battery at A0, everything unlocked, no ring in
   pool-forced runs → aggregates match the pre-S4 branch point within noise.
   The skeleton must be behaviorally invisible at defaults (the one allowed
   diff: removal pricing, which bots exercise — report the delta, expect it
   small given the deck-size > 8 guard).
3. Scripted shop test: two players, same shop — player A buys 3 removals
   (75/100/125 charged), player B's first removal still costs 75; counters
   survive to the next shop node (run-persistence proven in-test).
4. Forced-ring sim: owner Pulses 6× across two combats → exactly 2 discounts
   fired, counter survives the combat boundary.
5. Telemetry: all S4.1 fields + ascension level + `ringDiscountsFired`
   present in a human-session file and the sim summary.
6. Profile round-trip: export → wipe localStorage → import → identical
   profile; corrupted string rejected cleanly.
7. **Branch not merged.** Sign-off = branch green + this checklist; merge is
   a separate designer action after Playtest 2 telemetry is banked.
